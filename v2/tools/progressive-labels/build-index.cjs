'use strict';
// Derive LABEL metadata only. Never regenerate geometry, offices or URL audits.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),hash=p=>createHash('sha256').update(read(p)).digest('hex');
const ctx={window:{}};vm.createContext(ctx);for(const p of ['v2/common/js/label-engine.js','v2/national/centered-labels.js','v2/shared/reading-bridge.js'])vm.runInContext(read(p),ctx);
const E=ctx.window.KussoonLabelEngine,M=ctx.window.KussoonCenteredLabels,B=ctx.window.KussoonV2ReadingBridge;
const prefix='v2/data/national/2026-common/',manifestPath=prefix+'national-2026-pilot/manifest.json',manifest=JSON.parse(read(manifestPath));
const readingPath='v2/data/national/municipality-readings-all-source.json',reading=JSON.parse(read(readingPath)),referencePath='v2/data/national/office-reference-points.json',refs=JSON.parse(read(referencePath)).points;
const cos=Math.cos(35*Math.PI/180),project=p=>[p[0]*cos*1000,-p[1]*1000],inverse=p=>[p[0]/cos/1000,-p[1]/1000],round=n=>Number(n.toFixed(9));
const sources={[manifestPath]:hash(manifestPath),[readingPath]:hash(readingPath),[referencePath]:hash(referencePath),'v2/national/centered-labels.js':hash('v2/national/centered-labels.js'),'v2/shared/reading-bridge.js':hash('v2/shared/reading-bridge.js')},entries=[];
for(const meta of manifest.entries){
 const file=prefix+meta.source;sources[file]=hash(file);const t=JSON.parse(read(file));
 const arcs=t.arcs.map(a=>{let x=0,y=0;return a.map(p=>{if(!t.transform)return p;x+=p[0];y+=p[1];return [x*t.transform.scale[0]+t.transform.translate[0],y*t.transform.scale[1]+t.transform.translate[1]];});});
 const ring=ids=>{const out=[];for(const id of ids){const a=id<0?arcs[~id].slice().reverse():arcs[id];out.push(...(out.length?a.slice(1):a));}return out;};
 const geometries=t.objects.municipalities.geometries;if(geometries.length!==meta.regions)throw Error('source count '+meta.pref);
 for(const g of geometries){
  const polys=g.type==='Polygon'?[g.arcs.map(ring)]:g.arcs.map(p=>p.map(ring)),code=String(g.properties.N03_007);
  const region=B.attach([{code,name:g.properties.N03_004,polys}],reading).regions[0];
  const components=polys.map(p=>p.map(r=>r.map(project))),rings=components.flat(),box=E.bbox(rings),site=refs[code];
  const model={code,name:region.name,components,rings,box,centroid:E.centroid(rings),officeReferencePoint:site?project([site.longitude,site.latitude]):null};
  const result=M.officeComponent5(model),anchor=inverse(result.point);
  if(!E.isInside(...project(anchor.map(round)),rings))throw Error('anchor outside '+code);
  entries.push({code,pref:meta.pref,name:region.name,fullName:region.fullName,parts:region.readingParts,reading:region.reading,major:region.readingParts?.length===2?region.readingParts[0].name:null,county:g.properties.N03_003||null,anchor:anchor.map(round),bounds:[box.minX/cos/1000,-box.maxY/1000,box.maxX/cos/1000,-box.minY/1000].map(round),anchorReason:result.officeReason});
 }
}
entries.sort((a,b)=>a.code.localeCompare(b.code));if(entries.length!==1905||new Set(entries.map(x=>x.code)).size!==1905)throw Error('index coverage');
sources['v2/common/js/label-engine.js']=hash('v2/common/js/label-engine.js');
sources['v2/tools/progressive-labels/build-index.cjs']=hash('v2/tools/progressive-labels/build-index.cjs');
const result={version:1,year:2026,count:1905,strategy:'5C with existing sourced references; otherwise 5B; nationwide opt-in prototype only',sources,entries};
result.prefectureBytes=Object.fromEntries(manifest.entries.map(m=>[m.pref,Buffer.byteLength(read(prefix+m.source))]));
const output=JSON.stringify(result)+'\n',target=path.join(root,'v2/data/national/2026-common/national-2026-pilot/label-index.json');
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw Error('stale derived label index');console.log('PASS reproducible index: 47 current source files / 1905 automatic interior anchors');}
else{fs.writeFileSync(target,output);console.log('WROTE derived label index only: '+Buffer.byteLength(output)+' bytes, '+entries.length+' labels');}
module.exports=result;
