/* 撒豆（蒙特卡洛）的逻辑。不碰 DOM。
   豆子撒进方框，数落进湖里的有几颗：湖的面积 ≈ 方框面积 × 湖里的豆数 / 总豆数。撒得匀、撒得多就准；准十倍要撒百倍。 */
import {RNG} from '../core/rng.js';

/* ---------- 圆塘：方田里的内切圆，π ≈ 4 × 塘里的豆 / 总豆 ---------- */
export const inCircle=(x,y)=>(x-.5)**2+(y-.5)**2<=.25;
export const piOf=(inn,n)=>n?4*inn/n:0;
/* 均匀不均匀：把方田分成 k×k 格，各格豆数的变异系数（越小越匀） */
export function unevenness(pts,k=6){if(!pts.length)return 1;const c=new Array(k*k).fill(0);
  for(const [x,y] of pts){const i=Math.min(k-1,Math.floor(x*k)),j=Math.min(k-1,Math.floor(y*k));c[j*k+i]++;}
  const m=pts.length/(k*k),sd=Math.sqrt(c.reduce((s,v)=>s+(v-m)**2,0)/(k*k));return sd/m;}
/* 手撒：豆子落在手边，散开 spread；碰到田埂弹回田里 */
const bounce=v=>v<0?-v:v>=1?2-v-1e-9:v;
export function handToss(r,hx,hy,spread){for(let t=0;t<20;t++){const a=r()*Math.PI*2,d=Math.sqrt(-2*Math.log(1-r()))*spread,x=bounce(hx+Math.cos(a)*d),y=bounce(hy+Math.sin(a)*d);if(x>=0&&x<1&&y>=0&&y<1)return[x,y];}return null;}
/* 评级：匀不匀（各格豆数的起伏，是纯随机的几倍）和 π 差多少，取差的那一样。四角最容易漏撒 */
export function gradeUneven(ratio,err){const a=ratio<=2?3:ratio<=3?2:ratio<=4.5?1:0,b=err<=.05?3:err<=.1?2:err<=.2?1:0;return['下品','中品','上品','至妙'][Math.min(a,b)];}

/* ---------- 湖：以中心为极点、半径随角度起伏的一圈（可拉长、可斜） ---------- */
export function makeLake({cx,cy,r0,sx=1,sy=1,rot=0,waves=[]}){
  const R=th=>r0*(1+waves.reduce((s,[k,a,ph])=>s+a*Math.cos(k*th+ph),0));
  const co=Math.cos(rot),si=Math.sin(rot);
  const toLocal=(x,y)=>{const dx=x-cx,dy=y-cy,u=(dx*co+dy*si)/sx,v=(-dx*si+dy*co)/sy;return[u,v];};
  const inside=(x,y)=>{const [u,v]=toLocal(x,y);return Math.hypot(u,v)<=R(Math.atan2(v,u));};
  const N=2000;let A=0;for(let i=0;i<N;i++){const th=(i+.5)/N*Math.PI*2;A+=R(th)**2;}A=A/N*Math.PI*sx*sy;     // ½∮r²dθ × 拉伸
  const outline=(m=180)=>Array.from({length:m},(_,i)=>{const th=i/m*Math.PI*2,r=R(th),u=Math.cos(th)*r*sx,v=Math.sin(th)*r*sy;return[cx+u*co-v*si,cy+u*si+v*co];});
  const pts=outline(720);const bbox=[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))];
  return{inside,area:A,outline,bbox};}

export const MAP=100;                                    // 舆图一百顷
/* 第二回的三片湖 */
export const LAKES=[
  {nm:'太湖',def:{cx:.52,cy:.5,r0:.3,waves:[[2,.08,.4],[3,.1,1.3],[5,.05,2.2]]}},
  {nm:'洞庭',def:{cx:.3,cy:.66,r0:.14,waves:[[2,.12,.2],[3,.18,2.1],[4,.08,.7],[7,.04,1.1]]}},
  {nm:'鄱阳',def:{cx:.6,cy:.42,r0:.17,sx:.62,sy:1.9,rot:.5,waves:[[2,.06,1.1],[3,.12,.3],[5,.07,2.6]]}}
].map(l=>({...l,lake:makeLake(l.def)}));
/* 第三回的湖（方框已给定：湖的外接框） */
export const LAKE3={nm:'巢湖',lake:makeLake({cx:.5,cy:.5,r0:.28,sx:1.25,sy:.85,rot:-.2,waves:[[2,.08,.6],[3,.14,2.4],[4,.07,1.2],[6,.04,.3]]})};

/* ---------- 量湖的账：县令给 100 文，差 1% 扣 4 文；豆子一文钱 20 颗 ---------- */
export const PAY={base:100,perPct:4,beansPerWen:20};
export const cost=n=>Math.ceil(n/PAY.beansPerWen);
export const payout=(errPct,n)=>Math.round(PAY.base-PAY.perPct*Math.abs(errPct)-cost(n));
const erf=x=>{const s=Math.sign(x),a=Math.abs(x),t=1/(1+.3275911*a);return s*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a));};
const Phi=x=>.5*(1+erf(x/Math.SQRT2));
/* 期望的相对误差（%）：框面积 F、框里湖面积 Ain、湖真面积 A、豆数 n */
export function expErrPct(F,Ain,A,n){if(n<=0)return 100;const p=Ain/F,est=F*p,b=(est-A)/A,s=F*Math.sqrt(p*(1-p)/n)/A;
  if(s<1e-9)return Math.abs(b)*100;return 100*(s*Math.sqrt(2/Math.PI)*Math.exp(-b*b/(2*s*s))+b*(1-2*Phi(-b/s)));}
/* 框里的湖有多大（用细格点数） */
export function areaIn(lake,[x0,y0,x1,y1],k=240){let c=0;for(let j=0;j<k;j++)for(let i=0;i<k;i++){const x=x0+(i+.5)/k*(x1-x0),y=y0+(j+.5)/k*(y1-y0);if(lake.inside(x,y))c++;}return c/(k*k)*(x1-x0)*(y1-y0);}
/* 按一个框、一个豆数，平均能得多少文 */
export function expPay(lake,frame,n){const F=(frame[2]-frame[0])*(frame[3]-frame[1]),Ain=areaIn(lake,frame);return PAY.base-PAY.perPct*expErrPct(F,Ain,lake.area,n)-cost(n);}
/* 行家：框紧湖的外接框，豆数挑平均所得最高的 */
export function expert(lake){const f=lake.bbox;let best={n:0,pay:-1e9};const F=(f[2]-f[0])*(f[3]-f[1]),Ain=areaIn(lake,f);
  for(let n=20;n<=4000;n+=20){const pay=PAY.base-PAY.perPct*expErrPct(F,Ain,lake.area,n)-cost(n);if(pay>best.pay)best={n,pay};}return{frame:f,...best};}
export function gradeRatio(r){return r>=.9?'至妙':r>=.75?'上品':r>=.5?'中品':'下品';}

/* ---------- 第三回：分格撒 ---------- */
export const GRIDS=[{nm:'乱撒',g:1},{nm:'分 4×4 格',g:4},{nm:'分 7×7 格',g:7},{nm:'分 14×14 格',g:14}];
export const N3=196;
/* 在框里按 g×g 格撒 n 颗（各格轮流、格内随机）；g=1 即乱撒 */
export function scatter(r,frame,g,n){const [x0,y0,x1,y1]=frame,cells=g*g,pts=[];const order=Array.from({length:cells},(_,i)=>i);
  for(let k=0;k<n;k++){if(k%cells===0)for(let i=cells-1;i>0;i--){const j=Math.floor(r()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    const c=order[k%cells],ci=c%g,cj=Math.floor(c/g);pts.push([x0+(ci+r())/g*(x1-x0),y0+(cj+r())/g*(y1-y0)]);}
  return pts;}
export function estimate(lake,frame,pts){const F=(frame[2]-frame[0])*(frame[3]-frame[1]);return pts.length?F*pts.filter(([x,y])=>lake.inside(x,y)).length/pts.length:0;}
/* 推演 reps 回：各法的相对误差（%）分布 */
export function trials(lake,frame,g,n=N3,reps=1000,seed=7){const r=RNG(seed+g*101),out=[];for(let t=0;t<reps;t++){const e=estimate(lake,frame,scatter(r,frame,g,n));out.push(100*(e-lake.area)/lake.area);}return out;}
export const meanAbs=a=>a.reduce((s,v)=>s+Math.abs(v),0)/a.length;
