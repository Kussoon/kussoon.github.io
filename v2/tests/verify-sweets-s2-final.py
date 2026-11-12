from pathlib import Path
import json,csv,zipfile,xml.etree.ElementTree as E,re,collections,datetime,hashlib
root=Path(__file__).resolve().parents[2];folder=root/'v2/verification/sweets-s2-coordinate-audit/20261112-final';masters=root/'data/sweets/masters';N={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def read(z):
 ss=[''.join(x.itertext())for x in E.fromstring(z.read('xl/sharedStrings.xml'))];out={}
 for name in z.namelist():
  if not re.fullmatch(r'xl/worksheets/sheet\d+.xml',name):continue
  cells={}
  for c in E.fromstring(z.read(name)).findall('.//m:sheetData/m:row/m:c',N):
   v=c.find('m:v',N);v=v.text if v is not None else''
   if c.get('t')=='s':v=ss[int(v)]
   elif c.get('t')=='inlineStr':v=''.join(t.text or''for t in c.findall('.//m:t',N))
   f=c.find('m:f',N);cells[c.get('r')]=(v,f.text if f is not None else None,c.get('s'))
  out[name]=cells
 return out
old=zipfile.ZipFile(masters/'kussoon-sweets-common-master-v0.4.1-candidate-20261102.xlsx');new=zipfile.ZipFile(masters/'kussoon-sweets-common-master-v0.4.2-s2-candidate-20261112.xlsx');a=read(old);b=read(new);edits=json.loads((folder/'cell-edits.json').read_text());meta=json.loads((folder/'source-metadata.json').read_text());allowed={(meta['sheets'][e['sheet']]['path'],e['cell'])for e in edits};assert list(meta['sheets'])==[s.get('name')for s in E.fromstring(new.read('xl/workbook.xml')).findall('m:sheets/m:sheet',N)];assert len(meta['sheets'])==10
for sh in a:
 for c in a[sh].keys()|b[sh].keys():
  if a[sh].get(c,('',None,None))[:2]!=b[sh].get(c,('',None,None))[:2]:assert(sh,c)in allowed,(sh,c)
 for c,v in a[sh].items():assert b[sh][c][1:]==v[1:],(sh,c,'formula/style')
patch=set(json.loads((folder/'package-patch-paths.json').read_text()));assert old.namelist()==new.namelist()
for name in old.namelist():
 if name not in patch:assert old.read(name)==new.read(name),name
m=b['xl/worksheets/sheet1.xml'];headers={re.sub(r'\d','',c):v[0]for c,v in m.items()if re.sub(r'\D','',c)=='4'};stores={m['A'+str(r)][0]:{name:m.get(col+str(r),('',None,None))[0]for col,name in headers.items()}for r in range(5,515)};assert len(stores)==510
h=(root/'maps/unified-sweets-map.html').read_text();assert h==(folder/'unified-sweets-map-s2-verification-20261112.html').read_text();data=json.loads(re.search(r'<script id="storedata" type="application/json">(.*?)</script>',h,re.S)[1]);base=json.loads((folder/'baseline-main-storedata.json').read_text());assert len(data)==len(base)==429;assert len({x['store_id']for x in data})==429
with(folder/'s2-applied-24-diff.csv').open(encoding='utf-8-sig')as f:diff=list(csv.DictReader(f))
ids={x['店舗ID']for x in diff};assert len(ids)==24;assert collections.Counter(x['市']for x in diff)=={'尼崎市':1,'宝塚市':14,'伊丹市':9}
changed=set()
def date(v):
 if re.fullmatch(r'\d+(?:\.0+)?',v or''):return(datetime.date(1899,12,30)+datetime.timedelta(days=int(float(v)))).isoformat()
 return v[:10]if v else''
for x,y in zip(base,data):
 assert x['store_id']==y['store_id']
 for k in x:
  if x[k]!=y[k]:assert x['store_id']in ids and k in ['latitude','longitude'];changed.add(x['store_id'])
 for k,v in y.items():
  expected=stores[y['store_id']]['municipality'if k=='city'else k]
  if k in ['latitude','longitude']:assert float(expected)==v
  elif k=='last_business_check':assert date(expected)==date(v)
  else:assert str(expected or'')==str(v or''),(y['store_id'],k)
assert changed==ids
with(folder/'s2-final-106-decisions.csv').open(encoding='utf-8-sig')as f:audit=list(csv.DictReader(f))
assert len(audit)==len({x['店舗ID']for x in audit})==106;assert sorted(collections.Counter(x['統合最終判定']for x in audit).values())==[1,24,81]
for x in audit:
 if x['店舗ID']not in ids:
  row=next(r for r in range(5,515)if a['xl/worksheets/sheet1.xml']['A'+str(r)][0]==x['店舗ID'])
  for c in ['P','Q','R']:assert a['xl/worksheets/sheet1.xml'][c+str(row)]==b['xl/worksheets/sheet1.xml'][c+str(row)]
validation=json.loads((folder/'validation.json').read_text())
for name,sha in validation['sha256'].items():p=masters/name if name.endswith('.xlsx')else folder/name;assert hashlib.sha256(p.read_bytes()).hexdigest()==sha,name
print('PASS: original 10 sheets, 510 stores, 429 shared HTML attributes, 106=24+1+81, 24 unique coordinate changes, unchanged non-adopted 82, old values/formulas/styles/archive metadata retained')
