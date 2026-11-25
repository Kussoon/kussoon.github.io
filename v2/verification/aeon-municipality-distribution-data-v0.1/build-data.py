#!/usr/bin/env python3
"""Build coordinate-free distributions from the workbook and existing audits."""
import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import io
import json
from pathlib import Path
import zipfile

from openpyxl import load_workbook

from areas import address_code, load_areas, normalize_area_name, read_json
from classify import Brands

HERE = Path(__file__).resolve().parent
LEGACY_PATH = "v2/verification/aeon-national-map-v0.11/stores.json"
SHEETS = {
    "通常掲載店舗": "通常掲載",
    "参考・保留店舗": "参考・保留",
    "対象外": "対象外",
    "履歴・休業・予定": "履歴・休業・予定",
}
EXPECTED = {"通常掲載": 4613, "参考・保留": 75, "対象外": 26, "履歴・休業・予定": 14}
ID = "全国統合ID"
LEGACY_FIELDS = {
    "name": "表示用店舗名", "brand": "有効屋号", "operator": "実運営法人",
    "prefecture": "都道府県", "city": "市区町村", "address": "表示用住所",
}
BINS = [(0, "0"), (1, "1"), (2, "2"), (5, "3-5"), (9, "6-9"), (19, "10-19"),
        (49, "20-49"), (99, "50-99"), (float("inf"), "100+")]
UNKNOWN_OPERATOR = "運営会社未確認"
TARGET_NAMES = ["ダイエー国立店・イオンフードスタイル", "ダイエー南砂町スナモ店・イオンフードスタイル",
                "ダイエー小金井店・イオンフードスタイル", "ダイエー三軒茶屋店・イオンフードスタイル",
                "ダイエー高田店・イオンフードスタイル", "赤羽神谷店"]


def sha256(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def csv_rows(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def xlsx_rows(workbook, sheet, columns):
    source = iter(workbook[sheet].values)
    headers = next(source)
    indices = {field: headers.index(field) for field in columns}
    return [{field: row[i] for field, i in indices.items()} for row in source
            if any(row[i] is not None for i in indices.values())]


def unique_index(rows, field):
    index = {}
    for row in rows:
        key = row[field]
        if not key or key in index:
            raise ValueError(f"Missing or duplicate {field}: {key!r}")
        index[key] = row
    return index


def load_workbook_data(path):
    workbook = load_workbook(path, read_only=True, data_only=True)
    try:
        columns = {ID, *LEGACY_FIELDS.values(), "公式店舗名", "公式店舗URL", "住所根拠URL",
                   "基準日時点の住所", "全国調査基準日", "公開区分", "自治体コード"}
        all_rows = unique_index(xlsx_rows(workbook, "全国統合マスター", columns | {
            "現行公式名", "屋号", "屋号の根拠・由来", "運営法人確認状態", "運営法人根拠URL",
        }), ID)
        partitions = {status: xlsx_rows(workbook, sheet, columns if status == "通常掲載"
                                         else [ID, "公開区分"])
                      for sheet, status in SHEETS.items()}
        inherited = xlsx_rows(workbook, "未解決事項一覧", [ID, "項目", "理由", "根拠URL", "扱い"])
    finally:
        workbook.close()
    return all_rows, partitions, inherited


def load_n03_audit(path):
    columns = [ID, "都道府県", "市区町村", "基準日時点の住所", "N03期待自治体コード", "N03自治体コード照合"]
    def extract(stream):
        records = csv.DictReader(stream)
        # These are the expected address fields. Coordinate-based verdicts are omitted.
        return unique_index(({key: row[key] for key in columns} for row in records), ID)

    if path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as stream:
            return extract(stream)
    with zipfile.ZipFile(path) as archive:
        members = [name for name in archive.namelist() if Path(name).name.startswith("01-")
                   and name.lower().endswith(".csv")]
        if len(members) != 1:
            raise ValueError("Expected one full audit CSV prefixed with 01- in the audit ZIP")
        with archive.open(members[0]) as member:
            return extract(io.TextIOWrapper(member, encoding="utf-8-sig", newline=""))


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as out:
        if isinstance(data, list):
            out.write("[\n")
            out.write(",\n".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) for row in data))
            out.write("\n]\n")
        else:
            json.dump(data, out, ensure_ascii=False, indent=2)
            out.write("\n")


def write_csv(path, fields, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def legacy_differences(stores, legacy):
    rows = []
    for store_id in sorted(stores.keys() | legacy.keys()):
        if store_id not in stores or store_id not in legacy:
            rows.append({"store_id": store_id, "field": "id", "excel_value": store_id if store_id in stores else None,
                         "map_value": store_id if store_id in legacy else None, "status": "pending",
                         "reason": "片方の入力にのみ存在", "proposal": "掲載区分と地図用データの生成元を確認"})
            continue
        for key, col in LEGACY_FIELDS.items():
            excel, map_value = stores[store_id][col], legacy[store_id].get(key)
            if excel == map_value:
                continue
            # Preserve known disagreements and the exact values. Scope the render fallbacks to the original cases.
            if key == "brand" and excel is None and map_value == "カスミ":
                reason = "Excel有効屋号は空欄。既存JSONは表示名に含まれるカスミを付与"
                proposal = "元の空欄を保持し公式個店と名称を根拠に派生分類を提案"
                status = "documented"
            elif key == "operator" and excel is None and map_value == UNKNOWN_OPERATOR:
                reason = "Excel実運営法人は空欄。既存JSONは未確認ラベルで表示"
                proposal = "会社実名は保留し集計に未確認枠を残す"
                status = "documented"
            else:
                reason = "Excel通常掲載シートと既存JSONの値が異なる"
                proposal = "更新日と元資料の監査履歴をID別に確認"
                status = "pending"
            rows.append({"store_id": store_id, "field": key, "excel_value": excel, "map_value": map_value,
                         "status": status, "reason": reason, "proposal": proposal})
    return rows


def serialize_ids(rows):
    return [dict(row, store_ids=" ".join(row["store_ids"])) for row in rows]


def member_rows(stores, fields):
    grouped = defaultdict(list)
    for store in stores:
        grouped[tuple(store[field] or "" for field in fields)].append(store["store_id"])
    return [dict(zip(fields, key), store_count=len(ids), store_ids=sorted(ids))
            for key, ids in sorted(grouped.items())]


def bins_for(areas, stores, axis):
    candidates = sorted({store[axis] for store in stores}) if axis else ["全屋号"]
    members = defaultdict(lambda: defaultdict(list))
    for store in stores:
        group = store[axis] if axis else "全屋号"
        members[group][store["area_code"]].append(store["store_id"])
    rows = []
    for group in candidates:
        bins = {label: ([], []) for _, label in BINS}
        for area in areas:
            if area["status"] not in {"zero", "has_stores"}:
                continue
            ids = members[group][area["code"]]
            label = next(label for max_count, label in BINS if len(ids) <= max_count)
            bins[label][0].append(area["code"])
            bins[label][1].extend(ids)
        rows.extend({"dimension": axis or "all", "category": group, "store_count_band": label,
                     "area_count": len(codes), "area_codes": " ".join(codes),
                     "store_count": len(ids), "store_ids": sorted(ids)}
                    for label, (codes, ids) in bins.items())
    return rows


def write_rollup(output, mode, stores, areas, uncertainty):
    target = output / mode
    code_key = "city_area_code" if mode == "city" else "ward_area_code"
    rows = [dict(store, area_code=store[code_key]) for store in stores]
    members = {row["area_code"]: row["store_ids"] for row in member_rows(rows, ["area_code"])}
    mode_records = []
    for code, area in areas.items():
        parent = area["parent_city_code"]
        ids = members.get(code, [])
        status, reason = area["scope_status"], area["scope_reason"]
        if (mode == "city" and parent) or (mode == "ward" and area["kind"] == "designatedCity"):
            status, reason = "other_level", "別の集計単位で計上"
        elif status == "eligible":
            if ids:
                status = "has_stores"
            elif code in uncertainty or "*" in uncertainty:
                status, reason = "unconfirmed", "未解決の店舗割り当てがあるため0件を確定できない"
            else:
                status = "zero"
        mode_records.append({
            "code": code, "name": area["name"], "prefecture_code": area["prefecture_code"],
            "status": status, "reason": reason,
            "store_count": len(ids) if status in {"zero", "has_stores"} else None,
            "store_ids": ids,
        })

    area_fields = ["code", "name", "prefecture_code", "status", "reason", "store_count", "store_ids"]
    included = [r for r in mode_records if r["status"] in {"has_stores", "zero"}]
    positive = [r for r in mode_records if r["status"] == "has_stores"]
    zero = [r for r in mode_records if r["status"] == "zero"]
    excluded = [r for r in mode_records if r["status"] not in {"has_stores", "zero"}]
    for name, records in [("municipalities", mode_records), ("with-stores", positive),
                          ("zero-stores", zero), ("area-exceptions", excluded)]:
        write_csv(target / f"{name}.csv", area_fields, serialize_ids(records))

    ranking = []
    for i, row in enumerate(sorted(positive, key=lambda r: (-r["store_count"], r["code"])), 1):
        if not ranking or row["store_count"] != ranking[-1]["store_count"]:
            rank = i
        ranking.append(dict(row, rank=rank))
    write_csv(target / "ranking.csv", ["rank", *area_fields], serialize_ids(ranking))

    dimensions = {
        "prefectures": ["prefecture_code", "prefecture"], "brands": ["brand"],
        "brand-groups": ["brand_group"], "operators": ["operator"],
        "area-brands": ["area_code", "brand"], "area-operators": ["area_code", "operator"],
    }
    sums = {}
    for name, fields in dimensions.items():
        grouped = member_rows(rows, fields)
        flattened = [sid for row in grouped for sid in row["store_ids"]]
        sums[name] = {"count": len(flattened), "exact_ids": sorted(flattened) == sorted(s["store_id"] for s in stores)}
        write_csv(target / f"{name}.csv", [*fields, "store_count", "store_ids"], serialize_ids(grouped))

    freq = defaultdict(list)
    for row in included:
        freq[row["store_count"]].append(row)
    frequencies = []
    for n, group in sorted(freq.items()):
        ids = sorted(sid for area in group for sid in area["store_ids"])
        frequencies.append({"stores_per_area": n, "area_count": len(group),
                            "area_codes": " ".join(r["code"] for r in group), "store_ids": ids})
    write_csv(target / "frequency.csv", ["stores_per_area", "area_count", "area_codes", "store_ids"],
              serialize_ids(frequencies))

    color_bins = [row for axis in (None, "brand_group", "brand") for row in bins_for(mode_records, rows, axis)]
    write_csv(target / "color-bins.csv", ["dimension", "category", "store_count_band", "area_count",
                                        "area_codes", "store_count", "store_ids"], serialize_ids(color_bins))
    return mode_records, sums, color_bins


def build(args):
    inputs = {"workbook": args.workbook, "legacy_json": args.legacy, "address_audit": args.audit}
    digests = {label: sha256(path) for label, path in inputs.items()}
    area_scope = unique_index(csv_rows(HERE / "area-scope.csv"), "code")
    name_overrides = {(r["code"], r["source_name"]): r["display_name"]
                      for r in csv_rows(HERE / "municipality-overrides.csv")}
    areas, area_stats = load_areas(args.repo, area_scope, name_overrides)
    master, partitions, inherited = load_workbook_data(args.workbook)
    normal = unique_index(partitions["通常掲載"], ID)
    legacy = unique_index(read_json(args.legacy), "id")
    n03 = load_n03_audit(args.audit)
    overrides = unique_index(csv_rows(HERE / "brand-overrides.csv"), "store_id")
    brands = Brands(read_json(HERE / "brand-rules.json"), overrides)
    diff_rows = legacy_differences(normal, legacy)
    checks = {}

    def check(key, ok, value):
        checks[key] = {"status": "pass" if ok else "fail", "value": value}

    def review(key, count):
        checks[key] = {"status": "pending" if count else "pass", "value": count}

    partition_ids = [row[ID] for records in partitions.values() for row in records]
    counts = Counter(row["公開区分"] for row in master.values())
    expected = read_json(args.expect) if args.expect else EXPECTED
    check("master_listing_counts", counts == expected, dict(counts))
    split_differences = sorted(master.keys() ^ set(partition_ids))
    bad_partition = sorted(row[ID] for status, records in partitions.items() for row in records
                           if row["公開区分"] != status
                           or master.get(row[ID], {}).get("公開区分") != status)
    check("workbook_partitions", not split_differences and not bad_partition
          and len(partition_ids) == len(set(partition_ids)), {
              "count": len(partition_ids), "id_differences": split_differences, "wrong_status": bad_partition,
              "duplicates": len(partition_ids) - len(set(partition_ids)),
          })
    check("normal_count", len(normal) == expected["通常掲載"], len(normal))
    absence = sum(not row[ID] for records in partitions.values() for row in records)
    check("workbook_missing_ids", absence == 0, absence)
    check("workbook_duplicate_ids", len(partition_ids) == len(set(partition_ids)),
          len(partition_ids) - len(set(partition_ids)))
    check("normal_and_map_id_set", normal.keys() == legacy.keys(), len(normal.keys() ^ legacy.keys()))
    check("normal_and_pr761_id_set", normal.keys() == n03.keys(), len(normal.keys() ^ n03.keys()))
    check("unused_brand_overrides", overrides.keys() <= normal.keys(), sorted(overrides.keys() - normal.keys()))
    workbook_diff = [{"store_id": sid, "field": field, "master_value": master[sid][field],
                      "normal_value": value}
                     for sid, row in sorted(normal.items()) if sid in master
                     for field, value in sorted(row.items()) if value != master[sid][field]]
    check("workbook_normal_fields", not workbook_diff, len(workbook_diff))
    review("unexplained_legacy_field_differences", sum(r["status"] == "pending" for r in diff_rows))
    review("unconfirmed_office_names", len(area_stats["office_name_unconfirmed_codes"]))

    stores, area_audit, brand_audit, followup = [], [], [], []
    ward_uncertainty, city_uncertainty = set(), set()
    for sid, row in sorted(normal.items()):
        source_code = row["自治体コード"]
        code = address_code(source_code)
        label = areas.get(code)
        source_name = row["市区町村"]
        normalized_name = normalize_area_name(code, source_name or "", name_overrides)
        evidence = n03.get(sid, {})
        evidence_matches = (bool(code) and evidence.get("N03期待自治体コード") == code
                            and evidence.get("N03自治体コード照合") == "台帳自治体名・コード一致"
                            and all((row[k] or "") == evidence.get(k) for k in
                                    ["都道府県", "市区町村", "基準日時点の住所"]))
        participates = label and label["map_present"] and label["scope_status"] == "eligible"
        name_agrees = bool(label and normalized_name == label["name"])
        assigned = bool(participates and evidence_matches and name_agrees)
        city_code = (label["parent_city_code"] or code) if label else None
        area_audit.append({
            "store_id": sid, "workbook_address_code": source_code, "derived_n03_code": code,
            "pr761_code": evidence.get("N03期待自治体コード"), "source_name": source_name,
            "normalized_name": normalized_name, "map_name": label["name"] if label else None,
            "parent_city_code": label["parent_city_code"] if label else None,
            "name_override": (code, source_name) in name_overrides,
            "pr761_address_match": evidence_matches, "active_map_code_match": bool(label and label["map_present"]),
            "map_name_match": name_agrees, "status": "verified" if assigned else "pending",
        })

        if not assigned:
            ward_uncertainty.add(code if participates else "*")
            city_uncertainty.add(city_code if participates else "*")
            followup.append({
                "store_id": sid, "name": row["表示用店舗名"], "axis": "area", "status": "pending",
                "reason": "Excel住所の行政項目・PR #761・現行地図の照合を確認",
                "official_url": row["公式店舗URL"], "evidence_url": row["住所根拠URL"],
            })
        record = master.get(sid, {})
        old_map_brand = legacy.get(sid, {}).get("brand")
        classification = brands.classify(row, record, old_map_brand)
        name = row["表示用店舗名"]
        operator = row["実運営法人"]
        if classification["brand_status"] == "pending" or name in TARGET_NAMES or sid in overrides:
            followup.append({
                "store_id": sid, "name": name, "axis": "brand", "status": classification["brand_status"],
                "reason": classification["brand_basis"], "official_url": row["公式店舗URL"],
                "evidence_url": classification["brand_evidence_url"],
            })
        if not operator:
            followup.append({
                "store_id": sid, "name": name, "axis": "operator", "status": "pending",
                "reason": (record.get("運営法人確認状態") or "実運営法人の欄が空欄")
                          + " 基準日時点の営業主体の法人名を公式会社情報等で確認",
                "official_url": row["公式店舗URL"], "evidence_url": record.get("運営法人根拠URL"),
            })

        stores.append({
            "store_id": sid, "name": name, "prefecture": row["都道府県"],
            "prefecture_code": code[:2] if code else None, "source_municipality_name": source_name,
            "ward_area_code": code if assigned else None, "city_area_code": city_code if assigned else None,
            "parent_city_code": label["parent_city_code"] if assigned else None,
            "municipality_status": "verified" if assigned else "pending",
            "original_brand": row["有効屋号"], "original_raw_brand": record.get("屋号"),
            "legacy_map_brand": old_map_brand, "operator": operator or UNKNOWN_OPERATOR,
            "operator_status": "ledger" if operator else "pending",
            **{k: v for k, v in classification.items() if k != "name_brand_signals"},
        })
        brand_audit.append({
            "store_id": sid, "name": name, "official_name": row["公式店舗名"],
            "current_official_name": record.get("現行公式名"), "original_brand": row["有効屋号"],
            "legacy_map_brand": old_map_brand, "brand": classification["brand"],
            "brand_group": classification["brand_group"], "brand_status": classification["brand_status"],
            "brand_rule_id": classification["brand_rule_id"], "brand_basis": classification["brand_basis"],
            "master_brand_basis": classification["master_brand_basis"],
            "brand_evidence_url": classification["brand_evidence_url"],
            **{k: v for k, v in classification["name_brand_signals"].items()},
        })

    # The workbook can contain the same outstanding item in multiple sections.
    addresses = {}
    for entry in inherited:
        sid = entry[ID]
        if sid in normal and "保留" in (entry["扱い"] or ""):
            key = (sid, entry["項目"], entry["理由"], entry["根拠URL"])
            addresses[key] = {
                "store_id": sid, "name": normal[sid]["表示用店舗名"], "axis": "inherited_address",
                "status": "pending", "reason": f"{entry['項目']}の台帳保留を継承。{entry['理由']}",
                "official_url": normal[sid]["公式店舗URL"], "evidence_url": entry["根拠URL"],
            }
    followup.extend(addresses.values())
    followup.sort(key=lambda r: (r["store_id"], r["axis"], r["reason"]))
    missing_area = sum(s["municipality_status"] != "verified" for s in stores)
    check("unassigned_municipality_codes", missing_area == 0, missing_area)
    pr761_differences = sum(not r["pr761_address_match"] for r in area_audit)
    check("pr761_address_code_differences", pr761_differences == 0, pr761_differences)
    map_differences = sum(not r["active_map_code_match"] for r in area_audit)
    check("active_map_code_differences", map_differences == 0, map_differences)
    missing_brands = sum(not s["brand"] for s in stores)
    missing_groups = sum(not s["brand_group"] for s in stores)
    check("unassigned_brand_labels", not missing_brands, missing_brands)
    check("unassigned_brand_group_labels", not missing_groups, missing_groups)
    brand_pending = sum(row["brand_status"] == "pending" for row in stores)
    review("brand_pending", brand_pending)
    operator_pending = sum(row["operator_status"] == "pending" for row in stores)
    review("operator_pending", operator_pending)
    review("inherited_address_details_pending", len(addresses))
    review("boundary_assignment_unconfirmed", sum(area["scope_status"] == "unconfirmed" for area in areas.values()))
    review("brand_change_candidates", sum(row["brand_status"] == "candidate" for row in stores))

    out = args.output
    write_json(out / "stores.json", stores)
    modes = {}
    for mode, uncertainty in [("city", city_uncertainty), ("ward", ward_uncertainty)]:
        records, sums, color_bins = write_rollup(out, mode, stores, areas, uncertainty)
        statuses = Counter(r["status"] for r in records)
        modes[mode] = {"areas": records, "counts": dict(statuses)}
        flattened = [sid for r in records if r["status"] == "has_stores" for sid in r["store_ids"]]
        check(f"{mode}_municipality_id_partition_no_double_count",
              len(flattened) == len(set(flattened)) and set(flattened) == normal.keys(),
              {"listed": len(flattened), "duplicate_assignments": len(flattened) - len(set(flattened)),
               "missing_ids": sorted(normal.keys() - set(flattened))})
        check(f"{mode}_all_dimension_id_totals", all(row["exact_ids"] for row in sums.values()), sums)
        check(f"{mode}_zero_and_unknown_separated",
              all((r["store_count"] == 0 and not r["store_ids"]) if r["status"] == "zero"
                  else r["store_count"] is None for r in records if r["status"] != "has_stores"),
              dict(statuses))
        partition_sizes = Counter()
        for r in color_bins:
            partition_sizes[r["dimension"], r["category"]] += r["area_count"]
        denominator = statuses["has_stores"] + statuses["zero"]
        check(f"{mode}_color_band_denominators", all(n == denominator for n in partition_sizes.values()),
              {"denominator": denominator, "categories": len(partition_sizes)})
    write_json(out / "municipalities.json", {"registry": list(areas.values()), "levels": modes})
    area_fields = ["code", "prefecture_code", "name", "kind", "parent_city_code", "scope_status",
                   "scope_reason", "map_name", "office_name", "polygon_parts", "map_present", "office_present",
                   "office_name_agrees", "plate_region_status", "plate_join_status"]
    write_csv(out / "area-register.csv", area_fields, areas.values())
    check("all_store_total_city_vs_ward",
          sum(r["store_count"] or 0 for r in modes["city"]["areas"])
          == sum(r["store_count"] or 0 for r in modes["ward"]["areas"]) == len(stores), len(stores))

    audits = out / "audit"
    write_csv(audits / "master-listing-ids.csv", ["store_id", "listing"], [
        {"store_id": sid, "listing": row["公開区分"]} for sid, row in sorted(master.items())
    ])
    write_csv(audits / "master-sheet-differences.csv",
              ["store_id", "field", "master_value", "normal_value"], workbook_diff)
    write_csv(audits / "existing-map-differences.csv",
              ["store_id", "field", "excel_value", "map_value", "status", "reason", "proposal"], diff_rows)
    write_csv(audits / "municipality-verification.csv", list(area_audit[0]), area_audit)
    if not areas["22138"]["parent_city_code"] == areas["22139"]["parent_city_code"] == "22130":
        raise ValueError("Hamamatsu's post-reorganization parent linkage changed")
    write_csv(audits / "brand-verification.csv", list(brand_audit[0]), brand_audit)
    changed_rows = [r for r in brand_audit if r["brand_status"] != "retained"]
    write_csv(audits / "brand-change-candidates.csv", list(brand_audit[0]), changed_rows)
    mapping = defaultdict(list)
    for s in stores:
        key = (s["legacy_map_brand"] or "", s["original_brand"] or "", s["brand"], s["brand_group"], s["brand_status"])
        mapping[key].append(s["store_id"])
    mapping_fields = ["legacy_map_brand", "original_brand", "brand", "brand_group", "brand_status"]
    mapping_rows = [dict(zip(mapping_fields, key), store_count=len(ids), store_ids=ids)
                    for key, ids in sorted(mapping.items())]
    write_csv(audits / "brand-crosswalk.csv", [*mapping_fields, "store_count", "store_ids"],
              serialize_ids(mapping_rows))
    write_csv(audits / "individual-followup.csv",
              ["store_id", "name", "axis", "status", "reason", "official_url", "evidence_url"], followup)
    check("original_inputs_unchanged", digests == {k: sha256(path) for k, path in inputs.items()}, digests)
    summary = {
        "schema_version": "0.1", "inputs_sha256": digests,
        "store_baseline_dates": sorted({str(row["全国調査基準日"]) for row in normal.values()}),
        "master_total": len(master), "master_listing_counts": dict(sorted(counts.items())),
        "normal_stores": len(stores), "existing_map_brand_count": len({r["brand"] for r in legacy.values()}),
        "brand_count_excluding_pending": len({s["brand"] for s in stores if s["brand_status"] != "pending"}),
        "brand_group_count_excluding_pending": len({s["brand_group"] for s in stores if s["brand_status"] != "pending"}),
        "brand_status_counts": dict(sorted(Counter(s["brand_status"] for s in stores).items())),
        "brand_labels_changed_from_legacy": sum(s["brand"] != s["legacy_map_brand"] for s in stores),
        "existing_map_field_differences": dict(sorted(Counter(r["field"] for r in diff_rows).items())),
        "operator_count_excluding_pending": len({s["operator"] for s in stores if s["operator_status"] != "pending"}),
        "operator_pending": operator_pending, "area_sources": area_stats,
        "levels": {mode: levels["counts"] for mode, levels in modes.items()},
        "followup_counts": dict(sorted(Counter(r["axis"] for r in followup).items())),
        "followup_unique_stores": len({r["store_id"] for r in followup}),
        "preliminary_comparison": {
            "assigned_wards": {"preliminary": 4613, "actual": len(stores) - missing_area},
            "cities_with_stores": {"preliminary": 776, "actual": modes["city"]["counts"].get("has_stores", 0)},
            "wards_with_stores": {"preliminary": 916, "actual": modes["ward"]["counts"].get("has_stores", 0)},
            "brand_candidates": {"preliminary": 473, "actual": sum(s["brand_status"] == "candidate" for s in stores)},
            "brand_count_excluding_pending": {"preliminary": 42,
                                             "actual": len({s["brand"] for s in stores if s["brand_status"] != "pending"})},
        },
        "quality_status": "fail" if any(r["status"] == "fail" for r in checks.values()) else
                          "pending" if any(r["status"] == "pending" for r in checks.values()) else "pass",
        "quality_checks": checks,
    }
    write_json(out / "summary.json", summary)
    return summary


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, required=True)
    parser.add_argument("--audit", type=Path, required=True, help="PR #761 ZIP or a full audit CSV with its address fields")
    parser.add_argument("--repo", type=Path, default=HERE.parents[2])
    parser.add_argument("--legacy", type=Path, help="Previous map stores.json")
    parser.add_argument("--output", type=Path, default=HERE / "generated")
    parser.add_argument("--expect", type=Path, help="JSON with four expected listing category counts for a new edition")
    parser.add_argument("--strict", action="store_true", help="Exit 2 for pending checks")
    args = parser.parse_args()
    args.legacy = args.legacy or args.repo / LEGACY_PATH
    return args


if __name__ == "__main__":
    options = arguments()
    result = build(options)
    print(f"{result['normal_stores']} stores. Quality: {result['quality_status']}. {options.output}")
    raise SystemExit(1 if result["quality_status"] == "fail"
                     else 2 if options.strict and result["quality_status"] == "pending" else 0)
