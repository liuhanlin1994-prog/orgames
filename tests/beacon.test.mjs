import test from 'node:test';
import assert from 'node:assert/strict';
import {COVER,COVER_K,coverOf,covered,allCovers,minCover,greedy,VALLEY,haul,centroid,median,NET,dist,cost,best2,greedy2,gradeCover,gradeCost} from '../src/levels/beacon-core.js';

test('烽燧：三座望遍十四寨，只有一种修法；两座做不到', ()=>{
  assert.equal(COVER.villages.length,14);assert.equal(COVER.sites.length,8);
  const mc=minCover(COVER);assert.equal(mc.k,COVER_K);assert.equal(mc.covers.length,1);
  assert.equal(covered(COVER,mc.covers[0]).size,14);assert.equal(allCovers(COVER,2).length,0);
});
test('烽燧：先修望得最多的那座（贪心），三座只望得见十二寨；望得最多的那座恰恰不该修', ()=>{
  const g=greedy(COVER,3);assert.equal(covered(COVER,g).size,12);
  const sizes=COVER.sites.map((_,i)=>coverOf(COVER,i).length),big=sizes.indexOf(Math.max(...sizes));
  assert.equal(sizes.filter(x=>x===sizes[big]).length,1,'望得最多的只有一座');assert.ok(!minCover(COVER).covers[0].includes(big));
});
test('粮仓：总运程最短在中位（户数过半处），不在重心', ()=>{
  const vs=VALLEY.villages,m=median(vs),c=centroid(vs);
  assert.equal(m,.63);assert.ok(Math.abs(c-.5)<.02,'重心几乎在正中');
  for(let x=0;x<=1;x+=.01)assert.ok(haul(vs,x)>=haul(vs,m)-1e-9);
  assert.ok(haul(vs,c)/haul(vs,m)>1.1,'修在重心要多走一成多');
});
test('两座粮仓：先修最好的一座、再补一座（贪心）要多走两成；最好的一对里没有「单修一座时最好」的那个村', ()=>{
  const D=dist(NET),b=best2(NET,D),g=greedy2(NET,D);assert.ok(g.c/b.c>1.2);
  let one=0;NET.nodes.forEach((_,i)=>{if(cost(NET,D,[i])<cost(NET,D,[one]))one=i;});assert.ok(!b.p.includes(one));
  const all=[];for(let i=0;i<NET.nodes.length;i++)for(let j=i+1;j<NET.nodes.length;j++)all.push(cost(NET,D,[i,j]));all.sort((a,c)=>a-c);assert.ok(all[1]/all[0]>1.05,'次好的一对也要多走 5% 以上');
  assert.ok(D.every(r=>r.every(Number.isFinite)),'路网连通');
});
test('评级', ()=>{
  assert.equal(gradeCover(14,14),'至妙');assert.equal(gradeCover(13,14),'上品');assert.equal(gradeCover(11,14),'中品');assert.equal(gradeCover(8,14),'下品');
  assert.equal(gradeCost(10,10),'至妙');assert.equal(gradeCost(10.5,10),'上品');assert.equal(gradeCost(11.3,10),'中品');assert.equal(gradeCost(13,10),'下品');
});
