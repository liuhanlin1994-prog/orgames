import test from 'node:test';
import assert from 'node:assert/strict';
import {inCircle,piOf,unevenness,handToss,gradeUneven,makeLake,LAKES,LAKE3,PAY,cost,payout,expErrPct,areaIn,expPay,expert,gradeRatio,GRIDS,N3,scatter,estimate,trials,meanAbs} from '../src/levels/beans-core.js';
import {RNG} from '../src/core/rng.js';

test('撒得匀：π 越撒越准，误差约按豆数的平方根缩小', ()=>{
  const r=RNG(1),err=n=>{let s=0;for(let t=0;t<200;t++){let k=0;for(let i=0;i<n;i++)if(inCircle(r(),r()))k++;s+=Math.abs(piOf(k,n)-Math.PI);}return s/200;};
  const e1=err(100),e2=err(10000);assert.ok(e1/e2>7&&e1/e2<13,`准十倍要撒百倍：${e1.toFixed(3)} / ${e2.toFixed(3)}`);
});
test('撒不匀就偏：只撒中间，π 偏大；从田边扫到田边才匀', ()=>{
  const r=RNG(2),center=[],sweep=[];
  for(let i=0;i<3000;i++){const p=handToss(r,.5+(r()-.5)*.5,.5+(r()-.5)*.5,.1);if(p)center.push(p);}
  for(let i=0;i<3000;i++){const t=i/3000*8,row=Math.floor(t),f=t-row,y=(row+.5)/8,x=row%2?1-f:f;const p=handToss(r,x,y,.1);if(p)sweep.push(p);}
  const pi=pts=>piOf(pts.filter(p=>inCircle(...p)).length,pts.length);
  assert.ok(pi(center)>3.5);assert.ok(Math.abs(pi(sweep)-Math.PI)<.08);assert.ok(unevenness(center)>unevenness(sweep)*3);
  assert.ok(sweep.every(([x,y])=>x>=0&&x<1&&y>=0&&y<1),'碰到田埂弹回田里');
  assert.equal(gradeUneven(1,.02),'至妙');assert.equal(gradeUneven(1,.3),'下品');assert.equal(gradeUneven(5,.01),'下品');
});
test('湖的面积：极坐标积分与撒十万颗豆一致', ()=>{
  const r=RNG(3);for(const L of [...LAKES,LAKE3]){let k=0;const N=200000;for(let i=0;i<N;i++)if(L.lake.inside(r(),r()))k++;
    assert.ok(Math.abs(k/N-L.lake.area)<.005,L.nm+" "+(k/N)+" vs "+L.lake.area);const [x0,y0,x1,y1]=L.lake.bbox;assert.ok(x0>0&&y0>0&&x1<1&&y1<1,L.nm+' 在舆图之内');
    assert.ok(Math.abs(areaIn(L.lake,L.lake.bbox)-L.lake.area)/L.lake.area<.01,'外接框框住整片湖');}
});
test('期望误差公式与模拟一致；框没框全就偏', ()=>{
  const r=RNG(4),L=LAKES[1].lake,f=L.bbox,F=(f[2]-f[0])*(f[3]-f[1]);let s=0;const R=1500;
  for(let t=0;t<R;t++)s+=Math.abs(estimate(L,f,scatter(r,f,1,200))-L.area)/L.area*100;
  assert.ok(Math.abs(s/R-expErrPct(F,areaIn(L,f),L.area,200))<.4);
  const cut=[f[0],f[1],(f[0]+f[2])/2,f[3]];assert.ok(expPay(L,cut,400)<expPay(L,f,400)-20,'半个框：撒再多也偏');
});
test('量湖：框紧湖边比整张舆图撒强得多；豆数有个恰好', ()=>{
  for(const {nm,lake} of LAKES){const ex=expert(lake);let whole=-1e9;for(let n=20;n<=4000;n+=20)whole=Math.max(whole,expPay(lake,[0,0,1,1],n));
    assert.ok(ex.pay>whole+12,`${nm}：${ex.pay.toFixed(1)} vs ${whole.toFixed(1)}`);assert.ok(ex.n>=60&&ex.n<=600,nm);
    assert.ok(expPay(lake,lake.bbox,ex.n*6)<ex.pay-5&&expPay(lake,lake.bbox,Math.max(10,ex.n/6))<ex.pay-5,'撒太多太少都亏');}
  assert.equal(cost(20),1);assert.equal(cost(21),2);assert.equal(payout(5,200),100-20-10);assert.equal(gradeRatio(.95),'至妙');assert.equal(gradeRatio(.6),'中品');
});
test('分格撒：同样 196 颗，格分得越细越准（分层抽样）', ()=>{
  const L=LAKE3.lake,e=GRIDS.map(G=>meanAbs(trials(L,L.bbox,G.g)));
  for(let i=1;i<e.length;i++)assert.ok(e[i]<e[i-1],GRIDS[i].nm);assert.ok(e[0]/e[3]>2.2,'乱撒的误差是细格的两倍多');
  const pts=scatter(RNG(5),L.bbox,7,N3),g=7,cnt=new Array(49).fill(0),[x0,y0,x1,y1]=L.bbox;
  pts.forEach(([x,y])=>cnt[Math.min(6,Math.floor((y-y0)/(y1-y0)*g))*g+Math.min(6,Math.floor((x-x0)/(x1-x0)*g))]++);assert.ok(cnt.every(c=>c===4),'每格一样多');
});
