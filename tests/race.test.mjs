import test from 'node:test';
import assert from 'node:assert/strict';
import {ORDERS,orderKey,raceWins,matchWon,counterOf,HABIT,LEDGER20,habitSample,habitWinProb,kingPredict,kingMirror,R3_MATCHES} from '../src/levels/race-core.js';
import {RNG} from '../src/core/rng.js';

test('齐王无论怎么排，田忌都恰好只有一种排法能赢，就是孙膑之策', ()=>{
  for(const k of ORDERS){const wins=ORDERS.filter(t=>matchWon(t,k));assert.equal(wins.length,1);assert.deepEqual(wins[0],counterOf(k));assert.equal(raceWins(counterOf(k),k),2);}
  assert.deepEqual(counterOf([3,2,1]),[1,3,2]);   // 下驷对上驷，上驷对中驷，中驷对下驷
});
test('同等的马对上（镜像），田忌三场全输', ()=>{for(const t of ORDERS)assert.equal(raceWins(t,kingMirror(t)),0);});
test('出马簿与习惯一致：二十场里上中下出了九次', ()=>{
  const c={};LEDGER20.forEach(k=>c[k]=(c[k]||0)+1);assert.equal(LEDGER20.length,20);assert.equal(c['321'],9);
  for(const k in c)assert.ok(c[k]<=c['321']);
});
test('第二回：照着习惯出「下上中」最好，每局赢面 45%，且是唯一最好', ()=>{
  const ps=ORDERS.map(t=>habitWinProb(t)),best=Math.max(...ps);assert.ok(Math.abs(best-.45)<1e-9);
  assert.equal(ps.filter(p=>Math.abs(p-best)<1e-9).length,1);assert.equal(orderKey(ORDERS[ps.indexOf(best)]),'132');
  const r=RNG(3);let w=0;for(let i=0;i<40000;i++)if(matchWon([1,3,2],habitSample(r)))w++;assert.ok(Math.abs(w/40000-.45)<.01);
});
function play(policy,rnd){const hist=[];let hits=0,wins=0;
  for(let m=0;m<R3_MATCHES;m++){const pred=kingPredict(hist,rnd),mine=policy(hist,rnd);if(orderKey(pred)===orderKey(mine))hits++;if(matchWon(mine,kingMirror(pred)))wins++;hist.push(mine);}
  return{hits,wins};}
test('第三回：乱出（均匀随机）时，齐王只猜中约六分之一，你也只赢约六分之一', ()=>{
  const r=RNG(8),N=20000;let h=0,w=0;for(let i=0;i<N;i++){const x=play((_,rn)=>ORDERS[Math.floor(rn()*6)],r);h+=x.hits;w+=x.wins;}
  assert.ok(Math.abs(h/(N*R3_MATCHES)-1/6)<.01,'hits '+h/(N*R3_MATCHES));assert.ok(Math.abs(w/(N*R3_MATCHES)-1/6)<.01,'wins '+w/(N*R3_MATCHES));
});
test('第三回：总出同一种，第二局起次次被猜中，最多第一局侥幸赢一局', ()=>{
  const r=RNG(9);for(let i=0;i<500;i++){const x=play(()=>[1,3,2],r);assert.ok(x.hits>=R3_MATCHES-1);assert.ok(x.wins<=1);}
});
