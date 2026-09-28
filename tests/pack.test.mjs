import test from 'node:test';
import assert from 'node:assert/strict';
import {canPack,solve,valueOf,setsOf,onlineGreedy,checkBox,ROUNDS,SETS,gradeRatio} from '../src/levels/pack-core.js';
import {RNG} from '../src/core/rng.js';

/* 穷举式摆放（慢，但一目了然），用来核对快的那个 */
function slowPack(items,cols,rows){const g=new Uint8Array(cols*rows),used=new Uint8Array(items.length);let slack=cols*rows-items.reduce((s,[w,h])=>s+w*h,0);if(slack<0)return false;
  const rec=placed=>{if(placed===items.length)return true;const idx=g.indexOf(0);if(idx<0)return false;const x=idx%cols,y=(idx/cols)|0;
    for(let i=0;i<items.length;i++){if(used[i])continue;const [w,h]=items[i];for(const [ww,hh] of (w===h?[[w,h]]:[[w,h],[h,w]])){if(x+ww>cols||y+hh>rows)continue;let ok=true;
      for(let dy=0;dy<hh&&ok;dy++)for(let dx=0;dx<ww;dx++)if(g[(y+dy)*cols+x+dx]){ok=false;break;}if(!ok)continue;
      for(let dy=0;dy<hh;dy++)for(let dx=0;dx<ww;dx++)g[(y+dy)*cols+x+dx]=1;used[i]=1;if(rec(placed+1))return true;used[i]=0;for(let dy=0;dy<hh;dy++)for(let dx=0;dx<ww;dx++)g[(y+dy)*cols+x+dx]=0;}}
    if(slack>0){slack--;g[idx]=2;if(rec(placed))return true;g[idx]=0;slack++;}return false;};return rec(0);}

test('摆放判定与穷举一致，给出的摆法互不重叠、不出界', ()=>{
  const shapes=[[1,1],[1,2],[1,3],[1,4],[2,2],[2,3]],r=RNG(2);
  for(let k=0;k<1500;k++){const n=2+Math.floor(r()*6),it=[];for(let i=0;i<n;i++)it.push(shapes[Math.floor(r()*shapes.length)]);const [c,rw]=[[4,3],[5,4],[6,4]][k%3];
    const pos=canPack(it,c,rw);assert.equal(!!pos,slowPack(it,c,rw));
    if(pos){const box={cols:c,rows:rw,cap:99};assert.ok(checkBox(box,pos.map(([x,y,w,h])=>({x,y,w,h,kg:0,val:0}))).ok);pos.forEach(([x,y,w,h],i)=>assert.equal(w*h,it[i][0]*it[i][1]));}}
});
/* 事后诸葛给出的装法：每只箱子都合法，用处与宣称一致 */
function valid(r,o){const chosen=o.place.map(p=>r.items[p.id]);assert.equal(valueOf(chosen),o.val);
  r.boxes.forEach((b,bi)=>{const pl=o.place.filter(p=>p.box===bi).map(p=>({...p,kg:r.items[p.id].kg,val:r.items[p.id].val}));assert.ok(checkBox(b,pl).ok,r.nm+' 箱 '+bi);
    pl.forEach(p=>{const it=r.items[p.id];assert.ok((p.w===it.w&&p.h===it.h)||(p.w===it.h&&p.h===it.w));});});}
/* 可挪可舍的近视玩法：每来一件，在「不收 / 收下 / 收下并舍掉一两件」里挑眼下最值的（只会一只箱子） */
function myopic(r){const b=r.boxes[0],K=[];const ok=L=>L.reduce((s,x)=>s+x.kg,0)<=b.cap&&!!canPack(L.map(x=>[x.w,x.h]),b.cols,b.rows);
  for(const x of r.items){let best=K.slice(),bv=valueOf(K);const t=L=>{const v=valueOf(L);if(v>bv&&ok(L)){bv=v;best=L;}};
    t(K.concat([x]));K.forEach((_,i)=>t(K.filter((_,j)=>j!==i).concat([x])));K.forEach((_,i)=>K.forEach((_,j)=>{if(j>i)t(K.filter((_,k)=>k!==i&&k!==j).concat([x]));}));K.length=0;K.push(...best);}
  return valueOf(K);}

test('三回合的事后最好：46 / 57 / 80，装法合法', ()=>{
  assert.deepEqual(ROUNDS.map(r=>solve(r.items,r.boxes).val),[46,57,80]);
  for(const r of ROUNDS)valid(r,solve(r.items,r.boxes));
});
test('来者不拒吃大亏：不到事后最好的七成', ()=>{
  for(const r of ROUNDS){const o=solve(r.items,r.boxes).val;assert.ok(onlineGreedy(r.items,r.boxes[0])<=o*.7,r.nm);}
});
test('只收「每斤用处」高的，第一回也到不了至妙', ()=>{
  const r=ROUNDS[0],o=solve(r.items,r.boxes).val;
  for(const thr of [1,1.2,1.5,2,2.5])assert.ok(onlineGreedy(r.items,r.boxes[0],x=>x.val/x.kg>=thr)<o*.95,'门槛 '+thr);
});
test('箱里的能挪能舍，当场也能取舍得好：第一回可到满分', ()=>{
  const r=ROUNDS[0];assert.equal(myopic(r),solve(r.items,r.boxes).val);
});
test('成套加分：第二回的最好带法凑齐两套；拆掉一件就少一截', ()=>{
  const r=ROUNDS[1],o=solve(r.items,r.boxes),chosen=o.place.map(p=>r.items[p.id]);
  assert.deepEqual(setsOf(chosen).map(s=>s.nm).sort(),SETS.map(s=>s.nm).sort());
  const ink=chosen.filter(x=>x.nm!=='墨');assert.equal(valueOf(chosen)-valueOf(ink),2+8);
  assert.ok(chosen.reduce((s,x)=>s+x.val,0)<o.val);
});
test('第三回：两只箱子一起算，比只用书箱多出一截', ()=>{
  const r=ROUNDS[2],two=solve(r.items,r.boxes).val,one=solve(r.items,[r.boxes[0]]).val;assert.ok(two>=one+15,`${two} vs ${one}`);
});
test('合法性检查与评级', ()=>{
  const box={cols:3,rows:2,cap:5};assert.equal(checkBox(box,[{x:0,y:0,w:2,h:2,kg:3,val:1},{x:1,y:0,w:1,h:1,kg:1,val:1}]).why,'重叠');
  assert.equal(checkBox(box,[{x:2,y:0,w:2,h:1,kg:1,val:1}]).why,'出界');assert.equal(checkBox(box,[{x:0,y:0,w:1,h:1,kg:6,val:1}]).why,'超重');
  assert.equal(gradeRatio(1),'至妙');assert.equal(gradeRatio(.9),'上品');assert.equal(gradeRatio(.75),'中品');assert.equal(gradeRatio(.5),'下品');
});
