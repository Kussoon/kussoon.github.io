#!/usr/bin/env node
'use strict';
// Research-only importer; no writes to existing V2 geography or town data.
// Usage: node scripts/build-town-candidates.cjs <municipality-code> <input.geojson|input.topojson> <output.json>
// Does not certify names, readings or 2026 boundary correctness.
const fs=require('node:fs');
const path=require('node:path');
const CODES={'28217':'川西市','28219':'三田市','28301':'猪名川町'};
function fail(s){throw new Error(s)}
function extract(input){
 if(input?.type==='FeatureCollection'&&Array.isArray(input.features))
  return input.features.map((f,i)=>({id:String(f.id??f.properties?.KEY_CODE??f.properties?.KEYCODE??f.properties?.S_AREA??i),properties:f.properties||{},geometry:f.geometry}));
 if(input?.type==='Topology'&&input.objects&&typeof input.objects==='object'){
  // CODH TopoJSON can contain both a town layer and a city outline. Prefer the
  // town layer so municipal outlines are never treated as searchable town areas.
  const layers=input.objects.town ? [['town',input.objects.town]] : Object.entries(input.objects);
  const all=layers.flatMap(([key,obj])=>(obj.geometries||[]).map((g,i)=>({
   id:String(g.id??g.properties?.R2KAxx_ID??g.properties?.R2KA_ID??g.properties?.KEY_CODE??g.properties?.KEYCODE??g.properties?.S_AREA??i),
   properties:g.properties||{},geometry:{type:g.type,arcs:g.arcs},objectKey:key
  })));
  if(!all.length)fail('Topologyにgeometriesがありません');return all;
 }
 fail('FeatureCollectionまたはTopologyを指定してください');
}
function fromRaw(code,input){
 if(!CODES[code])fail('対象外の自治体コード: '+code);
 const rows=extract(input), idSet=new Set(), entries=[],errors=[],warnings=[];
 for(const [i,row] of rows.entries()){
  const p=row.properties;
  const name=String(p.S_NAME??p.SNAME??p.MOJI??p.NAME??p.name??'').trim();
  const id=String(p.R2KAxx_ID??p.R2KA_ID??p.KEY_CODE??p.KEYCODE??p.S_AREA??row.id).trim();
  if(!id)errors.push('行'+(i+1)+': 区画IDが空です');
  if(idSet.has(id))errors.push('行'+(i+1)+': 区画ID重複 '+id);idSet.add(id);
  if(!name)errors.push('行'+(i+1)+': 地名が空です');
  if(!row.geometry||!['Polygon','MultiPolygon'].includes(row.geometry.type))errors.push('行'+(i+1)+': 地理形状が不正');
  if(name&&id)entries.push({statisticalAreaId:id,name,geometryType:row.geometry?.type??null,reading:null,readingVerified:false,municipalityCode:code});
 }
 const byName=new Map();
 for(const e of entries){if(!byName.has(e.name))byName.set(e.name,[]);byName.get(e.name).push(e.statisticalAreaId)}
 const duplicates=[...byName.entries()].filter(([,ids])=>ids.length>1).map(([name,ids])=>({name,statisticalAreaIds:ids}));
 if(duplicates.length)warnings.push('同名の統計区画 '+duplicates.length+'件。自動的な町名統合はしない');
 return {
  status:'unverified-statistical-areas',basis:'2020-census',municipalityCode:code,municipality:CODES[code],
  source:'CODH 国勢調査町丁・字等別境界データセット（2020年国勢調査）',
  license:'CC BY 4.0',credit:'『国勢調査町丁・字等別境界データセット』（CODH作成）「令和2年国勢調査町丁・字等別境界データ」（e-Stat）を加工 doi:10.20676/00000450',
  statisticalAreaCount:rows.length,distinctNameCandidates:byName.size,
  errors,warnings,duplicateNames:duplicates,
  entries
 };
}
if(require.main===module){
 try{
  const [code,inputFile,outputFile]=process.argv.slice(2);
  if(!code||!inputFile||!outputFile)fail('Usage: node scripts/build-town-candidates.cjs <28217|28219|28301> <source.json> <output.json>');
  const data=JSON.parse(fs.readFileSync(inputFile,'utf8')),out=fromRaw(code,data);
  if(out.errors.length)fail(out.errors.join('\n'));
  fs.mkdirSync(path.dirname(outputFile),{recursive:true});
  fs.writeFileSync(outputFile,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({municipality:out.municipality,areas:out.statisticalAreaCount,distinctNameCandidates:out.distinctNameCandidates,duplicateNames:out.duplicateNames.length,output:outputFile}));
  console.log('要注意: 出力は未照合候補であり、町名地図・読み仮名の正式データではありません。');
 }catch(e){console.error(e.message);process.exitCode=1}
}
module.exports={extract,fromRaw};
