/* TOWNMAP-SSOT-001: nationwide label-update scheduling only.
 * The caller owns geometry, town data, visibility, reading and label layout.
 * Coalesce multiple events within a frame; do not change the update contract.
 */
(function(root){
 'use strict';
 function create({update,requestFrame,cancelFrame}){
  if(typeof update!=='function')throw new TypeError('label update callback required');
  const request=requestFrame||root.requestAnimationFrame?.bind(root);
  const cancel=cancelFrame||root.cancelAnimationFrame?.bind(root);
  if(typeof request!=='function'||typeof cancel!=='function')throw new TypeError('frame scheduler required');
  let frame=null,requests=0,updates=0;
  function run(){frame=null;updates++;update()}
  const api={
   request(){
    requests++;
    if(frame===null)frame=request(run);
   },
   flush(){
    if(frame!==null){cancel(frame);frame=null;run()}
   },
   cancel(){if(frame!==null){cancel(frame);frame=null}},
   stats(){return Object.freeze({requests,updates,pending:frame!==null})}
  };
  return Object.freeze(api);
 }
 const api=Object.freeze({create});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgLabelUpdateScheduler=api;
})(typeof globalThis!=='undefined'?globalThis:this);
