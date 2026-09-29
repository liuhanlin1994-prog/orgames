/* 烽燧（选址 · 覆盖）的逻辑。不碰 DOM。
   烽火台只能修在几处山头上，每座望得见方圆若干里的村寨：钱只够修几座，要让处处望得见（集合覆盖）。
   粮仓修在哪，各村运粮的路程（按户数算）加起来最短：不在重心，而在中位（中位选址）。 */
import {RNG} from '../core/rng.js';

export const ASPECT=1.6;                                   // 地图宽 : 高
const d2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

/* ---------- 第一回：烽燧（集合覆盖） ---------- */
export const coverOf=(inst,i)=>inst.villages.map((v,k)=>k).filter(k=>d2(inst.sites[i],inst.villages[k])<=inst.r);
export function covered(inst,chosen){const s=new Set();chosen.forEach(i=>coverOf(inst,i).forEach(k=>s.add(k)));return s;}
/* 穷举：k 座能望遍的所有选法 */
export function allCovers(inst,k){const n=inst.sites.length,out=[];const rec=(start,pick)=>{if(pick.length===k){if(covered(inst,pick).size===inst.villages.length)out.push(pick.slice());return;}
  for(let i=start;i<n;i++){pick.push(i);rec(i+1,pick);pick.pop();}};rec(0,[]);return out;}
export function minCover(inst){for(let k=1;k<=inst.sites.length;k++){const c=allCovers(inst,k);if(c.length)return{k,covers:c};}return null;}
/* 贪心：每次修「新望得见的村寨最多」的那座 */
export function greedy(inst,k){const pick=[];for(let t=0;t<k;t++){const have=covered(inst,pick);let best=-1,bn=-1;inst.sites.forEach((_,i)=>{if(pick.includes(i))return;const n=coverOf(inst,i).filter(v=>!have.has(v)).length;if(n>bn){bn=n;best=i;}});pick.push(best);}return pick;}

const V=(nm,x,y,pop)=>({nm,x,y,pop}),S=(x,y)=>({x,y});
const NAMES=['张家寨','李家堡','石门','柳林','黄沙','狼山','云台','马岭','羊角','鹰嘴','青石','白草','红柳','野狐','沙河','卧牛'];
/* 按种子摆一张山川图：村寨与可修烽火台的山头 */
export function makeCover(seed,nv,ns,r){const R=RNG(seed),vs=[],ss=[];
  const far=(p,arr,m)=>arr.every(q=>d2(p,q)>=m);
  for(let g=0;vs.length<nv&&g<5000;g++){const p={x:.08+R()*(ASPECT-.16),y:.1+R()*.8};if(far(p,vs,.2))vs.push(V(NAMES[vs.length],p.x,p.y,1));}
  for(let g=0;ss.length<ns&&g<5000;g++){const p={x:.1+R()*(ASPECT-.2),y:.12+R()*.76};if(far(p,ss,.26)&&far(p,vs,.11))ss.push(S(p.x,p.y));}
  return{villages:vs,sites:ss,r};}
export const COVER=makeCover(1912,14,8,.4);
export const COVER_K=3;

/* ---------- 第二回：粮仓（一条山谷里的中位） ---------- */
/* 山谷里的驿路是一条折线；村寨在路上的位置用「离谷口多远」表示（0–1） */
export const VALLEY={road:[[.05,.72],[.3,.6],[.52,.66],[.78,.42],[1.05,.5],[1.3,.3],[1.55,.36]],
  villages:[V('谷口',0,0,2),V('石门',.14,0,3),V('柳林',.3,0,1),V('黄沙',.45,0,2),V('马岭',.63,0,9),V('羊角',.8,0,2),V('鹰嘴',.96,0,1)]};
export const haul=(vs,x)=>vs.reduce((s,v)=>s+v.pop*Math.abs(v.x-x),0);         // 总运程：户数 × 路程
export const centroid=vs=>vs.reduce((s,v)=>s+v.pop*v.x,0)/vs.reduce((s,v)=>s+v.pop,0);
export function median(vs){const tot=vs.reduce((s,v)=>s+v.pop,0),sorted=[...vs].sort((a,b)=>a.x-b.x);let c=0;for(const v of sorted){c+=v.pop;if(c>=tot/2)return v.x;}return sorted[sorted.length-1].x;}

/* ---------- 第三回：两座粮仓（路网上的 2-中位） ---------- */
export function dist(net){const n=net.nodes.length,D=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?0:Infinity));
  net.edges.forEach(([a,b])=>{const L=d2(net.nodes[a],net.nodes[b]);D[a][b]=D[b][a]=Math.min(D[a][b],L);});
  for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(D[i][k]+D[k][j]<D[i][j])D[i][j]=D[i][k]+D[k][j];return D;}
export function cost(net,D,picks){if(!picks.length)return Infinity;return net.nodes.reduce((s,v,i)=>s+v.pop*Math.min(...picks.map(p=>D[i][p])),0);}
export function best2(net,D){let b={c:Infinity,p:null};for(let i=0;i<net.nodes.length;i++)for(let j=i+1;j<net.nodes.length;j++){const c=cost(net,D,[i,j]);if(c<b.c)b={c,p:[i,j]};}return b;}
export function greedy2(net,D){let first=0;net.nodes.forEach((_,i)=>{if(cost(net,D,[i])<cost(net,D,[first]))first=i;});let second=first===0?1:0;
  net.nodes.forEach((_,i)=>{if(i!==first&&cost(net,D,[first,i])<cost(net,D,[first,second]))second=i;});return{p:[first,second],c:cost(net,D,[first,second])};}
export const NET={nodes:[V('张家寨',.12,.22,2),V('李家堡',.3,.14,6),V('石门',.2,.5,2),V('柳林',.42,.4,3),V('黄沙',.14,.82,6),V('狼山',.44,.72,1),
    V('云台',.7,.24,5),V('马岭',.78,.56,4),V('羊角',1.02,.3,2),V('鹰嘴',1.1,.66,2),V('青石',1.34,.2,5),V('白草',1.46,.52,6),V('红柳',1.3,.84,4)],
  edges:[[0,1],[0,2],[1,3],[2,3],[2,4],[3,5],[4,5],[3,6],[1,6],[5,7],[6,7],[6,8],[7,8],[7,9],[8,10],[8,9],[9,11],[10,11],[9,12],[11,12]]};

export function gradeCover(n,all){return n>=all?'至妙':n>=all-1?'上品':n>=all-3?'中品':'下品';}
export function gradeCost(c,best){const r=c/best;return r<=1.001?'至妙':r<=1.08?'上品':r<=1.25?'中品':'下品';}
