'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('v2/common/js/town-svg-data-contract.js','utf8');
const ctx={};ctx.globalThis=ctx;vm.runInNewContext(src,ctx);
const api=ctx.KussoonTownSvgDataContract;
const eq=(a,b)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),b);
async function run(){
 const svgSource={towns:[
  {name:'A',reading:'えー',communities:['北','南'],d:'M0,0L4,0L4,4Z M9,9L13,9L13,13Z'},
  {name:'B',reading:'びー',communities:['南'],d:'M30,30L40,30L40,40Z'}
 ],viewBox:'0 0 100 100'};
 const svg=await api.loadUnified({municipalityId:'demo-city',sourceFormat:'svg',
  htmlPath:'/demo/towns.html',infoPath:'/demo/info.json',expectedTownCount:2,expectedRegionCount:2},
  {svgAdapter:{loadSvgTownSource:async()=>svgSource}});
 assert.equal(svg.records.length,2);assert.equal(svg.regions.length,2);
 eq(svg.records[0],{name:'A',reading:'えー',communities:['北','南'],
  geometry:{format:'svg-path',data:svgSource.towns[0].d}});
 assert.equal(svg.records[0].geometry.data,svgSource.towns[0].d,'multipart raw SVG unchanged');
 assert.equal(svg.raw,svgSource);
 const topology={type:'Topology',objects:{town:{geometries:[]}}};
 const features=[{type:'Feature',properties:{S_NAME:'A'},geometry:{type:'MultiPolygon',coordinates:[[[[0,0],[1,0],[0,1],[0,0]]]]}},
  {type:'Feature',properties:{S_NAME:'B'},geometry:{type:'Polygon',coordinates:[]}}];
 const mapping={communities:['北','南'],towns:{A:{community:'北'},B:{community:'南'}}};
 const manifest={municipalityId:'demo-city',sourceFormat:'topojson',topologyUrl:'/topo.json',
  mappingUrl:'/map.json',objectName:'town',townNameProperty:'S_NAME',
  expectedTownCount:2,expectedRegionCount:2};
 const topo=await api.loadUnified(manifest,{
  fetchJSON:async p=>p==='/topo.json'?topology:mapping,
  topojsonClient:{feature:()=>({features})}
 });
 assert.equal(topo.records.length,2);assert.equal(topo.sourceFormat,'topojson');
 assert.equal(topo.records[0].geometry.data,features[0],'GeoJSON geometry must remain unchanged');
 eq(topo.records[0].communities,['北']);eq(topo.regions,['北','南']);
 assert.equal(topo.raw.features,features);
 for(const bad of [
  {...svgSource,towns:[...svgSource.towns,{...svgSource.towns[0]}]},
  {...svgSource,towns:[svgSource.towns[0],{...svgSource.towns[1],name:'A'}]},
  {...svgSource,towns:[svgSource.towns[0],{...svgSource.towns[1],reading:''}]},
  {...svgSource,towns:[svgSource.towns[0],{...svgSource.towns[1],communities:['南','東']}]}
 ]){
  await assert.rejects(()=>api.loadUnified({municipalityId:'demo-city',sourceFormat:'svg',
   htmlPath:'/demo/towns.html',infoPath:'/demo/info.json',
   expectedTownCount:2,expectedRegionCount:2},{svgAdapter:{loadSvgTownSource:async()=>bad}}));
 }
 await assert.rejects(()=>api.loadUnified({...manifest,sourceFormat:'imaginary'},{}));
 console.log('PASS TOWN_SOURCE_UNIFIED unit: SVG multiparts, TopoJSON passthrough, validation, unchanged load()');
}
run().catch(err=>{console.error(err);process.exitCode=1});
