/* 断桥（最小割 · 最大流）的逻辑。不碰 DOM。
   江心诸洲由桥相连。桥有宽窄：越宽，拆起来越费工夫，走起粮车来也越多。
   拆桥截断敌军，最少要费多少工夫（最小割）＝ 从左岸往京城最多能同时运多少车粮（最大流）。 */

/* 最大流（Edmonds–Karp）。桥是无向的：两个方向各有 w 的余量。石桥拆不动，当作无穷宽 */
const INF=1e9;
export function maxFlow(map,cut=new Set()){
  const n=map.nodes.length,cap=Array.from({length:n},()=>new Array(n).fill(0));
  map.edges.forEach((e,i)=>{if(cut.has(i))return;const w=e.stone?INF:e.w;cap[e.a][e.b]+=w;cap[e.b][e.a]+=w;});
  const s=map.s,t=map.t,flow=Array.from({length:n},()=>new Array(n).fill(0));let total=0;
  for(;;){const prev=new Array(n).fill(-1);prev[s]=s;const q=[s];
    while(q.length&&prev[t]<0){const u=q.shift();for(let v=0;v<n;v++)if(prev[v]<0&&cap[u][v]-flow[u][v]>0){prev[v]=u;q.push(v);}}
    if(prev[t]<0)break;let f=INF;for(let v=t;v!==s;v=prev[v])f=Math.min(f,cap[prev[v]][v]-flow[prev[v]][v]);
    for(let v=t;v!==s;v=prev[v]){flow[prev[v]][v]+=f;flow[v][prev[v]]-=f;}total+=f;if(total>=INF)break;}
  /* 残量网络里从 s 走得到的一侧：跨出这一侧的桥就是最小割 */
  const side=new Set([s]),q=[s];while(q.length){const u=q.shift();for(let v=0;v<n;v++)if(!side.has(v)&&cap[u][v]-flow[u][v]>0){side.add(v);q.push(v);}}
  const cutEdges=map.edges.map((e,i)=>i).filter(i=>!cut.has(i)&&side.has(map.edges[i].a)!==side.has(map.edges[i].b));
  return{value:total,side,cut:cutEdges,flow};
}
/* 敌军从左岸出发，沿没拆的桥走得到哪些洲 */
export function reach(map,cut){const adj=map.nodes.map(()=>[]);map.edges.forEach((e,i)=>{if(!cut.has(i)){adj[e.a].push(e.b);adj[e.b].push(e.a);}});
  const seen=new Set([map.s]),q=[map.s];while(q.length){const u=q.shift();for(const v of adj[u])if(!seen.has(v)){seen.add(v);q.push(v);}}return seen;}
/* 敌军到京城的一条最短的路（用来标出「从这里过来」） */
export function enemyPath(map,cut){const prev=new Map([[map.s,null]]),q=[map.s];
  while(q.length){const u=q.shift();if(u===map.t)break;map.edges.forEach((e,i)=>{if(cut.has(i))return;const v=e.a===u?e.b:e.b===u?e.a:-1;if(v>=0&&!prev.has(v)){prev.set(v,[u,i]);q.push(v);}});}
  if(!prev.has(map.t))return null;const path=[];for(let v=map.t;prev.get(v);v=prev.get(v)[0])path.unshift(prev.get(v)[1]);return path;}
export const costOf=(map,cut)=>[...cut].reduce((s,i)=>s+map.edges[i].w,0);
/* 白拆的桥：两头都在敌军这边，或都在敌军够不着的那边 */
export function wasted(map,cut){const r=reach(map,cut);return[...cut].filter(i=>r.has(map.edges[i].a)===r.has(map.edges[i].b));}
/* 常见的笨办法：只拆左岸边的桥 / 只拆京城边的桥 / 先拆最窄的桥直到截断（再去掉白拆的） */
export const bankCut=(map,side)=>map.edges.reduce((s,e)=>s+((e.a===side||e.b===side)?(e.stone?INF:e.w):0),0);
export function cheapestFirst(map){const order=map.edges.map((e,i)=>i).filter(i=>!map.edges[i].stone).sort((a,b)=>map.edges[a].w-map.edges[b].w);const cut=new Set();
  for(const i of order){cut.add(i);if(!reach(map,cut).has(map.t))break;}
  for(const i of [...cut].sort((a,b)=>map.edges[b].w-map.edges[a].w)){cut.delete(i);if(reach(map,cut).has(map.t))cut.add(i);}
  return costOf(map,cut);}

/* ---------- 运粮：玩家一路一路地走，每路运这一路上最窄处还剩的车数 ---------- */
export function load(map,paths){const used=map.edges.map(()=>0);paths.forEach(p=>p.edges.forEach(i=>used[i]+=p.carts));return used;}
export function roomOf(map,paths,edges){const used=load(map,paths);return Math.min(...edges.map(i=>map.edges[i].stone?INF:map.edges[i].w-used[i]));}
/* 最大流拆成一路一路（给「探马」看：这么多路兵可以各走各的桥同时过来） */
export function decompose(map){const {flow}=maxFlow(map),n=map.nodes.length,f=flow.map(r=>r.slice()),paths=[];
  for(let guard=0;guard<200;guard++){const prev=new Array(n).fill(-1);prev[map.s]=map.s;const q=[map.s];
    while(q.length&&prev[map.t]<0){const u=q.shift();for(let v=0;v<n;v++)if(prev[v]<0&&f[u][v]>0){prev[v]=u;q.push(v);}}
    if(prev[map.t]<0)break;let c=INF;const nodes=[map.t];for(let v=map.t;v!==map.s;v=prev[v]){c=Math.min(c,f[prev[v]][v]);nodes.unshift(prev[v]);}
    for(let v=map.t;v!==map.s;v=prev[v])f[prev[v]][v]-=c;
    const edges=[];for(let k=1;k<nodes.length;k++){const a=nodes[k-1],b=nodes[k];edges.push(map.edges.findIndex(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a)));}
    paths.push({nodes,edges,carts:c});}
  return paths;}

/* ---------- 地图：0 是左岸（敌营 / 粮仓），1 是右岸（京城），其余是江心的洲。坐标在 [0,1]² 里 ---------- */
const N=(nm,x,y)=>({nm,x,y}),E=(a,b,w,stone)=>({a,b,w,stone:!!stone});
export const MAP1={s:0,t:1,nodes:[N('左岸',0,.5),N('京城',1,.5),N('白沙洲',.28,.2),N('芦洲',.26,.76),N('鹦鹉洲',.52,.22),N('橘子洲',.5,.58),N('桃花洲',.74,.3),N('鳌洲',.75,.78)],
  edges:[E(0,2,8),E(0,3,5),E(2,3,7),E(2,4,1),E(2,5,1),E(3,5,6),E(3,7,1),E(4,5,3),E(4,6,7),E(5,6,5),E(5,7,5),E(6,7,4),E(6,1,5),E(7,1,7)]};
export const MAP3={s:0,t:1,nodes:[N('左岸',0,.5),N('京城',1,.5),N('白沙洲',.2,.16),N('芦洲',.18,.5),N('柳洲',.2,.85),N('鹦鹉洲',.42,.28),N('橘子洲',.4,.66),N('金沙洲',.6,.14),N('桃花洲',.6,.48),N('梅洲',.6,.84),N('鳌洲',.8,.3),N('雁洲',.8,.7)],
  edges:[E(0,2,6),E(0,3,5,1),E(0,4,3),E(2,3,3),E(3,4,5),E(2,5,8),E(3,5,6),E(3,6,4),E(4,6,3),E(5,6,7),E(5,7,1),E(5,8,7),E(6,8,2),E(6,9,4),E(7,8,7),E(8,9,5),E(7,10,2),E(8,10,6),E(8,11,3),E(9,11,8),E(10,11,1),E(10,1,6,1),E(11,1,8)]};
export const ROUNDS=[{nm:'断桥',map:MAP1},{nm:'运粮',map:MAP1},{nm:'江防',map:MAP3}];
export function gradeCut(cost,best){const r=cost/best;return r<=1?'至妙':r<=1.2?'上品':r<=1.5?'中品':'下品';}
export function gradeFlow(f,best){const r=f/best;return r>=1?'至妙':r>=.85?'上品':r>=.65?'中品':'下品';}
