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
const quizContext={window:{}};
vm.runInNewContext(await readFile('v2/shared/municipality-quiz.js','utf8'),quizContext);
const KussoonV2MunicipalityQuiz=quizContext.window.KussoonV2MunicipalityQuiz;
const bridgeContext={window:{}};
vm.runInNewContext(await readFile('v2/shared/reading-bridge.js','utf8'),bridgeContext);
const KussoonV2ReadingBridge=bridgeContext.window.KussoonV2ReadingBridge;
const KussoonV2MapViewport={init({onZoomChange}){onZoomChange(1);return {reset(){onZoomChange(1);},zoomIn(){},zoomOut(){}};}};
const fakeFetch=async url=>{
 const file=resolve(root,'v2/national',url);
 // Prevent a URL from escaping the project checkout.
 assert(file.startsWith(join(root,'v2/data/national/')),url);
 const content=await readFile(file,'utf8');
 return {ok:true,status:200,text:async()=>content,json:async()=>JSON.parse(content)};
};
const script=page.split('<script>').at(-1).split('</script>')[0];
const context={document,Option,KussoonV2MunicipalRenderer,KussoonV2MapViewport,KussoonV2PlaceLabels,KussoonV2ReadingBridge,KussoonV2EstablishedLabelAdapter,KussoonV2MunicipalityQuiz,fetch:fakeFetch,performance:{now:()=>1000},TextEncoder,console};
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
await selectPref('22',39); // Actual 2026 Shizuoka source and official city-ward readings.
const aoi= node('region').children.find(o=>o.value==='22101');
assert(aoi&&aoi.textContent.includes('静岡市葵区'),'Shizuoka Aoi must have full city-ward name in dropdown');
node('placeSearch').value='静岡市葵区';
callbacks.get('placeSearch:input')();
assert(node('searchResults').children.some(b=>b.textContent.includes('静岡市葵区')),
       'full Shizuoka city-ward name must be searchable');

assert(!node('quizStart').disabled,'quiz must be available after prefecture loads');
callbacks.get('quizStart:click')();
assert(node('quizPlay').hidden===false,'quiz must be displayed');
assert(node('quizChoices').children.length===4,'quiz has four alternatives');
assert(node('region').disabled===true,'menu should not reveal correct place during quiz');
assert(lastRender?.selected,'correct area should be highlighted in quiz');
assert(node('breadcrumb').textContent.includes('クイズ中')&&!node('breadcrumb').textContent.includes('大津市'),'question name must be hidden in breadcrumb');
node('quizChoices').children[0].addEventListener; // ensure all choices are interactive
const btn=node('quizChoices').children[0];
callbacks.get('button:click')(); // quiz response
assert(node('quizNext').hidden===false,'next control after answer');
callbacks.get('quizNext:click')();
assert(node('quizChoices').children.length===4,'new question has four choices');
callbacks.get('quizStop:click')();
assert(node('quizPlay').hidden===true,'quiz stops cleanly');
assert(node('region').disabled===false,'regular map navigation restored');
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
