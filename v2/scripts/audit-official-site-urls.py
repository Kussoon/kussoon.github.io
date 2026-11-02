#!/usr/bin/env python3
"""Non-destructive nationwide official-site reachability audit.

HTTP status is a transport signal, NOT evidence that a URL belongs to the
intended municipality. 403, 429, DNS, timeouts, and 5xx require human review.
Only unique official URLs are requested; all municipality associations retained.
"""
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from collections import Counter, defaultdict
import json
import os
from pathlib import Path
import socket
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"/"offices"
OUT=ROOT/"audit"/"official-url-reachability-20261102.json"
MAX_WORKERS=10
TIMEOUT_SECONDS=10
USER_AGENT="Mozilla/5.0 (compatible; KussoonOfficialLinksAudit/1.0; site-validation)"
def request_once(url):
    # Do not parse body: only the HTTP status and final redirected URL are needed.
    req=urllib.request.Request(url,headers={
      "User-Agent":USER_AGENT,"Accept":"text/html,application/xhtml+xml,*/*;q=0.8"})
    try:
        with urllib.request.urlopen(req,timeout=TIMEOUT_SECONDS) as r:
            r.read(128)
            return int(r.status),r.geturl(),None
    except urllib.error.HTTPError as e:
        return e.code,e.geturl(),str(e.reason)[:120]
    except (urllib.error.URLError,TimeoutError,socket.timeout,ssl.SSLError,ConnectionError,ValueError, OSError) as e:
        return None,None,(type(e).__name__+": "+str(e))[:250]
def check(url):
    status,final,error=request_once(url)
    if status in (429,500,502,503,504) or (status is None and "timeout" in (error or "").lower()):
        time.sleep(.6)
        status,final,error=request_once(url)
    destination_host=urllib.parse.urlsplit(final or url).hostname or ""
    source_host=urllib.parse.urlsplit(url).hostname or ""
    if status is not None and 200<=status<300: label="reachable"
    elif status in (404,410):label="not_found"
    elif status in (401,403,407,429):label="restricted"
    elif status is not None and 300<=status<400:label="redirect_unresolved"
    elif status is not None and 500<=status<600:label="server_error"
    else:label="network_or_other"
    return {"url":url,"status":status,"result":label,"finalUrl":final,
            "redirectsToOtherHost": bool(final and source_host!=destination_host),
            "error":error}
def main():
    records=[]
    for n in range(1,48):
        pref=f"{n:02}"
        d=json.loads((DATA/(pref+".json")).read_text(encoding="utf-8"))
        if d.get("prefecture")!=pref:raise ValueError("Incorrect prefecture "+pref)
        for code,r in d["regions"].items():
            if not isinstance(r.get("official"),str) or not r["official"].startswith("https://"):
                raise ValueError(f"Malformed official URL for {pref} {code}")
            records.append({"pref":pref,"code":code,"name":r["name"],"url":r["official"]})
    if len(records)!=1912:raise ValueError(f"Expected 1912 registered regions, got {len(records)}")
    associations=defaultdict(list)
    for record in records:
        associations[record["url"]].append({k:v for k,v in record.items() if k!="url"})
    urls=sorted(associations)
    outcomes=[]
    started=time.monotonic()
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures={pool.submit(check,url):url for url in urls}
        for future in as_completed(futures):
            try:outcome=future.result()
            except Exception as exc:outcome={"url":futures[future],"status":None,
                "result":"network_or_other","finalUrl":None,"redirectsToOtherHost":False,
                "error":(type(exc).__name__+": "+str(exc))[:250]}
            outcome["regions"]=associations[outcome["url"]]
            outcomes.append(outcome)
    outcomes.sort(key=lambda x:x["url"])
    summary=Counter(o["result"] for o in outcomes)
    report={
        "asOf":"2026-11-02","runAtUtc":datetime.now(timezone.utc).isoformat(),
        "scope":"47 prefectures; all region official links (NOT Wikipedia, Maps, or office postal verification)",
        "registeredRegions":len(records),"uniqueUrls":len(urls),"workerCount":MAX_WORKERS,
        "seconds":round(time.monotonic()-started,1),
        "counts":dict(sorted(summary.items())),
        "decision":"2xx means HTTP reachable only. 404/410 candidate broken. 403/429/5xx/network failures require manual confirmation. Cross-host redirects require review.",
        "details":outcomes
    }
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("OFFICIAL URL AUDIT:",len(records),"regions,",len(urls),"unique URLs,",round(time.monotonic()-started,1),"seconds")
    print(json.dumps(report["counts"],ensure_ascii=False,sort_keys=True))
    print("Cross-host redirects:",sum(bool(o["redirectsToOtherHost"]) for o in outcomes))
    print("404/410 candidates:",[(x["url"],x["status"],len(x["regions"])) for x in outcomes if x["result"]=="not_found"][:80])
if __name__=="__main__":main()
