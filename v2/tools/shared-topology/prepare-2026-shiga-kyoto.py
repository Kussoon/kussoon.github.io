#!/usr/bin/env python3
"""Download official 2026 N03 files for a selected prefecture pair.

Test-only fixture for the shared national topology pipeline. The original files
and the produced output remain CI artifacts, not published in the website.
"""
import json
import pathlib
import subprocess
import sys
import time
import urllib.request
import zipfile

PREFS = ("25", "26")
BASE = "https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2026/"
ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "generated-input").resolve()
ROOT.mkdir(parents=True, exist_ok=True)


def download(code):
    filename = f"N03-20260101_{code}_GML.zip"
    target = ROOT / filename
    url = BASE + filename
    if not target.exists():
        last = None
        for attempt in range(3):
            try:
                request = urllib.request.Request(url, headers={
                    "User-Agent": "Kussoon V2 shared-topology research/1.0"
                })
                with urllib.request.urlopen(request, timeout=90) as response:
                    with open(target, "wb") as dest:
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
                    time.sleep((attempt + 1) * 3)
        else:
            raise RuntimeError(f"MLIT official ZIP download failed ({url}): {last}")
    with zipfile.ZipFile(target) as z:
        if z.testzip() is not None:
            raise RuntimeError(f"Invalid source ZIP {target}")
        shapes = [name for name in z.namelist() if name.lower().endswith(".shp")]
        gmls = [name for name in z.namelist() if name.lower().endswith(".gml")]
        if shapes:
            layer = sorted(shapes, key=lambda item: len(item))[0]
        elif gmls:
            layer = sorted(gmls, key=lambda item: len(item))[0]
        else:
            raise RuntimeError(f"Neither SHP nor GML present in {filename}")
        directory = ROOT / code
        z.extractall(directory)
        return directory / layer


def convert(code):
    src = download(code)
    dst = ROOT / f"{code}.geojson"
    print(f"Reading {src.name}, output {dst.name}", flush=True)
    cmd = [
        "ogr2ogr", "-f", "GeoJSON", "-t_srs", "EPSG:4326",
        "-lco", "RFC7946=YES", str(dst), str(src)
    ]
    subprocess.run(cmd, check=True)
    data = json.loads(dst.read_text("utf-8"))
    if data.get("type") != "FeatureCollection":
        raise RuntimeError(f"Not a FeatureCollection: {code}")
    if not data.get("features"):
        raise RuntimeError(f"No features found: {code}")
    return data["features"]


all_features = []
for pref in PREFS:
    features = convert(pref)
    counts = {}
    for feature in features:
        props = feature.get("properties") or {}
        code = str(props.get("N03_007") or "").strip()
        if not (len(code) == 5 and code.isdecimal() and code.startswith(pref)):
            raise RuntimeError(f"Unexpected N03_007={code!r} in prefecture {pref}")
        counts[code] = counts.get(code, 0) + 1
    print(f"Prefecture {pref}: {len(features)} source features, {len(counts)} local region codes", flush=True)
    all_features.extend(features)

if len(all_features) < 60:
    raise RuntimeError("Suspiciously few 2026 administrative features")
combined = ROOT / "shiga-kyoto-2026.geojson"
combined.write_text(json.dumps({"type": "FeatureCollection", "features": all_features},
                               ensure_ascii=False, separators=(",", ":")), "utf-8")
print(f"Combined {len(all_features)} polygons in {combined}, {combined.stat().st_size:,} bytes", flush=True)
