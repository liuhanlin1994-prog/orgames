import test from 'node:test';
import assert from 'node:assert/strict';
import {canPack,solveOne,solveTwo,weightOnly,greedy,checkBox,R1,R2,R3,gradeRatio} from '../src/levels/pack-core.js';
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
test('第一回：按每斤用处、按用处贪心都吃亏；只看斤两的最好装法摆不进书箱', ()=>{
  const {box,items}=R1,o=solveOne(items,box);assert.equal(o.val,38);
  assert.ok(weightOnly(items,box.cap)>o.val);assert.ok(greedy(items,box,x=>x.val/x.kg)<=o.val-3);assert.ok(greedy(items,box,x=>x.val)<=o.val-4);
  assert.ok(checkBox(box,o.place.map(p=>({...p,kg:items[p.id].kg,val:items[p.id].val}))).ok);
  assert.ok(o.place.some(p=>items[p.id].nm==='琴'),'最好的装法里恰恰带着琴');
});
test('第二回三站：都有陷阱；给出的最好装法合法', ()=>{
  assert.deepEqual(R2.map(s=>solveOne(s.items,s.box).val),[28,42,42]);
  for(const s of R2){const o=solveOne(s.items,s.box);assert.ok(weightOnly(s.items,s.box.cap)>o.val,s.nm);assert.ok(greedy(s.items,s.box,x=>x.val/x.kg)<o.val,s.nm);
    const c=checkBox(s.box,o.place.map(p=>({...p,kg:s.items[p.id].kg,val:s.items[p.id].val})));assert.ok(c.ok);assert.equal(c.val,o.val);}
});
test('第三回：两只箱子一起算，比只装书箱多出一截', ()=>{
  const [A,B]=R3.boxes,o=solveTwo(R3.items,A,B);assert.equal(o.val,57);assert.ok(solveOne(R3.items,A).val<=o.val-10);
  for(const bi of [0,1]){const bx=R3.boxes[bi],pl=o.place.filter(p=>p.box===bi).map(p=>({...p,kg:R3.items[p.id].kg,val:R3.items[p.id].val}));assert.ok(checkBox(bx,pl).ok);}
});
test('合法性检查与评级', ()=>{
  const box={cols:3,rows:2,cap:5};assert.equal(checkBox(box,[{x:0,y:0,w:2,h:2,kg:3,val:1},{x:1,y:0,w:1,h:1,kg:1,val:1}]).why,'重叠');
  assert.equal(checkBox(box,[{x:2,y:0,w:2,h:1,kg:1,val:1}]).why,'出界');assert.equal(checkBox(box,[{x:0,y:0,w:1,h:1,kg:6,val:1}]).why,'超重');
  assert.equal(gradeRatio(1),'至妙');assert.equal(gradeRatio(.92),'上品');assert.equal(gradeRatio(.8),'中品');assert.equal(gradeRatio(.5),'下品');
});
