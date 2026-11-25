#!/usr/bin/env python3
"""Independently verify the published artifacts and rebuild for byte comparison."""
import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
BASELINE = "7f73f359cb2305f4029ffecb46fa0c1560ca3137"
STORE_FIELDS = {
    "store_id", "name", "prefecture", "prefecture_code", "source_municipality_name",
    "ward_area_code", "city_area_code", "parent_city_code", "municipality_status",
    "original_brand", "original_raw_brand", "legacy_map_brand", "operator", "operator_status",
    "brand", "brand_group", "brand_status", "brand_rule_id", "brand_basis", "brand_evidence_url",
    "master_brand_basis",
}
BOUNDARIES = [(0, "0"), (1, "1"), (2, "2"), (5, "3-5"), (9, "6-9"), (19, "10-19"),
              (49, "20-49"), (99, "50-99"), (float("inf"), "100+")]
DIMENSIONS = {
    "prefectures": ("prefecture_code", "prefecture"), "brands": ("brand",),
    "brand-groups": ("brand_group",), "operators": ("operator",),
    "area-brands": ("area_code", "brand"), "area-operators": ("area_code", "operator"),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def load(file):
    return json.loads(file.read_text(encoding="utf-8"))


def rows(file):
    with file.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def git(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args])


def verify_scope(repo, base):
    prefix = "v2/verification/aeon-municipality-distribution-data-v0.1/"
    compared = git(repo, "diff", "--name-status", "--no-renames", "-z", base, "--").decode().split("\0")
    diff = zip(compared[::2], compared[1::2])
    outside = [path for action, path in diff if action != "A" or not path.startswith(prefix)]
    untracked = git(repo, "ls-files", "--others", "--exclude-standard", "-z").decode().split("\0")
    outside.extend(path for path in untracked if path and not path.startswith(prefix))
    require(not outside, f"Unexpected diff outside new verification artifacts: {outside}")


def verify_aggregate_files(root, mode, eligible, stores):
    folder = root / mode
    scoped = {sid: dict(store, area_code=store[f"{mode}_area_code"]) for sid, store in stores.items()}

    def verify_rollup(filename, fields):
        groups = defaultdict(set)
        for sid, store in scoped.items():
            groups[tuple(store[k] for k in fields)].add(sid)
        for row in rows(folder / (filename + ".csv")):
            values = tuple(row[k] for k in fields)
            ids = row["store_ids"].split()
            expected = groups.pop(values)
            require(int(row["store_count"]) == len(ids) == len(expected) and set(ids) == expected,
                    f"{mode}: {filename} / {values}: store IDs differ")
        require(not groups, f"{mode}: {filename} has missing categories")

    for filename, fields in DIMENSIONS.items():
        verify_rollup(filename, fields)
    with_stores = {c for c, a in eligible.items() if a["store_count"]}
    zeros = eligible.keys() - with_stores
    require({r["code"] for r in rows(folder / "with-stores.csv")} == with_stores, f"{mode}: with stores")
    require({r["code"] for r in rows(folder / "zero-stores.csv")} == zeros, f"{mode}: zero stores")
    ranking = rows(folder / "ranking.csv")
    ranked = sorted(with_stores, key=lambda c: (-eligible[c]["store_count"], c))
    require([r["code"] for r in ranking] == ranked, f"{mode}: ranking order")
    last_n, rank = None, None
    for i, r in enumerate(ranking, 1):
        n = eligible[r["code"]]["store_count"]
        if n != last_n:
            rank = i
        require(int(r["rank"]) == rank and set(r["store_ids"].split()) == set(eligible[r["code"]]["store_ids"]),
                f"{mode}: ranking row {r['code']}")
        last_n = n

    freq = rows(folder / "frequency.csv")
    expected_freq = defaultdict(set)
    for code, area in eligible.items():
        expected_freq[area["store_count"]].add(code)
    for row in freq:
        codes = expected_freq.pop(int(row["stores_per_area"]))
        ids = {sid for c in codes for sid in eligible[c]["store_ids"]}
        require(int(row["area_count"]) == len(codes) and set(row["area_codes"].split()) == codes
                and set(row["store_ids"].split()) == ids, f"{mode}: frequency row")
    require(not expected_freq, f"{mode}: missing frequency rows")

    files = rows(folder / "color-bins.csv")
    for dimension in ("all", "brand", "brand_group"):
        by_key = defaultdict(lambda: defaultdict(set))
        for sid, store in scoped.items():
            group = "全屋号" if dimension == "all" else store[dimension]
            by_key[group][store["area_code"]].add(sid)
        expected = {}
        for group, member_lists in by_key.items():
            groups = {band: (set(), set()) for _, band in BOUNDARIES}
            for code in eligible:
                ids = member_lists.get(code, set())
                band = next(b for maximum, b in BOUNDARIES if len(ids) <= maximum)
                groups[band][0].add(code)
                groups[band][1].update(ids)
            expected.update({(group, band): val for band, val in groups.items()})
        for row in files:
            if row["dimension"] != dimension:
                continue
            codes, ids = expected.pop((row["category"], row["store_count_band"]))
            require(int(row["area_count"]) == len(codes) and set(row["area_codes"].split()) == codes
                    and int(row["store_count"]) == len(ids) and set(row["store_ids"].split()) == ids,
                    f"{mode}: incorrect color bin {row['category']} / {row['store_count_band']}")
        require(not expected, f"{mode}: missing color bins: {dimension}")


def verify_artifacts(output):
    summary = load(output / "summary.json")
    require(summary["quality_status"] != "fail", "Structural check failure in summary.json")
    listing = rows(output / "audit/master-listing-ids.csv")
    require(len(listing) == len({r["store_id"] for r in listing}) and all(r["store_id"] for r in listing),
            "Master IDs missing or duplicated")
    require(dict(Counter(r["listing"] for r in listing)) == summary["master_listing_counts"], "Master listing counts")
    source_ids = {r["store_id"] for r in listing if r["listing"] == "通常掲載"}
    records = load(output / "stores.json")
    stores = {row["store_id"]: row for row in records}
    require(len(stores) == len(records) == summary["normal_stores"] and stores.keys() == source_ids,
            "Published store IDs differ from Excel listings")
    require(all(r.keys() == STORE_FIELDS for r in records), "Unexpected store schema, which must omit coordinates")
    require(all(r["brand"] and r["brand_group"] for r in records), "Missing brand or group")
    data = load(output / "municipalities.json")
    registry = {a["code"]: a for a in data["registry"]}
    coordinate_keys = {"lat", "lng", "lon", "latitude", "longitude", "coordinates", "geometry", "緯度", "経度"}
    require(not any(coordinate_keys & a.keys() for a in data["registry"]), "Coordinate fields in area registry")
    for sid, row in stores.items():
        ward = row["ward_area_code"]
        city = row["city_area_code"]
        require(all(isinstance(c, str) and re.fullmatch(r"[0-9]{5}", c) for c in (ward, city)),
                f"{sid}: missing or malformed area code")
        area = registry[ward]
        require(area["map_present"] and row["prefecture_code"] == ward[:2] == city[:2]
                and row["parent_city_code"] == area["parent_city_code"]
                and city == (area["parent_city_code"] or ward), f"{sid}: area code linkage")
    for mode in ("city", "ward"):
        areas = {r["code"]: r for r in data["levels"][mode]["areas"]}
        eligible = {c: r for c, r in areas.items() if r["status"] in {"zero", "has_stores"}}
        require(areas.keys() == registry.keys(), f"{mode}: missing registry entries")
        seen = []
        for code, area in areas.items():
            require(not (coordinate_keys & area.keys()), f"{mode}: coordinates in area data")
            ids = area["store_ids"]
            status = area["status"]
            if code in eligible:
                require(area["store_count"] == len(ids) and (bool(ids) == (status == "has_stores")),
                        f"{mode}: count/status mismatch for {code}")
                require(all(stores[sid][f"{mode}_area_code"] == code for sid in ids), f"{mode}: incorrect assignment")
                seen.extend(ids)
            else:
                require(area["store_count"] is None and not ids, f"{mode}: exception was counted as zero")
        require(len(seen) == len(stores) and set(seen) == stores.keys(), f"{mode}: duplicate or missing store IDs")
        verify_aggregate_files(output, mode, eligible, stores)
    pending = {k: row["value"] for k, row in summary["quality_checks"].items() if row["status"] == "pending"}
    require(sum(s["brand_status"] == "pending" for s in records) == pending.get("brand_pending", 0),
            "Pending brand records must be reported")
    require(sum(s["operator_status"] == "pending" for s in records) == pending.get("operator_pending", 0),
            "Pending operator records must be reported")
    return pending


def files_hashes(folder):
    result = {}
    for file in sorted(folder.rglob("*")):
        if file.is_file():
            with file.open("rb") as src:
                result[file.relative_to(folder)] = hashlib.file_digest(src, "sha256").hexdigest()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", required=True)
    parser.add_argument("--audit", required=True)
    parser.add_argument("--repo", type=Path, default=HERE.parents[2])
    parser.add_argument("--base", default=BASELINE, help="Git revision containing protected original files")
    parser.add_argument("--legacy")
    parser.add_argument("--expect")
    parser.add_argument("--output", type=Path, default=HERE / "generated")
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    verify_scope(args.repo, args.base)
    pending = verify_artifacts(args.output)
    with tempfile.TemporaryDirectory(prefix="aeon-rebuild-") as temp:
        cmd = [sys.executable, str(HERE / "build-data.py"), "--workbook", args.workbook,
               "--audit", args.audit, "--repo", str(args.repo), "--output", temp]
        for flag in ("legacy", "expect"):
            if getattr(args, flag):
                cmd.extend(["--" + flag, getattr(args, flag)])
        subprocess.run(cmd, check=True)
        snapshot, rebuild = files_hashes(args.output), files_hashes(Path(temp))
        require(snapshot == rebuild, f"Byte mismatch in {sorted(p for p in snapshot.keys() | rebuild.keys() if snapshot.get(p) != rebuild.get(p))}")
    print(f"Verified {len(snapshot)} generated files, ID membership, protected Git paths and byte reproducibility.")
    print("Pending:", json.dumps(pending, ensure_ascii=False))
    return 2 if args.strict and pending else 0


if __name__ == "__main__":
    raise SystemExit(main())
