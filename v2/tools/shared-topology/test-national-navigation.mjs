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
 return {tag,id,value:'',textContent:'',disabled:false,style:{},dataset:{},attrs:{},children:[],
  classList:{add(){},remove(){}},
  setAttribute(k,v){this.attrs[k]=v;},
  append(child){this.children.push(child);},
  replaceChildren(...next){this.children=next;},
  addEventListener(event,callback){callbacks.set((this.id||tag)+':'+event,callback);},
  getBoundingClientRect(){return {left:0,top:0,width:850,height:700};}
 };
}
function node(id){if(!nodes.has(id))nodes.set(id,element('div',id));return nodes.get(id);}
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
 focusBounds(polys){const pts=polys.flat(2);const xx=pts.map(p=>p[0]),yy=pts.map(p=>p[1]);return [Math.min(...xx),Math.min(...yy),Math.max(...xx),Math.max(...yy)];}
};
const KussoonV2MapViewport={init({onZoomChange}){onZoomChange(1);return {reset(){onZoomChange(1);},zoomIn(){},zoomOut(){}};}};
const fakeFetch=async url=>{
 const file=resolve(root,'v2/national',url);
 // Prevent a URL from escaping the project checkout.
 assert(file.startsWith(join(root,'v2/data/national/2026-common/')),url);
 const content=await readFile(file,'utf8');
 return {ok:true,status:200,text:async()=>content,json:async()=>JSON.parse(content)};
};
const script=page.split('<script>').at(-1).split('</script>')[0];
const context={document,Option,KussoonV2MunicipalRenderer,KussoonV2MapViewport,fetch:fakeFetch,performance:{now:()=>1000},TextEncoder,console};
vm.runInNewContext(script,context);
async function flush(){for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));}
await flush();
assert(node('status').textContent.includes('全国47都道府県'),'national overview did not load');
assert.equal(node('pref').children.length,48,'missing prefecture selector option');
assert(node('map').children.length>0,'national map not drawn');
async function selectPref(code,count){
 node('pref').value=code;
 callbacks.get('pref:change')();
 await flush();
 assert(node('status').textContent.includes('表示中です'),code+' failed to load: '+node('status').textContent);
 assert.equal(lastRender?.count,count,code+' incorrect municipality count');
 assert(node('region').children.length===count+1,code+' failed region choices');
 assert(!node('prefBtn').disabled,code+' back navigation disabled');
}
await selectPref('16',15); // Regression: do not reject prefectures under 20 municipalities.
await selectPref('25',19); // Regression: load a newly extracted combined-prefecture slice.
const region=node('region');region.value=region.children[1].value;
callbacks.get('region:change')();
assert(lastRender.selected,'municipality selection did not highlight region');
assert(node('breadcrumb').textContent.includes('＞'),'municipality breadcrumb absent');
callbacks.get('nationBtn:click')();
assert(node('status').textContent.includes('全国47都道府県'),'return-to-nation did not work');
assert.equal(node('pref').value,'','national reset failed');
console.log('PASS actual nationwide page: national overview, 47 controls, small-prefecture data, combined-prefecture slice, municipality selection, national return');
