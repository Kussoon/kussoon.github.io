// Data preparation only. Uses the unchanged nationwide modules present at PR595.
// No placement search runs during map interaction; approved existing city data is untouched.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
function generate(features,d3,engine,readable){
 const projection=d3.geoMercator().scale(100000).translate([0,0]);
 const candidates={},fallback=[];
 for(const feature of features){
  const name=feature.properties.S_NAME;
  const geographic=feature.geometry.type==='Polygon'?feature.geometry.coordinates:feature.geometry.coordinates[0];
  const rings=geographic.map(r=>r.map(projection));
  // Same first-ring projected centroid as the approved C/PR595 adapter.
  let point=engine.centroid([rings[0]]),method='first-ring-centroid';
  if(!engine.isInside(...point,rings)){
   const model={rings,centroid:point,box:engine.bbox(rings),polylabel:engine.polylabel(rings)};
   point=readable.safeInteriorCenter(model,engine);method='existing-safe-interior';fallback.push(name);
  }
  assert(engine.isInside(...point,rings),'Candidate outside town: '+name);
  const [lon,lat]=projection.invert(point);candidates[name]=[[lat,lon]];
 }
 return {candidates,diagnostics:{count:features.length,fallback,method:'PR595 first-ring centroid; only outside/hole candidates use unchanged safeInteriorCenter',moduleBlobs:{labelEngine:'ce88bcadc5c2cb6329eb8f68866a4b7b59a0d1ef',readableLabels:'5a45acd509255b53daaa55cd5dc1f80102bad265'}}};
}
function modules(){const context={window:{}};vm.createContext(context);for(const file of ['label-engine.js','readable-labels.js'])vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../v2/common/js',file),'utf8'),context);return context.window}
module.exports={generate,modules};
if(require.main===module){
 const [topologyFile,configFile]=process.argv.slice(2),topo=require(process.env.TOPOJSON_CLIENT_PATH||'topojson-client'),d3=require(process.env.D3_MODULE_PATH||'d3');
 const topology=JSON.parse(fs.readFileSync(topologyFile)),config=JSON.parse(fs.readFileSync(configFile)),m=modules();
 const result=generate(topo.feature(topology,topology.objects.town).features,d3,m.KussoonLabelEngine,m.KussoonReadableLabels);
 config.multiLabels=result.candidates;config.labelCandidateAudit=result.diagnostics;fs.writeFileSync(configFile,JSON.stringify(config)+'\n');console.log(JSON.stringify(result.diagnostics));
}
