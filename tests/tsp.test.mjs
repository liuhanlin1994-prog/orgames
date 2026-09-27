import test from 'node:test';
import assert from 'node:assert/strict';
import {heldKarp,tourLen,crossings,twoOptMove,twoOptLocal,bestImprove,genIslands,tangledTour,bestKnown,geng} from '../src/levels/tsp-core.js';
import {RNG} from '../src/core/rng.js';

function brute(pts){const n=pts.length;let best=1e9;const rec=(r,used)=>{if(r.length===n){best=Math.min(best,tourLen(r,pts,true));return;}for(let i=1;i<n;i++)if(!used[i]){used[i]=1;r.push(i);rec(r,used);r.pop();used[i]=0;}};rec([0],[1]);return best;}
test('Held–Karp 与暴力枚举一致', ()=>{
  const r=RNG(3);for(let t=0;t<20;t++){const n=4+Math.floor(r()*4),pts=[];for(let i=0;i<n;i++)pts.push([r(),r()]);
    const h=heldKarp(pts);assert.ok(Math.abs(h.len-brute(pts))<1e-9);assert.ok(Math.abs(tourLen(h.route,pts,true)-h.len)<1e-9);}
});
test('每解开一个交叉，航程一定变短', ()=>{
  const r=RNG(9);let checked=0;
  for(let t=0;t<200;t++){const pts=[];for(let i=0;i<12;i++)pts.push([r(),r()]);
    const route=[0].concat(Array.from({length:11},(_,i)=>i+1).sort(()=>r()-.5));
    for(const c of crossings(route,pts)){assert.ok(tourLen(twoOptMove(route,c.i,c.j),pts,true)<tourLen(route,pts,true));checked++;}}
  assert.ok(checked>200);
});
test('第二程：各种屏幕比例下，解完明结暗结都离最短不远（≤ 8%）', ()=>{
  for(const A of [.72,.9,1.2,1.5,1.9]){const pts=genIslands(11,2311,A),opt=heldKarp(pts).len;
    const start=tangledTour(pts,55,9);assert.ok(crossings(start,pts).length>=4,'老航线要够乱 '+A);
    const end=twoOptLocal(start,pts);assert.equal(crossings(end,pts).length,0);assert.equal(bestImprove(end,pts),null);
    assert.ok(tourLen(end,pts,true)/opt<=1.08,`A=${A}: ${tourLen(end,pts,true)/opt}`);}
});
test('第三程：29 座岛全部生成、巧解给出合法回路', ()=>{
  for(const A of [.72,1.5,1.9]){const pts=genIslands(29,4409,A);assert.equal(pts.length,30);
    const b=bestKnown(pts,8);assert.equal(new Set(b.route).size,30);assert.ok(geng(b.len)>0);}
});
