(function(root){
 'use strict';
 function solve3(m,b){
  const a=m.map((row,i)=>[...row,b[i]]);
  for(let c=0;c<3;c++){
   let pivot=c;for(let r=c+1;r<3;r++)if(Math.abs(a[r][c])>Math.abs(a[pivot][c]))pivot=r;
   if(Math.abs(a[pivot][c])<1e-9)return null;
   [a[c],a[pivot]]=[a[pivot],a[c]];
   const d=a[c][c];for(let j=c;j<4;j++)a[c][j]/=d;
   for(let r=0;r<3;r++)if(r!==c){const f=a[r][c];for(let j=c;j<4;j++)a[r][j]-=f*a[c][j];}
  }
  return a.map(row=>row[3]);
 }
 function fitCircle(points,start,end){
  let sx=0,sy=0,sxx=0,syy=0,sxy=0,sq=0,sxq=0,syq=0,n=0;
  for(let k=start;k<=end;k++){
   const {x,y}=points[k],q=x*x+y*y;sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y;sq+=q;sxq+=x*q;syq+=y*q;n++;
  }
  const abc=solve3([[sxx,sxy,sx],[sxy,syy,sy],[sx,sy,n]],[-sxq,-syq,-sq]);
  if(!abc)return null;
  const cx=-abc[0]/2,cy=-abc[1]/2,r2=cx*cx+cy*cy-abc[2];
  if(!(r2>0))return null;
  const r=Math.sqrt(r2);let err=0;
  for(let k=start;k<=end;k++)err+=(Math.hypot(points[k].x-cx,points[k].y-cy)-r)**2;
  return{cx,cy,r,rms:Math.sqrt(err/n)};
 }
 function detect(points,{minRadius=24,maxDiameter=240,maxSpan=280,minSweep=5.2,maxSweep=7.35}={}){
  const loops=[],rejections={tooSmall:0,openOrIncomplete:0,nonCircular:0,noCandidate:0};
  for(let i=3;i<points.length-16;i++){
   if(loops.some(z=>i<z.end+3))continue;
   const lim=Math.min(points.length-1,i+maxSpan);
   let arc=0,turn=0,minX=points[i].x,maxX=minX,minY=points[i].y,maxY=minY,best=null;
   for(let j=i+1;j<=lim;j++){
    const a=points[j-1],b=points[j];arc+=Math.hypot(b.x-a.x,b.y-a.y);
    minX=Math.min(minX,b.x);maxX=Math.max(maxX,b.x);minY=Math.min(minY,b.y);maxY=Math.max(maxY,b.y);
    if(j>i+1){const p=points[j-2],v1={x:a.x-p.x,y:a.y-p.y},v2={x:b.x-a.x,y:b.y-a.y};turn+=Math.atan2(v1.x*v2.y-v1.y*v2.x,v1.x*v2.x+v1.y*v2.y);}
    const sweep=Math.abs(turn);
    if(sweep>maxSweep)break;
    if(sweep<minSweep||j-i<16)continue;
    const w=maxX-minX,h=maxY-minY,d=Math.max(w,h),roughR=(w+h)*.25;
    if(d>maxDiameter||Math.min(w,h)<roughR*1.25||arc/roughR<4.5||arc/roughR>10.5)continue;
    if(roughR<minRadius){rejections.tooSmall++;continue;}
    const gap=Math.hypot(b.x-points[i].x,b.y-points[i].y);
    // Spring-like seams may be apart, but not so far that the loop ceases to read as a circle.
    if(gap>roughR*.65){rejections.openOrIncomplete++;continue;}
    const fit=fitCircle(points,i,j);
    if(!fit||fit.r<minRadius||fit.rms>fit.r*.30){rejections.nonCircular++;continue;}
    if(gap>fit.r*.55){rejections.openOrIncomplete++;continue;}
    const score=Math.abs(sweep-2*Math.PI)+fit.rms/fit.r+gap/fit.r*.25;
    if(!best||score<best.score)best={start:i,end:j,score,cx:fit.cx,cy:fit.cy,r:fit.r,sign:Math.sign(turn)||1,gap,rms:fit.rms,sweep};
   }
   if(!best){rejections.noCandidate++;continue;}
   loops.push(best);i=best.end;
  }
  return{loops,rejections};
 }
 root.CoasterLoopDetector={detect,fitCircle};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.CoasterLoopDetector;
})(typeof globalThis!=='undefined'?globalThis:this);
