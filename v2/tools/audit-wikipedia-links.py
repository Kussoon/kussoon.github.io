#!/usr/bin/env python3
"""Build the nationwide Wikipedia audit from current office JSON and Wikidata.

Uses Japanese local-government code (Wikidata P429) as the identity crosswalk,
then verifies the Japanese Wikipedia page's Wikidata item via the MediaWiki API.
The generated CSV is a dated audit record; it is not a runtime dependency.
"""
from __future__ import annotations

import csv
import glob
import hashlib
import json
import os
import re
import time
import urllib.parse
import urllib.request
import urllib.error
from collections import defaultdict
from datetime import date

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA_DIR = os.path.join(ROOT, "v2/data/offices")
OUT = os.path.join(ROOT, "v2/audit/wikipedia-links-2026-11-13.csv")
USER_AGENT = "KussoonWikipediaLinkAudit/1.0 (https://kussoon.com/)"
PREFECTURE_NAMES = dict(zip(
    [f"{i:02d}" for i in range(1, 48)],
    "北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県".split(),
))


def get_json(url: str, accept: str = "application/json") -> dict:
    for attempt in range(3):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": accept})
        try:
            with urllib.request.urlopen(req, timeout=90) as response:
                return json.load(response)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError("unreachable")


def wikipedia_title(url: str | None) -> str | None:
    if not url:
        return None
    parsed = urllib.parse.urlparse(url)
    if parsed.netloc.lower() != "ja.wikipedia.org" or not parsed.path.startswith("/wiki/"):
        return None
    return urllib.parse.unquote(parsed.path[len("/wiki/"):]).replace("_", " ")


def sparql_entities() -> dict[str, list[dict]]:
    query = '''SELECT ?code ?item ?label ?description ?article WHERE {
      ?item wdt:P429 ?code; rdfs:label ?label . FILTER(LANG(?label)="ja")
      OPTIONAL { ?item schema:description ?description . FILTER(LANG(?description)="ja") }
      OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://ja.wikipedia.org/> . }
    }'''
    url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": query, "format": "json"})
    rows = get_json(url, "application/sparql-results+json")["results"]["bindings"]
    by_code: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        code = row["code"]["value"]
        by_code[code[:5]].append({
            "dantai_code": code,
            "qid": row["item"]["value"].rsplit("/", 1)[-1],
            "label": row["label"]["value"],
            "description": row.get("description", {}).get("value", ""),
            "article_url": row.get("article", {}).get("value", ""),
        })
    return by_code


def page_info(titles: list[str]) -> dict[str, dict]:
    """Fetch existing pages, redirects, Wikidata sitelink item and intro extracts."""
    result: dict[str, dict] = {}
    titles = list(dict.fromkeys(t for t in titles if t))
    # The Extracts module omits extracts beyond its 20-item default limit even
    # when more titles are present, so keep every request within that limit.
    for offset in range(0, len(titles), 20):
        batch = titles[offset:offset + 20]
        params = {
            "action": "query", "format": "json", "formatversion": "2",
            "titles": "|".join(batch), "redirects": "1",
            "prop": "pageprops|extracts", "ppprop": "wikibase_item",
            "exintro": "1", "explaintext": "1", "exchars": "900",
        }
        url = "https://ja.wikipedia.org/w/api.php?" + urllib.parse.urlencode(params)
        data = get_json(url)
        print(f"Wikipedia API pages {min(offset + len(batch), len(titles))}/{len(titles)}", flush=True)
        normalized = {x["from"]: x["to"] for x in data.get("query", {}).get("normalized", [])}
        redirects = {x["from"]: x["to"] for x in data.get("query", {}).get("redirects", [])}
        pages = data.get("query", {}).get("pages", [])
        for page in pages:
            if page.get("missing"):
                continue
            result[page["title"]] = {
                "page_id": str(page.get("pageid", "")),
                "qid": page.get("pageprops", {}).get("wikibase_item", ""),
                "extract": page.get("extract", "").replace("\n", " ").strip(),
                "redirect_target": "",
            }
        for original in batch:
            target = normalized.get(original, original)
            target = redirects.get(target, target)
            if original != target and target in result:
                result[original] = dict(result[target], redirect_target=target)
    return result


def non_wikipedia_hash(region: dict) -> str:
    value = {key: val for key, val in region.items() if key != "wikipedia"}
    canonical = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def main() -> None:
    entities = sparql_entities()
    records = []
    for file in sorted(glob.glob(os.path.join(DATA_DIR, "[0-9][0-9].json"))):
        pref = os.path.basename(file)[:2]
        data = json.load(open(file, encoding="utf-8"))
        for code, region in data["regions"].items():
            records.append({"prefecture_code": pref, "code": code, "region": region,
                            "current_url": region.get("wikipedia", "")})

    chosen = {}
    pre_status = {}
    for row in records:
        code, region = row["code"], row["region"]
        matches = entities.get(code, [])
        if len(matches) == 1:
            chosen[code] = matches[0]
            pre_status[code] = "matched"
        elif len(matches) > 1:
            # A shared/mistaken P429 value occurs in Wikidata for a cultural
            # facility and the municipality. Resolve only by the exact JP label.
            exact = [item for item in matches if item["label"] == region["name"]]
            if len(exact) == 1:
                chosen[code] = exact[0]
                pre_status[code] = "matched_unique_name"
            else:
                pre_status[code] = "multiple_code_matches"
        else:
            pre_status[code] = "no_wikidata_code_match"

    titles = []
    for row in records:
        entity = chosen.get(row["code"])
        if entity and entity["article_url"]:
            title = wikipedia_title(entity["article_url"])
            entity["title"] = title
            titles.append(title)
        else:
            entity = entity or {}
        old_title = wikipedia_title(row["current_url"])
        if old_title:
            titles.append(old_title)

    pages = page_info(titles)
    columns = ["prefecture_code", "prefecture", "municipality_code", "municipality_name",
               "municipality_type", "current_wikipedia_url", "current_page_title",
               "current_page_id", "current_page_wikidata_item", "current_page_intro_excerpt",
               "wikidata_item", "matched_dantai_code", "wikidata_japanese_label",
               "wikidata_japanese_description", "candidate_wikipedia_url", "candidate_page_title",
               "verified_page_title", "verified_page_id", "verified_page_wikidata_item",
               "article_intro_excerpt", "verdict", "reason", "evidence_source",
               "confirmed_date", "region_non_wikipedia_sha256"]
    audit_rows = []
    diffs = []
    for row in records:
        code, reg = row["code"], row["region"]
        current = row["current_url"]
        current_title = wikipedia_title(current)
        ent = chosen.get(code, {})
        candidate = ent.get("article_url", "")
        candidate_title = ent.get("title", "")
        target = pages.get(candidate_title, {}) if candidate_title else {}
        current_page = pages.get(current_title, {}) if current_title else {}
        verdict = "E"
        reason = "記事対応の確認に追加調査が必要"
        replacement = current
        if pre_status.get(code) == "multiple_code_matches" or pre_status.get(code) == "no_wikidata_code_match":
            reason = "自治体コードに対応するWikidata項目を一意に特定できない"
        elif not ent.get("article_url"):
            verdict, reason = "D", "自治体コードに対応する日本語版Wikipedia記事がWikidataで確認できない"
        elif not target:
            reason = "Wikipedia APIで候補記事を取得できず、通信/一時エラーとの区別が未完了"
        elif target.get("qid") != ent.get("qid"):
            reason = "候補記事のpageprops Wikidata項目が自治体コード照合先と一致しない"
        else:
            excerpt = target.get("extract", "")
            # All identity evidence is code-based: the QID carries P429 and
            # the Japanese Wikipedia page independently carries the same QID.
            # Human-readable names and descriptions are included for review.
            is_direct = bool(current_title)
            current_matches = is_direct and current_page.get("qid") == ent.get("qid")
            if current_matches:
                verdict = "A"
                reason = "現行の直接リンク先（リダイレクト解決後）が自治体コード一致のWikidata項目と一致"
            elif is_direct:
                verdict = "C"
                reason = "現行直接リンク先が自治体コード照合先と異なる記事。正しい記事を特定"
                replacement = candidate
            else:
                verdict = "B"
                reason = "現行URLはWikipedia検索。自治体コードから正しい記事を特定し直接リンク化"
                replacement = candidate
            if not excerpt:
                reason += "（Wikipedia APIの一括取得では冒頭文なし。ページ項目IDの一致を確認）"
        if verdict in ("B", "C") and replacement != current:
            diffs.append({"municipality_code": code, "municipality_name": reg["name"],
                          "before_url": current, "after_url": replacement, "reason": reason})
        page_title = (current_page.get("redirect_target") or current_title or "")
        final_title = target.get("redirect_target") or candidate_title
        audit_rows.append({
            "prefecture_code": row["prefecture_code"], "prefecture": "",
            "municipality_code": code, "municipality_name": reg["name"],
            "municipality_type": reg.get("kind", ""), "current_wikipedia_url": current,
            "current_page_title": page_title, "wikidata_item": ent.get("qid", ""),
            "current_page_id": current_page.get("page_id", ""),
            "current_page_wikidata_item": current_page.get("qid", ""),
            "current_page_intro_excerpt": current_page.get("extract", ""),
            "matched_dantai_code": ent.get("dantai_code", ""),
            "wikidata_japanese_label": ent.get("label", ""),
            "wikidata_japanese_description": ent.get("description", ""),
            "candidate_wikipedia_url": candidate, "candidate_page_title": candidate_title,
            "verified_page_title": final_title if target else "",
            "verified_page_id": target.get("page_id", ""),
            "verified_page_wikidata_item": target.get("qid", ""),
            "article_intro_excerpt": target.get("extract", ""),
            "verdict": verdict, "reason": reason,
            "evidence_source": "Wikidata P429 prefix+Japanese sitelink; ja.wikipedia.org API pageprops+intro",
            "confirmed_date": date.today().isoformat(),
            "region_non_wikipedia_sha256": non_wikipedia_hash(reg),
            "_replacement": replacement,
        })

    # Fill prefecture names from the data blobs.
    for audit in audit_rows:
        audit["prefecture"] = PREFECTURE_NAMES[audit["prefecture_code"]]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        for audit in audit_rows:
            writer.writerow({key: audit[key] for key in columns})
    diff_path = os.path.join(ROOT, "v2/audit/wikipedia-link-changes-2026-11-13.csv")
    with open(diff_path, "w", newline="", encoding="utf-8-sig") as f:
        diff_columns = ["municipality_code", "municipality_name", "before_url", "after_url", "reason"]
        writer = csv.DictWriter(f, fieldnames=diff_columns)
        writer.writeheader()
        writer.writerows(diffs)

    # Only fields explicitly recorded as B/C may change; A and D/E remain untouched.
    file_by_code = {}
    data_by_file = {}
    for file in glob.glob(os.path.join(DATA_DIR, "[0-9][0-9].json")):
        prefdata = json.load(open(file, encoding="utf-8"))
        data_by_file[file] = prefdata
        for c, region in prefdata["regions"].items():
            file_by_code[c] = (file, prefdata, region)
    for audit in audit_rows:
        if audit["verdict"] in ("B", "C"):
            _, prefdata, region = file_by_code[audit["municipality_code"]]
            region["wikipedia"] = audit["_replacement"]
    for file, prefdata in sorted(data_by_file.items()):
        with open(file, "w", encoding="utf-8") as f:
            json.dump(prefdata, f, ensure_ascii=False, indent=2)
            f.write("\n")
    print(json.dumps({"regions": len(audit_rows), "verdicts": {v: sum(a["verdict"] == v for a in audit_rows) for v in "ABCDE"},
                      "changed_links": len(diffs), "audit_csv": os.path.relpath(OUT, ROOT),
                      "change_csv": os.path.relpath(diff_path, ROOT)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
