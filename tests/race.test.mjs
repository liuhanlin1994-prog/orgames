import test from 'node:test';
import assert from 'node:assert/strict';
import {maxWins,bestAssign,countWins,sameRankWins,sunbinPick,onlineSolver,R1,R2,R3,gradeR2,gradeR3,runTime} from '../src/levels/race-core.js';
import {RNG} from '../src/core/rng.js';

function brute(mine,opp){let best=0;const a=[...mine];const perm=k=>{if(k===a.length){best=Math.max(best,a.reduce((s,v,i)=>s+(v>opp[i]?1:0),0));return;}
  for(let i=k;i<a.length;i++){[a[k],a[i]]=[a[i],a[k]];perm(k+1);[a[k],a[i]]=[a[i],a[k]];}};perm(0);return best;}

test('明牌最多能赢几场：与穷举一致，给出的排法确实赢这么多', ()=>{
  const r=RNG(3);for(let t=0;t<2000;t++){const n=2+Math.floor(r()*5),m=[],o=[];for(let i=0;i<n;i++){m.push(1+Math.floor(r()*11));o.push(1+Math.floor(r()*11));}
    const w=maxWins(m,o);assert.equal(w,brute(m,o));const lanes=bestAssign(m,o);assert.equal(new Set(lanes).size,n);assert.equal(countWins(m,o,lanes),w);}
});
test('第一回：同等相对三场皆负，孙膑的次序两胜一负', ()=>{
  assert.equal(sameRankWins(R1.mine,R1.king),0);assert.equal(maxWins(R1.mine,R1.king),2);
  assert.equal(countWins(R1.mine,R1.king,[2,0,1]),2);
});
test('第二回：秦王的马更强，同等相对只能赢零到一场，排得好能赢过半', ()=>{
  for(const c of R2){const sm=c.mine.reduce((a,b)=>a+b,0),so=c.opp.reduce((a,b)=>a+b,0);assert.ok(sm<so,c.nm);
    assert.ok(sameRankWins(c.mine,c.opp)<=1,c.nm);assert.ok(maxWins(c.mine,c.opp)>c.opp.length/2,c.nm);}
  assert.deepEqual(R2.map(c=>maxWins(c.mine,c.opp)),[4]);
});
test('暗盘：「能赢用刚好赢的，赢不了派最弱的」每一步都是妙手（与精确解一致）', ()=>{
  const r=RNG(9);const sets=R3.map(c=>[c.mine,c.opp]);for(let t=0;t<120;t++){const m=[],o=[];for(let i=0;i<5;i++){m.push(1+Math.floor(r()*11));o.push(1+Math.floor(r()*11));}sets.push([m,o]);}
  for(const [m,o] of sets){const S=onlineSolver(m,o),n=m.length,seen=new Set();
    const walk=(mm,om)=>{if(!om||seen.has(mm*4096+om))return;seen.add(mm*4096+om);
      for(let j=0;j<n;j++)if(om>>j&1){const avail=[];for(let i=0;i<n;i++)if(mm>>i&1)avail.push(i);const g=sunbinPick(m,avail,o[j]);assert.ok(S.isBest(mm,om,j,g));avail.forEach(i=>walk(mm&~(1<<i),om&~(1<<j)));}};
    walk(S.full,S.full);}
});
test('暗盘：按规矩走，期望赢过半；乱派的期望赢得少得多', ()=>{
  for(const c of R3){const S=onlineSolver(c.mine,c.opp),best=S.V(S.full,S.full);assert.ok(best>=2.5,c.nm+' '+best);
    // 乱派：每场随手派一匹
    const n=5;let rnd=0;const r=RNG(4);for(let k=0;k<4000;k++){const order=[...Array(n).keys()].sort(()=>r()-.5),mine=[...Array(n).keys()].sort(()=>r()-.5);rnd+=order.reduce((s,j,i)=>s+(c.mine[mine[i]]>c.opp[j]?1:0),0);}
    assert.ok(rnd/4000<best-.8,c.nm+' random '+rnd/4000+' vs '+best);}
});
test('评级与跑马时间', ()=>{
  assert.equal(gradeR2(4,4),'至妙');assert.equal(gradeR2(3,4),'上品');assert.equal(gradeR2(2,4),'中品');assert.equal(gradeR2(1,4),'下品');
  assert.equal(gradeR3(15,15),'至妙');assert.equal(gradeR3(12,15),'上品');
  assert.ok(runTime(9,true)<runTime(8,false));assert.ok(runTime(5,true)<runTime(5,false));
});
