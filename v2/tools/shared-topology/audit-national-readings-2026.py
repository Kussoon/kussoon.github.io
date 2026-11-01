#!/usr/bin/env python3
"""Audit CC0 national reading snapshot against every published official 2026 V2 region.
No readings are fabricated and no administrative boundaries are modified.
"""
import json,pathlib,sys,collections
ROOT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'v2/data/national')
manifest=json.loads((ROOT/'2026-common/national-2026-pilot/manifest.json').read_text())
source=json.loads((ROOT/'municipality-readings-all-source.json').read_text())
items=source['items']
def valid_entry(code,name,entry):
 if not entry:return False
 full=entry['name']
 text=entry['reading']
 if full==name:return bool(text)
 if name.endswith('区') and full.endswith(name) and full[:-len(name)].endswith('市'):
  return len(text.split())==2
 return False
details=[]
issues=[]
total=matched=missing=mismatched=0
for row in manifest['entries']:
 pref=row['pref'];path=ROOT/'2026-common'/row['source']
 topo=json.loads(path.read_text())
 regions=topo['objects']['municipalities']['geometries']
 if len(regions)!=row['regions']:raise RuntimeError(f'Wrong number of regions: {pref}')
 counts=collections.Counter()
 for g in regions:
  code=str(g['properties']['N03_007'])
  name=str(g['properties']['N03_004'])
  entry=items.get(code)
  if valid_entry(code,name,entry):counts['matched']+=1
  elif entry:
   counts['mismatched']+=1
   issues.append({'code':code,'officialName':name,'sourceName':entry['name'],'kind':'name_mismatch'})
  else:
   counts['missing']+=1
   issues.append({'code':code,'officialName':name,'kind':'missing'})
 total+=len(regions);matched+=counts['matched'];missing+=counts['missing'];mismatched+=counts['mismatched']
 details.append({'pref':pref,'total':len(regions),**dict(counts)})
 print(f"PASS {pref} {len(regions)} regions, {counts['matched']} verified, {counts['missing']} missing, {counts['mismatched']} mismatched",flush=True)
if total!=manifest['municipalityCount']:raise RuntimeError('Nationwide count inconsistent')
if total!=matched+missing+mismatched:raise RuntimeError('Coverage count inconsistent')
# Guard against accidentally losing most of the existing, verified nationwide catalog.
if matched<1700:raise RuntimeError(f'Unexpectedly poor coverage: {matched}/{total}')
out={'source':source['meta']['source'],'sourceCount':source['meta']['count'],
     'target':'official 2026 V2 municipality geometry','total':total,'matched':matched,
     'missing':missing,'mismatched':mismatched,'coveragePct':round(100*matched/total,1),
     'byPrefecture':details,'issues':issues,
     'policy':'Match five-digit municipality code and 2026 displayed name, or full designated-city+ward name. Never infer unmatched readings.'}
dest=ROOT/'municipality-readings-2026-coverage.json'
dest.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('PASS national coverage:',matched,'/',total,'(',out['coveragePct'],'%), unmatched:',len(issues),flush=True)
