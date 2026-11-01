import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const here=dirname(fileURLToPath(import.meta.url));
const script=resolve(here,'../build.mjs');
const fixture=resolve(here,'synthetic-two-prefectures.geojson');

async function generate(extra=[]){
 const dir=await mkdtemp(join(tmpdir(),'kussoon-topology-'));
 const run=spawnSync(process.execPath,[script,'--input',fixture,'--output',dir,...extra],
  {encoding:'utf8',maxBuffer:4*1024*1024});
 if(run.status!==0){await rm(dir,{force:true,recursive:true});throw Error(run.stderr||run.stdout);}
 const read=async file=>JSON.parse(await readFile(join(dir,file),'utf8'));
 return {dir,read,stdout:run.stdout};
}

test('one national topology produces identical arcs on both prefecture sides',async()=>{
 const result=await generate(['--keep','0.5']);
 try{
  const manifest=await result.read('manifest.json');
  const a=await result.read('27.topojson'),b=await result.read('29.topojson');
  assert.equal(manifest.prefectureCount,2);
  assert.equal(manifest.regionCount,4);
  assert.ok(manifest.sharedPrefectureArcCounts['27-29']>0);
  const left=new Set(a.arcs.map(arc=>JSON.stringify(arc)));
  assert.ok(b.arcs.some(arc=>left.has(JSON.stringify(arc))),
   'shared prefecture seam must have byte-for-byte identical arc geometry');
  assert.deepEqual(a.transform,b.transform);
  const city=a.objects.municipalities.geometries.find(g=>g.properties.N03_007==='27221');
  assert.equal(city.type,'MultiPolygon');
  assert.equal(city.arcs.length,2,'detached component must survive');
 }finally{await rm(result.dir,{force:true,recursive:true});}
});

test('builder rejects missing N03 identifiers; does not silently drop a region',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kussoon-invalid-'));
 try{
  const invalid=await readFile(fixture,'utf8');
  const item=JSON.parse(invalid);
  delete item.features[0].properties.N03_007;
  const file=join(dir,'invalid.geojson');
  const {writeFile}=await import('node:fs/promises');
  await writeFile(file,JSON.stringify(item));
  const p=spawnSync(process.execPath,[script,'--input',file,'--output',join(dir,'out')],
   {encoding:'utf8'});
  assert.notEqual(p.status,0);
  assert.match(p.stderr,/Missing\/invalid N03_007/);
 }finally{await rm(dir,{force:true,recursive:true});}
});
