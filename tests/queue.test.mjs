import test from 'node:test';
import assert from 'node:assert/strict';
import {erlangC,wqMMc,genArrivals,simulate,waitStats,R1,R2,R3,MU,r2MaxLambda,labRun,r3Stats,r1Grade} from '../src/levels/queue-core.js';
import {RNG} from '../src/core/rng.js';

test('Erlang C 公式', ()=>{assert.ok(Math.abs(erlangC(1,.7)-.7)<1e-12);assert.ok(Math.abs(erlangC(2,1)-1/3)<1e-12);assert.equal(wqMMc(60,12,5),Infinity);});
test('先来先过、多门时，每位来客都在最早空出来的门查验', ()=>{
  const r=RNG(2),cu=simulate(genArrivals(40,3,[{p:1,mean:5}],r),4,'pooled');
  for(const x of cu){assert.ok(x.start>=x.t-1e-12);assert.ok(Math.abs(x.end-x.start-x.s)<1e-12);}
  const byGate={};cu.forEach(x=>(byGate[x.gate]=byGate[x.gate]||[]).push(x));
  for(const g in byGate){const L=byGate[g].sort((a,b)=>a.start-b.start);for(let i=1;i<L.length;i++)assert.ok(L[i].start>=L[i-1].end-1e-12);}
});
function dayAvg(c,N,r){let a=0;for(let d=0;d<N;d++)a+=waitStats(simulate(genArrivals(R1.lambda,R1.T,R1.classes,r),c,'pooled'),0,R1.T).avg;return a/N;}
test('第一回：四道门（每小时验 48、来 56）平均等候远超一刻；五道门在一刻以内', ()=>{
  const r=RNG(4);const a4=dayAvg(4,300,r),a5=dayAvg(5,300,r),a6=dayAvg(6,300,r);
  assert.ok(a4>2*R1.target,'4:'+a4);assert.ok(a5<R1.target/1.5,'5:'+a5);assert.ok(a6<a5);
  assert.equal(r1Grade(5),'至妙');assert.equal(r1Grade(4),'下品');
});
test('第一回用的那个上午（固定 seed）很典型：同一串来客，门越多越短；四门远超一刻、五门在一刻以内', ()=>{
  const arr=genArrivals(R1.lambda,R1.T,R1.classes,RNG(R1.seed)),avg=c=>waitStats(simulate(arr,c,'pooled'),0,R1.T).avg;
  const a=[1,2,3,4,5,6].map(avg);for(let i=1;i<a.length;i++)assert.ok(a[i]<=a[i-1]);
  assert.ok(a[3]>2*R1.target,'4:'+a[3]);assert.ok(a[4]<R1.target/2,'5:'+a[4]);
  const typ=dayAvg(4,300,RNG(8));assert.ok(Math.abs(a[3]-typ)/typ<.15,'4 门与平均的差 '+a[3]+' vs '+typ);
});
test('第二回：推演百日与公式吻合；五道门、平均候不过一刻，最多接得住每小时 56 位', ()=>{
  assert.equal(r2MaxLambda(),56);
  const r=RNG(6);for(const l of [45,50,54,56,57]){const f=wqMMc(l,MU,R2.c)*60,s=labRun(l,r);assert.ok(Math.abs(s-f)/f<.25,`${l}: sim ${s} formula ${f}`);}
  assert.ok(wqMMc(56,MU,5)*60<=15&&wqMMc(57,MU,5)*60>15);
});
test('第三回：一条长队比各门各排平均更短、最久候少一半以上、无人被抢先；快者先行平均最短但驼队多等', ()=>{
  const r=RNG(5),N=200,acc={separate:{},pooled:{},spt:{}};
  for(let d=0;d<N;d++){const arr=genArrivals(R3.lambda,R3.T,R3.classes,r);for(const k in acc){const s=r3Stats(arr,k);for(const f in s)acc[k][f]=(acc[k][f]||0)+s[f]/N;}}
  assert.ok(acc.pooled.avg<acc.separate.avg);assert.ok(acc.pooled.max<acc.separate.max*.5);
  assert.equal(acc.pooled.over,0);assert.ok(acc.separate.over>.25);
  assert.ok(acc.spt.avg<acc.pooled.avg);assert.ok(acc.spt.slow>acc.pooled.slow);assert.ok(acc.spt.fast<acc.pooled.fast/2);
});
