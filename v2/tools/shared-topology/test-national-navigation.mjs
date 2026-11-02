#!/usr/bin/env node
// Exercise the actual national page with real generated 2026 map data.
// A minimal DOM is sufficient to catch country -> prefecture -> municipality
// routing bugs without installing a browser in GitHub Actions.
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=process.cwd(),page=await readFile('v2/national/official-2026-nationwide-pilot.html','utf8');
const callbacks=new Map(),nodes=new Map(),viewEvents=new Map();
function element(tag='div',id=''){
 return {tag,id,value:'',textContent:'',disabled:false,checked:false,style:{},dataset:{},attrs:{},children:[],
  classList:{add(){},remove(){}},
  setAttribute(k,v){this.attrs[k]=v;},
  append(child){this.children.push(child);},
  replaceChildren(...next){this.children=next;},
  querySelector(){return null;},
  addEventListener(event,callback){callbacks.set((this.id||tag)+':'+event,callback);},
  getBoundingClientRect(){return {left:0,top:0,width:850,height:700};}
 };
}
function node(id){if(!nodes.has(id))nodes.set(id,element('div',id));return nodes.get(id);}
node('nationExtent').value='main';
const document={
 getElementById:node,
 createElement:tag=>element(tag),
 createElementNS:(_,tag)=>element(tag),
 createDocumentFragment:()=>element('fragment'),
 addEventListener(){},
};
const Option=function(text,value){const el=element('option');el.value=value;el.textContent=text;return el;};
let lastRender=null;
const KussoonV2MunicipalRenderer={
 render(opts){lastRender={count:opts.regions.length,selected:opts.selected};},
 focusBounds(){return [135,35,135.5,35.5];}
};
const KussoonV2PlaceLabels={matches(r,q){return r.fullName?.includes(q)||r.name.includes(q)||r.reading?.includes(q)||r.code.includes(q);},show(){}};
const KussoonV2EstablishedLabelAdapter={layout(){return new Map();}};
const KussoonV2ReadingBridge={attach(regions,source){return {regions:regions.map(r=>({...r,reading:source.items[r.code]?.name===r.name?source.items[r.code].reading:''})),stats:{total:regions.length,matched:0,missing:regions.length,mismatched:0}};}};
const KussoonV2MapViewport={init({onZoomChange}){onZoomChange(1);return {reset(){onZoomChange(1);},zoomIn(){},zoomOut(){}};}};
const fakeFetch=async url=>{
 const file=resolve(root,'v2/national',url);
 // Prevent a URL from escaping the project checkout.
 assert(file.startsWith(join(root,'v2/data/national/2026-common/')),url);
 const content=await readFile(file,'utf8');
 return {ok:true,status:200,text:async()=>content,json:async()=>JSON.parse(content)};
};
const script=page.split('<script>').at(-1).split('</script>')[0];
const context={document,Option,KussoonV2MunicipalRenderer,KussoonV2MapViewport,KussoonV2PlaceLabels,KussoonV2ReadingBridge,KussoonV2EstablishedLabelAdapter,fetch:fakeFetch,performance:{now:()=>1000},TextEncoder,console};
vm.runInNewContext(script,context);
async function until(predicate,label){
 for(let i=0;i<200;i++){
  if(predicate())return;
  await new Promise(resolve=>setTimeout(resolve,25));
 }
 throw Error('Timed out: '+label+'; status='+node('status').textContent);
}
await until(()=>node('status').textContent.includes('全国47都道府県'),'national overview');
assert(node('status').textContent.includes('全国47都道府県'),'national overview did not load');
assert.equal(node('pref').children.length,47,'missing prefecture selector options');
assert(node('map').children.length>0,'national map not drawn');
async function selectPref(code,count){
 node('pref').value=code;
 callbacks.get('pref:change')();
 await until(()=>!node('status').textContent.includes('読み込み中です'),'prefecture '+code);
 assert(node('status').textContent.includes('表示中です'),code+' failed to load: '+node('status').textContent);
 assert.equal(lastRender?.count,count,code+' incorrect municipality count');
 assert(node('region').children.length===count+1,code+' failed region choices');
 assert(!node('prefBtn').disabled,code+' back navigation disabled');
}
await selectPref('16',15); // Regression: do not reject prefectures under 20 municipalities.
await selectPref('25',19); // Regression: load a newly extracted combined-prefecture slice.
node('placeSearch').value='大津';
callbacks.get('placeSearch:input')();
assert(node('searchResults').children.length>0,'search result did not appear');
assert(node('readingCoverage').textContent.includes('読み仮名：'),'reading coverage indicator should display');
node('readingMode').value='off';callbacks.get('readingMode:change')();
const region=node('region');region.value=region.children[1].value;
callbacks.get('region:change')();
assert(lastRender.selected,'municipality selection did not highlight region');
assert(node('breadcrumb').textContent.includes('＞'),'municipality breadcrumb absent');
callbacks.get('nationBtn:click')();
assert(node('status').textContent.includes('全国47都道府県'),'return-to-nation did not work');
assert.equal(node('pref').value,'','national reset failed');
console.log('PASS actual nationwide page: national overview, 47 controls, small-prefecture data, combined-prefecture slice, municipality selection, national return');
