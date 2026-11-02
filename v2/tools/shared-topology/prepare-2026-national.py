#!/usr/bin/env python3
"""Build one nationwide N03-2026 GeoJSON input from official prefecture ZIPs.

This is a temporary-input preparation step for the isolated national topology
pilot. Original archives and intermediate files remain in RUNNER_TEMP.
"""
import json
import pathlib
import subprocess
import sys
import time
import urllib.request
import zipfile

PREFECTURES = tuple(f"{n:02d}" for n in range(1, 48))
BASE = "https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2026/"
ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "generated-input").resolve()
ROOT.mkdir(parents=True, exist_ok=True)
OUT = ROOT / "national-2026.geojson"
SUMMARY = ROOT / "source-summary.json"


def download(code):
    filename = f"N03-20260101_{code}_GML.zip"
    target = ROOT / filename
    if not target.exists():
        last = None
        for attempt in range(3):
            try:
                request = urllib.request.Request(
                    BASE + filename,
                    headers={"User-Agent": "Kussoon V2 national topology pilot/1.0"},
                )
                with urllib.request.urlopen(request, timeout=120) as response, target.open("wb") as dest:
                    while True:
                        block = response.read(1024 * 1024)
                        if not block:
                            break
                        dest.write(block)
                break
            except Exception as exc:
                last = exc
                target.unlink(missing_ok=True)
                if attempt < 2:
                    time.sleep((attempt + 1) * 4)
        else:
            raise RuntimeError(f"Official MLIT ZIP download failed for {code}: {last}")
    with zipfile.ZipFile(target) as archive:
        corrupt = archive.testzip()
        if corrupt is not None:
            raise RuntimeError(f"Invalid ZIP member {corrupt} in {filename}")
        candidates = [n for n in archive.namelist() if n.lower().endswith((".shp", ".gml"))]
        if not candidates:
            raise RuntimeError(f"No SHP/GML data in {filename}")
        # The shortest named spatial layer matches the existing regional
        # preparation scripts and avoids metadata/auxiliary layers.
        layer = sorted(candidates, key=len)[0]
        dest = ROOT / ("extract-" + code)
        dest.mkdir(exist_ok=True)
        archive.extractall(dest)
        return dest / layer


def polygons(geometry):
    if not geometry:
        return []
    kind = geometry.get("type")
    if kind == "Polygon":
        return [geometry["coordinates"]]
    if kind == "MultiPolygon":
        return geometry["coordinates"]
    if kind == "GeometryCollection":
        result = []
        for child in geometry.get("geometries", []):
            result.extend(polygons(child))
        return result
    if kind in ("LineString", "MultiLineString", "Point", "MultiPoint"):
        return []
    raise RuntimeError(f"Unsupported source geometry {kind}")


def convert(code):
    source = download(code)
    target = ROOT / f"{code}.geojson"
    subprocess.run(
        ["ogr2ogr", "-f", "GeoJSON", "-t_srs", "EPSG:4326",
         "-lco", "RFC7946=YES", str(target), str(source)],
        check=True,
    )
    data = json.loads(target.read_text("utf-8"))
    if data.get("type") != "FeatureCollection" or not data.get("features"):
        raise RuntimeError(f"Invalid/empty GeoJSON for prefecture {code}")
    codes = set()
    normalized = 0
    for feature in data["features"]:
        props = feature.get("properties") or {}
        local = str(props.get("N03_007") or "").strip()
        if local.isdecimal():
            local = local.zfill(5)
            props["N03_007"] = local
        if len(local) != 5 or not local.isdecimal() or not local.startswith(code):
            raise RuntimeError(f"Unexpected N03_007={local!r} in prefecture {code}")
        if not str(props.get("N03_004") or "").strip():
            raise RuntimeError(f"Missing N03_004 for {local}")
        geom = feature.get("geometry")
        if geom and geom.get("type") == "GeometryCollection":
            areas = polygons(geom)
            if not areas:
                raise RuntimeError(f"No polygon area for code {local}")
            feature["geometry"] = {"type": "MultiPolygon", "coordinates": areas}
            normalized += 1
    print(f"PASS {code}: {len(data['features'])} source features, {normalized} normalized geometries", flush=True)
    return data["features"]


counts = {}
total_features = 0
with OUT.open("w", encoding="utf-8") as dest:
    dest.write('{"type":"FeatureCollection","features":[\n')
    first = True
    for pref in PREFECTURES:
        features = convert(pref)
        local_codes = set()
        for feature in features:
            code = str(feature["properties"]["N03_007"])
            local_codes.add(code)
            if not first:
                dest.write(",\n")
            json.dump(feature, dest, ensure_ascii=False, separators=(",", ":"))
            first = False
            total_features += 1
        if not local_codes:
            raise RuntimeError(f"No administrative codes for {pref}")
        counts[pref] = len(local_codes)
    dest.write("\n]}\n")

summary = {
    "source": "国土数値情報 行政区域データ N03-20260101, 2026-01-01",
    "sourcePage": "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html",
    "prefectureCount": len(counts),
    "sourceFeatureCount": total_features,
    "uniqueRegionCodesByPrefecture": counts,
    "uniqueRegionCodeCount": sum(counts.values()),
    "note": "Temporary source conversion for an isolated pilot; source archives and intermediate GeoJSON are not copied into the website repository."
}
SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", "utf-8")
print(f"PASS nationwide source: {len(counts)} prefectures, {sum(counts.values())} unique region codes, {total_features} source features", flush=True)
