#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/town-maps/28217.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'common/js/town-map-engine.js'),'utf8');
const ctx={console};vm.runInNewContext(source,ctx);
const decoded=ctx.KussoonV2TownMap.decode(data.topo);
const expected=data.topo.bbox;
const actual=[decoded.sourceBounds.minX,decoded.sourceBounds.minY,decoded.sourceBounds.maxX,decoded.sourceBounds.maxY];
for(let i=0;i<4;i++)if(Math.abs(actual[i]-expected[i])>1e-9)throw new Error('source bbox mismatch: '+actual+' vs '+expected);
if(decoded.features.length!==191)throw new Error('expected 191 decoded features');
if(decoded.deltaEncoded)throw new Error('Kawanishi source must remain absolute-coordinate TopoJSON');
if(decoded.features.some(f=>f.geometryType!=='Polygon'||!f.d||!f.rings.length))throw new Error('invalid decoded geometry');
const ids=new Set(decoded.features.map(f=>f.id));if(ids.size!==191)throw new Error('duplicate polygon IDs');
if(data.kana.nameEntryCount!==182)throw new Error('expected 182 display names');
if(decoded.projectedBounds.maxX!==1000||decoded.projectedBounds.maxY!==650)throw new Error('invalid projection bounds');
console.log('town-map-engine-geometry: PASS');
