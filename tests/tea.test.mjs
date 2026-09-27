import test from 'node:test';
import assert from 'node:assert/strict';
import {TEA_R1,TEA_R2,TEA_TOKENS,TEA_R2_TARGET,teaDur,teaSchedule,teaAllTotals,teaBest,teaBestOrder,teaCritical} from '../src/levels/tea-core.js';

test('第一回：华罗庚的办法甲 16 分钟，办法乙、丙 20 分钟', ()=>{
  assert.equal(teaSchedule(['kettle','boil','pot','cups','leaf'],TEA_R1).total,16);
  assert.equal(teaSchedule(['kettle','pot','cups','leaf','boil'],TEA_R1).total,20);   // 乙：先把准备做完再烧水
  assert.equal(teaBest(TEA_R1),16);
  assert.equal(Math.max(...teaAllTotals(TEA_R1)),20);
});
test('没洗水壶不能烧水', ()=>{assert.equal(teaSchedule(['boil','kettle','pot','cups','leaf'],TEA_R1),null);});
test('第一回的关键路径是 洗水壶→烧开水', ()=>{
  const d=teaDur(TEA_R1),c=teaCritical(TEA_R1,d,teaBestOrder(TEA_R1));
  assert.deepEqual([...c].sort(),['boil','kettle']);
});
function allAlloc(tasks,n){const ids=tasks.map(t=>t.id),out=[];const rec=(i,left,cur)=>{if(i===ids.length){if(left===0)out.push(Object.assign({},cur));return;}for(let c=0;c<=left;c++){cur[ids[i]]=c;rec(i+1,left-c,cur);}};rec(0,n,{});return out;}
const tot=(tok)=>teaSchedule(teaBestOrder(TEA_R2),TEA_R2,teaDur(TEA_R2,tok)).total;
test('第二回：不用签 16 分钟；一签用在烧水最好（9 分钟），用在洗杯一分钟不省', ()=>{
  assert.equal(tot({}),16);assert.equal(tot({boil:1}),9);assert.equal(tot({cups:1}),16);
});
test('第二回：三签的唯一最优是 烧水×2 + 洗杯×1 = 6 分钟（关键路径会转移）', ()=>{
  const res=allAlloc(TEA_R2,TEA_TOKENS).map(a=>({a,t:tot(a)}));
  const best=Math.min(...res.map(r=>r.t));assert.equal(best,TEA_R2_TARGET);
  const winners=res.filter(r=>r.t===best).map(r=>Object.entries(r.a).filter(([,v])=>v).map(([k,v])=>k+v).sort().join(','));
  assert.deepEqual([...new Set(winners)],['boil2,cups1']);
  assert.equal(tot({boil:3}),8);               // 烧水再快也没用了：卡住的是那双手
  const c=teaCritical(TEA_R2,teaDur(TEA_R2,{boil:2}),teaBestOrder(TEA_R2));
  assert.ok(!c.has('boil')&&c.has('cups')&&c.has('leaf'));
});
