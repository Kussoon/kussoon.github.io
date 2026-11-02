#!/usr/bin/env python3
"""Build Hokkaido municipality-office directory from public J-LIS and Hokkaido links.
Source: J-LIS 2026-02-24, Hokkaido official 50-on municipality directory.
"""
import html
import json
import re
import time
import urllib.request
import urllib.parse
from html.parser import HTMLParser
from pathlib import Path

J_LIS = "https://www.j-lis.go.jp/spd/code-address/hokkaido/cms_12214179.html"
LINKS = "https://www.pref.hokkaido.lg.jp/link/shichoson/aiueo.html"
SAPPORO = "https://www.city.sapporo.jp/shimin/koseki/toiawase.html"
OUT = Path(__file__).resolve().parents[1] / "data" / "offices" / "01.json"
class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows=[];self.row=None;self.cell=None
    def handle_starttag(self, tag, attrs):
        if tag=="tr": self.row=[]
        if tag in ("td","th") and self.row is not None:self.cell=[]
    def handle_data(self,data):
        if self.cell is not None:self.cell.append(data)
    def handle_endtag(self,tag):
        if tag in ("td","th") and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split()));self.cell=None
        if tag=="tr" and self.row is not None:
            if self.row:self.rows.append(self.row)
            self.row=None
class LinksParser(HTMLParser):
    def __init__(self):
        super().__init__();self.links=[];self.href=None;self.textbuf=None
    def handle_starttag(self, tag, attrs):
        if tag=="a":
            self.href=dict(attrs).get("href","")
            self.textbuf=[]
    def handle_data(self,data):
        if self.textbuf is not None:self.textbuf.append(data)
    def handle_endtag(self,tag):
        if tag=="a" and self.textbuf is not None:
            self.links.append(("".join(self.textbuf).strip(),self.href))
            self.href=None;self.textbuf=None
def fetch(url):
    request=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; Kussoon-V2-offices-build/1.0; public-directory-copy)"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request,timeout=35) as r:
                body=r.read()
                return body.decode("utf-8","replace")
        except Exception:
            if attempt==2: raise
            time.sleep(attempt+1)
p=TableParser();p.feed(fetch(J_LIS))
records={}
for row in p.rows:
    if len(row)<5:continue
    code,name,reading,zip_code,address=row[:5]
    if not re.fullmatch(r"\d{6}",code):continue
    if not re.fullmatch(r"\d{3}-\d{4}",zip_code):raise ValueError("Invalid zip: "+str(row))
    code=code[:5]
    if code in records:raise ValueError("Duplicate code "+code)
    records[code]=(name,zip_code,address)
if len(records)!=189:raise ValueError(f"Expected 189 areas, found {len(records)}; sample: {list(records.items())[:5]}")
links=LinksParser();links.feed(fetch(LINKS))
officials={}
for name,url in links.links:
    if name in [v[0] for v in records.values()] and url.startswith("https://"):
        officials[name]=url
# Some prefecture links use HTTP or scheme-relative URLs.
for name,url in links.links:
    if name in [v[0] for v in records.values()] and name not in officials and (url.startswith("http://") or url.startswith("//")):
        officials[name]=url.replace("http://","https://",1) if url.startswith("http://") else "https:"+url
ward_codes={code for code in records if code.startswith("011") and code!="01100"}
if len(ward_codes)!=10:raise ValueError(f"Expected 10 Sapporo wards: {sorted(ward_codes)}")
unknown=[name for code,(name,_,_) in records.items() if code not in ward_codes and name not in officials]
if unknown:raise ValueError(f"Official Hokkaido link missing for {len(unknown)} municipalities: {unknown}")
if len(officials)<179:raise ValueError(f"Only {len(officials)} official links")
regions={};offices={}
for code,(name,zip_code,address) in sorted(records.items()):
    ward=code in ward_codes
    kind="ward" if ward else "city" if name.endswith("市") else "village" if name.endswith("村") else "town"
    office_id=f"{code}-{kind}"
    official=officials["札幌市"] if ward else officials[name]
    if code=="01101":
        address="札幌市中央区南3条西11丁目330番地2"
    regions[code]={
        "name":name,"kind":"designatedCity" if code=="01100" else kind,
        **({"parentCode":"01100"} if ward else {}),
        "officeIds":[office_id,"01100-city"] if ward else [office_id],
        "official":official,
        "wikipedia":"https://ja.wikipedia.org/w/index.php?search="+urllib.parse.quote("北海道"+name,safe="")
    }
    offices[office_id]={
        "name":name+("役所" if kind in ("ward","city") else "役場"),
        "status":"verified","postalCode":zip_code,
        "address":address if address.startswith("北海道") else "北海道"+address
    }
if len(regions)!=189 or len(offices)!=189:raise ValueError("Expected 189 region/office records")
from collections import Counter
kinds=Counter(v["kind"] for v in regions.values())
if kinds["ward"]!=10 or kinds["designatedCity"]!=1:raise ValueError(str(kinds))
doc={
    "schemaVersion":2,"prefecture":"01","asOf":"2026-11-02",
    "sources":[J_LIS,LINKS,SAPPORO],
    "regions":regions,"offices":offices
}
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(f"Generated {OUT}: {len(regions)} regions, {len(offices)} offices, {len(officials)} official links; kinds={dict(kinds)}")
