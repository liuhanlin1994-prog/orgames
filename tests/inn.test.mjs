import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE,SCENES,expRevenue,bestProtect,littlewood,simNights,innGrade,labSeed} from '../src/levels/inn-core.js';
import {RNG} from '../src/core/rng.js';

test('寻常夜：四座留三座给贵客最好（每夜约 95 文）', ()=>{
  assert.equal(bestProtect(BASE),3);assert.ok(Math.abs(expRevenue(3,BASE)-95)<1e-9);
  assert.ok(expRevenue(3,BASE)>expRevenue(4,BASE)&&expRevenue(4,BASE)>expRevenue(2,BASE)&&expRevenue(2,BASE)>expRevenue(0,BASE));
});
test('Littlewood 法则与逐一试算的最优一致', ()=>{for(const sc of [BASE,...SCENES])assert.equal(littlewood(sc),bestProtect(sc));});
test('三种夜晚：价廉留二、价昂留四、罕至留二', ()=>{assert.deepEqual(SCENES.map(bestProtect),[2,4,2]);});
test('推演一千夜与期望进账一致', ()=>{
  const r=RNG(3);for(const sc of [BASE,...SCENES])for(let y=0;y<=4;y++){const s=simNights(y,sc,60000,r),e=expRevenue(y,sc);assert.ok(Math.abs(s-e)/e<.02,`${sc.nm} ${y}: ${s} vs ${e}`);}
});
test('评级看规矩', ()=>{assert.equal(innGrade(3,BASE),'至妙');assert.equal(innGrade(0,BASE),'下品');assert.equal(innGrade(4,SCENES[1]),'至妙');});
test('推演一千夜用同一串夜晚比较规矩：多数随机串的最高点就在留三座；挑出的串一定如此', ()=>{
  const r=RNG(11);let agree=0;for(let k=0;k<200;k++){const s=1+Math.floor(r()*1e6),v=[0,1,2,3,4].map(y=>simNights(y,BASE,1000,RNG(s)));if(v.indexOf(Math.max(...v))===3)agree++;}
  assert.ok(agree>=180,'agree '+agree);
  for(let k=0;k<20;k++){const s=labSeed(r),v=[0,1,2,3,4].map(y=>simNights(y,BASE,1000,RNG(s)));assert.equal(v.indexOf(Math.max(...v)),3);}
});
