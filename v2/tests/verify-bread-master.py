"""Read-only checks for the versioned bread workbook and its review CSV; stdlib only."""
import csv,hashlib,json,pathlib,zipfile,xml.etree.ElementTree as ET,collections
root=pathlib.Path(__file__).resolve().parents[2]
folder=root/'data/bread'
m=json.loads((folder/'manifest.json').read_text())
current=m['current_working_master'];file=folder/current['path']
assert hashlib.sha256(file.read_bytes()).hexdigest()==current['sha256'],'workbook hash'
view=folder/current['review_csv']['path']
assert hashlib.sha256(view.read_bytes()).hexdigest()==current['review_csv']['sha256'],'CSV hash'
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(file) as z:
 sheets=ET.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet',ns)
 assert [s.get('name')for s in sheets]==current['worksheets'],'worksheet preservation'
 strings=[''.join(t.text or ''for t in x.findall('.//m:t',ns))for x in ET.fromstring(z.read('xl/sharedStrings.xml'))]
 rels={x.get('Id'):x.get('Target')for x in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
 sheet=next(x for x in sheets if x.get('name')=='5市店舗マスター');rid=sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id');target=rels[rid];target=target.lstrip('/') if target.startswith('/')else 'xl/'+target
 rows=[]
 for row in ET.fromstring(z.read(target)).findall('m:sheetData/m:row',ns):
  values={}
  for cell in row.findall('m:c',ns):
   key=''.join(c for c in cell.get('r')if c.isalpha());v=cell.find('m:v',ns);value=v.text if v is not None else ''
   if cell.get('t')=='s':value=strings[int(value)]
   elif cell.get('t')=='inlineStr':value=''.join(t.text or ''for t in cell.findall('.//m:t',ns))
   values[key]=value
  rows.append(values)
 header=rows[0];stores=[x for x in rows[1:]if x.get('X')]
 assert len(stores)==current['record_count']==263
 assert len({x['W']for x in stores})==263
 assert {int(float(x['X']))for x in stores}==set(range(1,264))
 assert collections.Counter(x['E']for x in stores)==current['listing_counts']
 with view.open(encoding='utf-8-sig',newline='') as f:csvrows=list(csv.DictReader(f))
 assert len(csvrows)==263
 by={int(float(x['No.'])):x for x in csvrows}
 for row in stores:
  csvrow=by[int(float(row['X']))]
  for col,name in header.items():
   if col in ['N','O']:assert float(csvrow[name])==float(row[col]),(row['X'],name)
   elif col=='X':assert int(float(csvrow[name]))==int(float(row[col])),(row['X'],name)
   else:assert csvrow[name]==str(row.get(col,'')),(row['X'],name)
print('PASS: unchanged workbook, 11 worksheets, 263 IDs/keys, 245/17/1, CSV correspondence')
