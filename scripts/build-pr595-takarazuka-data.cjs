const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const topo=require(process.env.TOPOJSON_CLIENT_PATH||'topojson-client');
const source=JSON.parse(fs.readFileSync(process.argv[2]));
const info=JSON.parse(fs.readFileSync(process.argv[3])).towns;
const groups=new Map(info.map(t=>[t.name,[]]));
const sourceIndex=new Map(source.objects.town.geometries.map((g,i)=>[g,i]));
const alias={'布売自由ガ丘':'売布自由ガ丘'};
for(const g of source.objects.town.geometries){
 const raw=g.properties.S_NAME,base=raw.replace(/[一二三四五六七八九十百]+丁目$/,'');
 const name=alias[base]||base;assert(groups.has(name),'Unmatched source: '+raw);groups.get(name).push(g);
}
const geometries=info.map(t=>{const members=groups.get(t.name);assert(members.length);return {...topo.mergeArcs(source,members),properties:{S_NAME:t.name,sourceKeys:members.map(g=>g.properties.KEY_CODE),sourceRecords:members.map(g=>sourceIndex.get(g))}}});
const merged={...source,objects:{town:{type:'GeometryCollection',geometries}},metadata:{...source.metadata,processing:'丁目を既存125町名へ集約。布売自由ガ丘を既存台帳の売布自由ガ丘へ補正。座標・元arcは変更しない。',sourceRepository:'Kussoon/takarazuka',sourceCommit:'fe3c5692ab0547348b67a47874a1c43f2c382c5a',sourceGeometryRecordCount:398,sourceStatisticalKeyCount:337,displayTownCount:125}};
const readings={"すみれガ丘":"すみれがおか","長尾台":"ながおだい","逆瀬台":"さかせだい","小浜":"こはま","西谷":"にしたに","中山台":"なかやまだい","長尾":"ながお","売布":"めふ","宝塚第一":"たからづかだいいち","良元":"りょうげん","末成":"すえなり","仁川":"にがわ","末広":"すえひろ","光明":"こうみょう","西山":"にしやま","高司":"たかつかさ","安倉":"あくら","宝小":"ほうしょう","美座":"みざ","山本山手":"やまもとやまて"};
const config={code:'28214',name:'宝塚市',municipalityId:'jp-hyogo-takarazuka',expectedTownCount:125,expectedRegionCount:20,topologyUrl:'/v2/verify-town-map-pr595/data/28214.topojson',mappingUrl:'/v2/verify-town-map-pr595/data/28214-membership.json',objectName:'town',townNameProperty:'S_NAME',readings:Object.fromEntries(info.map(t=>[t.name,t.reading])),regionReadings:readings,membership:{additionalRegions:Object.fromEntries(info.filter(t=>t.communities.length>1).map(t=>[t.name,t.communities.slice(1)]))},sources:{topology:'https://github.com/Kussoon/takarazuka/blob/fe3c5692ab0547348b67a47874a1c43f2c382c5a/data/takarazuka-towns.topojson',townRegister:'https://github.com/Kussoon/takarazuka/blob/fe3c5692ab0547348b67a47874a1c43f2c382c5a/data/takarazuka-town-info.json',regionReadings:'/v2/docs/town-map/TAKARAZUKA_20_REGION_READINGS_20261116.md',statisticalYear:2020,sourceGeometryRecordCount:398,sourceStatisticalKeyCount:337}};
const mapping={communities:Object.keys(readings),towns:Object.fromEntries(info.map(t=>[t.name,{community:t.communities[0]}]))};
const dir=require('node:path').resolve(__dirname,'../v2/verify-town-map-pr595/data')+'/';
for(const [file,data] of Object.entries({'28214.json':config,'28214.topojson':merged,'28214-membership.json':mapping}))fs.writeFileSync(dir+file,JSON.stringify(data)+'\n');
assert.equal(geometries.length,125);assert.equal(groups.size,125);assert.equal([...groups.values()].flat().length,398);
assert.deepEqual(merged.arcs,source.arcs);
const features=topo.feature(merged,merged.objects.town).features;
assert(features.every(f=>f.geometry.coordinates.length>0));
console.log(JSON.stringify({source:398,towns:125,regions:20,multipart:features.filter(f=>f.geometry.coordinates.length>1).map(f=>({name:f.properties.S_NAME,parts:f.geometry.coordinates.length})),sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(process.argv[2])).digest('hex')}));
