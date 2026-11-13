const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const root=path.join(__dirname,'..');
const dataDir=path.join(root,'data/offices');
const auditPath=path.join(root,'audit/wikipedia-links-2026-11-13.csv');
const changesPath=path.join(root,'audit/wikipedia-link-changes-2026-11-13.csv');

function parseCsv(file){
 const [header,...lines]=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').trimEnd().split(/\r?\n/);
 const columns=header.split(',');
 return lines.map(line=>{
  const cells=[];let value='',quoted=false;
  for(let i=0;i<line.length;i++){
   const ch=line[i];
   if(ch==='"'&&quoted&&line[i+1]==='"'){value+='"';i++;}
   else if(ch==='"')quoted=!quoted;
   else if(ch===','&&!quoted){cells.push(value);value='';}
   else value+=ch;
  }
  cells.push(value);
  return Object.fromEntries(columns.map((key,index)=>[key,cells[index]||'']));
 });
}

function sorted(value){
 if(Array.isArray(value))return value.map(sorted);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,sorted(value[k])]));
 return value;
}
function stableSha(value){
 return crypto.createHash('sha256').update(JSON.stringify(sorted(value))).digest('hex');
}

test('all 47 prefecture office datasets cover 1,912 unique municipality codes',()=>{
 const files=fs.readdirSync(dataDir).filter(name=>/^\d{2}\.json$/.test(name)).sort();
 assert.equal(files.length,47);
 const codes=new Set();let regionCount=0;
 for(const file of files){
  const pref=file.slice(0,2),data=JSON.parse(fs.readFileSync(path.join(dataDir,file),'utf8'));
  assert.equal(data.prefecture,pref);
  for(const [code,region] of Object.entries(data.regions)){
   assert.match(code,/^\d{5}$/);assert.ok(code.startsWith(pref),code);
   assert.ok(!codes.has(code),'duplicate municipality code '+code);codes.add(code);
   assert.ok(region.name&&region.kind,code+' missing municipality identity');
   regionCount++;
  }
 }
 assert.equal(regionCount,1912);assert.equal(codes.size,1912);
});

test('audit records all regions and validates direct ja.wikipedia article identity',()=>{
 const audit=parseCsv(auditPath),changes=parseCsv(changesPath);
 assert.equal(audit.length,1912);
 const byCode=new Map(audit.map(row=>[row.municipality_code,row]));
 assert.equal(byCode.size,1912);
 const counts={A:0,B:0,C:0,D:0,E:0};let initialSearch=0,initialDirect=0;
 for(const file of fs.readdirSync(dataDir).filter(name=>/^\d{2}\.json$/.test(name))){
  const data=JSON.parse(fs.readFileSync(path.join(dataDir,file),'utf8'));
  for(const [code,region] of Object.entries(data.regions)){
   const row=byCode.get(code);assert.ok(row,'missing audit row '+code);
   assert.equal(row.municipality_name,region.name,code+' name mismatch');
   assert.equal(row.prefecture_code,file.slice(0,2),code+' prefecture mismatch');
   assert.ok(row.municipality_type,code+' missing classification');
   counts[row.verdict]++;
   if(row.current_wikipedia_url.includes('/w/index.php?search='))initialSearch++;
   else if(row.current_wikipedia_url.includes('/wiki/'))initialDirect++;
   assert.equal(row.wikidata_item,row.verified_page_wikidata_item,code+' page and identity QID differ');
   assert.ok(row.matched_dantai_code.startsWith(code),code+' P429 code mismatch');
   assert.match(row.candidate_wikipedia_url,/^https:\/\/ja\.wikipedia\.org\/wiki\//,code+' is not a direct Japanese article');
   assert.equal(decodeURIComponent(new URL(row.candidate_wikipedia_url).pathname.slice('/wiki/'.length)),row.candidate_page_title.replaceAll(' ','_'),code+' title mismatch');
   assert.ok(row.verified_page_title&&row.verified_page_id,code+' page not confirmed by MediaWiki API');
   assert.ok(row.article_intro_excerpt,code+' article intro not confirmed');
   if(row.verdict==='A')assert.equal(row.current_page_wikidata_item,row.wikidata_item,code+' retained direct link must resolve to the matched QID');
   if(row.verdict==='C')assert.ok(!row.current_page_id||row.current_page_wikidata_item!==row.wikidata_item,code+' correction must have a verified mismatch or missing prior page');
   const expected=row.verdict==='A'?row.current_wikipedia_url:row.candidate_wikipedia_url;
   assert.equal(region.wikipedia,expected,code+' live data differs from its audit verdict');
   const nonWiki={...region};delete nonWiki.wikipedia;
   assert.equal(stableSha(nonWiki),row.region_non_wikipedia_sha256,code+' non-Wikipedia region data changed');
   assert.equal(row.verdict==='A'||row.verdict==='B'||row.verdict==='C',true,code+' unresolved article');
  }
 }
 assert.deepEqual(counts,{A:268,B:1634,C:10,D:0,E:0});
 assert.equal(initialDirect,278);assert.equal(initialSearch,1634);
 assert.equal(changes.length,1644);
 assert.equal(changes.filter(row=>row.municipality_code==='12101').length,1);
 const central=byCode.get('12101');
 assert.equal(central.candidate_page_title,'中央区 (千葉市)');
 assert.equal(central.wikidata_item,'Q1075869');
 assert.match(central.article_intro_excerpt,/千葉県千葉市を構成する行政区/);
 assert.equal(central.candidate_wikipedia_url,'https://ja.wikipedia.org/wiki/%E4%B8%AD%E5%A4%AE%E5%8C%BA_(%E5%8D%83%E8%91%89%E5%B8%82)');
 const centralWards=['01101','12101','13102','27128','28110','40133'].map(code=>byCode.get(code));
 assert.equal(new Set(centralWards.map(row=>row.wikidata_item)).size,centralWards.length);
 assert.equal(new Set(centralWards.map(row=>row.candidate_page_title)).size,centralWards.length);
});

test('the 278 previously direct links are retained when correct and corrected only when mismatched',()=>{
 const audit=parseCsv(auditPath),direct=audit.filter(row=>row.current_wikipedia_url.includes('/wiki/'));
 assert.equal(direct.length,278);
 assert.equal(direct.filter(row=>row.verdict==='A').length,268);
 assert.equal(direct.filter(row=>row.verdict==='C').length,10);
 for(const row of direct){
  const data=JSON.parse(fs.readFileSync(path.join(dataDir,row.prefecture_code+'.json'),'utf8'));
  const active=data.regions[row.municipality_code].wikipedia;
  assert.equal(active,row.verdict==='A'?row.current_wikipedia_url:row.candidate_wikipedia_url,row.municipality_code);
 }
});

test('same-name wards and municipalities resolve to code-specific, distinct Wikipedia items',()=>{
 const rows=parseCsv(auditPath),groups=new Map();
 for(const row of rows){const list=groups.get(row.municipality_name)||[];list.push(row);groups.set(row.municipality_name,list);}
 const duplicates=[...groups.entries()].filter(([,list])=>list.length>1);
 assert.ok(duplicates.length>0,'audit should include homonymous municipalities');
 for(const [name,list] of duplicates){
  assert.equal(new Set(list.map(row=>row.wikidata_item)).size,list.length,name+' must resolve each code to a distinct item');
  assert.equal(new Set(list.map(row=>row.candidate_wikipedia_url)).size,list.length,name+' must resolve each code to a distinct article');
 }
});
