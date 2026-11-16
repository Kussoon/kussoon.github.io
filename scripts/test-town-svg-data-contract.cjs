'use strict';
// Pure contract checks, plus exact Nishinomiya 321/26 real dataset integration.
// Does not open or mutate the current map implementation.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const topojsonClient=require('topojson-client');
const sandbox={};sandbox.globalThis=sandbox;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../v2/common/js/town-svg-data-contract.js'),'utf8'),sandbox);
const {validateManifest,load}=sandbox.KussoonTownSvgDataContract;
const source={
 municipalityId:'jp-hyogo-nishinomiya',
 topologyUrl:'/v2/data/nishinomiya-town-v2-premerged.topojson',
 mappingUrl:'/nishinomiya/data/community-town-map.json',
 exceptionUrl:'/v2/data/nishinomiya-uekoto-community.topojson',
 objectName:'town',townNameProperty:'S_NAME',expectedTownCount:321,expectedRegionCount:26
};
function copy(o){return JSON.parse(JSON.stringify(o))}
const root=path.join(__dirname,'..');
const local={
 [source.topologyUrl]:JSON.parse(fs.readFileSync(path.join(root,source.topologyUrl.slice(1)),'utf8')),
 [source.mappingUrl]:JSON.parse(fs.readFileSync(path.join(root,source.mappingUrl.slice(1)),'utf8')),
 [source.exceptionUrl]:JSON.parse(fs.readFileSync(path.join(root,source.exceptionUrl.slice(1)),'utf8'))
};
(async()=>{
 let calls=[];
 const result=await load(source,{fetchJSON:async url=>{calls.push(url);assert(url in local);return local[url]},topojsonClient});
 assert.equal(result.features.length,321);
 assert.equal(new Set(result.features.map(x=>x.properties.S_NAME)).size,321);
 assert.equal(result.mapping.communities.length,26);
 assert(result.subtopology.objects.town.geometries.length===6);
 assert(calls.length===3&&calls.includes(source.exceptionUrl));
 assert(Object.isFrozen(result.manifest));
 const count=result.features.filter(f=>f.geometry.type==='MultiPolygon').length;
 console.log('NISHINOMIYA_DATA_CONTRACT '+JSON.stringify({towns:321,regions:26,multiPolygonTowns:count,exceptionGeometries:6}));
 const ordinary=copy(source);ordinary.municipalityId='jp-testcity';ordinary.expectedTownCount=2;ordinary.expectedRegionCount=1;delete ordinary.exceptionUrl;
 const fixture={
  type:'Topology',objects:{town:{type:'GeometryCollection',geometries:[
   {type:'Polygon',properties:{S_NAME:'本町'},arcs:[[0]]},
   {type:'MultiPolygon',properties:{S_NAME:'飛び地町'},arcs:[[[1]],[[2]]]}
  ]}},arcs:[
   [[0,0],[2,0],[0,2],[-2,0],[0,-2]],
   [[4,0],[1,0],[0,1],[-1,0],[0,-1]],
   [[6,0],[1,0],[0,1],[-1,0],[0,-1]]
  ]
 };
 let fetched=[];const ordinaryMap={communities:['中心'],towns:{'本町':{community:'中心'},'飛び地町':{community:'中心'}}};
 const toy=await load(ordinary,{fetchJSON:async u=>{fetched.push(u);return u===ordinary.topologyUrl?fixture:ordinaryMap},topojsonClient});
 assert.equal(toy.features.length,2);assert.equal(toy.subtopology,null);
 assert.equal(toy.features[1].geometry.type,'MultiPolygon','disjoint shape must be one town ID');
 assert.deepEqual(fetched,[ordinary.topologyUrl,ordinary.mappingUrl]);
 for(const change of [
  {expectedTownCount:1},{expectedRegionCount:2},{municipalityId:'bad space'},
  {exceptionUrl:'https://external.example/file.json'},{topologyUrl:'//host/path'}
 ]){
  const modified={...ordinary,...change};
  if(change.expectedTownCount===1||change.expectedRegionCount===2)
   await assert.rejects(()=>load(modified,{fetchJSON:async u=>u===ordinary.topologyUrl?fixture:ordinaryMap,topojsonClient}));
  else assert.throws(()=>validateManifest(modified));
 }
 await assert.rejects(()=>load(ordinary,{fetchJSON:async u=>u===ordinary.topologyUrl?
  {...fixture,objects:{invalid:fixture.objects.town}}:ordinaryMap,topojsonClient}));
 await assert.rejects(()=>load(ordinary,{fetchJSON:async u=>u===ordinary.topologyUrl?
  {...fixture,objects:{town:{type:'GeometryCollection',geometries:[
   {...fixture.objects.town.geometries[0]},{...fixture.objects.town.geometries[0]}
  ]}}}:ordinaryMap,topojsonClient}));
 await assert.rejects(()=>load(ordinary,{fetchJSON:async u=>u===ordinary.topologyUrl?fixture:
  {communities:['中心','中心'],towns:ordinaryMap.towns},topojsonClient}));
 console.log('PASS TOWN_SVG_DATA_CONTRACT: 321/26 real data, optional exception, detached MultiPolygon, bad-count/name/path rejection');
})().catch(err=>{console.error(err);process.exitCode=1});
