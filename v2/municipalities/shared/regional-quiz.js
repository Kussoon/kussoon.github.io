/* Kussoon V2 regional municipal quizzes: reusable pure quiz logic.
 * No DOM dependency. Existing Hyogo quizzes remain unchanged during migration.
 */
(function(g){'use strict';
function shuffled(items,random=Math.random){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function start(items,random=Math.random){
 const order=shuffled(items,random);
 if(!order.length)throw Error('出題区域がありません');
 return {order,index:0,correct:0,answer:'',answered:false,wrongCodes:new Set(),firstTryCorrectCodes:new Set(),missedQuestionCodes:new Set()};
}
function question(session){if(session.index>=session.order.length)return null;session.answer=session.order[session.index].code;session.answered=false;session.wrongCodes=new Set();return session.order[session.index];}
function answer(session,code){
 if(!session||session.answered)return {accepted:false};
 if(code!==session.answer){session.wrongCodes.add(code);session.missedQuestionCodes.add(session.answer);return {accepted:true,correct:false,firstTry:false};}
 session.answered=true;const firstTry=session.wrongCodes.size===0;
 if(firstTry){session.correct++;session.firstTryCorrectCodes.add(session.answer);}
 return {accepted:true,correct:true,firstTry};
}
function finish(session){return {correct:session.correct,total:session.order.length,missed:session.order.filter(x=>session.missedQuestionCodes.has(x.code))};}
function next(session){session.index++;return question(session);}
function arcIds(geometry){
 const ids=new Set();function visit(v){if(typeof v==='number'){ids.add(v<0?~v:v);}else if(Array.isArray(v))v.forEach(visit);}
 visit(geometry.arcs);return ids;
}
function neighbors(geometries){
 const owners=new Map(),result=new Map();
 for(const g of geometries){
  const code=String(g.properties.N03_007);if(!result.has(code))result.set(code,new Set());
  for(const arc of arcIds(g)){if(!owners.has(arc))owners.set(arc,new Set());owners.get(arc).add(code);}
 }
 for(const codes of owners.values()){for(const a of codes)for(const b of codes)if(a!==b)result.get(a).add(b);}
 return result;
}
function samples(item,max=240){
 const rings=[];for(const polygon of item.polys)for(const ring of polygon)if(ring.length)rings.push(ring);
 const n=rings.reduce((s,x)=>s+x.length,0),step=Math.max(1,Math.ceil(n/max)),out=[];let i=0;
 for(const ring of rings)for(const p of ring)if(i++%step===0)out.push(p);
 return out;
}
function proximity(all,geometries,{random=Math.random}={}){
 const adj=neighbors(geometries),points=new Map(all.map(x=>[x.code,samples(x)])),cache=new Map();
 const lat=new Map(all.map(x=>{const pts=points.get(x.code);return [x.code,pts.length?pts.reduce((s,p)=>s+p[1],0)/pts.length:35];}));
 function distance(a,b){
  const key=a.code<b.code?a.code+'|'+b.code:b.code+'|'+a.code;
  if(cache.has(key))return cache.get(key);
  let min=Infinity;const ca=points.get(a.code)||[],cb=points.get(b.code)||[];
  const cos=Math.cos(((lat.get(a.code)+lat.get(b.code))/2)*Math.PI/180);
  for(const [ax,ay] of ca)for(const [bx,by] of cb){const dx=(ax-bx)*cos,dy=ay-by;min=Math.min(min,dx*dx+dy*dy);}
  cache.set(key,min);return min;
 }
 function options(item,current){
  const same=new Set(current.map(x=>x.code)),direct=adj.get(item.code)||new Set(),small=current.length<=3;
  const candidates=all.filter(x=>x.code!==item.code).map(x=>({item:x,inRegion:same.has(x.code),adjacent:direct.has(x.code),distance:distance(item,x)}));
  candidates.sort((a,b)=>(small?Number(b.inRegion)-Number(a.inRegion):0)||
   Number(b.adjacent)-Number(a.adjacent)||Number(b.inRegion)-Number(a.inRegion)||
   a.distance-b.distance||a.item.code.localeCompare(b.item.code));
  return shuffled([item,...candidates.slice(0,3).map(x=>x.item)],random);
 }
 return Object.freeze({options,neighbors:adj,distance});
}
g.KussoonV2RegionalQuiz=Object.freeze({shuffled,start,question,answer,finish,next,proximity});
})(window);
