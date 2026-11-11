import pathlib,json,zipfile,xml.etree.ElementTree as E,re,collections,hashlib,csv
root=pathlib.Path(__file__).resolve().parents[2];folder=root/'v2/verification/bread-coordinate-audit/20261111-nine-fixes';masters=root/'data/bread/masters';ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def read(z):
 strings=[''.join(x.itertext())for x in E.fromstring(z.read('xl/sharedStrings.xml'))];ans={}
 for name,p in [('master','xl/worksheets/sheet2.xml'),('overview','xl/worksheets/sheet1.xml'),('history','xl/worksheets/sheet6.xml')]:
  cells={}
  for c in E.fromstring(z.read(p)).findall('.//m:sheetData/m:row/m:c',ns):
   v=c.find('m:v',ns);v=v.text if v is not None else''
   if c.get('t')=='s':v=strings[int(v)]
   elif c.get('t')=='inlineStr':v=''.join(t.text or''for t in c.findall('.//m:t',ns))
   f=c.find('m:f',ns);cells[c.get('r')]=(v,f.text if f is not None else None)
  ans[name]=cells
 return ans
oldzip=zipfile.ZipFile(masters/'five-city-master-v1.4.3-candidate-20261111.xlsx');newzip=zipfile.ZipFile(masters/'five-city-master-v1.4.4-candidate-20261111.xlsx');old=read(oldzip);new=read(newzip);five={17,97,107,207,209};nine=json.loads((folder/'nine-records.json').read_text());assert{r['no']for r in nine}==five|{111,112,113,114}
assert oldzip.namelist()==newzip.namelist()
for p in oldzip.namelist():
 if p not in ['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml','xl/worksheets/sheet6.xml']:assert oldzip.read(p)==newzip.read(p),p
allowed={('master',c+str(n+1))for n in five for c in ['N','O']}|{('overview','A2')};changed=[]
for sh in old:
 for c in old[sh].keys()|new[sh].keys():
  if old[sh].get(c)!=new[sh].get(c):
   if sh=='history'and int(re.sub(r'\D','',c))in range(41,46):continue
   assert(sh,c)in allowed,(sh,c);changed.append((sh,c))
assert len(changed)==11
get=lambda s:json.loads(re.search(r'<script id="bread-data" type="application/json">(.*?)</script>',s,re.S)[1]);base=(folder/'baseline-main-v1.3.11.html.txt').read_text();html=(folder/'unified-bread-map-v1.3.13-verification-20261111.html').read_text();a=get(base);b=get(html);assert len(a)==len(b)==263;assert len({x['No.']for x in b})==len({x['unified_key']for x in b})==263;assert collections.Counter(x['status']for x in b)=={'通常掲載':245,'参考候補':17,'閉店履歴':1}
changes=[];expected={x['no']:x for x in nine}
for x,y in zip(a,b):
 for k in x:
  if x[k]!=y[k]:assert x['No.']in expected and k in ['緯度','経度'];changes.append((x['No.'],k))
 row=x['No.']+1;assert new['master']['W'+str(row)][0]==y['unified_key'];assert int(new['master']['X'+str(row)][0])==y['No.'];assert [float(new['master'][c+str(row)][0])for c in ['N','O']]==[y['緯度'],y['経度']]
 if x['No.']in expected:
  d=expected[x['No.']];assert[x['緯度'],x['経度']]==d['old'];assert[y['緯度'],y['経度']]==d['new']
assert len(changes)==18
strip=lambda s:re.sub(r'(<script id="bread-data" type="application/json">).*?(</script>)',r'\1DATA\2',s,flags=re.S)
normalized=strip(html).replace('Version 1.3.13（検証版）','Version 1.3.11').replace('最終更新日：2026年11月11日（座標データ更新）','最終更新日：2026年11月2日（データ更新）').replace('データ更新日：2026-11-11','データ更新日：2026-11-02').replace('\n<meta name="robots" content="noindex,nofollow,noarchive">','');assert normalized==strip(base),'HTML changed outside coordinate/version/date/noindex'
assert next(x for x in b if x['No.']==135)['status']=='閉店履歴';assert all(x['No.']not in {264,265}for x in b)
for name,count in [('incremental-five-diff.csv',5),('cumulative-nine-diff.csv',9)]:
 with(folder/name).open(encoding='utf-8-sig')as f:assert len(list(csv.DictReader(f)))==count
v=json.loads((folder/'validation.json').read_text())
for name,sha in v['files'].items():p=masters/name if name.endswith('.xlsx')else folder/name;assert hashlib.sha256(p.read_bytes()).hexdigest()==sha
print('PASS: incremental 5 + retained 4 = cumulative 9; 263 Excel/HTML keys and coordinates; other 254 unchanged; 11 sheets and all prior history/metadata retained; 245/17/1 and public 262; HTML logic/CSS/footer/Umami unchanged')
