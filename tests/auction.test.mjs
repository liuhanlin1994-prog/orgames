import test from 'node:test';
import assert from 'node:assert/strict';
import {NAMES,SIG,makeLots,sealed,dutch,aiBid,runSealed,expert,LOTS3,vickrey,payoffAt,truthful,R1,R2,gradeProfit} from '../src/levels/auction-core.js';
import {RNG} from '../src/core/rng.js';

test('赢者诅咒：得标者的估价平均高出真值一截', ()=>{
  const lots=makeLots(99,4000);let over=0,n=0;
  for(const l of lots){const w=l.est.indexOf(Math.max(...l.est));over+=l.est[w]-l.v;n++;}
  assert.ok(over/n>SIG*.5,'五人里估得最高的，平均高估超过半个眼力');
  let naive=0;for(const l of lots){const s=sealed(l,l.est[0]);if(s.win===0)naive+=s.profit;}assert.ok(naive<0,'照估价出，长远必亏');
});
test('落价与暗标是一回事：在某价喊「要了」＝暗标出这个价', ()=>{
  const r=RNG(4),lots=makeLots(5,300);
  for(const l of lots){const p=Math.round(l.est[0]-40+r()*80),d=dutch(l,p),s=sealed(l,p);assert.equal(d.win,s.win);assert.equal(d.price,s.price);assert.ok(d.first>=d.price);}
});
test('第一回：照估价喊要亏；压低一截的高手赚；莽汉亏', ()=>{
  const naive=runSealed(R1,e=>e),ex=runSealed(R1,expert);
  assert.ok(naive[0]<=-30,`照估价 ${naive[0]}`);assert.ok(ex[0]>=25,`高手 ${ex[0]}`);assert.ok(ex[1]<0&&naive[1]<0,'莽汉亏本');
  assert.ok(R1.filter(l=>sealed(l,l.est[0]).win===0).length>=4,'照估价出，常常得标');
});
test('第二回：眼力有高低——看不准多压、看得准少压，胜过一律压同样多', ()=>{
  const ex=runSealed(R2,expert)[0],naive=runSealed(R2,e=>e)[0];
  assert.ok(naive<0);assert.ok(ex>=25);
  for(const d of [5,10,15,20,25,30,40])assert.ok(runSealed(R2,e=>e-d)[0]<=ex-10,`一律压 ${d}`);
});
test('第三回：只付次高价时，照心里的价出最好（弱占优）', ()=>{
  for(const l of LOTS3){const best=payoffAt(l,l.v);
    for(let b=0;b<=200;b++){assert.ok(payoffAt(l,b)<=best);const v=vickrey(l,b);assert.equal(v.win===0?v.profit:0,payoffAt(l,b));}}
  assert.ok(LOTS3.some(l=>payoffAt(l,l.v+15)<0),'有一件，多出了就亏');
  assert.ok(LOTS3.some(l=>payoffAt(l,l.v-10)<payoffAt(l,l.v)),'有一件，少出了就错过');
  assert.equal(truthful(LOTS3),43);
});
test('评级：亏本即下品；和高手比', ()=>{
  assert.equal(gradeProfit(-1,30),'下品');assert.equal(gradeProfit(30,28),'至妙');assert.equal(gradeProfit(20,28),'上品');assert.equal(gradeProfit(10,28),'中品');assert.equal(gradeProfit(0,28),'下品');
  assert.equal(NAMES.length,5);assert.equal(aiBid(R1[0],1),Math.round(R1[0].est[1]-.4*R1[0].sig));
});
