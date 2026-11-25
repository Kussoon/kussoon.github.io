"""Read the published map's actual geometry paths and the existing region ledgers."""
import base64
from collections import Counter
import gzip
import json
import re
from pathlib import Path


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def code5(value):
    return isinstance(value, str) and re.fullmatch(r"[0-9]{5}", value) is not None


def address_code(value):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{5,6}", value):
        return None
    if len(value) == 6:
        check = 11 - sum(int(digit) * weight for digit, weight in zip(value, range(6, 1, -1))) % 11
        if int(value[-1]) != check % 10:
            return None
    return value[:5]


def geometries(topology):
    return topology["objects"]["municipalities"]["geometries"]


def geometry_index(path, pref, expected):
    index = {}
    for shape in geometries(read_json(path)):
        properties = shape["properties"]
        code = properties["N03_007"]
        if not code5(code) or not code.startswith(pref) or code in index:
            raise ValueError(f"Invalid or duplicate N03 code {code} in {path}")
        shape_type = shape["type"]
        if shape_type not in {"Polygon", "MultiPolygon"} or not shape["arcs"]:
            raise ValueError(f"Empty or invalid geometry for {code}")
        index[code] = (properties["N03_004"], len(shape["arcs"]) if shape_type == "MultiPolygon" else 1)
    if len(index) != expected:
        raise ValueError(f"Manifest count differs in {path}")
    return index


def plate_index(directory):
    plates = {}
    dates = set()
    for page in sorted(directory.glob("[0-9][0-9]*.html")):
        embedded = page.read_text(encoding="utf-8").split("globalThis.embeddedMap=", 1)[1]
        wrapper, _ = json.JSONDecoder().raw_decode(embedded)
        topology = json.loads(gzip.decompress(base64.b64decode(wrapper["gzipBase64"])))
        metadata = topology["metadata"]
        dates.add((metadata["source_date"], metadata["as_of"]))
        for shape in geometries(topology):
            props = shape["properties"]
            code = props["map_code"]
            if not code5(code) or not code.startswith(wrapper["prefecture"]) or code in plates:
                raise ValueError(f"Invalid plate code {code} in {page}")
            plates[code] = (props["region_status"], props["join_status"])
    return plates, sorted(dates)


def load_areas(repo, scope, name_overrides):
    root = repo / "v2/data/national/2026-common"
    topologies = read_json(root / "national-2026-pilot/manifest.json")
    entries = topologies["entries"]
    expected_prefs = {f"{i:02}" for i in range(1, 48)}
    if len(entries) != 47 or {e["pref"] for e in entries} != expected_prefs:
        raise ValueError("The map manifest must cover all 47 prefectures")
    html = (repo / "maps/national-municipalities.html").read_text(encoding="utf-8")
    selection = re.search(r"sharedTrialPrefectures=new Set\(\[(.*?)\]\)", html)
    if not selection or "/v2/data/national/2026-shared-preview/" not in html:
        raise ValueError("Cannot verify the published map's active geometry paths")
    shared = set(re.findall(r"'([0-9]{2})'", selection[1]))
    if not shared <= expected_prefs:
        raise ValueError("Invalid prefecture in shared topology selection")

    shapes, offices, map_diffs = {}, {}, []
    for entry in entries:
        pref = entry["pref"]
        baseline = geometry_index(root / entry["source"], pref, entry["regions"])
        active = baseline
        if pref in shared:
            path = repo / "v2/data/national/2026-shared-preview" / f"{pref}.topojson"
            active = geometry_index(path, pref, entry["regions"])
            map_diffs.extend(code for code in sorted(baseline.keys() | active.keys())
                             if baseline.get(code) != active.get(code))
        shapes.update(active)
        directory = read_json(repo / "v2/data/offices" / f"{pref}.json")
        for code, area in directory["regions"].items():
            if not code5(code) or not code.startswith(pref):
                raise ValueError(f"Invalid office region: {code}")
            offices[code] = area
    if len(shapes) != topologies["municipalityCount"]:
        raise ValueError("Active map code count differs from manifest")

    index = read_json(repo / "v2/progressive-preview/label-index.json")
    labels = {item["code"]: item for item in index["entries"]}
    if len(labels) != len(index["entries"]) or labels.keys() != shapes.keys():
        raise ValueError("Map and national label code sets differ")
    plates, plate_dates = plate_index(repo / "driving/vehicleregistrationplates/region")
    map_only = shapes.keys() - offices.keys()
    if map_only != scope.keys():
        raise ValueError(f"Review the map-only area scope: {sorted(map_only ^ scope.keys())}")

    areas = {}
    for code in sorted(shapes.keys() | offices.keys() | plates.keys()):
        office = offices.get(code, {})
        label = labels.get(code, {})
        shape_name, parts = shapes.get(code, (None, None))
        if code in shapes and shape_name not in {label["name"], label["fullName"], label["major"]}:
            raise ValueError(f"Label vs. N03 detail name mismatch: {code} / {shape_name} / {label['fullName']}")
        parent = office.get("parentCode")
        if parent and (code not in shapes or offices[parent]["kind"] != "designatedCity"
                       or code[:2] != parent[:2] or label["major"] != offices[parent]["name"]):
            raise ValueError(f"Invalid designated city parent: {code} / {parent}")
        kind = office.get("kind", "map_exception")
        if kind == "ward" and not parent:
            if not ("13101" <= code <= "13123"):
                raise ValueError(f"Unexpected ward without a parent: {code}")
            kind = "special_ward"
        exception = scope.get(code)
        status = exception["status"] if exception else "eligible"
        reason = exception["reason"] if exception else None
        if not office and not exception:
            status, reason = "unconfirmed", "ナンバープレート地図にのみ存在"
        if kind != "designatedCity" and code not in shapes and office:
            status, reason = "unconfirmed", "庁舎台帳のコードが公開地図にない"
        name = label.get("fullName") or office.get("name")
        office_name = office.get("name")
        areas[code] = {
            "code": code, "prefecture_code": code[:2], "name": name, "kind": kind,
            "parent_city_code": parent, "scope_status": status, "scope_reason": reason,
            "map_name": shape_name, "office_name": office_name, "polygon_parts": parts,
            "map_present": code in shapes, "office_present": bool(office),
            "office_name_agrees": (not (name and office_name)
                                   or normalize_area_name(code, office_name, name_overrides) == name),
            "plate_region_status": plates[code][0] if code in plates else None,
            "plate_join_status": plates[code][1] if code in plates else None,
        }

    parents = {a["parent_city_code"] for a in areas.values() if a["parent_city_code"]}
    expected_parents = {code for code, a in areas.items() if a["kind"] == "designatedCity"}
    if parents != expected_parents:
        raise ValueError(f"Parent cities and the ward linkage differ: {sorted(parents ^ expected_parents)}")
    stats = {
        "n03_as_of": "2026-01-01",
        "active_map_codes": len(shapes), "national_index_codes": len(labels), "office_codes": len(offices),
        "map_only_codes": sorted(map_only), "office_only_codes": sorted(offices.keys() - shapes.keys()),
        "active_vs_manifest_code_name_or_part_count_differences": sorted(map_diffs),
        "shared_topology_prefectures": sorted(shared),
        "multi_part_areas": sum(parts > 1 for _, parts in shapes.values()),
        "polygon_parts": sum(parts for _, parts in shapes.values()),
        "plate_geometry_codes": len(plates), "plate_metadata_dates": plate_dates,
        "plate_region_status_counts": dict(Counter(state for state, _ in plates.values())),
        "plate_vs_map_only_plate_codes": sorted(plates.keys() - shapes.keys()),
        "plate_vs_map_only_map_codes": sorted(shapes.keys() - plates.keys()),
        "office_name_unconfirmed_codes": [c for c, a in areas.items() if not a["office_name_agrees"]],
    }
    return areas, stats


def normalize_area_name(code, name, overrides):
    replacement = overrides.get((code, name), name)
    # The store ledger often includes a county prefix, while the map index has the municipality name.
    return re.sub(r"^.+?郡(?=.+[町村]$)", "", replacement)
