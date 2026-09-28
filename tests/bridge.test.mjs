import test from 'node:test';
import assert from 'node:assert/strict';
import {maxFlow,reach,enemyPath,costOf,wasted,bankCut,cheapestFirst,load,roomOf,decompose,MAP1,MAP3,ROUNDS,gradeCut,gradeFlow} from '../src/levels/bridge-core.js';

/* 穷举：按「哪些洲留在敌军这边」分成两半，算每种分法要拆的桥 */
function partitions(m){const isl=m.nodes.map((_,i)=>i).filter(i=>i!==m.s&&i!==m.t),vals=[];
  for(let mask=0;mask<1<<isl.length;mask++){const side=new Set([m.s]);isl.forEach((v,k)=>{if(mask>>k&1)side.add(v);});let c=0;m.edges.forEach(e=>{if(side.has(e.a)!==side.has(e.b))c+=e.stone?Infinity:e.w;});vals.push(c);}
  return vals.sort((a,b)=>a-b);}

test('最小割：穷举与最大流一致，且最省的拆法只有一种、比次好的省一截', ()=>{
  for(const m of [MAP1,MAP3]){const f=maxFlow(m),v=partitions(m);assert.equal(f.value,v[0]);assert.ok(v[1]>=v[0]+3,'次好的至少多 3 工');
    const cut=new Set(f.cut);assert.ok(!reach(m,cut).has(m.t),'拆了就截断');assert.equal(costOf(m,cut),f.value);assert.equal(wasted(m,cut).length,0);}
  assert.equal(maxFlow(MAP1).value,9);assert.equal(maxFlow(MAP3).value,14);
});
test('笨办法都吃亏：只拆岸边的桥、专拣窄桥拆', ()=>{
  for(const m of [MAP1,MAP3]){const v=maxFlow(m).value;assert.ok(bankCut(m,m.s)>=v+3);assert.ok(bankCut(m,m.t)>=v+3);assert.ok(cheapestFirst(m)>=v+5,'先拆最窄的');}
  assert.ok(maxFlow(MAP1).cut.some(i=>MAP1.edges[i].w>=6),'最省的拆法里恰恰有一座宽桥');
});
test('拆得最少＝运得最多：最大流拆成一路一路，合起来正好等于最小割，且不超任何桥的宽度', ()=>{
  for(const m of [MAP1,MAP3]){const ps=decompose(m),tot=ps.reduce((s,p)=>s+p.carts,0);assert.equal(tot,maxFlow(m).value);
    const used=load(m,ps);m.edges.forEach((e,i)=>{if(!e.stone)assert.ok(used[i]<=e.w);});
    maxFlow(m).cut.forEach(i=>assert.equal(used[i],m.edges[i].w,'腰上的桥都满载'));
    ps.forEach(p=>{assert.equal(p.nodes[0],m.s);assert.equal(p.nodes[p.nodes.length-1],m.t);});}
});
test('运粮：一路运这一路最窄处还剩的车数；贪心走最宽的路也可能卡在不到最大', ()=>{
  const m=MAP1,p1={nodes:[0,2,4,6,1],edges:[0,3,8,12]};assert.equal(roomOf(m,[],p1.edges),1);
  const paths=[{...p1,carts:1}];assert.equal(roomOf(m,paths,p1.edges),0);
  const adj=m.nodes.map(()=>[]);m.edges.forEach((e,i)=>{adj[e.a].push([e.b,i]);adj[e.b].push([e.a,i]);});const all=[];
  const dfs=(u,nodes,edges)=>{if(u===m.t){all.push({nodes:nodes.slice(),edges:edges.slice()});return;}for(const [v,i] of adj[u]){if(nodes.includes(v))continue;nodes.push(v);edges.push(i);dfs(v,nodes,edges);nodes.pop();edges.pop();}};dfs(m.s,[m.s],[]);
  const ws=[];for(;;){const c=all.map(p=>({p,room:roomOf(m,ws,p.edges)})).filter(c=>c.room>0).sort((a,b)=>b.room-a.room)[0];if(!c)break;ws.push({...c.p,carts:c.room});}
  assert.equal(ws.reduce((s,p)=>s+p.carts,0),8,'每回都走最宽的一路，只运得 8 车——要撤回重排');
  assert.ok(enemyPath(m,new Set()).length>=2);assert.equal(enemyPath(m,new Set(maxFlow(m).cut)),null);
  assert.equal(gradeCut(9,9),'至妙');assert.equal(gradeCut(10,9),'上品');assert.equal(gradeCut(15,9),'下品');assert.equal(gradeFlow(9,9),'至妙');assert.equal(gradeFlow(8,9),'上品');
  assert.equal(ROUNDS[0].map,ROUNDS[1].map,'第二回用第一回的河网');assert.equal(MAP3.edges.filter(e=>e.stone).length,2);
});
