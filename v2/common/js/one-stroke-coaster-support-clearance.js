/* Kussoon one-stroke coaster: world-space bridge support clearance v79.
 * Keeps the approved ride geometry, vehicle, rails and physics untouched.
 * Omits a support when another section of the route passes through its
 * vertical occupied space. Spatial grid keeps checks cheap during animation.
 */
(function(root){
 'use strict';
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function create({sample,finish,spacing=1.25,cellSize=4}={}){
  if(typeof sample!=='function'||!Number.isFinite(finish)||finish<=0)
   throw new TypeError('A completed coaster route is required');
  const grid=new Map(),cache=new Map();
  function cell(x,z){return Math.floor(x/cellSize)+':'+Math.floor(z/cellSize)}
  const samples=Math.max(2,Math.ceil(finish/spacing));
  for(let i=0;i<=samples;i++){
   const s=finish*i/samples,p=sample(s),entry={s,x:p.x,y:p.y,z:p.z};
   const key=cell(p.x,p.z);
   if(!grid.has(key))grid.set(key,[]);
   grid.get(key).push(entry);
  }
  function evaluateSupport({s,p,dir,right}={}){
   if(!Number.isFinite(s)||!p||!dir||!right)throw new TypeError('Incomplete support geometry');
   if(cache.has(s))return cache.get(s);
   // Inverted or steep backward sections are not a safe resting surface
   // for a ground-supported trestle. No beam is ever put above the car.
   const upY=dir.z*right.x-dir.x*right.z;
   if(p.y<=3.5||dir.z<.5||upY<.65||Math.abs(right.y)>.35){
    cache.set(s,false);return false;
   }
   const beamY=p.y-.52,rad=3.3;
   const x0=Math.floor((p.x-rad)/cellSize),x1=Math.floor((p.x+rad)/cellSize);
   const z0=Math.floor((p.z-rad)/cellSize),z1=Math.floor((p.z+rad)/cellSize);
   for(let ix=x0;ix<=x1;ix++)for(let iz=z0;iz<=z1;iz++){
    const points=grid.get(ix+':'+iz)||[];
    for(const q of points){
     // Ignore the rails immediately above their OWN support. A remote
     // section at the same (x,z), even from a different lap, is checked.
     if(Math.abs(q.s-s)<5.5)continue;
     if(q.y<-.2||q.y>beamY+2.2)continue;
     if(distance(p,q)<rad){
      cache.set(s,false);return false;
     }
    }
   }
   cache.set(s,true);return true;
  }
  return Object.freeze({allows:evaluateSupport,stats:()=>Object.freeze({
   sampledPoints:samples+1,checked:cache.size,accepted:[...cache.values()].filter(Boolean).length
  })});
 }
 const api=Object.freeze({create});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonCoasterSupportClearance=api;
})(typeof globalThis!=='undefined'?globalThis:this);
