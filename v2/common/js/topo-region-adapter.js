/* Kussoon V2: small TopoJSON -> planar municipality model adapter.
 * Decodes delta-encoded TopoJSON arcs from the authoritative project dataset.
 * Keeps rings/holes and distinct administrative codes; no external library.
 */
(function(global){
'use strict';
function decodeArc(arc,transform){
  let x=0,y=0;
  const out=[];
  for(const p of arc){
    x+=p[0];y+=p[1];
    out.push([x*transform.scale[0]+transform.translate[0],
              y*transform.scale[1]+transform.translate[1]]);
  }
  return out;
}
function decodeTopology(topo,objectName='city'){
  if(topo?.type!=='Topology'||!topo.transform||!Array.isArray(topo.arcs))
    throw new Error('TopoJSONデータが不正です');
  const geometry=topo.objects?.[objectName];
  if(!geometry||!Array.isArray(geometry.geometries))
    throw new Error('指定した行政区域がありません: '+objectName);
  const cache=new Map();
  function getArc(i){
    const key=i<0?~i:i;
    if(key<0||key>=topo.arcs.length)throw new Error('不正なArc ID: '+i);
    if(!cache.has(key))cache.set(key,decodeArc(topo.arcs[key],topo.transform));
    const line=cache.get(key);
    return i<0?[...line].reverse():line;
  }
  function stitched(ids){
    const ring=[];
    for(const [index,id] of ids.entries()){
      const arc=getArc(id);
      for(const p of arc.slice(index?1:0))ring.push(p);
    }
    // Repeated terminal vertex is unnecessary for the geometry engine.
    if(ring.length>2&&ring[0][0]===ring[ring.length-1][0]&&ring[0][1]===ring[ring.length-1][1])
      ring.pop();
    return ring;
  }
  return geometry.geometries.map(g=>{
    const polygons=g.type==='MultiPolygon'?g.arcs:g.type==='Polygon'?[g.arcs]:null;
    if(!polygons)throw new Error('未対応の形状: '+g.type);
    const rings=polygons.flatMap(poly=>poly.map(stitched).filter(r=>r.length>=3));
    if(!rings.length)throw new Error('空の地理形状');
    return {properties:g.properties||{},rings,polygonCount:polygons.length};
  });
}
function projectRegions(regions,engine,options={}){
  const width=options.width||900,pad=options.padding??30;
  const lonScale=Math.cos((options.referenceLatitude??35)*Math.PI/180);
  const points=regions.flatMap(g=>g.rings.flat());
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const [lon,lat] of points){
    const x=lon*lonScale,y=-lat;
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);
    minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  }
  const scale=(width-pad*2)/Math.max(maxX-minX,maxY-minY);
  if(!(scale>0)&&!Number.isFinite(scale))throw new Error('投影範囲が不正です');
  const height=(maxY-minY)*scale+pad*2;
  const models=regions.map(g=>{
    const props=g.properties;
    const code=String(props.N03_007||'');
    const name=String(props.N03_004||'');
    if(!/^\d{5}$/.test(code)||!name)throw new Error('行政区域コードまたは名前が不正です');
    const rings=g.rings.map(r=>r.map(([lon,lat])=>[
      pad+(lon*lonScale-minX)*scale,
      pad+(-lat-minY)*scale
    ]));
    return {id:code,code,name,major:props.N03_003||null,rings,
      polygonCount:g.polygonCount,
      box:engine.bbox(rings),centroid:engine.centroid(rings),
      polylabel:engine.polylabel(rings)};
  });
  const keys=models.map(m=>m.id);
  if(new Set(keys).size!==keys.length)throw new Error('行政区域コードが重複しています');
  return {models,width,height,bounds:{x:0,y:0,w:width,h:height}};
}
global.KussoonTopoRegionAdapter={decodeTopology,projectRegions};
})(window);
