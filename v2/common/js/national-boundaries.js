/* Kussoon V2 national map core.
 * One geographic coordinate system, municipality codes as stable keys.
 * Local map windows and license-plate memberships are independent overlays.
 * No DOM, no layout-specific/manual coordinates. Experimental 2021 data.
 */
(function(global){
 'use strict';
 const CODE=/^\d{5}$/;
 const PREF=/^\d{2}$/;
 const distinct=xs=>[...new Set(xs)];
 function registry(topologyByPref,catalog,mode='municipality'){
  if(!['municipality','ward'].includes(mode))throw Error('Unsupported administrative grouping');
  if(typeof global.topojson?.merge!=='function')throw Error('topojson-client is not loaded');
  const designated=new Map((catalog.designatedCities||[]).map(city=>[
   city.prefectureCode+'|'+city.name,city.municipalityCode
  ]));
  const records=[];
  for(const [prefCode,topology] of Object.entries(topologyByPref)){
   if(!PREF.test(prefCode))throw Error('Invalid prefecture code: '+prefCode);
   if(topology?.type!=='Topology'||!Array.isArray(topology.arcs))throw Error('Invalid TopoJSON: '+prefCode);
   const names=Object.keys(topology.objects||{});
   if(names.length!==1||!Array.isArray(topology.objects[names[0]].geometries))
    throw Error('Unrecognized municipality geometry: '+prefCode);
   const grouped=new Map();
   for(const g of topology.objects[names[0]].geometries){
    const p=g.properties||{};
    const code=String(p.N03_007||'');
    const municipality=String(p.N03_004||'');
    const parentCity=p.N03_003?String(p.N03_003):null;
    const prefecture=String(p.N03_001||'');
    if(!CODE.test(code)||code.slice(0,2)!==prefCode||!municipality)
     throw Error('Invalid municipality code/name '+prefCode+': '+code);
    // N03_003 is also used for county names (e.g. 南都留郡).
    // Only entries explicitly registered as designated cities are grouped.
    const designatedId=parentCity?designated.get(prefCode+'|'+parentCity):null;
    const cityName=designatedId?parentCity:null;
    // N03_003 has a county name for towns/villages and a parent city name
    // for designated-city wards. County is part of the full administrative name.
    const county=!designatedId&&parentCity?.endsWith('郡')?parentCity:null;
    const targetCode=mode==='municipality'&&designatedId?designatedId:code;
    const targetName=mode==='municipality'&&designatedId?cityName:municipality;
    const key=prefCode+':'+targetCode;
    if(!grouped.has(key))grouped.set(key,{
      id:key,code:targetCode,name:targetName,
      fullName:cityName&&mode==='ward'?cityName+municipality:
       county?county+municipality:targetName,
      county,
      prefecture,prefectureCode:prefCode,major:cityName&&mode==='ward'?cityName:null,
      municipalityCodes:[],geometries:[]
    });
    const group=grouped.get(key);
    if(group.name!==targetName)throw Error('Conflicting administrative unit name '+key);
    group.municipalityCodes.push(code);group.geometries.push(g);
   }
   for(const group of grouped.values()){
    const geometry=global.topojson.merge(topology,group.geometries);
    if(geometry.type!=='MultiPolygon'||!Array.isArray(geometry.coordinates))
     throw Error('Invalid dissolved boundary for '+group.name);
    const geoPolygons=geometry.coordinates.filter(p=>p.length);
    if(!geoPolygons.length)throw Error('Empty region '+group.name);
    const {geometries,...metadata}=group;
    records.push({...metadata,municipalityCodes:distinct(group.municipalityCodes),geoPolygons});
   }
  }
  const ids=records.map(r=>r.id);
  if(new Set(ids).size!==ids.length)throw Error('Duplicate administrative IDs');
  return records;
 }
 function project(records,engine,{maxSpan=850,pad=30}={}){
  if(!records.length)throw Error('No regions to project');
  const positions=records.flatMap(r=>r.geoPolygons.flatMap(p=>p.flat()));
  let latSum=0;
  for(const [lon,lat] of positions){if(!Number.isFinite(lon)||!Number.isFinite(lat))throw Error('Invalid coordinate');latSum+=lat;}
  const lonFactor=Math.cos((latSum/positions.length)*Math.PI/180);
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  for(const [lon,lat] of positions){const x=lon*lonFactor,y=-lat;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  const scale=maxSpan/Math.max(x1-x0,y1-y0);
  const width=(x1-x0)*scale+pad*2,height=(y1-y0)*scale+pad*2;
  const projectPoint=([lon,lat])=>[pad+(lon*lonFactor-x0)*scale,pad+(-lat-y0)*scale];
  const models=records.map(r=>{
   const rings=r.geoPolygons.flatMap(polygon=>polygon.map(ring=>ring.map(projectPoint)));
   const {geoPolygons,...props}=r;
   return {...props,rings,box:engine.bbox(rings),centroid:engine.centroid(rings),
    polylabel:engine.polylabel(rings)};
  });
  return {models,bounds:{x:0,y:0,w:width,h:height},projectPoint};
 }
 function plateMembers(models,plate){
  const needed=new Set(plate.municipalityCodes);
  if(needed.size!==plate.municipalityCodes.length)throw Error('Duplicate plate membership codes');
  const codes=new Set();
  const matches=[];
  for(const m of models){
   const included=m.municipalityCodes.some(code=>needed.has(code));
   if(included){matches.push(m);for(const c of m.municipalityCodes)if(needed.has(c))codes.add(c);}
  }
  const missing=[...needed].filter(c=>!codes.has(c));
  if(missing.length)throw Error('Missing plate municipalities: '+missing.join(', '));
  if(matches.some(m=>m.municipalityCodes.some(c=>!needed.has(c))))
   throw Error('A plate area partially overlaps a grouped municipality; use ward mode');
  return matches;
 }
 function joinPlateShape(members,engine){
  if(!members.length)throw Error('Empty plate area');
  const rings=members.flatMap(m=>m.rings);
  return {id:'plate',code:null,name:'',rings,box:engine.bbox(rings),
   centroid:engine.centroid(rings),polylabel:engine.polylabel(rings)};
 }
 function boundsFor(models){
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const m of models){minX=Math.min(minX,m.box.minX);maxX=Math.max(maxX,m.box.maxX);
   minY=Math.min(minY,m.box.minY);maxY=Math.max(maxY,m.box.maxY);}
  return {x:minX,y:minY,w:maxX-minX,h:maxY-minY};
 }
 global.KussoonNationalBoundaries={registry,project,plateMembers,joinPlateShape,boundsFor};
})(window);
