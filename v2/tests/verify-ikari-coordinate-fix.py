import pathlib,zipfile,xml.etree.ElementTree as E,json,re,csv,hashlib,collections
root=pathlib.Path(__file__).resolve().parents[2];inp=root;out=root/'v2/verification/bread-coordinate-audit/20261111-ikari-fix';ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def read(p):
 z=zipfile.ZipFile(p);ss=[''.join(x.itertext())for x in E.fromstring(z.read('xl/sharedStrings.xml'))]if'xl/sharedStrings.xml'in z.namelist()else[];rels={x.get('Id'):x.get('Target')for x in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))};ans={};forms={}
 for sh in E.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet',ns):
  rid=sh.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id');p=rels[rid];p=p.lstrip('/')if p.startswith('/')else'xl/'+p;rt=E.fromstring(z.read(p));cells={};fm={}
  for c in rt.findall('.//m:sheetData/m:row/m:c',ns):
   v=c.find('m:v',ns);v=v.text if v is not None else''
   if c.get('t')=='s':v=ss[int(v)]
   elif c.get('t')=='inlineStr':v=''.join(t.text or''for t in c.findall('.//m:t',ns))
   f=c.find('m:f',ns)
   if f is not None:fm[c.get('r')]=f.text
   assert c.get('t')!='e',(sh.get('name'),c.get('r'),v)
   if v!='':cells[c.get('r')]=v
  ans[sh.get('name')]=cells;forms[sh.get('name')]=fm
 return ans,forms
old,of=read(root/'data/bread/masters/five-city-master-v1.4.2-candidate-20261102.xlsx');new,nf=read(root/'data/bread/masters/five-city-master-v1.4.3-candidate-20261111.xlsx');assert list(old)==list(new)and of==nf
diff=json.loads((out/'ikari-coordinate-diff-20261111.json').read_text());allowed={('5市店舗マスター',c+str(x['no']+1))for x in diff for c in ['N','O']}|{('概要','A2')};changes=[]
for sheet,cells in old.items():
 for cell in cells.keys()|new[sheet].keys():
  a=cells.get(cell,'');b=new[sheet].get(cell,'')
  if a!=b:
   if(sheet,cell)in allowed:changes.append((sheet,cell,a,b));continue
   if sheet=='変更履歴'and int(re.sub(r'\D','',cell))>=37:continue
   raise AssertionError(('unexpected Excel value change',sheet,cell,a,b))
assert len(changes)==9,changes
base=(root/'maps/unified-bread-map.html').read_text();html=(out/'unified-bread-map-v1.3.12-verification-20261111.html').read_text();get=lambda s:json.loads(re.search(r'<script id="bread-data" type="application/json">(.*?)</script>',s,re.S)[1]);a=get(base);b=get(html);assert len(a)==len(b)==263
htmlchanges=[]
for x,y in zip(a,b):
 assert x.keys()==y.keys()
 for k in x:
  if x[k]!=y[k]:assert x['No.']in[111,112,113,114]and k in['緯度','経度'];htmlchanges.append((x['No.'],k))
assert len(htmlchanges)==8;assert len({x['No.']for x in b})==len({x['unified_key']for x in b})==263;assert collections.Counter(x['status']for x in b)=={'通常掲載':245,'参考候補':17,'閉店履歴':1}
for x in diff:
 r=x['no']+1;assert(float(new['5市店舗マスター']['N'+str(r)]),float(new['5市店舗マスター']['O'+str(r)]))==(x['new_lat'],x['new_lon'])
without=lambda s:re.sub(r'(<script id="bread-data" type="application/json">).*?(</script>)',r'\1DATA\2',s,flags=re.S)
norm=without(html).replace('Version 1.3.12（検証版）','Version 1.3.11').replace('最終更新日：2026年11月11日（座標データ更新）','最終更新日：2026年11月2日（データ更新）').replace('データ更新日：2026-11-11','データ更新日：2026-11-02').replace('\n<meta name="robots" content="noindex,nofollow,noarchive">','')
assert norm==without(base),'non-data HTML difference outside allowed version/date/noindex'

print('PASS: four coordinate pairs only; all unrelated Excel/HTML data and scripts preserved')
