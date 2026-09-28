import test from 'node:test';
import assert from 'node:assert/strict';
import {band,R1,R3,makeGod,golden,pairs,fibonacci,left,gradeWidth,gradeLeft,gradeR1,T0,T1} from '../src/levels/kiln-core.js';

const deg=s=>(s.b-s.a)*(T1-T0);
test('夹逼：最好的一窑左右两个邻居之间，必定夹着真正最好的火候（单峰）', ()=>{
  const f=R1.f,xs=[.1,.3,.5,.62,.7,.9],tests=xs.map(x=>({x,q:f(x)})),b=band(tests);
  assert.ok(b.a<R1.peak&&R1.peak<b.b);assert.equal(b.m,.62);
  for(let i=0;i<1000;i++){const x=i/1000,y=(i+1)/1000;if(y<=R1.peak)assert.ok(f(y)>=f(x));if(x>=R1.peak)assert.ok(f(y)<=f(x));}  // 单峰
});
test('窑神刁难：0.618 法六窑夹到 18℃；对分着烧 26℃；平均撒开烧夹不住', ()=>{
  assert.ok(Math.abs(deg(golden(makeGod(),6))-18)<.6);
  assert.ok(Math.abs(deg(pairs(makeGod(),6))-25.6)<1);
  const g=makeGod();for(let k=1;k<=6;k++)g.fire(k/7);assert.ok(deg(g.state)>50);
  for(const n of [4,5,6,7])assert.ok(Math.abs(deg(golden(makeGod(),n))-200*.618**(n-1))<1.5,'每多一窑缩成 0.618');
  assert.equal(gradeWidth(18),'至妙');assert.equal(gradeWidth(25.6),'上品');assert.equal(gradeWidth(57),'下品');
});
test('窑神不讲理但守规矩：说「不如」的窑都在红框之外，红框里只剩最好的那窑', ()=>{
  for(const seq of [[.3,.8,.55,.6,.45,.7],[.618,.382,.5,.45,.47,.9],[.1,.2,.3,.4,.5,.6]]){const g=makeGod();seq.forEach(x=>g.fire(x));const s=g.state;
    assert.ok(s.a<s.m&&s.m<s.b);for(const t of s.tests)if(t.x!==s.m)assert.ok(t.x<=s.a||t.x>=s.b);}
  const g=makeGod();g.fire(.5);g.fire(.7);const r=g.fire(.9);assert.ok(r.wasted===(g.state.b<=.9),'红框外的一窑白烧');
});
test('二十档：分数法六窑一档不差；五窑做不到（穷举验证）', ()=>{
  const s=fibonacci(makeGod(0,R3.levels+1),6);assert.equal(left(s),1);assert.deepEqual(s.tests.slice(0,2).map(t=>t.x),[8,13]);
  const memo=new Map(),bm=(a,b,m,n)=>{const k=[a,b,m,n].join();if(memo.has(k))return memo.get(k);let r=Math.max(1,b-a-1);
    if(n>0)for(let x=a+1;x<b;x++){if(x===m)continue;const w=m===null?bm(a,b,x,n-1):Math.max(x<m?bm(a,m,x,n-1):bm(m,b,x,n-1),x<m?bm(x,b,m,n-1):bm(a,x,m,n-1));r=Math.min(r,w);}
    memo.set(k,r);return r;};
  assert.equal(bm(0,21,null,6),1);assert.equal(bm(0,21,null,5),2);
  assert.equal(gradeLeft(1),'至妙');assert.equal(gradeLeft(3),'中品');assert.equal(gradeR1(10),'至妙');assert.equal(gradeR1(30),'中品');
});
