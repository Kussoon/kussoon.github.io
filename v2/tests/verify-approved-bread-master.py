#!/usr/bin/env python3
"""Verify staged official bread master and coordinated production HTML release."""
import collections, csv, hashlib, json, pathlib, re, zipfile, xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "data/bread"
HTML = ROOT / "maps/unified-bread-map.html"
PREVIEW = ROOT / "v2/verification/bread-integration/20261111/index.html"
EXPECTED_NINE = [17,97,107,111,112,113,114,207,209]
N = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

def read(s):
    return json.loads(re.search(r'<script id="bread-data" type="application/json">([\s\S]*?)</script>',s)[1])

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def cell_values(z, path):
    strings = ["".join(t.itertext()) for t in ET.fromstring(z.read("xl/sharedStrings.xml"))]
    result={}
    for c in ET.fromstring(z.read(path)).iter(N+"c"):
        v=c.find(N+"v")
        value=v.text if v is not None else ""
        if c.get("t")=="s": value=strings[int(value)]
        elif c.get("t")=="inlineStr": value="".join(t.text or "" for t in c.iter(N+"t"))
        result[c.attrib["r"]]=value
    return result

def main():
    m=json.loads((DATA/"manifest.json").read_text())
    a=m["approved_master"]
    book=DATA/a["path"]
    view=DATA/m["review_csv"]["path"]
    assert book.is_file() and view.is_file()
    assert sha(book)=="2014e2238565bdb9d3b0666bad168c2a31552200feceb5c025bcaab2bd237521"==a["sha256"]
    assert sha(view)=="2bb6dc73fd7eac2af71b80ff4823182b9a12134aed67d9534a8883a51ed63af7"==m["review_csv"]["sha256"]
    assert a["version"]=="1.4.5" and a["record_count"]==263 and a["public_count"]==262
    assert a["adopted_coordinate_changes"]==EXPECTED_NINE
    assert a["adoption_status"]=="approved_on_release_merge"
    assert m["html_release"]["version"]=="1.3.13"
    assert m["html_release"]["release_atomically_with_master"] is True

    html=HTML.read_text()
    preview=PREVIEW.read_text()
    assert "noindex" not in html and "（検証版）" not in html
    assert "Version 1.3.13" in html and "2026年11月11日" in html
    assert "animate:false,maxClusterRadius:36" in html
    assert "function')$('map').parentElement.append(safeText('p'," in html
    assert '<script defer src="/common/footer-links.js"></script>' in html
    assert "cloud.umami.is/script.js" in html

    expected=preview.replace('<meta name="robots" content="noindex,nofollow,noarchive">\n',"").replace("Version 1.3.13（検証版）","Version 1.3.13").replace("2026年11月11日（座標データ更新）","2026年11月11日（データ更新）").replace('<p class="bread-footer-version">Version 1.3.13（検証版）</p>','<p class="bread-footer-version">Version 1.3.13</p>')
    assert html==expected, "Production HTML contains an unreviewed difference against Safari-tested preview"

    stores=read(html)
    assert len(stores)==263
    assert len({r["No."] for r in stores})==263
    assert len({r["unified_key"] for r in stores})==263
    assert collections.Counter(r["status"] for r in stores)=={"通常掲載":245,"参考候補":17,"閉店履歴":1}
    assert {r["No."] for r in stores if r["status"]!="閉店履歴"}==set(range(1,264))-{135}

    with zipfile.ZipFile(book) as z:
        assert z.testzip() is None
        names=[s.get("name") for s in ET.fromstring(z.read("xl/workbook.xml")).find(N+"sheets")]
        assert names==a["worksheets"] and len(names)==11
        cells=cell_values(z, "xl/worksheets/sheet2.xml")
        for rec in stores:
            row=str(rec["No."]+1)
            assert cells["W"+row]==rec["unified_key"],rec["No."]
            assert int(cells["X"+row])==rec["No."]
            assert [float(cells[k+row]) for k in ("N","O")]==[rec["緯度"],rec["経度"]],rec["No."]

    with view.open(encoding="utf-8-sig",newline="") as f:
        csvrows=list(csv.DictReader(f))
    assert len(csvrows)==263
    for rec, row in zip(stores,csvrows):
        assert int(row["No."])==rec["No."]
        assert row["unified_key"]==rec["unified_key"]
        assert row["status"]==rec["status"]
        assert [float(row["緯度"]),float(row["経度"])]==[rec["緯度"],rec["経度"]]

    previous = DATA / a["previous_master"]
    assert sha(previous) == "8c9d737c68490daf9535df4464877e83d5823dba9ce3e55c4609bb151cb3f2f4"
    sheet = "xl/worksheets/sheet2.xml"
    with zipfile.ZipFile(previous) as before, zipfile.ZipFile(book) as after:
        assert before.namelist() == after.namelist()
        for name in before.namelist():
            if name != sheet:
                assert before.read(name) == after.read(name), name

        # Reordering cells must preserve every cell's contents and attributes.
        previous_sheet = ET.fromstring(before.read(sheet))
        current_sheet = ET.fromstring(after.read(sheet))

        def column_index(cell):
            letters = re.fullmatch(r"([A-Z]+)[0-9]+", cell.attrib["r"])[1]
            result = 0
            for letter in letters:
                result = result * 26 + ord(letter) - ord("A") + 1
            return result

        for row in previous_sheet.iter(N + "row"):
            row[:] = sorted(row, key=column_index)
        assert ET.tostring(previous_sheet) == ET.tostring(current_sheet)
    print("PASS: workbook cell order, historical package contents, 263 keys and coordinates, release HTML and CSV")

if __name__=="__main__":
    main()
