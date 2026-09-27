/* 七洲洋（旅行商）的算法部分：不碰 DOM，可在 Node 里测试 */
import {RNG, shuffle} from '../core/rng.js';

export const GENG_PER_UNIT=14;                       // 逻辑长度 → 更（《更路簿》里的航程单位）
export function tspDist(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1]);}
export function tourLen(route,pts,closed){let s=0;for(let i=0;i<route.length-1;i++)s+=tspDist(pts[route[i]],pts[route[i+1]]);if(closed&&route.length>1)s+=tspDist(pts[route[route.length-1]],pts[route[0]]);return s;}
export function geng(L){return Math.round(L*GENG_PER_UNIT);}

/* Held–Karp：n ≤ 13 求精确最短回路（从 0 号点出发） */
export function heldKarp(pts){
  const n=pts.length,N=1<<n,INF=1e18,dp=new Float64Array(N*n).fill(INF),par=new Int8Array(N*n).fill(-1);
  dp[1*n+0]=0;
  for(let m=1;m<N;m+=2)for(let j=0;j<n;j++){const v=dp[m*n+j];if(v>=INF||!(m&(1<<j)))continue;
    for(let k=1;k<n;k++){if(m&(1<<k))continue;const nm=m|(1<<k),nv=v+tspDist(pts[j],pts[k]);if(nv<dp[nm*n+k]){dp[nm*n+k]=nv;par[nm*n+k]=j;}}}
  let best=INF,last=0;for(let j=1;j<n;j++){const v=dp[(N-1)*n+j]+tspDist(pts[j],pts[0]);if(v<best){best=v;last=j;}}
  const route=[];let m=N-1,j=last;while(j!==-1&&j!==0){route.push(j);const pj=par[m*n+j];m&=~(1<<j);j=pj;}route.push(0);route.reverse();
  return{route,len:best};
}
export function nearestTour(pts,start){const n=pts.length,used=new Array(n).fill(false),r=[start];used[start]=true;
  for(let s=1;s<n;s++){const c=r[r.length-1];let bj=-1,bd=1e9;for(let j=0;j<n;j++)if(!used[j]){const v=tspDist(pts[c],pts[j]);if(v<bd){bd=v;bj=j;}}r.push(bj);used[bj]=true;}return r;}
function segCross(a,b,c,e){const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  const d1=o(c,e,a),d2=o(c,e,b),d3=o(a,b,c),d4=o(a,b,e);return((d1>0&&d2<0)||(d1<0&&d2>0))&&((d3>0&&d4<0)||(d3<0&&d4>0));}
/* 回路中所有自交：返回边对 (i,j) 与交点 */
export function crossings(route,pts){const n=route.length,out=[];
  for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){if(i===0&&j===n-1)continue;
    const a=pts[route[i]],b=pts[route[(i+1)%n]],c=pts[route[j]],e=pts[route[(j+1)%n]];
    if(segCross(a,b,c,e)){const den=(a[0]-b[0])*(c[1]-e[1])-(a[1]-b[1])*(c[0]-e[0]);const t=((a[0]-c[0])*(c[1]-e[1])-(a[1]-c[1])*(c[0]-e[0]))/den;out.push({i,j,x:a[0]+t*(b[0]-a[0]),y:a[1]+t*(b[1]-a[1])});}}
  return out;}
/* 2-opt：拆掉 (i,i+1) 与 (j,j+1) 两段，反转中间，换个接法 */
export function twoOptMove(route,i,j){const r=route.slice();let a=i+1,b=j;while(a<b){[r[a],r[b]]=[r[b],r[a]];a++;b--;}return r;}
export function bestImprove(route,pts){const n=route.length;let best=null,gain=1e-9;
  for(let i=0;i<n-1;i++)for(let j=i+2;j<n;j++){if(i===0&&j===n-1)continue;
    const a=pts[route[i]],b=pts[route[i+1]],c=pts[route[j]],e=pts[route[(j+1)%n]];
    const g=tspDist(a,b)+tspDist(c,e)-tspDist(a,c)-tspDist(b,e);if(g>gain){gain=g;best=[i,j];}}
  return best;}
export function twoOptLocal(route,pts){let r=route.slice(),mv;while((mv=bestImprove(r,pts)))r=twoOptMove(r,mv[0],mv[1]);return r;}
export function orOpt(route,pts){let r=route.slice(),improved=true;const n=r.length;
  while(improved){improved=false;
    for(let len=1;len<=3&&!improved;len++)for(let i=1;i+len<=n&&!improved;i++){
      const seg=r.slice(i,i+len),rest=r.slice(0,i).concat(r.slice(i+len)),base=tourLen(r,pts,true);
      for(let k=0;k<rest.length&&!improved;k++){for(const sg of [seg,seg.slice().reverse()]){const cand=rest.slice(0,k+1).concat(sg,rest.slice(k+1));if(cand[0]!==0)continue;if(tourLen(cand,pts,true)<base-1e-9){r=cand;improved=true;break;}}}}}
  return r;}
export function bestKnown(pts,tries){let best=null,bl=1e9;const r=RNG(99);
  for(let t=0;t<tries;t++){let perm=[0].concat(shuffle(pts.map((_,i)=>i).slice(1),r));perm=twoOptLocal(orOpt(twoOptLocal(perm,pts),pts),pts);const l=tourLen(perm,pts,true);if(l<bl){bl=l;best=perm;}}
  const nn=orOpt(twoOptLocal(nearestTour(pts,0),pts),pts);const ln=tourLen(nn,pts,true);if(ln<bl){bl=ln;best=nn;}
  return{route:best,len:bl};}
/* 生成岛：0 号是港口（右下），其余不太挤 */
export function genIslands(n,seed,A){
  const r=RNG(seed),pts=[[A*.9,.86]],minD=Math.sqrt(A/(n+1))*.62;let guard=0;
  while(pts.length<n+1&&guard++<20000){const p=[.06*A+r()*A*.84,.08+r()*.72];if(p[0]>A*.72&&p[1]>.7)continue;if(pts.every(q=>tspDist(p,q)>minD))pts.push(p);}
  return pts;}
/* 老舵工的缠结航线：交叉多但不至于满屏 */
export function tangledTour(pts,seed,maxX){
  const r=RNG(seed);let best=null,bc=-1;
  for(let t=0;t<400;t++){const p=[0].concat(shuffle(pts.map((_,i)=>i).slice(1),r));const c=crossings(p,pts).length;if(c>bc&&c<=maxX){bc=c;best=p;}}
  return best;}
export function tspGrade(ratio){return ratio<1.0005?'至短':ratio<1.03?'上品':ratio<1.1?'中品':'下品';}
