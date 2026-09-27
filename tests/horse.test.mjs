import test from 'node:test';
import assert from 'node:assert/strict';
import {stopWinExact,stopBestK,stopSimulate,stopGrade} from '../src/levels/horse-core.js';
import {RNG} from '../src/core/rng.js';

test('十匹马：先看 3 匹最好（约 39.9%），先看 4 匹几乎一样', ()=>{
  const b=stopBestK(10);assert.equal(b.k,3);assert.ok(Math.abs(b.p-.3987)<.0005);
  assert.ok(Math.abs(stopWinExact(10,4)-.3983)<.0005);
});
test('一百匹马：先看 37 匹最好，赢面约 37%', ()=>{
  const b=stopBestK(100);assert.equal(b.k,37);assert.ok(Math.abs(b.p-.371)<.001);
});
test('推演与精确值一致', ()=>{
  const r=RNG(5);
  for(const [n,k] of [[10,0],[10,3],[10,7],[100,37],[100,10]]){
    const w=stopSimulate(n,k,40000,r).reduce((a,b)=>a+b,0)/40000;
    assert.ok(Math.abs(w-stopWinExact(n,k))<.012,`${n},${k}: ${w} vs ${stopWinExact(n,k)}`);
  }
});
test('评级看方法：先看 3 或 4 匹是至妙', ()=>{
  assert.equal(stopGrade(10,3),'至妙');assert.equal(stopGrade(10,4),'至妙');assert.equal(stopGrade(10,0),'下品');
  assert.equal(stopGrade(100,37),'至妙');
});
