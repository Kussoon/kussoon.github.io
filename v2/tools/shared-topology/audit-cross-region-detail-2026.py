#!/usr/bin/env python3
"""High-density, read-only border comparison for five nationwide V2 seams.

Existing 2026 official regional 20m topology data are never edited.
The results are *nearby exterior-boundary* comparisons, not certified
shared-border measurements: nearby rivers, islands and coastline may enter.
All coordinates are WGS84 and distance calculations use local metric scaling.
"""
import json,math,pathlib,sys
from collections import Counter
from shapely.geometry import LineString,Point,box, mapping
from shapely.ops import unary_union,transform

ROOT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'v2/data/national/2026-common')
OUT=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else '/tmp/cross-region-detail')
OUT.mkdir(parents=True,exist_ok=True)
manifest=json.loads((ROOT/'national-2026-pilot/manifest.json').read_text())
sources={e['pref']:e['source'] for e in manifest['entries']}
PAIRS=[('07','08'),('07','15'),('06','15'),('28','31'),('28','33')]
labels={'07':'福島県','08':'茨城県','15':'新潟県','06':'山形県','28':'兵庫県','31':'鳥取県','33':'岡山県'}
def decode(t):
 tr=t.get('transform');result=[]
 for arc in t['arcs']:
  x=y=0;pts=[]
  for a,b in arc:
   if tr:
    x+=a;y+=b;pts.append((x*tr['scale'][0]+tr['translate'][0],y*tr['scale'][1]+tr['translate'][1]))
   else:pts.append((a,b))
  result.append(pts)
 return result
def references(g):
 if g['type']=='Polygon':
  for ring in g['arcs']:
   yield from ring
 elif g['type']=='MultiPolygon':
  for polygon in g['arcs']:
   for ring in polygon:yield from ring
 else:raise ValueError('unsupported geometry '+g['type'])
cache={}
def borders(pref):
 if pref in cache:return cache[pref]
 t=json.loads((ROOT/sources[pref]).read_text())
 refs=Counter()
 for g in t['objects']['municipalities']['geometries']:
  refs.update((~v if v<0 else v) for v in references(g))
 arcs=decode(t)
 result=[LineString(arcs[i]) for i,n in refs.items() if n==1 and len(arcs[i])>1]
 cache[pref]=result
 return result
def percentile(arr,p):
 if not arr:return None
 s=sorted(arr);return round(s[round((len(s)-1)*p)],2)
def audit(a,b):
 left,right=borders(a),borders(b)
 # The same local-metre conversion is used on both sides.
 all_y=[x.bounds[1] for x in left[:200]+right[:200]]
 lat=sum(all_y)/len(all_y)
 sx=111320*math.cos(math.radians(lat));sy=110950
 to_m=lambda x,y,z=None:(x*sx,y*sy)
 from_m=lambda x,y,z=None:(x/sx,y/sy)
 A=[transform(to_m,l) for l in left];B=[transform(to_m,l) for l in right]
 # A tree bounds large non-border coastlines cheaply.
 from shapely.strtree import STRtree
 tree=STRtree(B)
 step=100 # dense 100-m regular samples along each exterior arc
 points=[];near_arc_ids=set();distances=[]
 for i,line in enumerate(A):
  if line.length<1:continue
  # Nearness at 3 locations identifies candidate neighboring arcs.
  spots=[line.interpolate(frac,normalized=True) for frac in (0,.5,1)]
  if min(p.distance(B[int(tree.nearest(p))]) for p in spots)>300:continue
  num=max(2,min(5000,math.ceil(line.length/step)+1))
  matched=False
  for j in range(num):
   pos=line.interpolate(j/(num-1),normalized=True)
   target=B[int(tree.nearest(pos))]
   d=pos.distance(target)
   # Deliberately retain only near-border samples; do not label this as
   # maximum true legal border gap or guarantee that all segments were found.
   if d>300:continue
   hit=target.interpolate(target.project(pos))
   lon,latitude=from_m(pos.x,pos.y);lon2,latitude2=from_m(hit.x,hit.y)
   distances.append(d);matched=True
   points.append({'type':'Feature','properties':{'distanceM':round(d,2),'side':a,'nearestSide':b},
                  'geometry':{'type':'Point','coordinates':[round(lon,6),round(latitude,6)]},
                  '_other':[lon2,latitude2]})
  if matched:near_arc_ids.add(i)
 if not distances:raise RuntimeError('No border vicinity samples '+a+'-'+b)
 # Retain 120 largest offsets and a further set of spaced diagnostic samples.
 ranked=sorted(points,key=lambda x:x['properties']['distanceM'],reverse=True)
 chosen=ranked[:120]
 high=sorted({round(p['properties']['distanceM'],2) for p in points if p['properties']['distanceM']>20})
 # Display the full candidate external border strokes (within geographic
 # envelope of observed matched sample points) rather than inventing joins.
 all_obs=[f['geometry']['coordinates'] for f in points]
 extent=[min(x[0] for x in all_obs),min(x[1] for x in all_obs),
         max(x[0] for x in all_obs),max(x[1] for x in all_obs)]
 vicinity=box(extent[0]-.025,extent[1]-.025,extent[2]+.025,extent[3]+.025)
 features=[]
 for side,lines in ((a,left),(b,right)):
  for line in lines:
   if not line.intersects(vicinity):continue
   clip=line.intersection(vicinity)
   if clip.is_empty:continue
   # It is an exterior boundary, not necessarily the shared prefecture seam.
   features.append({'type':'Feature','properties':{'type':'boundary','side':side},'geometry':mapping(clip)})
 for k,p in enumerate(chosen):
  p.pop('_other',None);p['properties']['type']='sample';p['properties']['rank']=k+1
 features.extend(chosen)
 report={'pair':a+'-'+b,'names':[labels[a],labels[b]],'sampleStepM':step,
         'matchedSampleCount':len(distances),
         'medianM':percentile(distances,.5),'p95M':percentile(distances,.95),
         'maxObservedM':round(max(distances),2),
         'fractionWithin20m':round(sum(x<=20 for x in distances)/len(distances),4),
         'samplesOutside20m':sum(x>20 for x in distances),
         'displayedWorstSamples':len(chosen),
         'approximateExtent':extent,
         'caution':'100m samples near opposite exterior boundaries (<=300m). Not a certified full-length province border match.'}
 collection={'type':'FeatureCollection','properties':report,'features':features}
 (OUT/(a+'-'+b+'.geojson')).write_text(json.dumps(collection,ensure_ascii=False,separators=(',',':'))+'\n')
 print('PAIR',a+'-'+b, 'points',len(distances),'median',report['medianM'],'p95',report['p95M'],'max',report['maxObservedM'],'within20',report['fractionWithin20m'],flush=True)
 return report
report={'description':'Dense 100m samples for five flagged cross-region borders, diagnostic only',
        'warning':'Samples beyond 300m are excluded; readings do not certify exact boundary alignment or total worst-case offsets.',
        'pairs':[audit(a,b) for a,b in PAIRS]}
(OUT/'index.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('PASS all five detailed border comparisons',flush=True)
