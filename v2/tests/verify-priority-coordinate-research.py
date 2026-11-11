"""Read-only checks for the twelve-store secondary research bundle (stdlib only)."""
import json,csv,re,zipfile,xml.etree.ElementTree as E,collections,pathlib,math
root=pathlib.Path(__file__).resolve().parents[2]
folder=root/'v2/verification/bread-coordinate-audit/20261111-secondary-priority'
data=json.loads((folder/'secondary-records.json').read_text());expected={5,17,80,92,93,97,107,142,192,207,209,214}
assert len(data)==12 and {x['no']for x in data}==expected and len({x['key']for x in data})==12
assert collections.Counter(x['secondary_code']for x in data)=={'A':5,'B':5,'C':2}
baseline=root/'v2/verification/bread-coordinate-audit/20261111/reports/audit-records.csv'
with baseline.open(encoding='utf-8-sig',newline='')as f:old={int(x['no']):x for x in csv.DictReader(f)}
for x in data:
 a=old[x['no']];assert a['code']==x['code']==x['first_code']=='B'
 for k in ['key','name','address','status','position_state','public_position']:assert x[k]==a[k],(x['no'],k)
 for k in ['lat','lon','compare_lat','compare_lon','distance_m']:assert float(a[k])==x[k],(x['no'],k)
 assert x['distance_m']>=100
 assert (x['proposed_lat']is not None)==(x['secondary_code']=='A');assert(x['proposed_lon']is not None)==(x['secondary_code']=='A')
 assert x['new_evidence_urls'] and all(u.startswith('https://')for u in x['new_evidence_urls'])
 assert (folder/x['gsi_map_review_file']).exists()
html=(folder/'bread-coordinate-priority-comparison.html').read_text();view=json.loads(re.search(r'id="audit-data" type="application/json">(.*?)</script>',html,re.S)[1]);assert len(view)==12
for x in data:
 y=next(y for y in view if y['no']==x['no'])
 for a,b in [('code','secondary_code'),('candidate_lat','proposed_lat'),('candidate_lon','proposed_lon'),('lat','lat'),('lon','lon'),('key','key')]:assert y[a]==x[b]
 assert y['distance_m']==(x['distance_to_proposal_m']if x['secondary_code']=='A'else x['distance_m'])
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(folder/'kussoon-bread-coordinate-priority-secondary-20261111.xlsx')as z:
 ss=[''.join(x.itertext())for x in E.fromstring(z.read('xl/sharedStrings.xml'))]
 def rows(sheet):
  out=[]
  for row in E.fromstring(z.read('xl/worksheets/sheet'+str(sheet)+'.xml')).findall('m:sheetData/m:row',ns):
   if int(row.get('r'))<5:continue
   cells={}
   for c in row.findall('m:c',ns):
    v=c.find('m:v',ns);v=v.text if v is not None else'';assert c.get('t')!='e'
    if c.get('t')=='s':v=ss[int(v)]
    cells[re.sub(r'\d','',c.get('r'))]=v
   if cells.get('A'):out.append(cells)
  return out
 for c in rows(1):
  x=next(x for x in data if x['no']==int(c['A']));assert c['B']=='B'and c['C']==x['secondary_code'];assert c['D']==x['name']
  if x['secondary_code']=='A':assert float(c['K'])==x['proposed_lat']and float(c['L'])==x['proposed_lon']and abs(float(c['M'])-x['distance_to_proposal_m'])<.001
  else:assert not c.get('K')and not c.get('L')and not c.get('M')
 assert len(rows(1))==len(rows(2))==12
 for c in rows(2):
  x=next(x for x in data if x['no']==int(c['A']));assert c['B']=='B'and c['G']==x['key']and c['H']==x['address']
  assert float(c['J'])==x['lat']and float(c['K'])==x['lon']and float(c['S'])==x['distance_m'];assert not c.get('U')and not c.get('V')
print('PASS: 12 original B records preserved; proposals A5/B5/C2; no inferred candidate coordinates; Excel/HTML/source correspondence')
