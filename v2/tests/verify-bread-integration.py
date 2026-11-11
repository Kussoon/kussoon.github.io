"""Read-only integration contract; pin upstream sources and reject any extra HTML edit."""
import pathlib, subprocess, json, re, hashlib, collections, csv, zipfile, xml.etree.ElementTree as E, difflib
root=pathlib.Path(__file__).resolve().parents[2]
folder=root/'v2/verification/bread-integration/20261111'
sources=json.loads((folder/'sources.json').read_text())
def git(ref,path): return subprocess.check_output(['git','show',ref+':'+path],cwd=root)
def sha(b): return hashlib.sha256(b).hexdigest()
path='maps/unified-bread-map.html'
main=git(sources['main'],path).decode()
old=git(sources['pr415']+'~2',path).decode()
fixed=git(sources['pr415'],path).decode()
assert main==old,'Latest main map changed: integration must be reviewed'
basename='v2/verification/bread-coordinate-audit/20261111-nine-fixes/'
source_path=basename+'unified-bread-map-v1.3.13-verification-20261111.html'
source=git(sources['pr414'],source_path).decode()
assert (root/source_path).read_text()==source
html=(folder/'unified-bread-map-v1.3.13-integrated-verification-20261111.html').read_text()
a=old.splitlines(True);b=fixed.splitlines(True)
ops=[(''.join(a[i:j]),''.join(b[k:l])) for tag,i,j,k,l in difflib.SequenceMatcher(None,a,b).get_opcodes() if tag!='equal']
assert len(ops)==1
before,after=ops[0];assert source.count(before)==1
assert source.replace(before,after)==html,'HTML changed outside exact PR415 initialization patch'
assert git('HEAD',path).decode()==main,'Production HTML must remain untouched'
test='v2/tests/bread-marker-refresh.browser.cjs'
assert (root/test).read_bytes()==git(sources['pr415'],test),'PR415 regression must be reused unchanged'
get=lambda s:json.loads(re.search(r'<script id="bread-data" type="application/json">(.*?)</script>',s,re.S)[1])
x=get(main);y=get(html);assert get(source)==y
assert len(x)==len(y)==263
assert len({r['No.']for r in y})==len({r['unified_key']for r in y})==263
assert collections.Counter(r['status']for r in y)=={'通常掲載':245,'参考候補':17,'閉店履歴':1}
expected=json.loads((root/basename/'nine-records.json').read_text())
expected={r['no']:r for r in expected}
assert set(expected)=={17,97,107,111,112,113,114,207,209}
rows=[];changed=[]
for a,b in zip(x,y):
 assert set(a)==set(b)
 changes=[k for k in a if a[k]!=b[k]]
 assert not changes or (a['No.']in expected and set(changes)=={'緯度','経度'})
 if changes:
  d=expected[a['No.']];assert [a['緯度'],a['経度']]==d['old'];assert [b['緯度'],b['経度']]==d['new'];changed.append(a['No.'])
 rows.append({'no':b['No.'],'key':b['unified_key'],'name':b['店名'],'status':b['status'],'old_lat':a['緯度'],'old_lng':a['経度'],'lat':b['緯度'],'lng':b['経度'],'coordinate_changed':bool(changes),'all_other_fields_equal':True})
assert set(changed)==set(expected)
master='data/bread/masters/five-city-master-v1.4.4-candidate-20261111.xlsx'
assert (root/master).read_bytes()==git(sources['pr414'],master)
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(root/master) as z:
 strings=[''.join(t.itertext()) for t in E.fromstring(z.read('xl/sharedStrings.xml'))]
 cells={}
 for c in E.fromstring(z.read('xl/worksheets/sheet2.xml')).findall('.//m:sheetData/m:row/m:c',ns):
  v=c.find('m:v',ns);v=v.text if v is not None else ''
  if c.get('t')=='s': v=strings[int(v)]
  elif c.get('t')=='inlineStr':v=''.join(t.text or '' for t in c.findall('.//m:t',ns))
  cells[c.get('r')]=v
 sheets=E.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet',ns);assert len(sheets)==11
 assert len([k for k in cells if re.fullmatch('X[0-9]+',k) and k!='X1' and cells[k]])==263
 for b,row in zip(y,rows):
  n=str(b['No.']+1)
  assert cells['W'+n]==b['unified_key'];assert int(cells['X'+n])==b['No.']
  assert [float(cells[c+n]) for c in ['N','O']]==[b['緯度'],b['経度']]
  row['excel_key_coordinates_equal']=True
  columns={re.sub(r'[0-9]+','',cell):value for cell,value in cells.items() if re.fullmatch('[A-Z]+1',cell)}
  for column,key in columns.items():
   if key not in b: continue  # 入力区分 is Excel management metadata; public_display is HTML-derived.
   value=cells.get(column+n,'');target=b[key]
   if key in ['緯度','経度']: assert float(value)==target,(n,key)
   elif key in ['No.','source_no']: assert value==str(target),(n,key)
   elif key=='links': assert json.loads(value)==target,(n,key)
   else: assert value==target,(n,key)
  row['all_shared_excel_fields_equal']=True
with (folder/'all-263-diff.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=rows[0],lineterminator='\n');w.writeheader();w.writerows(rows)
base=(root/basename/'baseline-main-v1.3.11.html.txt').read_text();assert main==base
# The upstream verifier proves normalization of only coordinates/version/date/noindex.
subprocess.run(['python3',str(root/'v2/tests/verify-nine-coordinate-fix.py')],check=True,cwd=root)
report={'status':'PASS','sources':sources,'managed':263,'public':262,'normal':245,'reference':17,'closed_history':1,'coordinate_changes':sorted(changed),'unchanged_coordinates':254,'all_noncoordinate_record_fields_unchanged':True,'pr414_bread_data_byte_identical':re.search(r'<script id="bread-data".*?</script>',source,re.S)[0]==re.search(r'<script id="bread-data".*?</script>',html,re.S)[0],'excel_keys_and_coordinates_matched':263,'all_shared_excel_fields_matched':263,'excel_byte_identical_to_pr414':True,'excel_sheets':11,'html_exact_pr415_patch_only':True,'production_html_unchanged':True,'pr415_regression_byte_identical':True,'hashes':{'integrated_html':sha(html.encode()),'excel_candidate':sha((root/master).read_bytes()),'regression_test':sha((root/test).read_bytes())}}
(folder/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
