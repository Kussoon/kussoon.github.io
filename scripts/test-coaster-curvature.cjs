// Run from the repository root with node scripts/test-coaster-curvature.cjs [game.html]
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const cases=[
 ['hill',[[.05,.72],[.15,.64],[.25,.48],[.36,.25],[.47,.27],[.6,.46],[.74,.72],[.86,.68],[.95,.59]]],
 ['sharp',[[.05,.79],[.25,.79],[.40,.32],[.52,.21],[.63,.75],[.82,.80],[.95,.45]]],
 ['zigzag',[[.05,.83],[.91,.71],[.48,.55],[.93,.45],[.54,.29],[.95,.18]]],
 ['dense',[[.05,.8],[.4,.7],...Array.from({length:12},(_,i)=>[.4+(i%2?.07:0),.68-i*.025]),[.95,.31]]],
 ['vertical',[[.04,.82],[.22,.82],[.22,.16],[.72,.16],[.72,.8],[.96,.8]]],
 ['loop',null],
 ['double-loop',null]
];
function points(name,source,w,h){
 if(source)return source.map(([x,y])=>[w*x,h*y]);
 const loop=(cx,cy,r)=>Array.from({length:95},(_,i)=>{
  const angle=Math.PI/2-2*Math.PI*i/94;
  return [cx+r*Math.cos(angle)+i*.09,cy+r*Math.sin(angle)];
 });
 const r=w<500?36:58,cy=h*.55;
 const first=w*.30, second=w*.67;
 return [[w*.06,cy+r],[first-36,cy+r],...loop(first,cy,r),
  ...(name==='double-loop'?[[second-36,cy+r],...loop(second,cy,r)]:[]),
  [w*.85,cy+r+16],[w*.95,cy+r+9]];
}

function boot(file,width,height){
 const nodes=new Map();
 const ctx=new Proxy({}, {get:(target,key)=>target[key]??(()=>({width:40,addColorStop(){}}))});
 function node(id){
  if(!nodes.has(id))nodes.set(id,{listeners:{},getBoundingClientRect:()=>({left:0,top:0,width,height}),
    getContext:()=>ctx,addEventListener(name,callback){this.listeners[name]=callback;},
    click(){this.onclick?.()},setPointerCapture(){}});
  return nodes.get(id);
 }
 const state={console:{info(){},error(...args){throw new Error(args.join(' '))}},URLSearchParams,
   document:{getElementById:node,querySelector:node,addEventListener(){}},
   devicePixelRatio:1,location:{search:'?debugLoops'},PointerEvent(){},addEventListener(){},
   requestAnimationFrame(callback){state.frame=callback}};
 state.window=state;
 vm.createContext(state);
 const html=fs.readFileSync(file,'utf8');
 for(const [,params,content] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
  const source=params.match(/src="([^"]+)"/);
  const code=source?fs.readFileSync('.'+source[1],'utf8'):content;
  const entry='updateLoopControls();size();requestAnimationFrame(loop);';
  vm.runInContext(code.replace(entry,'window.course={sample,length:()=>finish};'+entry),state);
 }
 return {state,node};
}
for(const [width,height] of [[1000,720],[375,620],[428,870]]){
 for(const [name,source] of cases){
  const file=process.argv[2]||'v2/one-stroke-coaster-3d-v112.html';
   const {state,node}=boot(file,width,height);
   const coords=points(name,source,width,height);
   const canvas=node('canvas');
   function pointer(name,[x,y]){
    canvas.listeners[name]({pointerId:2,clientX:x,clientY:y,preventDefault(){}});
   }
   pointer('pointerdown',coords[0]);
   for(let i=1;i<coords.length;i++){
    const [x0,y0]=coords[i-1],[x,y]=coords[i];
    const steps=Math.ceil(Math.hypot(x-x0,y-y0)/4);
    for(let j=1;j<=steps;j++)pointer('pointermove',[x0+(x-x0)*j/steps,y0+(y-y0)*j/steps]);
   }
   pointer('pointerup',coords.at(-1));
   node('go').click();
   const {sample,length}=state.course;
   assert(length()>1,name+' failed to generate');
   const step=.1;
   for(let d=step;d+step<length();d+=step){
    const a=sample(d-step),b=sample(d),c=sample(d+step);
    const u=[b.x-a.x,b.y-a.y,b.z-a.z],v=[c.x-b.x,c.y-b.y,c.z-b.z];
    const cosine=u.reduce((sum,n,i)=>sum+n*v[i],0)/(Math.hypot(...u)*Math.hypot(...v));
    const angle=Math.acos(Math.max(-1,Math.min(1,cosine)));
    assert(angle<=step/4.4,name+' at '+d.toFixed(2)+' m exceeds curvature tolerance');
   }
   console.log(width,height,name,'passed');
 }
}
