#!/usr/bin/env python3
"""Static regression checks for Kussoon autonomous-bus subsidy article.

Usage:
    python3 tests/check_autonomous_bus_subsidies_layout.py

This checks the draft HTML only. It does not replace browser-based rendering
or HTTP link tests.
"""
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / "driving/autonomous-bus-subsidies/index.html"
EXPECTED_CHAPTERS = 8
EXPECTED_GROUPS = 6


class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.hash_links = []
        self.cards = 0
        self.groups = 0
        self.tables = 0
        self.headings = 0

    def handle_starttag(self, tag, attrs):
        props = dict(attrs)
        if props.get("id"):
            self.ids.append(props["id"])
        if props.get("href", "").startswith("#"):
            self.hash_links.append(props["href"][1:])
        classes = props.get("class", "").split()
        if tag == "div" and "vertical-records" in classes:
            self.groups += 1
        if tag == "section" and "vertical-record" in classes:
            self.cards += 1
        if tag == "table":
            self.tables += 1
        if tag == "h2":
            self.headings += 1


def main():
    raw = ARTICLE.read_text(encoding="utf-8")
    p = ArticleParser()
    p.feed(raw)
    p.close()
    chapter_count = len(re.findall(r"<h2>第[1-8]章", raw))
    assert chapter_count == EXPECTED_CHAPTERS, (
        f"Expected {EXPECTED_CHAPTERS} numbered chapters, got {chapter_count}"
    )
    assert p.groups == EXPECTED_GROUPS, f"Expected 6 vertical groups, got {p.groups}"
    assert p.tables == 0, "Do not reintroduce horizontally scrollable tables"
    assert p.cards >= 20, f"Unexpectedly few record cards: {p.cards}"
    assert len(set(p.ids)) == len(p.ids), "Duplicate HTML IDs found"
    assert not (set(p.hash_links) - set(p.ids)), (
        f"Broken internal anchors: {set(p.hash_links) - set(p.ids)}"
    )
    assert 'content="noindex,nofollow"' in raw, (
        "Draft must stay noindex until publication is explicitly approved"
    )
    assert 'href="archive/2026-11.html"' in raw, (
        "November research archive link missing"
    )
    assert ".vertical-records{display:grid" in raw, (
        "Vertical layout CSS missing"
    )
    for legacy in (".table-scroll", ".scroll-hint",
                   ".readable-mobile-cards", ".responsive-data-block"):
        assert legacy not in raw, f"Obsolete table CSS remains: {legacy}"
    print(f"PASS: {chapter_count} chapters, {p.groups} vertical groups, "
          f"{p.cards} record cards, 0 HTML tables, anchors OK, draft noindex OK")


if __name__ == "__main__":
    main()
