import test from 'node:test';
import assert from 'node:assert/strict';
import {growth,kellyF,outcomes,play,skill,fleetStats,fleetPaths,R1,R2,R3,passR3,gradeSkill,pTxt,bTxt,SILK} from '../src/levels/kelly-core.js';

test('凯利比例使每趟的期望对数增长最大；押满（赔光的机会大于零）必然破产', ()=>{
  for(const d of R2.deals){const k=kellyF(d.p,d.b);let best=-1,bf=0;for(let f=0;f<.99;f+=.005){const g=growth(d.p,d.b,f);if(g>best){best=g;bf=f;}}assert.ok(Math.abs(bf-k)<.006,`${d.nm} ${bf} vs ${k}`);}
  assert.equal(growth(.6,1,1),-Infinity);assert.equal(kellyF(.4,1),0);assert.ok(Math.abs(kellyF(.6,1)-.2)<1e-12);
});
test('第一回：同样的风浪里，全押的莽商二十趟内必定赔光；计然的押法期望长得最快', ()=>{
  const wins=outcomes(Array(R1.voyages).fill(SILK),R1.seed);assert.ok(wins.some(w=>!w),'这二十趟里总有风浪');
  const deals=Array(R1.voyages).fill(SILK);assert.equal(play(deals,wins,Array(R1.voyages).fill(1)).at(-1),0);
  for(const f of [.05,.1,.3,.5])assert.ok(growth(.6,1,f)<growth(.6,1,.2));
  // 这二十趟不是特别走运或倒霉：计然赢了，但没有暴富
  const k=play(deals,wins,Array(R1.voyages).fill(.2)).at(-1);assert.ok(k>100&&k<400,'计然 '+k);
});
test('第二回：几桩亏本买卖凯利一文不押；评分只看押法、不看运气', ()=>{
  const bad=R2.deals.filter(d=>kellyF(d.p,d.b)===0).map(d=>d.nm);assert.deepEqual(bad,['海外奇珍','漆器','赌坊的买卖']);
  const kel=R2.deals.map(d=>kellyF(d.p,d.b));assert.ok(Math.abs(skill(R2.deals,kel)-1)<1e-12);
  assert.ok(skill(R2.deals,R2.deals.map(()=>.5))<0,'一律押一半，期望在缩');assert.ok(skill(R2.deals,R2.deals.map(()=>.05))<.5);
});
test('第三回：千舟的精确结局与模拟一致；只有「半个凯利」上下能同时稳妥又长得快', ()=>{
  const {p,b}=R3.deal,n=R3.voyages;
  for(const f of [.1,.2]){const s=fleetStats(p,b,f,n),paths=fleetPaths(p,b,f,n,4000,9);const safe=paths.filter(x=>x[n]>1).length/4000;assert.ok(Math.abs(safe-s.safe)<.03,`${f}: ${safe} vs ${s.safe}`);
    const med=[...paths.map(x=>x[n])].sort((a,c)=>a-c)[2000];assert.ok(Math.abs(Math.log(med/s.median))<.35);}
  const ok=[];for(let k=1;k<=40;k++){const f=k/100;if(passR3(fleetStats(p,b,f,n)))ok.push(f);}
  assert.ok(ok.length>=4,'可行的押法 '+ok);assert.ok(Math.min(...ok)>=.08&&Math.max(...ok)<=.16,'可行范围 '+ok);
  assert.ok(!passR3(fleetStats(p,b,kellyF(p,b),n)),'全凯利太冒险');assert.ok(fleetStats(p,b,.5,n).ruin>.5,'押一半，多半沦落');
});
test('评级与读法', ()=>{assert.equal(gradeSkill(1),'至妙');assert.equal(gradeSkill(.85),'上品');assert.equal(gradeSkill(.6),'中品');assert.equal(gradeSkill(-1),'下品');
  assert.equal(pTxt(.6),'六成');assert.equal(pTxt(.55),'五成半');assert.equal(bTxt(1),'一倍');assert.equal(bTxt(.5),'五成');assert.equal(bTxt(4),'四倍');});
