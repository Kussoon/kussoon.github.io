/* Kussoon V2 town SVG shared data + gesture helpers, experimental phase 3.
 * Caller supplies URLs, expected counts and D3 zoom callbacks.
 * No labels, community exceptions, quiz grading, or geometry are managed here.
 */
(function(root){
 'use strict';
 async function fetchJSON(url){
  if(typeof url!=='string'||!url.startsWith('/'))throw new Error('町域データはサイト内の絶対パスで指定してください');
  const response=await fetch(url);
  if(!response.ok)throw new Error(url+'：HTTP '+response.status);
  return response.json();
 }
 async function loadTownData(paths, topojsonClient, townObject, expectedTownCount){
  if(!paths||!paths.topology||!paths.community||!paths.exceptions)throw new Error('町域データの指定が不足しています');
  if(!topojsonClient||typeof topojsonClient.feature!=='function')throw new Error('TopoJSONの変換処理が必要です');
  const [topology,mapping,subtopology]=await Promise.all([
   fetchJSON(paths.topology),fetchJSON(paths.community),fetchJSON(paths.exceptions)
  ]);
  if(!topology.objects||!topology.objects[townObject])throw new Error('町域のTopoJSONオブジェクトがありません');
  const features=topojsonClient.feature(topology,topology.objects[townObject]).features;
  if(!Array.isArray(features)||features.length!==expectedTownCount){
   throw new Error('町名数が'+expectedTownCount+'ではありません: '+(features&&features.length));
  }
  return {topology,mapping,subtopology,features};
 }
 function attachZoom(svg,d3,onZoom,minZoom,maxZoom){
  if(!svg||!d3||typeof onZoom!=='function')throw new TypeError('SVG・D3・ズーム更新処理が必要です');
  const zoom=d3.zoom().scaleExtent([minZoom,maxZoom]).on('zoom',onZoom);
  svg.call(zoom).on('dblclick.zoom',null);
  return zoom;
 }
 function zoomBy(svg,zoom,factor,duration=150){
  svg.transition().duration(duration).call(zoom.scaleBy,factor);
 }
 root.KussoonTownSvgCore=Object.freeze({loadTownData,attachZoom,zoomBy});
})(window);
