import test from 'node:test';
import assert from 'node:assert/strict';
import {erlangC,lqMMc,wqMMc,MU,GATES,ROUNDS,dayLen,genDay,createGateSim,runPolicy,bench,policyExpert,gradeRatio} from '../src/levels/queue-core.js';
import {RNG} from '../src/core/rng.js';

const day=sc=>genDay(sc,RNG(sc.seed));
const statik=c=>()=>c;

test('Erlang C 公式', ()=>{assert.ok(Math.abs(erlangC(1,.7)-.7)<1e-12);assert.ok(Math.abs(erlangC(2,1)-1/3)<1e-12);assert.equal(lqMMc(60,12,5),Infinity);assert.ok(wqMMc(40,12,4)>0);});

test('城门口模拟：先来先验、一门一次只验一人、等候折钱等于人人等候之和、关城后全部验完', ()=>{
  const sc=ROUNDS[0],arr=day(sc),sim=createGateSim(sc,arr.map(a=>({...a})));sim.setCount(3);
  // 中途开关几次门
  const T=dayLen(sc);for(let t=0;t<T;t+=.05){sim.advance(t);if(Math.abs(t-1.5)<.03)sim.setCount(5);if(Math.abs(t-4.5)<.03)sim.setCount(2);}
  sim.advance(T);sim.finish();
  assert.equal(sim.served.length,arr.length);
  const byStart=[...sim.served].sort((a,b)=>a.start-b.start);for(let i=1;i<byStart.length;i++)assert.ok(byStart[i].t>=byStart[i-1].t-1e-12,'FIFO');
  const byGate={};sim.served.forEach(x=>(byGate[x.gate]=byGate[x.gate]||[]).push(x));
  for(const g in byGate){const L=byGate[g].sort((a,b)=>a.start-b.start);for(let i=1;i<L.length;i++)assert.ok(L[i].start>=L[i-1].end-1e-12);}
  for(const x of sim.served){assert.ok(x.start>=x.t-1e-12);assert.ok(Math.abs(x.end-x.start-x.s)<1e-9);}
  const sumWait=sim.served.reduce((s,x)=>s+(x.start-x.t),0)*sc.CW;assert.ok(Math.abs(sumWait-sim.costs().wait)<1e-6*Math.max(1,sumWait));
});

test('第一回：老门官（看预报开门、队长加门）明显胜过全天六门或四门', ()=>{
  const sc=ROUNDS[0];let b=0,s6=0,s5=0,s4=0;
  for(let k=0;k<25;k++){const arr=genDay(sc,RNG(100+k));b+=bench(sc,arr).cost.total;s6+=runPolicy(sc,arr,statik(6)).cost.total;s5+=runPolicy(sc,arr,statik(5)).cost.total;s4+=runPolicy(sc,arr,statik(4)).cost.total;}
  assert.ok(s6>1.2*b,`6门 ${s6} vs ${b}`);assert.ok(s5>1.25*b,`5门 ${s5}`);assert.ok(s4>1.6*b,`4门 ${s4}`);
  const arr=day(sc),r=bench(sc,arr).cost.total;assert.equal(gradeRatio(r/r),'至妙');assert.equal(gradeRatio(runPolicy(sc,arr,statik(6)).cost.total/r)!=='至妙',true);
});

test('第二回：驼队结伴排在一道门后，各门各排比一条长队多花不少；拉起一米线立刻见效', ()=>{
  const sc=ROUNDS[1];let pooled=0,sep=0,maxP=0,maxS=0;
  for(let k=0;k<25;k++){const arr=genDay(sc,RNG(200+k)),pol=policyExpert(sc,sc.W);
    const a=runPolicy(sc,arr,pol,{pooled:true}),c=runPolicy(sc,arr,pol,{pooled:false});pooled+=a.cost.total;sep+=c.cost.total;}
  assert.ok(sep>1.12*pooled,`各排 ${sep} vs 一队 ${pooled}`);
});

test('第三回：老门官守得住工时限额；一开城就把六门全开，工时在灯会前耗尽，民怨翻倍不止', ()=>{
  const sc=ROUNDS[2],arr=day(sc),b=bench(sc,arr);assert.ok(b.cost.used<=sc.budget+1e-9);
  const early=runPolicy(sc,arr,statik(6));assert.ok(early.cost.forced);assert.ok(early.cost.total>3*b.cost.total,`${early.cost.total} vs ${b.cost.total}`);
  const four=runPolicy(sc,arr,statik(Math.round(sc.budget/dayLen(sc))+1));assert.ok(four.cost.total>1.5*b.cost.total);
});

test('评级', ()=>{assert.equal(gradeRatio(1.02),'至妙');assert.equal(gradeRatio(1.1),'上品');assert.equal(gradeRatio(1.3),'中品');assert.equal(gradeRatio(2),'下品');assert.equal(GATES,6);assert.ok(MU>10&&MU<12);});
