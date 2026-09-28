/* 长亭 · 背包问题：收拾行囊 → 驿站连程（限一炷香）→ 书童同行（两只箱子）
   手感：物件是一块块的，拖进书箱的格子；点一下转个向。摆得下、背得动，用处加起来越多越好。 */
import {RNG} from '../core/rng.js';
import {INK,PAPER,BRUSH_FONT,paperBase,paperGrain,pavilion,willow,figure,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {solveOne,solveTwo,checkBox,R1,R2,R3,gradeRatio} from './pack-core.js';

const ink=a=>`rgba(${INK},${a})`;
/* ---------- 物件的画法（横放：长边水平） ---------- */
function drawIcon(c,nm,pw,ph){
  c.save();if(ph>pw){c.translate(pw,0);c.rotate(Math.PI/2);[pw,ph]=[ph,pw];}
  const L=pw,T=ph,m=Math.min(L,T)*.1;c.lineCap='round';c.lineJoin='round';
  const rr=(x,y,w,h,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();};
  const book=(x,y,w,h,label)=>{c.fillStyle='rgba(30,70,100,.85)';c.fillRect(x,y,w,h);c.fillStyle=`rgba(${PAPER},.95)`;c.fillRect(x+w*.62,y+h*.12,w*.22,h*.76);
    c.strokeStyle=`rgba(${PAPER},.7)`;c.lineWidth=1;for(let k=1;k<5;k++){c.beginPath();c.moveTo(x+w*.06,y+h*k/5);c.lineTo(x+w*.14,y+h*k/5);c.stroke();}
    if(label){c.fillStyle=ink(.85);c.font=`${Math.round(Math.min(w*.16,h*.3))}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';const ch=[...label];ch.forEach((t,i)=>c.fillText(t,x+w*.73,y+h*(.3+i*.4/Math.max(1,ch.length-1))));}};
  switch(nm){
    case '琴':{rr(m,T*.2,L-2*m,T*.6,T*.2);c.fillStyle='rgba(92,48,30,.92)';c.fill();c.strokeStyle='rgba(240,225,190,.75)';c.lineWidth=.8;for(let k=0;k<7;k++){const y=T*(.27+k*.075);c.beginPath();c.moveTo(m+L*.06,y);c.lineTo(L-m-L*.04,y);c.stroke();}
      c.fillStyle='rgba(250,245,230,.9)';for(let k=0;k<13;k++){c.beginPath();c.arc(m+L*(.14+k*.06),T*.24,1.2,0,7);c.fill();}c.fillStyle='rgba(179,38,30,.8)';c.fillRect(L-m-L*.05,T*.62,L*.03,T*.25);break;}
    case '剑':{c.fillStyle='rgba(40,35,30,.9)';rr(L*.3,T*.38,L*.66,T*.24,T*.12);c.fill();c.fillStyle='rgba(200,160,70,.95)';c.fillRect(L*.26,T*.22,L*.05,T*.56);c.fillStyle='rgba(92,48,30,.9)';c.fillRect(L*.1,T*.4,L*.16,T*.2);
      c.fillStyle='rgba(179,38,30,.85)';c.beginPath();c.moveTo(L*.1,T*.5);c.lineTo(L*.03,T*.75);c.lineTo(L*.08,T*.8);c.closePath();c.fill();break;}
    case '雨伞':{c.fillStyle='rgba(190,140,70,.85)';c.beginPath();c.moveTo(L*.12,T*.3);c.lineTo(L*.86,T*.46);c.lineTo(L*.86,T*.54);c.lineTo(L*.12,T*.7);c.closePath();c.fill();c.strokeStyle=ink(.5);c.lineWidth=.8;for(let k=1;k<4;k++){c.beginPath();c.moveTo(L*.12,T*(.3+k*.1));c.lineTo(L*.86,T*.5);c.stroke();}
      c.strokeStyle=ink(.85);c.lineWidth=Math.max(1.5,T*.06);c.beginPath();c.moveTo(L*.86,T*.5);c.lineTo(L*.95,T*.5);c.moveTo(L*.12,T*.5);c.lineTo(L*.05,T*.5);c.quadraticCurveTo(L*.02,T*.5,L*.03,T*.66);c.stroke();break;}
    case '画轴':{c.fillStyle=`rgba(${PAPER},.98)`;rr(L*.1,T*.3,L*.8,T*.4,T*.2);c.fill();c.strokeStyle=ink(.5);c.lineWidth=1;c.stroke();c.fillStyle=ink(.85);rr(L*.04,T*.34,L*.08,T*.32,3);c.fill();rr(L*.88,T*.34,L*.08,T*.32,3);c.fill();
      c.fillStyle='rgba(179,38,30,.75)';c.fillRect(L*.46,T*.3,L*.04,T*.4);break;}
    case '论语':book(m,T*.14,L-2*m,T*.72,'论语');break;
    case '四书':{const w=(L-3*m)/2;book(m,T*.08,w,T*.4,'大学');book(m,T*.52,w,T*.4,'中庸');book(2*m+w,T*.08,w,T*.4,'论语');book(2*m+w,T*.52,w,T*.4,'孟子');break;}
    case '笔墨':{for(let k=0;k<2;k++){const y=T*(.3+k*.25);c.strokeStyle='rgba(150,120,60,.95)';c.lineWidth=Math.max(2,T*.09);c.beginPath();c.moveTo(L*.12,y);c.lineTo(L*.72,y);c.stroke();c.fillStyle=ink(.9);c.beginPath();c.moveTo(L*.72,y-T*.06);c.quadraticCurveTo(L*.88,y,L*.72,y+T*.06);c.fill();}
      c.fillStyle=ink(.85);c.fillRect(L*.2,T*.74,L*.45,T*.13);break;}
    case '药箱':{c.fillStyle='rgba(120,70,40,.85)';rr(m,T*.14,L-2*m,T*.72,3);c.fill();c.strokeStyle=`rgba(${PAPER},.55)`;c.lineWidth=1;c.strokeRect(m+L*.05,T*.22,L*.4,T*.56);c.strokeRect(L*.52,T*.22,L*.4,T*.56);
      c.fillStyle=`rgba(${PAPER},.95)`;c.font=`${Math.round(T*.42)}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText('药',L*.72,T*.52);break;}
    case '干粮':{c.fillStyle='rgba(185,140,80,.88)';c.beginPath();c.moveTo(L*.5,T*.14);c.quadraticCurveTo(L*.92,T*.3,L*.86,T*.9);c.lineTo(L*.14,T*.9);c.quadraticCurveTo(L*.08,T*.3,L*.5,T*.14);c.fill();
      c.fillStyle='rgba(150,100,50,.95)';c.beginPath();c.ellipse(L*.5,T*.2,L*.1,T*.08,0,0,7);c.fill();c.strokeStyle='rgba(120,80,40,.7)';c.lineWidth=1.2;c.beginPath();c.moveTo(L*.4,T*.22);c.lineTo(L*.28,T*.08);c.moveTo(L*.6,T*.22);c.lineTo(L*.72,T*.08);c.stroke();break;}
    case '棋':{c.fillStyle='rgba(200,160,100,.9)';c.fillRect(m,m,L-2*m,T-2*m);c.strokeStyle=ink(.5);c.lineWidth=.7;for(let k=1;k<8;k++){c.beginPath();c.moveTo(m+(L-2*m)*k/8,m);c.lineTo(m+(L-2*m)*k/8,T-m);c.stroke();c.beginPath();c.moveTo(m,m+(T-2*m)*k/8);c.lineTo(L-m,m+(T-2*m)*k/8);c.stroke();}
      [[2,3,1],[3,3,0],[5,4,1],[4,5,0],[3,5,1]].forEach(([i,j,b])=>{c.fillStyle=b?ink(.92):'rgba(250,248,240,1)';c.beginPath();c.arc(m+(L-2*m)*i/8,m+(T-2*m)*j/8,Math.min(L,T)*.045,0,7);c.fill();c.strokeStyle=ink(.5);c.stroke();});break;}
    case '棉袍':{c.fillStyle='rgba(30,91,115,.78)';rr(m,T*.1,L-2*m,T*.8,4);c.fill();c.fillStyle=`rgba(${PAPER},.95)`;c.beginPath();c.moveTo(L*.36,T*.1);c.lineTo(L*.5,T*.46);c.lineTo(L*.64,T*.1);c.lineTo(L*.58,T*.1);c.lineTo(L*.5,T*.32);c.lineTo(L*.42,T*.1);c.closePath();c.fill();
      c.strokeStyle='rgba(20,50,70,.6)';c.lineWidth=1;c.beginPath();c.moveTo(L*.22,T*.2);c.lineTo(L*.22,T*.82);c.moveTo(L*.78,T*.2);c.lineTo(L*.78,T*.82);c.stroke();break;}
    case '砚台':{c.fillStyle=ink(.85);rr(m*1.5,m*1.5,L-3*m,T-3*m,L*.14);c.fill();c.fillStyle='rgba(60,70,90,.9)';c.beginPath();c.ellipse(L*.5,T*.4,L*.24,T*.16,0,0,7);c.fill();break;}
    case '盘缠':{for(let k=0;k<5;k++){const x=L*(.26+(k%3)*.24),y=T*(.34+Math.floor(k/3)*.32),r=Math.min(L,T)*.14;c.fillStyle='rgba(170,130,60,.95)';c.beginPath();c.arc(x,y,r,0,7);c.fill();c.fillStyle=`rgba(${PAPER},.95)`;c.fillRect(x-r*.3,y-r*.3,r*.6,r*.6);}
      c.strokeStyle='rgba(179,38,30,.8)';c.lineWidth=1.2;c.beginPath();c.moveTo(L*.1,T*.2);c.quadraticCurveTo(L*.5,T*.95,L*.9,T*.25);c.stroke();break;}
    case '茶饼':{c.fillStyle='rgba(235,225,200,.98)';c.beginPath();c.arc(L/2,T/2,Math.min(L,T)*.38,0,7);c.fill();c.strokeStyle=ink(.5);c.lineWidth=1;c.stroke();c.fillStyle='rgba(179,38,30,.85)';c.fillRect(L*.42,T*.42,L*.16,T*.16);break;}
    case '灯笼':{c.fillStyle='rgba(200,54,36,.9)';c.beginPath();c.ellipse(L/2,T/2,L*.3,T*.34,0,0,7);c.fill();c.fillStyle=ink(.85);c.fillRect(L*.35,T*.12,L*.3,T*.08);c.fillRect(L*.35,T*.8,L*.3,T*.08);break;}
    default:{c.fillStyle=ink(.3);c.fillRect(m,m,L-2*m,T-2*m);}
  }
  c.restore();
}

export const packLevel={
  id:'pack',title:'长亭',concept:'背包问题',ambience:'scroll',poem:['寒蝉凄切','对长亭晚','骤雨初歇'],poemSrc:'柳永《雨霖铃》',
  colophon:{head:'背包问题',seal:'取舍',
    lines:['箱只一只，力只几斤：带什么，舍什么。','只拣「每斤最有用」的装，常剩下装不满的空当；最值钱的，也未必该带。','斤两要算，格子也要算；两只箱子，就一起算。穷尽组合、层层递推，才得最好的取舍。'],
    note:'今之装箱配载、投资组合、预算分配，皆是取舍之学。'},
  start(ui,audio){
    const S={round:1,idx:0,cfg:null,items:[],cell:40,boxes:[],tray:null,locked:false,timer:0,tally:{val:0,best:0},opt:null,order:0,first:true};
    const root=el('div','pk'),bg=el('canvas','pk-bg'),bar=el('div','pk-bar'),layer=el('div','pk-layer');[bg,bar,layer].forEach(e=>root.appendChild(e));ui.stage.appendChild(root);
    let W=0,H=0;

    /* ---------- 长亭、柳、古道 ---------- */
    function drawScene(){W=root.clientWidth;H=root.clientHeight;const c=fitCanvas(bg,W,H),r=RNG(6);paperBase(c,0,0,W,H);
      c.strokeStyle=ink(.12);c.lineWidth=1.2;c.beginPath();c.moveTo(0,H*.86);c.quadraticCurveTo(W*.5,H*.78,W,H*.9);c.stroke();
      for(let i=0;i<40;i++){const x=r()*W,y=H*.82+r()*H*.16;c.strokeStyle=ink(.12+r()*.1);c.beginPath();c.moveTo(x,y);c.lineTo(x+(r()-.5)*4,y-5-r()*6);c.stroke();}
      c.globalAlpha=.35;pavilion(c,W*.93,H*.84,Math.min(90,H*.16));willow(c,RNG(3),W*.04,H*.9,H*.5);c.globalAlpha=1;
      paperGrain(c,0,0,W,H,false);}

    /* ---------- 版式：箱子在左（窄屏在上），案台在右（窄屏在下） ---------- */
    function shelf(list,width,cell){let x=0,y=0,rowH=0;const gap=8,pos=new Map();
      [...list].sort((a,b)=>(b.h2-a.h2)||(b.w2-a.w2)||(a.id-b.id)).forEach(it=>{const w=it.w2*cell,h=it.h2*cell;if(x>0&&x+w>width){x=0;y+=rowH+gap;rowH=0;}pos.set(it.id,[x,y]);x+=w+gap;rowH=Math.max(rowH,h);});
      return{pos,h:y+rowH};}
    function dims(it){return it.rot?[it.h,it.w]:[it.w,it.h];}
    function layout(){
      W=root.clientWidth;H=root.clientHeight;const top=bar.offsetHeight+10,wide=W>H*1.05,bx=S.cfg.boxes,titleH=26;
      const all=S.items.map(it=>{const [w2,h2]=[Math.max(it.w,it.h),Math.min(it.w,it.h)];return{id:it.id,w2,h2};});
      for(let cell=Math.min(96,Math.round(H/6.5));cell>=24;cell-=2){
        let boxes=[],tray;
        if(wide){let y=top;const maxC=Math.max(...bx.map(b=>b.cols));bx.forEach(b=>{boxes.push({x:16,y:y+titleH,b});y+=titleH+b.rows*cell+14;});
          if(y>H-10||maxC*cell>W*.55)continue;const tx=16+maxC*cell+40,tw=W-tx-16;const sh=shelf(all,tw,cell);if(sh.h>H-top-14)continue;tray={x:tx,y:top+titleH,w:tw,h:H-top-titleH-10};}
        else{let x=12,y=top,rowH=0;bx.forEach(b=>{const w=b.cols*cell;if(x>12&&x+w>W-12){x=12;y+=rowH+titleH+12;rowH=0;}boxes.push({x,y:y+titleH,b});x+=w+16;rowH=Math.max(rowH,b.rows*cell);});
          const ty=y+rowH+titleH+22,tw=W-24;const sh=shelf(all,tw,cell);if(ty+sh.h>H-8)continue;tray={x:12,y:ty,w:tw,h:H-ty-8};}
        S.cell=cell;S.boxes=boxes;S.tray=tray;break;}
      drawBoxes();place();
    }
    function drawBoxes(){
      layer.querySelectorAll('.pk-box,.pk-tray-lbl').forEach(e=>e.remove());const cell=S.cell;
      S.boxes.forEach((B,bi)=>{const d=el('div','pk-box');d.style.cssText=`left:${B.x}px;top:${B.y}px;width:${B.b.cols*cell}px;height:${B.b.rows*cell}px;background-size:${cell}px ${cell}px`;
        const t=el('div','pk-box-t');t.innerHTML=`<b>${B.b.nm}</b><span class="kg"></span>`;d.appendChild(t);B.el=d;layer.insertBefore(d,layer.firstChild);});
      const tl=el('div','pk-tray-lbl','案上 · 点一下转向，拖进箱里');tl.style.left=S.tray.x+'px';tl.style.top=(S.tray.y-24)+'px';layer.appendChild(tl);
    }
    /* ---------- 物件 ---------- */
    function makeItems(){
      layer.querySelectorAll('.pk-item').forEach(e=>e.remove());
      S.items=S.cfg.items.map(d=>({...d,rot:d.h>d.w,loc:null,el:null}));   // 案上一律横放
      S.items.forEach(it=>{const e=el('button','pk-item');e.setAttribute('aria-label',`${it.nm}，${it.kg}斤，用处${it.val}`);
        e.appendChild(el('canvas'));e.appendChild(el('span','kg',it.kg+'斤'));e.appendChild(el('span','val',String(it.val)));it.el=e;wire(it);layer.appendChild(e);});
    }
    function paintItem(it){const [w,h]=dims(it),cell=S.cell,cv=it.el.querySelector('canvas');const pw=w*cell-4,ph=h*cell-4;it.el.style.width=pw+'px';it.el.style.height=ph+'px';
      const c=fitCanvas(cv,pw,ph);c.clearRect(0,0,pw,ph);drawIcon(c,it.nm,pw,ph);it.painted=w+'x'+h+'@'+cell;}
    function place(){
      const cell=S.cell,trayItems=S.items.filter(it=>!it.loc).map(it=>{const [w2,h2]=dims(it);return{id:it.id,w2,h2};}),sh=shelf(trayItems,S.tray.w,cell);
      S.items.forEach(it=>{const [w,h]=dims(it);if(it.painted!==w+'x'+h+'@'+cell)paintItem(it);let x,y;
        if(it.loc){const B=S.boxes[it.loc.box];x=B.x+it.loc.x*cell+2;y=B.y+it.loc.y*cell+2;}else{const p=sh.pos.get(it.id);x=S.tray.x+p[0]+2;y=S.tray.y+p[1]+2;}
        it.el.style.left=x+'px';it.el.style.top=y+'px';it.el.classList.toggle('in',!!it.loc);});
      meters();
    }
    function boxItems(bi,except){return S.items.filter(it=>it.loc&&it.loc.box===bi&&it!==except);}
    function fitsAt(it,bi,x,y,rot){const b=S.cfg.boxes[bi],[w,h]=rot===undefined?dims(it):(rot?[it.h,it.w]:[it.w,it.h]);if(x<0||y<0||x+w>b.cols||y+h>b.rows)return false;
      for(const o of boxItems(bi,it)){const [ow,oh]=dims(o);if(x<o.loc.x+ow&&o.loc.x<x+w&&y<o.loc.y+oh&&o.loc.y<y+h)return false;}return true;}
    function totals(){return S.cfg.boxes.map((b,bi)=>{const its=boxItems(bi);return{kg:its.reduce((s,i)=>s+i.kg,0),val:its.reduce((s,i)=>s+i.val,0),cap:b.cap};});}
    function meters(){const T=totals();S.boxes.forEach((B,bi)=>{const t=T[bi],k=B.el.querySelector('.kg');k.textContent=`${t.kg} / ${t.cap} 斤`;k.classList.toggle('over',t.kg>t.cap);B.el.classList.toggle('over',t.kg>t.cap);});
      const val=T.reduce((s,t)=>s+t.val,0),over=T.some(t=>t.kg>t.cap);S.val=val;S.over=over;const v=bar.querySelector('.pk-val');if(v)v.innerHTML=`用处 <b>${val}</b>`;
      if(!S.locked)refreshActs();}

    /* ---------- 拖放与转向 ---------- */
    let drag=null,ghost=null;
    function wire(it){const e=it.el;
      e.addEventListener('pointerdown',ev=>{if(S.locked||ev.button>0)return;const r=e.getBoundingClientRect();drag={it,dx:ev.clientX-r.left,dy:ev.clientY-r.top,x0:ev.clientX,y0:ev.clientY,moved:false};try{e.setPointerCapture(ev.pointerId);}catch(_){}});
      e.addEventListener('pointermove',ev=>{if(!drag||drag.it!==it)return;if(!drag.moved&&Math.hypot(ev.clientX-drag.x0,ev.clientY-drag.y0)>5){drag.moved=true;e.classList.add('drag');}
        if(!drag.moved)return;const lr=layer.getBoundingClientRect(),x=ev.clientX-lr.left-drag.dx,y=ev.clientY-lr.top-drag.dy;e.style.left=x+'px';e.style.top=y+'px';showGhost(it,x,y);});
      const up=ev=>{if(!drag||drag.it!==it)return;const d=drag;drag=null;e.classList.remove('drag');hideGhost();
        if(!d.moved){rotate(it);return;}const lr=layer.getBoundingClientRect(),x=ev.clientX-lr.left-d.dx,y=ev.clientY-lr.top-d.dy,t=target(it,x,y);
        if(t&&fitsAt(it,t.bi,t.x,t.y)){it.loc={box:t.bi,x:t.x,y:t.y};it.order=++S.order;audio.tap(4+t.bi);}else{if(t)flashBad(it);it.loc=null;audio.tap(1);}
        place();};
      e.addEventListener('pointerup',up);e.addEventListener('pointercancel',up);
      e.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();quickPlace(it);}else if(ev.key==='r'||ev.key==='R')rotate(it);});
    }
    function target(it,x,y){const cell=S.cell,[w,h]=dims(it);let best=null;
      S.boxes.forEach((B,bi)=>{const cx=x+w*cell/2,cy=y+h*cell/2;if(cx<B.x-cell*.3||cy<B.y-cell*.3||cx>B.x+B.b.cols*cell+cell*.3||cy>B.y+B.b.rows*cell+cell*.3)return;
        const gx=Math.round((x-B.x)/cell),gy=Math.round((y-B.y)/cell);best={bi,x:Math.max(0,Math.min(B.b.cols-w,gx)),y:Math.max(0,Math.min(B.b.rows-h,gy))};});return best;}
    function showGhost(it,x,y){const t=target(it,x,y);if(!t){hideGhost();return;}const B=S.boxes[t.bi],[w,h]=dims(it),cell=S.cell;if(!ghost){ghost=el('div','pk-ghost');layer.appendChild(ghost);}
      ghost.style.cssText=`left:${B.x+t.x*cell}px;top:${B.y+t.y*cell}px;width:${w*cell}px;height:${h*cell}px`;ghost.classList.toggle('bad',!fitsAt(it,t.bi,t.x,t.y));}
    function hideGhost(){if(ghost){ghost.remove();ghost=null;}}
    function flashBad(it){it.el.classList.remove('shake');void it.el.offsetWidth;it.el.classList.add('shake');}
    function rotate(it){if(S.locked)return;if(it.w===it.h){flashBad(it);return;}
      if(it.loc){const nr=!it.rot;if(fitsAt(it,it.loc.box,it.loc.x,it.loc.y,nr)){it.rot=nr;}else{it.rot=nr;it.loc=null;ui.flash('转不开，放回案上',parseFloat(it.el.style.left)+20,parseFloat(it.el.style.top));}}
      else it.rot=!it.rot;audio.tap(3);place();}
    /* 键盘或省事：找第一个放得下的格子 */
    function quickPlace(it){if(S.locked)return;if(it.loc){it.loc=null;place();return;}
      for(let bi=0;bi<S.cfg.boxes.length;bi++)for(const rot of [it.rot,!it.rot]){const b=S.cfg.boxes[bi],[w,h]=rot?[it.h,it.w]:[it.w,it.h];for(let y=0;y+h<=b.rows;y++)for(let x=0;x+w<=b.cols;x++)if(fitsAt(it,bi,x,y,rot)){it.rot=rot;it.loc={box:bi,x,y};it.order=++S.order;place();return;}}
      flashBad(it);}

    /* ---------- 回合 ---------- */
    function setup(cfg,barHtml){
      clearInterval(S.timer);S.cfg=cfg.boxes?cfg:{...cfg,boxes:[cfg.box]};S.locked=false;S.order=0;bar.innerHTML=barHtml+'<span class="pk-val"></span><span class="pk-legend">朱字是「用处」</span>';
      S.opt=S.cfg.boxes.length>1?solveTwo(S.cfg.items,...S.cfg.boxes):solveOne(S.cfg.items,S.cfg.boxes[0]);
      makeItems();drawScene();layout();ui.hideResult();
    }
    function refreshActs(){const label=S.round===2?'装好了，上路':'上路';ui.acts([[label,settle,true,S.over||S.val===0]]);}
    function result(){return{val:S.val,best:S.opt.val,ratio:S.val/S.opt.val};}
    function showBest(){S.items.forEach(it=>{it.loc=null;});S.opt.place.forEach(p=>{const it=S.items[p.id];it.rot=(p.w!==it.w);it.loc={box:p.box,x:p.x,y:p.y};});place();audio.gliss();
      ui.say('这是最好的装法。注意它舍掉了什么、又挤进了什么——常常不是「每斤最有用」的那几样。');}
    function lock(){S.locked=true;clearInterval(S.timer);ui.acts([]);}
    function settle(){
      if(S.locked)return;lock();const r=result(),g=gradeRatio(r.ratio),perfect=r.val>=r.best;perfect?audio.arp():audio.low();
      if(S.round===2){if(S.first){S.tally.val+=r.val;S.tally.best+=r.best;}S.first=false;ui.meter(`<small>三站用处</small><b>${S.tally.val}</b><small>/ ${S.tally.best}</small>`);}
      const lineOk='斤两、格子都算尽了：一分用处也没浪费。',lineNo=S.round===3?'两只箱子要一起想：有的物件放书箱挤，放背篓刚好；背篓斤两小，挑轻而有用的。':'只拣「每斤最有用」的，或只拣「最有用」的，都会留下装不满的空当。换几样组合试试。';
      ui.result(perfect?'妙':g,`用处 <b>${r.val}</b> · 最好能得 <b>${r.best}</b>`,perfect?lineOk:lineNo,false);
      const L=[];if(!perfect)L.push(['看最好的装法',showBest]);
      if(S.round===1)L.push(['再装一次',()=>round1()],['下一回 →',round2,true]);
      else if(S.round===2)L.push(['再装一次（不计分）',()=>station(S.idx,true)],S.idx<R2.length-1?['下一站 →',()=>station(S.idx+1),true]:['收官 →',finish2,true]);
      else L.push(['再装一次',round3],['题跋 · 钤印',()=>ui.colophon(),true]);
      ui.acts(L);
    }
    function round1(){S.round=1;ui.stageName('第一回 · 收拾行囊');ui.meter('');setup(R1,`<span class="nm">书箱</span><span>限重 ${R1.box.cap} 斤</span>`);
      ui.say('进京赶考，书箱只背得动二十斤。把案上的物件<b>拖进书箱</b>，点一下能转个向。摆得下、背得动，「用处」加起来越多越好。');}
    function round2(){S.round=2;S.tally={val:0,best:0};ui.stageName('第二回 · 驿站连程');station(0);}
    function station(k,retry){
      S.idx=k;S.first=!retry;const s=R2[k];setup(s,`<span class="nm">${s.nm}</span><span>第 ${k+1} / ${R2.length} 站 · 限重 ${s.box.cap} 斤</span>`);
      if(!retry){const inc=el('div','rc-incense','<span>一炷香</span><div class="stick"><div class="burn"></div></div>');bar.insertBefore(inc,bar.querySelector('.pk-val'));
        const total=(reduceMotion()?s.secs*2:s.secs)*1000,t0=performance.now(),burn=inc.querySelector('.burn');
        S.timer=setInterval(()=>{if(!root.isConnected){clearInterval(S.timer);return;}const k2=Math.max(0,1-(performance.now()-t0)/total);burn.style.width=(k2*100)+'%';inc.classList.toggle('low',k2<.25);
          if(k2<=0){clearInterval(S.timer);timeUp();}},100);}
      ui.say(retry?'不计分，慢慢装。':'每到一站换一批物件，<b>一炷香</b>内装好上路；香尽时背不动的，只好把最后放进去的几样留下。');
    }
    function timeUp(){if(S.locked)return;let T=totals();const placed=S.items.filter(it=>it.loc).sort((a,b)=>b.order-a.order);
      while(T.some(t=>t.kg>t.cap)&&placed.length){placed.shift().loc=null;place();T=totals();}ui.say('香尽了，上路！');settle();}
    function finish2(){ui.hideResult();const g=gradeRatio(S.tally.val/S.tally.best);audio.arp();
      ui.result(g,`三站用处 <b>${S.tally.val}</b> · 最好能得 <b>${S.tally.best}</b>`,g==='至妙'?'站站取舍得当。':'每一站都有一件「看着最值、其实不该带」或「看着不起眼、却刚好补满空当」的东西。',false);
      ui.say('下一回，书童同行：两只箱子，一起算。');ui.acts([['再走一遍',round2],['下一回 →',round3,true]]);}
    function round3(){S.round=3;ui.stageName('第三回 · 书童同行');ui.meter('');
      setup(R3,`<span class="nm">书箱 ＋ 背篓</span><span>书箱限 ${R3.boxes[0].cap} 斤，书童的背篓限 ${R3.boxes[1].cap} 斤</span>`);
      ui.say('书童背个小背篓同行。东西可以放书箱，也可以放背篓——两只箱子<b>一起想</b>，别各顾各的。');}

    this._resize=()=>{if(!S.cfg)return;drawScene();layout();};
    this._stop=()=>{clearInterval(S.timer);};
    packLevel._dbg=S;packLevel._go=n=>[round1,round2,round3][n-1]();   /* 自动化测试用 */
    round1();
  },
  resize(){this._resize&&this._resize();},
  stop(){this._stop&&this._stop();this._resize=null;}
};
