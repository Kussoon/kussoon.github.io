(()=>{'use strict';
const names=['すみれ台','宝生ケ丘','仁川町','一ケ谷町'],items=[],$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const element=(name,attrs={})=>{const n=document.createElementNS(NS,name);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
function insideRing(x,y,ring){let b=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],c=ring[j];if((a[1]>y)!==(c[1]>y)&&x<(c[0]-a[0])*(y-a[1])/(c[1]-a[1])+a[0])b=!b;}return b;}
const inside=(x,y,polys)=>polys.some(p=>insideRing(x,y,p[0])&&!p.slice(1).some(h=>insideRing(x,y,h)));
function intervals(polys,y){
 const xs=[];for(const poly of polys)for(const ring of poly)for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[j],b=ring[i];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
 xs.sort((a,b)=>a-b);const r=[];for(let i=0;i+1<xs.length;i+=2){const x=(xs[i]+xs[i+1])/2;if(inside(x,y,polys))r.push({x,y,width:xs[i+1]-xs[i]});}return r;
}
function distance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
function clearance(x,y,polys){let d=Infinity;for(const poly of polys)for(const ring of poly)for(let i=0;i<ring.length;i++)d=Math.min(d,distance(x,y,ring[i],ring[(i+1)%ring.length]));return d;}
function project(geo){
 const coords=geo.coordinates.flat(2),xs=coords.map(p=>p[0]),ys=coords.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const cos=Math.cos((minY+maxY)*Math.PI/360),scale=235/Math.max((maxX-minX)*cos,maxY-minY);
 const xy=([x,y])=>[22+(x-minX)*cos*scale,265-(y-minY)*scale],polys=geo.coordinates.map(p=>p.map(r=>r.map(xy)));
 const all=polys.flat(2),b={x0:Math.min(...all.map(p=>p[0])),x1:Math.max(...all.map(p=>p[0])),y0:Math.min(...all.map(p=>p[1])),y1:Math.max(...all.map(p=>p[1]))};
 return{polys,b};
}
function candidates({polys,b}){
 const midY=(b.y0+b.y1)/2,h=b.y1-b.y0;
 const mid=intervals(polys,midY).sort((a,c)=>c.width-a.width)[0];
 const pool=[];for(let i=-30;i<=30;i++){const y=midY+i*h/100;for(const r of intervals(polys,y)){const d=clearance(r.x,y,polys);pool.push({...r,d,score:Math.abs(y-midY)/h*2+12/(r.width+8)+3/(d+5)});}}
 pool.sort((a,c)=>a.score-c.score);
 const slice=mid||[...pool].sort((a,c)=>Math.abs(a.y-midY)-Math.abs(c.y-midY))[0];
 let best=null;
 for(let ix=0;ix<75;ix++)for(let iy=0;iy<75;iy++){const x=b.x0+(b.x1-b.x0)*(ix+.5)/75,y=b.y0+h*(iy+.5)/75;if(!inside(x,y,polys))continue;const d=clearance(x,y,polys);if(!best||d>best.d)best={x,y,d};}
 return{mid:slice,multi:pool[0]||slice,poly:best,midY};
}
function pathFor(polys){return polys.map(poly=>poly.map(r=>r.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+','+y.toFixed(2)).join('')+'Z').join('')).join('');}
function render(){
 const mode=$('method').value,size=Number($('size').value),dots=$('dots').value==='on';$('fontsize').textContent=size+'px';$('cards').replaceChildren();
 for(const it of items){
  const section=document.createElement('section');section.className='card';const h=document.createElement('h2');h.textContent=it.name;section.append(h);
  const svg=element('svg',{viewBox:'0 0 300 290',role:'img','aria-label':it.name+'の町域'});svg.append(element('path',{d:pathFor(it.polys),class:'region'}));
  const color={poly:'#cc7135',mid:'#8050b8',multi:'#187954'};
  if(dots)for(const k of ['poly','mid','multi']){const p=it.result[k];if(p)svg.append(element('circle',{cx:p.x,cy:p.y,r:3.5,fill:color[k],stroke:'#fff','stroke-width':1}));}
  const p=it.result[mode];if(p){const txt=element('text',{class:'label',x:p.x,y:p.y,'font-size':size});txt.textContent=it.name;svg.append(txt);}section.append(svg);
  const m=document.createElement('p');m.className='detail';m.textContent=p?'南北中央から '+Math.abs(p.y-it.result.midY).toFixed(1)+' 図面単位／境界から '+clearance(p.x,p.y,it.polys).toFixed(1)+' 図面単位':'計算できません';section.append(m);
  const small=document.createElement('p');small.className='small';small.textContent='統合した丁目・区域の数：'+it.count;section.append(small);$('cards').append(section);
 }
}
async function start(){try{
 const res=await fetch('/nishinomiya/data/nishinomiya-towns.topojson');if(!res.ok)throw Error('HTTP '+res.status);
 const top=await res.json(),o=top.objects.town||Object.values(top.objects)[0];
 for(const name of names){
  const gs=o.geometries.filter(g=>{const s=g.properties?.S_NAME||'';return s===name||(s.startsWith(name)&&/^[一二三四五六七八九十]+丁目$/.test(s.slice(name.length)));});
  if(!gs.length)throw Error(name+'の町域が見つかりません');
  const geo=topojson.merge(top,gs),shape=project(geo);items.push({...shape,name,count:gs.length,result:candidates(shape)});
 }
 $('status').textContent='4町のデータを読み込みました。方式と文字サイズを変更して比較できます。';render();
}catch(e){console.error(e);$('status').textContent='読み込みエラー：'+e.message;}}
for(const id of ['method','size','dots'])$(id).addEventListener('input',render);start();
})();