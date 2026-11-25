#!/usr/bin/env python3
"""Join the approved PR #769 snapshot to the workbook's store details."""
import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit

from openpyxl import load_workbook

HERE = Path(__file__).resolve().parent
PR_HEAD = "9be7cc4adc05a604df47fa85f34339e43c050373"
EXPECTED = (4613, 42, 21, 17, 1741, 1892)
DIMENSIONS = {
    "prefectures": ("prefecture_code", "prefecture"), "brands": ("brand",),
    "brand-groups": ("brand_group",), "operators": ("operator",),
    "area-brands": ("area_code", "brand"), "area-operators": ("area_code", "operator"),
}


def check(condition, message):
    if not condition:
        raise ValueError(message)


def load(path):
    with path.open(encoding="utf-8") as stream:
        return json.load(stream)


def read_csv(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def dump(path, data):
    path.parent.mkdir(exist_ok=True, parents=True)
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        json.dump(data, stream, ensure_ascii=False, separators=(",", ":"))
        stream.write("\n")


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def workbook_details(path):
    columns = ("全国統合ID", "表示用店舗名", "公式住所原文", "基準日時点の住所",
               "表示用住所", "公式店舗URL", "公式URL種別", "実運営法人")
    book = load_workbook(path, read_only=True, data_only=True)
    try:
        rows = iter(book["通常掲載店舗"].values)
        headers = next(rows)
        positions = [headers.index(key) for key in columns]
        result = {}
        for row in rows:
            sid, name, official, baseline, display, url, url_kind, operator = (row[p] for p in positions)
            check(sid and sid not in result, f"Workbook ID missing or repeated: {sid}")
            address = official or baseline or display
            parsed = urlsplit(url or "")
            safe_url = url if parsed.scheme in {"https", "http"} and parsed.hostname else ""
            result[sid] = {"name": name, "address": address, "addressType": "公式原文" if official else
                           "基準日住所" if baseline else "台帳表示住所", "url": safe_url,
                           "urlKind": url_kind or "", "workbookOperator": operator}
        return result
    finally:
        book.close()


def check_rollups(rows, generated):
    results = {}
    for mode in ("city", "ward"):
        scoped = [dict(s, area_code=s[f"{mode}_area_code"]) for s in rows]
        counts = Counter(s["area_code"] for s in scoped)
        records = read_csv(generated / mode / "municipalities.csv")
        found = [r for r in records if r["status"] in {"has_stores", "zero"}]
        check(len(found) == (1741 if mode == "city" else 1892), f"{mode}: wrong area denominator")
        for r in records:
            code = r["code"]
            if r["status"] in {"has_stores", "zero"}:
                check(counts[code] == int(r["store_count"]), f"{mode}: wrong total for {code}")
            else:
                check(not counts[code] and not r["store_count"], f"{mode}: an exception has a store count")
        check(sum(counts.values()) == len(rows) and counts.keys() <= {r["code"] for r in found},
              f"{mode}: invalid municipality assignments")
        for file, keys in DIMENSIONS.items():
            groups = defaultdict(set)
            for store in scoped:
                groups[tuple(store[k] for k in keys)].add(store["store_id"])
            for row in read_csv(generated / mode / (file + ".csv")):
                key = tuple(row[k] for k in keys)
                check(groups.pop(key) == set(row["store_ids"].split()), f"{mode}: inconsistent {file}: {key}")
            check(not groups, f"{mode}: missing rows in {file}")
        buckets = Counter()
        for r in found:
            count = int(r["store_count"])
            thresholds = [0, 1, 2, 5, 9, 19, 49, 99, float("inf")]
            band = next(i for i, high in enumerate(thresholds) if count <= high)
            buckets[band] += 1
        results[mode] = {"areas": len(found), "withStores": len(counts), "zero": len(found) - len(counts),
                         "colorBins": [buckets[i] for i in range(9)]}
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--workbook", type=Path, required=True)
    parser.add_argument("--repo", type=Path, default=HERE.parents[2])
    parser.add_argument("--output", type=Path, default=HERE / "data")
    args = parser.parse_args()
    generated = args.snapshot / "generated"
    summary = load(generated / "summary.json")
    rows = load(generated / "stores.json")
    check(digest(args.workbook) == summary["inputs_sha256"]["workbook"], "Workbook SHA-256 differs")
    registry = load(generated / "municipalities.json")["registry"]
    check(len(registry) == len({a["code"] for a in registry}), "Duplicate registry codes")
    detail = workbook_details(args.workbook)
    ids = [r["store_id"] for r in rows]
    check(len(ids) == len(set(ids)) == len(detail) and set(ids) == detail.keys(), "Store IDs differ from Excel")
    rollups = check_rollups(rows, generated)
    labels = {r["code"]: r for r in load(args.repo / "v2/progressive-preview/label-index.json")["entries"]}
    counties = load(args.repo / "v2/progressive-preview/county-overlay.json")["entries"]
    prefectures = dict(sorted({r["prefecture_code"]: r["prefecture"] for r in rows}.items()))
    check(len(prefectures) == 47, "Not all 47 prefectures")
    overrides = {r["store_id"]: r for r in read_csv(args.snapshot / "operator-overrides.csv")}
    followup = defaultdict(list)
    for item in read_csv(generated / "audit/individual-followup.csv"):
        followup[item["store_id"]].append({k: item[k] for k in ("axis", "status", "reason", "evidence_url")})
    areas = {}
    for area in registry:
        code = area["code"]
        label = labels.get(code, {})
        county = counties.get(code, {})
        name = area["name"]
        if county.get("name") == name:
            name = county["county"] + name
        areas[code] = {"name": name, "short": label.get("name", name), "reading": label.get("reading", ""),
                       "pref": area["prefecture_code"], "kind": area["kind"], "status": area["scope_status"],
                       "reason": area["scope_reason"], "parent": area["parent_city_code"]}
    for code, area in areas.items():
        if area["kind"] == "designatedCity":
            child = next((c for c, a in areas.items() if a["parent"] == code and labels[c].get("parts")), None)
            if child:
                prefix = labels[child]["parts"][0]
                if prefix["name"] == area["name"]:
                    area["reading"] = prefix["reading"]
    brand_groups = dict(sorted({r["brand"]: r["brand_group"] for r in rows}.items()))
    check(all(brand_groups[r["brand"]] == r["brand_group"] for r in rows), "Conflicting brand groups")
    brands = list(brand_groups)
    groups = sorted(set(brand_groups.values()))
    operators = sorted({r["operator"] for r in rows})
    observed = (len(ids), len(brands), len(groups), len(operators), rollups["city"]["areas"], rollups["ward"]["areas"])
    check(observed == EXPECTED, f"Unexpected counts: {observed}")
    sparse = Counter()
    store_files = defaultdict(lambda: defaultdict(list))
    for store in rows:
        sid = store["store_id"]
        extra = detail[sid]
        ward = store["ward_area_code"]
        area = areas[ward]
        check(extra["name"] == store["name"] and area["status"] == "eligible"
              and area["pref"] == store["prefecture_code"] and (area["parent"] or ward) == store["city_area_code"],
              f"Wrong displayed name or municipal linkage: {sid}")
        operator_override = overrides.get(sid)
        check(store["operator"] == (operator_override["operator"] if operator_override else extra["workbookOperator"]),
              f"Wrong operator: {sid}")
        sparse[(ward, brands.index(store["brand"]), operators.index(store["operator"]))] += 1
        store_files[area["pref"]][ward].append({
            "id": sid, "name": extra["name"], "address": extra["address"],
            "addressType": extra["addressType"], "url": extra["url"], "urlKind": extra["urlKind"],
            "brand": brands.index(store["brand"]), "operator": operators.index(store["operator"]),
            "originalBrand": store["original_brand"], "brandStatus": store["brand_status"],
            "brandRule": store["brand_rule_id"], "brandBasis": store["brand_basis"],
            "brandSource": store["brand_evidence_url"], "operatorSource": operator_override,
            "review": followup.get(sid, []),
        })

    for pref, districts in sorted(store_files.items()):
        dump(args.output / "stores" / f"{pref}.json", districts)
    dump(args.output / "index.json", {
        "source": PR_HEAD, "storesAsOf": summary["store_baseline_dates"][0], "areasAsOf": "2026-01-01",
        "total": len(ids), "prefectures": prefectures, "areas": areas, "brands": brands, "groups": groups,
        "brandGroup": [groups.index(brand_groups[b]) for b in brands], "operators": operators,
        "members": [[*key, n] for key, n in sorted(sparse.items())],
    })
    dump(args.output / "validation.json", {
        "source": PR_HEAD, "sourceHashes": {name: digest(generated / name)
                                           for name in ("stores.json", "municipalities.json", "summary.json")},
        "stores": len(ids), "idMissing": 0, "idDuplicate": 0, "unassigned": 0, "doubleCount": 0,
        "brands": len(brands), "groups": len(groups), "operators": len(operators),
        "officialSourceAddress": sum(d["addressType"] == "公式原文" for d in detail.values()),
        "addressMissing": sum(not d["address"] for d in detail.values()),
        "officialLinkMissing": sum(not d["url"] for d in detail.values()),
        "levels": rollups, "review": summary["followup_counts"],
    })
    print(observed)


if __name__ == "__main__":
    main()
