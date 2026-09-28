/* 长亭 · 背包问题（在线版）：亲友送行 → 文房四宝 → 书童同行
   亲友一件件递来，每件只等几秒：拖进书箱（点一下转向），还是让它留在长亭？箱里的也能挪、能舍。
   最后和「事后诸葛」比——他知道后面还会来什么。 */
import {RNG} from '../core/rng.js';
import {INK,PAPER,BRUSH_FONT,paperBase,paperGrain,pavilion,willow,figure,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {ROUNDS,SETS,kindOf,setsOf,valueOf,solve,onlineGreedy,gradeRatio} from './pack-core.js';

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
    case '笔':{const y=T*.5;c.strokeStyle='rgba(150,120,60,.95)';c.lineWidth=Math.max(2.5,T*.16);c.beginPath();c.moveTo(L*.1,y);c.lineTo(L*.7,y);c.stroke();
      c.strokeStyle='rgba(110,80,40,.6)';c.lineWidth=1;for(let k=1;k<4;k++){c.beginPath();c.moveTo(L*(.1+k*.15),y-T*.08);c.lineTo(L*(.1+k*.15),y+T*.08);c.stroke();}
      c.fillStyle=ink(.9);c.beginPath();c.moveTo(L*.7,y-T*.11);c.quadraticCurveTo(L*.95,y,L*.7,y+T*.11);c.closePath();c.fill();
      c.strokeStyle='rgba(179,38,30,.8)';c.lineWidth=1.2;c.beginPath();c.moveTo(L*.1,y);c.quadraticCurveTo(L*.03,y+T*.2,L*.07,y+T*.34);c.stroke();break;}
    case '墨':{c.fillStyle=ink(.9);rr(L*.22,T*.1,L*.56,T*.8,3);c.fill();c.strokeStyle='rgba(200,160,70,.9)';c.lineWidth=1;c.strokeRect(L*.28,T*.18,L*.44,T*.64);
      c.fillStyle='rgba(215,175,80,.95)';c.font=`${Math.round(T*.34)}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText('墨',L*.5,T*.5);break;}
    case '纸':{for(let k=3;k>=0;k--){c.fillStyle=`rgba(${PAPER},${.9+k*.02})`;c.strokeStyle=ink(.3);c.lineWidth=.8;const o=k*T*.05;c.fillRect(L*.08+o,T*.18+o,L*.8,T*.6);c.strokeRect(L*.08+o,T*.18+o,L*.8,T*.6);}
      c.fillStyle='rgba(179,38,30,.8)';c.fillRect(L*.44,T*.16,L*.07,T*.8);break;}
    case '棉被':{c.fillStyle='rgba(60,95,140,.8)';rr(m,T*.14,L-2*m,T*.72,T*.28);c.fill();c.fillStyle='rgba(250,245,230,.75)';
      for(let i=0;i<6;i++)for(let j=0;j<3;j++){const x=L*(.16+i*.14)+(j%2)*L*.07,y=T*(.3+j*.2);c.beginPath();c.arc(x,y,Math.min(L,T)*.04,0,7);c.fill();}
      c.strokeStyle='rgba(120,80,40,.9)';c.lineWidth=Math.max(2,T*.05);c.beginPath();c.moveTo(L*.3,T*.1);c.lineTo(L*.3,T*.9);c.moveTo(L*.7,T*.1);c.lineTo(L*.7,T*.9);c.stroke();break;}
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

/* 送东西的人：衣色、帽子 */
const GIVER={'母亲':['rgba(170,70,60,.3)',0],'父亲':['rgba(70,80,100,.3)',1],'先生':['rgba(30,70,100,.32)',2],'友人':['rgba(60,100,70,.3)',1],'同窗':['rgba(30,91,115,.28)',2],
  '族叔':['rgba(110,80,50,.3)',1],'邻家':['rgba(140,110,60,.3)',0],'邻家阿婆':['rgba(120,90,110,.3)',0],'书童':['rgba(180,140,70,.3)',0]};
const LINES=['前面来的先占了地方和斤两，后面的好东西就进不来。心里要有一条线：每斤用处太低的，宁可留在长亭。',
  '一锭墨只值 2，可凑齐文房四宝便多 8。单件看着不值的，要看它能和谁凑成一套。',
  '两只箱子一起算：背篓斤两小、格子少，留给轻而有用的；重的大件放书箱。'];
const INTRO=['进京赶考，亲友来长亭送行，一件件递东西。每件只等几秒：<b>拖进书箱</b>（点一下转向），或者让它留在长亭。书箱只背得动 20 斤；后面还会来什么，只看得见两件。',
  '这回物件更多。凑齐<b>文房四宝</b>（笔墨纸砚）多 8，凑齐<b>琴棋书画</b>多 12——单件不起眼的，凑成一套就值钱。',
  '书童背个小背篓同行。东西放书箱、放背篓都行；箱里的也能挪来挪去，或拖到「留在长亭」舍掉。'];
const NAMES=['第一回 · 亲友送行','第二回 · 文房四宝','第三回 · 书童同行'];

export const packLevel={
  id:'pack',title:'长亭',concept:'背包问题',ambience:'scroll',poem:['寒蝉凄切','对长亭晚','骤雨初歇'],poemSrc:'柳永《雨霖铃》',
  colophon:{head:'背包问题',seal:'取舍',
    lines:['亲友一件件递来，带不带当场定：箱只一只，力只几斤。','来者不拒，好东西来时已无处可放；心里要有一条「每斤值不值」的线。','一锭墨不起眼，凑齐文房四宝便值钱。事后看全了、穷尽组合，才知道最好的取舍。'],
    note:'今之装箱配载、预算分配、广告位与算力的实时接单，皆是「一件件来、当场取舍」的在线背包。'},
  start(ui,audio){
    const S={round:1,cfg:null,items:[],idx:-1,hand:null,live:false,cell:40,boxes:[],t0:0,dur:0,timer:0,nextT:0,expired:false,lastSec:0,opt:null,view:'mine',mineSnap:null,bestSnap:null};
    const root=el('div','pk'),bg=el('canvas','pk-bg'),bar=el('div','pk-bar'),layer=el('div','pk-layer');[bg,bar,layer].forEach(e=>root.appendChild(e));ui.stage.appendChild(root);
    const side=el('div','pk-side',`<div class="pk-from"><canvas></canvas><div class="tx"></div></div><div class="pk-mid"><div class="hw"><div class="pk-hand"></div><div class="pk-fuse off"><i></i></div></div><div class="pk-next"><small>后面还有</small><div class="tiles"></div></div></div><div class="pk-sets"></div><div class="pk-pile"></div>`);
    layer.appendChild(side);
    const q=s=>side.querySelector(s),fromTx=q('.pk-from .tx'),giverCv=q('.pk-from canvas'),handEl=q('.pk-hand'),fuse=q('.pk-fuse'),fuseI=q('.pk-fuse i'),tiles=q('.tiles'),setsEl=q('.pk-sets'),pileEl=q('.pk-pile');
    let W=0,H=0;

    /* ---------- 长亭、柳、古道 ---------- */
    function drawScene(){W=root.clientWidth;H=root.clientHeight;const c=fitCanvas(bg,W,H),r=RNG(6);paperBase(c,0,0,W,H);
      c.strokeStyle=ink(.12);c.lineWidth=1.2;c.beginPath();c.moveTo(0,H*.86);c.quadraticCurveTo(W*.5,H*.78,W,H*.9);c.stroke();
      for(let i=0;i<40;i++){const x=r()*W,y=H*.82+r()*H*.16;c.strokeStyle=ink(.12+r()*.1);c.beginPath();c.moveTo(x,y);c.lineTo(x+(r()-.5)*4,y-5-r()*6);c.stroke();}
      c.globalAlpha=.35;pavilion(c,W*.93,H*.84,Math.min(90,H*.16));willow(c,RNG(3),W*.04,H*.9,H*.5);c.globalAlpha=1;
      paperGrain(c,0,0,W,H,false);}
    function drawGiver(from){const w=giverCv.clientWidth||40,h=giverCv.clientHeight||50,c=fitCanvas(giverCv,w,h);c.clearRect(0,0,w,h);if(!from)return;const [tint,hat]=GIVER[from]||['rgba(90,90,90,.3)',0];figure(c,w/2,h-2,h*.92,tint,hat);}

    /* ---------- 版式：箱子在左（窄屏在上），递东西的在右（窄屏在下） ---------- */
    function dims(it){return it.rot?[it.h,it.w]:[it.w,it.h];}
    function sizeSide(x,y,w,cell){side.style.left=x+'px';side.style.top=y+'px';side.style.width=w+'px';
      handEl.style.width=(4*cell+14)+'px';handEl.style.height=(2*cell+14)+'px';tiles.style.height=(cell+20)+'px';setsEl.style.display=S.round>1?'':'none';}
    function layout(){
      W=root.clientWidth;H=root.clientHeight;const top=bar.offsetHeight+34,wide=W>H*1.05,bx=S.cfg.boxes;let done=false;
      for(let cell=Math.min(96,Math.round(H/7));cell>=18&&!done;cell-=2){
        const boxes=[];let sx,sy,sw;
        if(wide){const maxC=Math.max(...bx.map(b=>b.cols));sw=Math.min(W-maxC*cell-74,440);if(sw<4*cell+30)continue;
          const x0=Math.max(18,Math.round((W-(maxC*cell+40+sw))/2));let y=top;bx.forEach(b=>{boxes.push({x:x0,y,b});y+=b.rows*cell+40;});
          if(y-40>H-10)continue;sx=x0+maxC*cell+40;sy=top-30;}
        else{let x=12,y=top,rowH=0,bad=false;bx.forEach(b=>{const w=b.cols*cell;if(w>W-24)bad=true;if(x>12&&x+w>W-12){x=12;y+=rowH+40;rowH=0;}boxes.push({x,y,b});x+=w+16;rowH=Math.max(rowH,b.rows*cell);});
          if(bad)continue;sx=12;sy=y+rowH+12;sw=W-24;}
        sizeSide(sx,sy,sw,cell);S.cell=cell;S.boxes=boxes;
        if(sy+side.offsetHeight<=H-8)done=true;}
      drawBoxes();renderNext();place();drawGiver(S.hand&&S.hand.from);
    }
    function drawBoxes(){
      layer.querySelectorAll('.pk-box').forEach(e=>e.remove());const cell=S.cell;
      S.boxes.forEach(B=>{const d=el('div','pk-box');d.style.cssText=`left:${B.x}px;top:${B.y}px;width:${B.b.cols*cell}px;height:${B.b.rows*cell}px;background-size:${cell}px ${cell}px`;
        const t=el('div','pk-box-t');t.innerHTML=`<b>${B.b.nm}</b><span class="kg"></span>`;d.appendChild(t);B.el=d;layer.insertBefore(d,layer.firstChild);});
    }
    const off=e=>{let x=0,y=0;for(let n=e;n&&n!==layer;n=n.offsetParent){x+=n.offsetLeft;y+=n.offsetTop;}return{x,y,w:e.offsetWidth,h:e.offsetHeight};};

    /* ---------- 物件 ---------- */
    function ensureEl(it){if(it.el)return;const e=el('button','pk-item');e.setAttribute('aria-label',`${it.nm}，${it.kg}斤，用处${it.val}`);
      e.appendChild(el('canvas'));e.appendChild(el('span','kg',it.kg+'斤'));e.appendChild(el('span','val',String(it.val)));it.el=e;wire(it);layer.appendChild(e);}
    function paintItem(it){const [w,h]=dims(it),cell=S.cell,cv=it.el.querySelector('canvas');const pw=w*cell-4,ph=h*cell-4;it.el.style.width=pw+'px';it.el.style.height=ph+'px';
      const c=fitCanvas(cv,pw,ph);c.clearRect(0,0,pw,ph);drawIcon(c,it.nm,pw,ph);it.painted=w+'x'+h+'@'+cell;}
    function place(){const cell=S.cell,hr=off(handEl);
      S.items.forEach(it=>{const show=it.state==='hand'||it.state==='box';if(!show){if(it.el)it.el.style.display='none';return;}
        ensureEl(it);it.el.style.display='';const [w,h]=dims(it);if(it.painted!==w+'x'+h+'@'+cell)paintItem(it);let x,y;
        if(it.state==='box'){const B=S.boxes[it.loc.box];x=B.x+it.loc.x*cell+2;y=B.y+it.loc.y*cell+2;}else{x=hr.x+(hr.w-w*cell)/2+2;y=hr.y+(hr.h-h*cell)/2+2;}
        it.el.style.left=x+'px';it.el.style.top=y+'px';it.el.classList.toggle('in',it.state==='box');it.el.classList.toggle('hand',it.state==='hand');});
      meters();}
    function renderNext(){tiles.innerHTML='';const cell=S.cell,from=S.idx+1,list=S.items.slice(from,from+2);
      if(!list.length){tiles.appendChild(el('span','pk-tile',`<span>${S.idx>=S.items.length-1&&S.live?'这是最后一件':''}</span>`));return;}
      list.forEach(it=>{const [w,h]=it.h>it.w?[it.h,it.w]:[it.w,it.h],pw=Math.round(w*cell*.5),ph=Math.round(h*cell*.5),t=el('div','pk-tile'),cv=el('canvas');cv.style.width=pw+'px';cv.style.height=ph+'px';
        t.appendChild(cv);t.appendChild(el('span','',`${it.nm} ${it.kg}斤·<em>${it.val}</em>`));tiles.appendChild(t);const c=fitCanvas(cv,pw,ph);drawIcon(c,it.nm,pw,ph);});}
    const inBox=bi=>S.items.filter(it=>it.state==='box'&&(bi===undefined||it.loc.box===bi));
    function meters(){S.boxes.forEach((B,bi)=>{const kg=inBox(bi).reduce((s,i)=>s+i.kg,0),k=B.el&&B.el.querySelector('.kg');if(k)k.textContent=`${kg} / ${B.b.cap} 斤`;});
      const mine=inBox(),v=bar.querySelector('.pk-val');if(v)v.innerHTML=`用处 <b>${valueOf(mine)}</b>`;
      if(S.round>1){const got=new Set(mine.map(x=>kindOf(x.nm))),alive=new Set(S.items.filter(x=>x.state!=='left').map(x=>kindOf(x.nm)));
        setsEl.innerHTML=SETS.map(s=>`<div class="st${s.need.every(k=>got.has(k))?' done':''}"><b>${s.nm}</b><i>+${s.bonus}</i>${s.need.map(k=>`<span class="${got.has(k)?'got':alive.has(k)?'':'lost'}">${k}</span>`).join('')}</div>`).join('');}
      const left=S.items.filter(x=>x.state==='left');pileEl.innerHTML=`<b>留在长亭</b>${left.length?left.length+' 件：'+left.map(x=>x.nm).reverse().join('、'):'拖到这里的，就不带了'}`;}

    /* ---------- 拖放与转向 ---------- */
    let drag=null,ghost=null;
    function wire(it){const e=it.el;
      e.addEventListener('pointerdown',ev=>{if(!S.live||ev.button>0)return;const r=e.getBoundingClientRect();drag={it,dx:ev.clientX-r.left,dy:ev.clientY-r.top,x0:ev.clientX,y0:ev.clientY,moved:false};try{e.setPointerCapture(ev.pointerId);}catch(_){}});
      e.addEventListener('pointermove',ev=>{if(!drag||drag.it!==it)return;if(!drag.moved&&Math.hypot(ev.clientX-drag.x0,ev.clientY-drag.y0)>5){drag.moved=true;e.classList.add('drag');}
        if(!drag.moved)return;const lr=layer.getBoundingClientRect(),x=ev.clientX-lr.left-drag.dx,y=ev.clientY-lr.top-drag.dy;e.style.left=x+'px';e.style.top=y+'px';showGhost(it,x,y);
        pileEl.classList.toggle('hot',overPile(ev.clientX-lr.left,ev.clientY-lr.top));});
      const up=ev=>{if(!drag||drag.it!==it)return;const d=drag;drag=null;e.classList.remove('drag');hideGhost();pileEl.classList.remove('hot');
        if(!S.live){place();return;}
        if(!d.moved){rotate(it);afterDrop();return;}
        const lr=layer.getBoundingClientRect(),px=ev.clientX-lr.left,py=ev.clientY-lr.top,x=px-d.dx,y=py-d.dy,t=target(it,x,y);
        if(t){const ok=canPut(it,t.bi,t.x,t.y);if(ok===true)put(it,t);else{if(ok==='kg')ui.flash('背不动了',px,py-20);flashBad(it);place();}}
        else if(overPile(px,py))leave(it);
        else place();
        afterDrop();};
      e.addEventListener('pointerup',up);e.addEventListener('pointercancel',up);
      e.addEventListener('keydown',ev=>{if(!S.live)return;if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();quickPlace(it);}else if(ev.key==='r'||ev.key==='R')rotate(it);else if(ev.key==='Delete'||ev.key==='Backspace'){ev.preventDefault();leave(it);}});
    }
    function overPile(px,py){const r=off(pileEl);return px>=r.x&&px<=r.x+r.w&&py>=r.y-6&&py<=r.y+r.h+6;}
    function target(it,x,y){const cell=S.cell,[w,h]=dims(it);let best=null;
      S.boxes.forEach((B,bi)=>{const cx=x+w*cell/2,cy=y+h*cell/2;if(cx<B.x-cell*.3||cy<B.y-cell*.3||cx>B.x+B.b.cols*cell+cell*.3||cy>B.y+B.b.rows*cell+cell*.3)return;
        const gx=Math.round((x-B.x)/cell),gy=Math.round((y-B.y)/cell);best={bi,x:Math.max(0,Math.min(B.b.cols-w,gx)),y:Math.max(0,Math.min(B.b.rows-h,gy))};});return best;}
    function fitsAt(it,bi,x,y,rot){const b=S.cfg.boxes[bi],[w,h]=rot===undefined?dims(it):(rot?[it.h,it.w]:[it.w,it.h]);if(x<0||y<0||x+w>b.cols||y+h>b.rows)return false;
      for(const o of inBox(bi)){if(o===it)continue;const [ow,oh]=dims(o);if(x<o.loc.x+ow&&o.loc.x<x+w&&y<o.loc.y+oh&&o.loc.y<y+h)return false;}return true;}
    function kgOk(it,bi){return inBox(bi).filter(o=>o!==it).reduce((s,o)=>s+o.kg,0)+it.kg<=S.cfg.boxes[bi].cap;}
    function canPut(it,bi,x,y,rot){return !fitsAt(it,bi,x,y,rot)?'room':!kgOk(it,bi)?'kg':true;}
    function showGhost(it,x,y){const t=target(it,x,y);if(!t){hideGhost();return;}const B=S.boxes[t.bi],[w,h]=dims(it),cell=S.cell;if(!ghost){ghost=el('div','pk-ghost');layer.appendChild(ghost);}
      ghost.style.cssText=`left:${B.x+t.x*cell}px;top:${B.y+t.y*cell}px;width:${w*cell}px;height:${h*cell}px`;ghost.classList.toggle('bad',canPut(it,t.bi,t.x,t.y)!==true);}
    function hideGhost(){if(ghost){ghost.remove();ghost=null;}}
    function flashBad(it){if(!it.el)return;it.el.classList.remove('shake');void it.el.offsetWidth;it.el.classList.add('shake');}
    function rotate(it){if(it.w===it.h){flashBad(it);return;}
      if(it.state==='box'){const nr=!it.rot;if(fitsAt(it,it.loc.box,it.loc.x,it.loc.y,nr))it.rot=nr;else{ui.flash('转不开',parseFloat(it.el.style.left)+20,parseFloat(it.el.style.top));flashBad(it);return;}}
      else it.rot=!it.rot;audio.tap(3);place();}
    /* 键盘或省事：找第一个放得下的格子 */
    function quickPlace(it){for(let bi=0;bi<S.cfg.boxes.length;bi++){if(!kgOk(it,bi))continue;for(const rot of [it.rot,!it.rot]){const b=S.cfg.boxes[bi],[w,h]=rot?[it.h,it.w]:[it.w,it.h];
        for(let y=0;y+h<=b.rows;y++)for(let x=0;x+w<=b.cols;x++)if(fitsAt(it,bi,x,y,rot)){it.rot=rot;put(it,{bi,x,y});return true;}}}
      flashBad(it);return false;}
    function put(it,t){const wasHand=it.state==='hand';it.state='box';it.loc={box:t.bi,x:t.x,y:t.y};audio.tap(4+t.bi);if(wasHand)handDone();place();}
    function leave(it,late){const wasHand=it.state==='hand',r=it.el?off(it.el):{x:W/2,y:H/2};it.state='left';audio.paper();
      ui.flash(late?'误了时辰，留在长亭':'留在长亭',r.x+10,r.y);if(wasHand)handDone();place();}
    function afterDrop(){if(S.expired&&S.hand&&S.hand.state==='hand')leave(S.hand,true);}

    /* ---------- 一件件递来 ---------- */
    function handDone(){S.hand=null;S.expired=false;fuse.classList.add('off');clearTimeout(S.nextT);S.nextT=setTimeout(next,280);refreshActs();}
    function next(){if(!S.live||!root.isConnected)return;S.idx++;
      if(S.idx>=S.items.length){endRound();return;}
      const it=S.items[S.idx];it.state='hand';it.rot=it.h>it.w;S.hand=it;S.expired=false;S.t0=performance.now();S.dur=(reduceMotion()?1.6:1)*S.cfg.secs*1000;S.lastSec=0;
      fromTx.innerHTML=`<small>第 ${S.idx+1} / ${S.items.length} 件</small><b>${it.from}递来：${it.nm}</b>`;drawGiver(it.from);
      fuse.classList.remove('off','low');fuseI.style.width='100%';renderNext();place();it.el.classList.remove('arrive');void it.el.offsetWidth;it.el.classList.add('arrive');audio.paper();refreshActs();}
    function tick(){if(!root.isConnected){stopTimers();return;}if(!S.live||!S.hand)return;
      const rest=S.dur-(performance.now()-S.t0),k=Math.max(0,rest/S.dur);fuseI.style.width=(k*100)+'%';fuse.classList.toggle('low',k<.3);
      const sec=Math.ceil(rest/1000);if(sec!==S.lastSec&&sec>0&&sec<=3)audio.tap(1);S.lastSec=sec;
      if(rest<=0){if(drag&&drag.it===S.hand)S.expired=true;else leave(S.hand,true);}}
    function stopTimers(){clearInterval(S.timer);clearTimeout(S.nextT);}
    function refreshActs(){if(S.live)ui.acts([['不带这件',()=>{if(S.hand)leave(S.hand);},false,!S.hand]]);}

    /* ---------- 回合 ---------- */
    function begin(n){
      stopTimers();S.round=n;S.cfg=ROUNDS[n-1];S.idx=-1;S.hand=null;S.live=false;S.expired=false;S.view='mine';
      layer.querySelectorAll('.pk-item').forEach(e=>e.remove());
      S.items=S.cfg.items.map(d=>({...d,rot:d.h>d.w,state:'wait',loc:null,el:null}));
      S.opt=solve(S.cfg.items,S.cfg.boxes);
      const cap=S.cfg.boxes.map(b=>`${b.nm}限 ${b.cap} 斤`).join('，');
      bar.innerHTML=`<span class="nm">${S.cfg.nm}</span><span>${S.cfg.items.length} 件 · 每件等 ${S.cfg.secs} 秒 · ${cap}</span><span class="pk-val">用处 <b>0</b></span><span class="pk-legend">朱字是「用处」</span>`;
      fromTx.innerHTML=`<small>${S.cfg.items.length} 件，一件件递来</small><b>长亭外，亲友陆续来了</b>`;fuse.classList.add('off');
      ui.hideResult();ui.meter('');ui.stageName(NAMES[n-1]);ui.say(INTRO[n-1]);ui.acts([['开始 →',go,true]]);drawScene();layout();drawGiver(null);
    }
    function go(){if(S.live)return;S.live=true;clearInterval(S.timer);S.timer=setInterval(tick,100);next();}
    const snap=it=>({state:it.state,loc:it.loc&&{...it.loc},rot:it.rot});
    function endRound(){
      S.live=false;S.hand=null;stopTimers();hideGhost();fuse.classList.add('off');
      const mine=inBox(),val=valueOf(mine),sets=setsOf(mine),best=S.opt.val,perfect=val>=best,g=gradeRatio(val/best);
      S.mineSnap=S.items.map(snap);const bp=new Map(S.opt.place.map(p=>[p.id,p]));
      S.bestSnap=S.items.map(it=>{const p=bp.get(it.id);return p?{state:'box',loc:{box:p.box,x:p.x,y:p.y},rot:p.w!==it.w}:{state:'left',loc:null,rot:it.rot};});
      fromTx.innerHTML=`<small>送行的人都来过了</small><b>该上路了</b>`;drawGiver(null);renderNext();
      perfect?audio.arp():g==='下品'?audio.low():audio.bell();
      const naive=S.cfg.boxes.length===1?onlineGreedy(S.cfg.items,S.cfg.boxes[0]):null;
      const nums=`用处 <b>${val}</b>${sets.length?`（含${sets.map(s=>s.nm+' +'+s.bonus).join('、')}）`:''} · 事后诸葛 <b>${best}</b>${naive!=null?` · 来者不拒 ${naive}`:''}`;
      const line=perfect?'和事后诸葛一般无二：该舍的舍了，该等的等到了。':g==='至妙'||g==='上品'?'已是好眼力：事后诸葛知道后面来什么，你只能当场定。':LINES[S.round-1];
      ui.result(perfect?'妙':g,nums,line,false);endActs();
    }
    function endActs(){const L=[];if(S.mineSnap&&S.mineSnap.some((m,i)=>m.state!==S.bestSnap[i].state))L.push([S.view==='best'?'看我的装法':'看事后诸葛的装法',toggleBest]);
      L.push(['再来一次',()=>begin(S.round)]);L.push(S.round<3?['下一回 →',()=>begin(S.round+1),true]:['题跋 · 钤印',()=>ui.colophon(),true]);ui.acts(L);}
    function toggleBest(){S.view=S.view==='best'?'mine':'best';const src=S.view==='best'?S.bestSnap:S.mineSnap;S.items.forEach((it,i)=>Object.assign(it,{...src[i],loc:src[i].loc&&{...src[i].loc}}));
      place();audio.gliss();endActs();
      if(S.view==='best'){const lost=S.items.filter(it=>it.state==='left').map(it=>it.nm);ui.say(`事后诸葛知道全部 ${S.items.length} 件，才这样装。他舍掉的是：${lost.join('、')}。`);}
      else ui.say('这是你的装法。');}

    this._resize=()=>{if(!S.cfg)return;drawScene();layout();};
    /* 说明文字换行、结果卡片出入都会改变舞台大小：跟着重排 */
    let lastWH='',rq=0;const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{cancelAnimationFrame(rq);rq=requestAnimationFrame(()=>{const k=root.clientWidth+'x'+root.clientHeight;if(k!==lastWH&&S.cfg){lastWH=k;this._resize();}});}):null;if(ro)ro.observe(root);
    this._stop=()=>{stopTimers();S.live=false;if(ro)ro.disconnect();};
    /* 自动化测试用 */
    packLevel._dbg=S;packLevel._go=n=>begin(n);
    packLevel._play={go,put:(bi,x,y,rot)=>{const it=S.hand;if(!it)return false;if(rot!==undefined)it.rot=rot;if(canPut(it,bi,x,y)!==true)return false;put(it,{bi,x,y});return true;},skip:()=>S.hand&&leave(S.hand),quick:()=>S.hand&&quickPlace(S.hand)};
    begin(1);
  },
  resize(){this._resize&&this._resize();},
  stop(){this._stop&&this._stop();this._resize=null;}
};
