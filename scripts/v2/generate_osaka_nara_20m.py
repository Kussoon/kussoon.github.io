#!/usr/bin/env python3
"""Generate 20m shared-arc simplified TopoJSON, matching the V2 trial's DP logic."""
import json, math
from pathlib import Path
source=Path("v2/data/national/2026-common/osaka-nara.topojson")
target=source.with_name("osaka-nara-20m.topojson")
t=json.loads(source.read_text(encoding="utf-8"))
tr=t.get("transform")
arcs=[]
for a in t["arcs"]:
    x=y=0
    pts=[]
    for p in a:
        if tr:
            x+=p[0];y+=p[1]
            pts.append([x*tr["scale"][0]+tr["translate"][0],y*tr["scale"][1]+tr["translate"][1]])
        else:pts.append(p)
    arcs.append(pts)
def dist2(p,a,b,lat):
    mx=111320*math.cos(math.radians(lat));my=111195
    ax,ay=a[0]*mx,a[1]*my;bx,by=b[0]*mx,b[1]*my;px,py=p[0]*mx,p[1]*my
    dx,dy=bx-ax,by-ay
    den=dx*dx+dy*dy
    k=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/den)) if den else 0
    return (px-ax-k*dx)**2+(py-ay-k*dy)**2
def dp(pts,m=20):
    if len(pts)<=2 or pts[0]==pts[-1]:return pts
    keep={0,len(pts)-1};stack=[(0,len(pts)-1)]
    lat=(pts[0][1]+pts[-1][1])/2
    while stack:
        a,b=stack.pop()
        if b-a<2:continue
        i=max(range(a+1,b),key=lambda i:dist2(pts[i],pts[a],pts[b],lat))
        if dist2(pts[i],pts[a],pts[b],lat)>m*m:
            keep.add(i);stack.extend(((a,i),(i,b)))
    return [pts[i] for i in sorted(keep)]
out={"type":"Topology","objects":t["objects"],"arcs":[dp(a) for a in arcs]}
if "bbox" in t:out["bbox"]=t["bbox"]
assert len(out["objects"]["municipalities"]["geometries"])==111
assert len(out["arcs"])==len(t["arcs"])
target.write_text(json.dumps(out,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print(target, target.stat().st_size, "bytes; vertices",sum(map(len,out["arcs"])))
