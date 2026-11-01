#!/usr/bin/env python3
"""Diagnostic-only 2026 cross-REGION prefecture-border alignment audit.

Reads published prefecture-sliced TopoJSON, never mutates any data.
Topologies from separate build groups need independent verification. The
metrics below are distances between *nearby exterior arc samples*, not a
guarantee of legal boundary equality, particularly near water and islands.
"""
import json, math, pathlib, sys
from collections import Counter
from shapely.geometry import LineString
from shapely.strtree import STRtree
from shapely.ops import transform

ROOT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'v2/data/national/2026-common')
OUT=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else '/tmp/v2-national-cross-region-audit.json')
manifest=json.loads((ROOT/'national-2026-pilot/manifest.json').read_text())
entries={x['pref']:x for x in manifest['entries']}
# Only border pairs constructed IN DIFFERENT source groups. These are
# known land-contiguous, not marine-only neighbors.
PAIRS=[
 ('07','08'), # Fukushima / Ibaraki
 ('07','09'), # Fukushima / Tochigi
 ('07','15'), # Fukushima / Niigata
 ('06','15'), # Yamagata / Niigata
 ('10','15'), # Gunma / Niigata
 ('10','20'), # Gunma / Nagano
 ('11','20'), # Saitama / Nagano
 ('14','22'), # Kanagawa / Shizuoka
 ('15','17'), # Niigata / Ishikawa? separated by Toyama: excluded below
 ('16','21'), # Toyama / Gifu
 ('17','21'), # Ishikawa / Gifu
 ('18','21'), # Fukui / Gifu
 ('18','25'), # Fukui / Shiga
 ('18','26'), # Fukui / Kyoto
 ('19','22'), # Yamanashi / Shizuoka
 ('20','21'), # Nagano / Gifu
 ('20','22'), # Nagano / Shizuoka
 ('20','23'), # Nagano / Aichi
 ('21','25'), # Gifu / Shiga
 ('24','25'), # Mie / Shiga
 ('24','29'), # Mie / Nara
 ('28','31'), # Hyogo / Tottori
 ('28','33'), # Hyogo / Okayama
]
PAIRS=[p for p in PAIRS if p!=('15','17')]
def decode(t):
 tr=t.get('transform')
 result=[]
 for arc in t['arcs']:
  x=y=0;pts=[]
  for a,b in arc:
   if tr:
    x+=a;y+=b
    pts.append((x*tr['scale'][0]+tr['translate'][0],y*tr['scale'][1]+tr['translate'][1]))
   else:pts.append((a,b))
  result.append(pts)
 return result
def arcs_of(g):
 if g['type']=='Polygon':
  for ring in g['arcs']:
   yield from ring
 elif g['type']=='MultiPolygon':
  for polygon in g['arcs']:
   for ring in polygon:yield from ring
 else:raise ValueError('Unsupported geometry '+g['type'])
cache={}
def load(pref):
 if pref in cache:return cache[pref]
 src=ROOT/entries[pref]['source']
 t=json.loads(src.read_text())
 refs=Counter()
 for g in t['objects']['municipalities']['geometries']:
  # an arc used twice by one municipality is an internal edge, too
  refs.update((~arc if arc<0 else arc) for arc in arcs_of(g))
 coords=decode(t)
 external=[coords[i] for i,count in refs.items() if count==1 and len(coords[i])>=2]
 cache[pref]=external
 return external
def nearest_metrics(a,b):
 # Equirectangular local metres: sufficient for this diagnostic threshold.
 # Compute latitude for projection from the two prefectures' border samples.
 arcsA=load(a);arcsB=load(b)
 ys=[p[1] for arc in (arcsA[:250]+arcsB[:250]) for p in (arc[0],arc[-1])]
 lat=sum(ys)/len(ys)
 sx=111320*math.cos(math.radians(lat));sy=110950
 def xy(p):return (p[0]*sx,p[1]*sy)
 def make(arcs):
  out=[]
  for arc in arcs:
   line=LineString([xy(p) for p in arc])
   if line.length>0:out.append(line)
  return out
 B=make(arcsB)
 tree=STRtree(B)
 distances=[];matched_segments=0;length_matched=0
 # Include arcs only where two exteriors are reasonably near each other.
 # Sample endpoints and midpoints so isolated coastline arcs don't dominate.
 for arc in arcsA:
  if len(arc)<2:continue
  samples=[xy(arc[0]),xy(arc[len(arc)//2]),xy(arc[-1])]
  from shapely.geometry import Point
  vals=[]
  for x,y in samples:
   pt=Point(x,y)
   idx=tree.nearest(pt)
   vals.append(pt.distance(B[int(idx)]))
  if min(vals)<=250:
   distances.extend(v for v in vals if v<=250)
   matched_segments+=1
   length_matched+=LineString([xy(p) for p in arc]).length
 if not distances:
  return {'pair':a+'-'+b,'samples':0,'nearbyExteriorArcs':0,'status':'NO_NEARBY_MATCH'}
 distances.sort()
 p95=distances[min(len(distances)-1,int(.95*(len(distances)-1)))]
 return {'pair':a+'-'+b,'samples':len(distances),'nearbyExteriorArcs':matched_segments,
         'approxSharedBorderKm':round(length_matched/1000,2),
         'medianDistanceM':round(distances[len(distances)//2],2),
         'p95DistanceM':round(p95,2),'maxDistanceM':round(distances[-1],2),
         'pctSamplesWithin20m':round(100*sum(d<=20 for d in distances)/len(distances),1),
         'status':'CHECK' if p95>20 else 'CLOSE_AT_20M_SCALE'}
results=[]
for left,right in PAIRS:
 result=nearest_metrics(left,right)
 results.append(result)
 print(result,flush=True)
report={'kind':'diagnostic','source':'separately built 2026 N03 regional TopoJSON',
        'method':'nearest external arc samples with local-metre approximation, 250m proximity cut',
        'warning':'No complete exact-seam equivalence claim; coastline, islands and border topology require nationwide source rebuild to certify.',
        'pairs':results,'closePairs':sum(x['status']=='CLOSE_AT_20M_SCALE' for x in results),
        'needReview':sum(x['status']!='CLOSE_AT_20M_SCALE' for x in results)}
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('REPORT',OUT,'close',report['closePairs'],'review',report['needReview'])
