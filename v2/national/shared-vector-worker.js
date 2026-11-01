/* Worker: isolate expensive polygon operations from the mobile UI thread. */
'use strict';
self.onmessage=async event=>{
 const area=event.data.area,box=event.data.box,pad=[box[0]-.01,box[1]-.01,box[2]+.01,box[3]+.01];
 try{
  importScripts('https://unpkg.com/topojson-client@3/dist/topojson-client.min.js',
   'https://cdn.jsdelivr.net/npm/polygon-clipping@0.15.7/dist/polygon-clipping.umd.min.js',
   'https://cdn.jsdelivr.net/npm/@turf/turf@7.2.0/turf.min.js');
  const topo=self.topojson,pc=self.polygonClipping,turf=self.turf;
  if(!topo||!pc||!turf)throw Error('計算ライブラリを読み込めませんでした');
  function mp(g){return g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];}
  function nonempty(g){return Array.isArray(g)&&g.length>0;}
  function union(gs){const a=gs.filter(nonempty);return a.length>1?pc.union(...a):a[0]||[];}
  function clip(g){return pc.intersection(g,[[[pad[0],pad[1]],[pad[2],pad[1]],[pad[2],pad[3]],[pad[0],pad[3]],[pad[0],pad[1]]]]);}
  function buffer(g){
   if(!nonempty(g))return [];
   const result=turf.buffer({type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:g}},.35,{units:'kilometers',steps:5});
   return result?mp(result.geometry):[];
  }
  function within(g){
   let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
   function walk(a){if(typeof a[0]==='number'){minX=Math.min(minX,a[0]);maxX=Math.max(maxX,a[0]);minY=Math.min(minY,a[1]);maxY=Math.max(maxY,a[1]);}else a.forEach(walk);}
   walk(g.coordinates);return minX<=pad[2]&&maxX>=pad[0]&&minY<=pad[3]&&maxY>=pad[1];
  }
  function inRing(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
  function inMulti(p,geo){return geo.some(poly=>inRing(p,poly[0])&&!poly.slice(1).some(h=>inRing(p,h)));}
  const features=[];
  for(const pref of ['27','29']){
   const response=await fetch('../data/national/2021/'+pref+'.topojson');
   if(!response.ok)throw Error(pref+'のデータを取得できません（HTTP '+response.status+'）');
   const topology=await response.json(),object=topology.objects[Object.keys(topology.objects)[0]];
   for(const f of topo.feature(topology,object).features){
    if(!within(f.geometry))continue;
    const geometry=clip(mp(f.geometry));
    if(nonempty(geometry))features.push({id:f.properties.N03_007,name:f.properties.N03_004,pref,geometry});
   }
  }
  const osaka=features.filter(f=>f.pref==='27'),nara=features.filter(f=>f.pref==='29');
  const osakaUnion=union(osaka.map(f=>f.geometry));
  const naraUnion=union(nara.map(f=>f.geometry));
  if(!nonempty(osakaUnion)||!nonempty(naraUnion))throw Error('両府県の比較境界が見つかりません');
  const osakaNear=buffer(osakaUnion),naraNear=buffer(naraUnion);
  const fringe=pc.difference(osakaNear,osakaUnion),gaps=nonempty(fringe)?pc.intersection(fringe,naraNear):[];
  const adjusted=osaka.map(f=>({...f}));
  let claimed=[],extraCells=0;
  for(const f of nara){
   let candidate=pc.difference(f.geometry,osakaUnion);
   const additions=nonempty(gaps)?pc.intersection(gaps,buffer(f.geometry)):[];
   if(nonempty(additions))extraCells++;
   candidate=union([candidate,additions]);
   if(nonempty(claimed)&&nonempty(candidate))candidate=pc.difference(candidate,claimed);
   if(!nonempty(candidate))continue;
   claimed=union([claimed,candidate]);
   adjusted.push({...f,geometry:candidate});
  }
  // Send an ordered polyline representation of Osaka's shared border.
  const lines=[];
  for(const poly of osakaUnion)for(const ring of poly)for(let i=0;i<ring.length-1;i++){
   const a=ring[i],b=ring[i+1],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
   if(inMulti(mid,naraNear))lines.push([a,b]);
  }
  self.postMessage({ok:true,area,adjusted,lines,extraCells});
 }catch(err){self.postMessage({ok:false,area,error:String(err?.message||err)});}
};
