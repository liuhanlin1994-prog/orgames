import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENES,PRICES,DAYS,solve,priceAt,bidPrice,genGuests,runPolicy,bestFixed,gradeRatio} from '../src/levels/inn-core.js';
import {RNG} from '../src/core/rng.js';

const mean=(sc,S,price,n=400,seed=1)=>{const r=RNG(seed);let s=0;for(let k=0;k<n;k++)s+=runPolicy(sc,genGuests(sc,r),price).rev;return s/n;};

test('动态规划算出的期望进账，与按它挂牌推演四百旬的平均一致', ()=>{
  for(const sc of SCENES){const S=solve(sc),v=S.V[0][sc.rooms],m=mean(sc,S,(t,c)=>priceAt(S,t,c));assert.ok(Math.abs(m-v)/v<.04,`${sc.nm}: ${m} vs ${v}`);}
});
test('账房的挂牌胜过任何一口价；贱卖（30 文）只得一半上下', ()=>{
  for(const sc of SCENES){const S=solve(sc),dp=mean(sc,S,(t,c)=>priceAt(S,t,c)),bf=bestFixed(sc);
    assert.ok(dp>bf.rev,sc.nm);assert.ok(mean(sc,S,()=>30)<.6*dp,sc.nm+' 贱卖');}
  // 灯会与第三回：临近灯会盐商才来，一口价明显吃亏
  for(const sc of SCENES.slice(1)){const S=solve(sc),dp=mean(sc,S,(t,c)=>priceAt(S,t,c)),bf=bestFixed(sc);assert.ok(bf.rev<.95*dp,`${sc.nm}: ${bf.rev} vs ${dp}`);}
});
test('房越多、日子越少，挂牌越低；「这间房留着值多少」也一样', ()=>{
  for(const sc of SCENES){const S=solve(sc);
    for(const t of [0,3,6,8,9,9.8])for(let c=2;c<=sc.rooms;c++){assert.ok(priceAt(S,t,c)<=priceAt(S,t,c-1),`${sc.nm} t${t} c${c}`);assert.ok(bidPrice(S,t,c)<=bidPrice(S,t,c-1)+1e-9);}
    assert.ok(bidPrice(S,9.98,sc.rooms)<bidPrice(S,0,1));}
});
test('挂牌不低于这间房的机会价值（Littlewood 法则的推广）', ()=>{
  for(const sc of SCENES){const S=solve(sc);for(const t of [0,2,5,7,9])for(let c=1;c<=sc.rooms;c++)assert.ok(priceAt(S,t,c)>=bidPrice(S,t,c)-1e-9,`${sc.nm} t${t} c${c}`);}
});
test('每回合挑的那一旬客人是典型的：一口价与账房之比接近各旬的中位数', ()=>{
  for(const sc of SCENES){const S=solve(sc),bf=bestFixed(sc),g=genGuests(sc,RNG(sc.seed));
    const r=runPolicy(sc,g,()=>bf.price).rev/runPolicy(sc,g,(t,c)=>priceAt(S,t,c)).rev;assert.ok(r>.85&&r<1,sc.nm+' '+r);}
});
test('评级', ()=>{assert.equal(gradeRatio(1.02),'至妙');assert.equal(gradeRatio(.92),'上品');assert.equal(gradeRatio(.8),'中品');assert.equal(gradeRatio(.5),'下品');assert.equal(DAYS,10);assert.equal(PRICES[0],10);});
