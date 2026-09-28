/* 客栈（收益管理 · 动态定价）的逻辑。不碰 DOM。
   正月初五到十五，客栈几间上房只卖上元灯会那一夜。客人陆续路过，远远看见挂牌价：心里价高过挂牌价就订，否则扭头走。
   灯会那夜空着的房一文不值。时间单位：日（0 = 初五清早，10 = 十五灯会）。 */
import {RNG} from '../core/rng.js';
export const TYPES=[{nm:'书生',lo:12,hi:36},{nm:'商贾',lo:28,hi:66},{nm:'盐商',lo:55,hi:115}];
export const P_MIN=10,P_MAX=120,P_STEP=5,DAYS=10,K=60;          // K：动态规划里每日的步数
export const PRICES=[];for(let p=P_MIN;p<=P_MAX;p+=P_STEP)PRICES.push(p);
const mixLinear=(r0,r1,m0,m1)=>Array.from({length:DAYS},(_,d)=>{const r=r0+(r1-r0)*d/(DAYS-1),m=m0+(m1-m0)*d/(DAYS-1);return[1-r-m,m,r];});
export const SCENES=[
  {nm:'平常日子',rooms:8,lam:[3,3,3,4,4,4,5,5,6,6],mix:mixLinear(.05,.2,.3,.4),seed:12},
  {nm:'上元灯会',rooms:8,lam:[5,5,5,5,4,4,4,3,4,4],mix:Array.from({length:DAYS},(_,d)=>d<6?[.6,.4,0]:[.15,.15,.7]),seed:130},
  {nm:'账房的算盘',rooms:10,lam:[5,5,5,5,5,5,4,4,4,5],mix:Array.from({length:DAYS},(_,d)=>d<6?[.55,.45,0]:d<8?[.3,.4,.3]:[.1,.2,.7]),hint:true,seed:59}
];
const surv=(ty,p)=>Math.max(0,Math.min(1,(ty.hi-p)/(ty.hi-ty.lo)));
export const buyProb=(sc,d,p)=>sc.mix[Math.min(DAYS-1,d)].reduce((s,w,i)=>s+w*surv(TYPES[i],p),0);

/* 动态规划：V[t][c] = 第 t 步、还剩 c 间房时，往后按最好的挂牌价能期望再赚多少 */
export function solve(sc){
  const N=DAYS*K,C=sc.rooms,V=Array.from({length:N+1},()=>new Float64Array(C+1)),P=Array.from({length:N},()=>new Int16Array(C+1));
  for(let t=N-1;t>=0;t--){const d=Math.floor(t/K),q=sc.lam[d]/K;
    for(let c=1;c<=C;c++){let best=-1,bp=P_MAX;for(const p of PRICES){const b=q*buyProb(sc,d,p),v=b*(p+V[t+1][c-1])+(1-b)*V[t+1][c];if(v>=best-1e-12){best=Math.max(best,v);bp=p;}}   /* 一样赚时挂高价：宁可不卖 */V[t][c]=best;P[t][c]=bp;}
    P[t][0]=P_MAX;}
  return{V,P,sc};
}
const stepOf=t=>Math.max(0,Math.min(DAYS*K-1,Math.floor(t*K)));
export const priceAt=(S,t,c)=>c<=0?P_MAX:S.P[stepOf(t)][c];
/* 这一间房留到后面平均还值多少（机会成本；Littlewood 法则的推广） */
export const bidPrice=(S,t,c)=>c<=0?Infinity:S.V[stepOf(t)+1][c]-S.V[stepOf(t)+1][c-1];

export function genGuests(sc,rnd){
  const out=[];for(let d=0;d<DAYS;d++){let t=0;while(true){t+=-Math.log(1-rnd())/sc.lam[d];if(t>=1)break;
    let x=rnd(),i=0;const m=sc.mix[d];for(;i<m.length-1;i++){x-=m[i];if(x<0)break;}const ty=TYPES[i];out.push({t:d+t,type:i,w:ty.lo+(ty.hi-ty.lo)*rnd()});}}
  out.forEach((g,i)=>g.id=i);return out;
}
export function runPolicy(sc,guests,price){let c=sc.rooms,rev=0;const sold=[],path=[];
  for(const g of guests){const p=price(g.t,c);path.push([g.t,p]);if(c>0&&g.w>=p){rev+=p;c--;sold.push({t:g.t,p,id:g.id});}}
  return{rev,sold,path,left:c};}
/* 事前挑一口价（不看这一旬的客人）：各种客流下平均最赚的那个价 */
export function bestFixed(sc,n=300){const r=RNG(77),streams=Array.from({length:n},()=>genGuests(sc,r));let best=PRICES[0],bv=-1;
  for(const p of PRICES){const v=streams.reduce((s,st)=>s+runPolicy(sc,st,()=>p).rev,0)/n;if(v>bv){bv=v;best=p;}}return{price:best,rev:bv};}
export function gradeRatio(r){return r>=.97?'至妙':r>=.88?'上品':r>=.75?'中品':'下品';}
