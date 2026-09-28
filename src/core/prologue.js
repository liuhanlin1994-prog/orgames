/* 序章：帷幄之中摆弄算筹（一二 加 二五 得 三七）；天亮，算筹升起对齐成山脊，晕成水墨；题名、钤印。
   画面每一帧都只由时间 t 决定，跳过、重放、改变窗口大小都不会乱。 */
import {RNG,Noise1} from './rng.js';
import {INK,BRUSH_FONT,paperBase,paperGrain,drawPeak,massifTopAt,mistBand,fitCanvas,sealCanvas} from './ink.js';
import {$,el,reduceMotion,writeChars} from './ui.js';

const T_END=21.6;
const LINES=[
  {t0:1.3,t1:6.1,txt:'夫运筹策帷帐之中，决胜於千里之外，吾不如子房。',src:'汉高祖论张良 · 《史记》',dark:true},
  {t0:6.4,t1:9.6,txt:'筹，是古人计算用的小竹棍。运筹，就是摆弄算筹、筹划得失。',dark:true},
  {t0:10,t1:14.3,txt:'两千年后，人们把一门学问译作「运筹学」：在种种限制与不确定之中，寻那最好的决断。'},
  {t0:14.7,t1:20.4,txt:'这卷《千里江山》尚未着色。每参透一处妙策，便着一处青绿。'}
];
const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
const c01=x=>Math.max(0,Math.min(1,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const seg=(t,a,b)=>c01((t-a)/(b-a));
/* 圆头竹筹；旧浏览器没有 roundRect 时退回方头 */
const pill=(c,x,y,w,h,r)=>{c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);};

export function playPrologue({audio,onDone}){
  const box=$('intro'),cv=$('introCv'),txt=$('introText'),title=$('introTitle');
  box.hidden=false;box.classList.remove('out');txt.innerHTML='';title.innerHTML='';
  let W,H,ctx,G,mtn=null,cfg=null;
  const noise=Noise1(RNG(17));

  /* ---------- 几何 ---------- */
  function layout(){
    W=innerWidth;H=innerHeight;ctx=fitCanvas(cv,W,H);
    const portrait=W<H*.8,cx=portrait?W*.42:W*.42,cy=portrait?H*.56:H*.6,Lr=Math.min(W*(portrait?.2:.11),H*.15),wr=Lr*.085,gap=wr*3.4;
    const tx=cx-Lr*.85,ux=cx+Lr*.5,yA=cy-Lr*1.05,yB=cy+Lr*.6,yC=cy-Lr*.15,len=Lr*.8;
    const H_=(x,y)=>({x,y,a:0,len}),V_=(x,y)=>({x,y,a:Math.PI/2,len});
    const hs=(n,x,y)=>Array.from({length:n},(_,k)=>H_(x,y+(k-(n-1)/2)*gap));
    const vs=(n,x,y)=>Array.from({length:n},(_,k)=>V_(x+(k-(n-1)/2)*gap,y));
    const A_t=hs(1,tx,yA),A_u=vs(2,ux,yA),B_t=hs(2,tx,yB),B_u=vs(5,ux,yB);
    const C_t=hs(3,tx,yC),C_top=Object.assign(H_(ux,yC-Lr*.5),{len:len*.72}),C_u=vs(2,ux,yC+Lr*.08).map(r=>Object.assign(r,{len:len*.72}));
    // 每根筹：落下时刻、在第一排/第二排的位置、合并后的位置
    const rods=[];
    const add=(pos,drop,merge,fade)=>rods.push({pos,drop,merge,fade:!!fade});
    add(A_t[0],1.6,C_t[0]);add(A_u[0],1.85,C_u[0]);add(A_u[1],2.05,C_u[1]);
    add(B_t[0],2.65,C_t[1]);add(B_t[1],2.85,C_t[2]);
    add(B_u[0],3.15,C_top);[1,2,3,4].forEach(k=>add(B_u[k],3.15+k*.2,C_top,true));
    // 天亮时再撒下十四根，凑成二十段山脊
    const r=RNG(5),extra=[];for(let i=0;i<14;i++)extra.push({x:cx+(r()-.5)*Lr*4.6,y:cy+(r()-.3)*Lr*2.4,a:r()*Math.PI,len:len*(.8+r()*.2)});
    // 远山：用笔墨引擎画好，山脊取自同一套山形
    const base=H*(portrait?.78:.8),hh=H*(portrait?.26:.34);
    cfg={base,a:.72,c:1,cun:.9,lw:2.2,trees:.9,dot:1.1,peaks:[
      {x:W*.1,h:hh*.55,wl:W*.14,wr:W*.12,k:1.6,seed:901},{x:W*.3,h:hh*.82,wl:W*.13,wr:W*.1,k:1.9,seed:902},{x:W*.46,h:hh,wl:W*.1,wr:W*.12,k:2,seed:903},
      {x:W*.64,h:hh*.7,wl:W*.12,wr:W*.13,k:1.7,seed:904},{x:W*.86,h:hh*.62,wl:W*.13,wr:W*.14,k:1.6,seed:905}]};
    cfg.peaks.forEach(p=>delete p._sil);
    const N=20,xs=Array.from({length:N+1},(_,i)=>W*(.03+.94*i/N)),ridge=xs.map(x=>[x,Math.min(base-4,massifTopAt(cfg,x))]);
    const live=rods.filter(q=>!q.fade).map(q=>({src:q.merge,rod:q})).concat(extra.map(e=>({src:e,extra:e})));
    live.sort((a,b)=>a.src.x-b.src.x);
    live.forEach((o,i)=>{const p=ridge[i],q=ridge[i+1];o.tgt={x:(p[0]+q[0])/2,y:(p[1]+q[1])/2,a:Math.atan2(q[1]-p[1],q[0]-p[0]),len:Math.hypot(q[0]-p[0],q[1]-p[1])*1.06};o.i=i;
      if(o.rod)o.rod.ridge=o.tgt,o.rod.ri=i;else o.extra.ridge=o.tgt,o.extra.ri=i;});
    // 离屏画好山
    mtn=document.createElement('canvas');const mc=fitCanvas(mtn,W,H);
    [...cfg.peaks].sort((a,b)=>b.h-a.h).forEach(p=>drawPeak(mc,p,cfg,false));
    mistBand(mc,0,W,base+6,H*.05,.9,31);
    G={portrait,cx,cy,Lr,wr,tx,ux,yA,yB,yC,rods,extra,len};
  }
  layout();

  /* ---------- 画 ---------- */
  function rodAt(q,t){
    // 落下 → 第一/二排 → 合并 → 升起成山脊
    let s={x:q.pos.x,y:q.pos.y,a:q.pos.a,len:q.pos.len,al:0,ink:0};
    const d=seg(t,q.drop,q.drop+.38);if(d<=0)return s;
    s.al=d;s.y=q.pos.y-(1-ease(d))*H*.25;s.a=q.pos.a+(1-d)*.6;
    const m=ease(seg(t,6.6+q.pos.x/W*.8,7.9+q.pos.x/W*.8));
    if(m>0){s.x=lerp(q.pos.x,q.merge.x,m);s.y=lerp(q.pos.y,q.merge.y,m);s.a=lerp(q.pos.a,q.merge.a,m);s.len=lerp(q.pos.len,q.merge.len,m);if(q.fade)s.al=1-m;}
    if(q.ridge)Object.assign(s,rise(s,q.ridge,q.ri,t));
    return s;
  }
  function rise(s,tg,i,t){const k=ease(seg(t,10+i*.045,11.9+i*.045));if(k<=0)return s;
    let da=tg.a-s.a;while(da>Math.PI/2)da-=Math.PI;while(da<-Math.PI/2)da+=Math.PI;
    return{x:lerp(s.x,tg.x,k),y:lerp(s.y,tg.y,k)-Math.sin(k*Math.PI)*G.Lr*.6,a:s.a+da*k,len:lerp(s.len,tg.len,k),ink:k,al:s.al*(1-seg(t,12.6,13.6))};}
  function drawRod(s){
    if(s.al<=.01)return;const{wr}=G;ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.a);ctx.globalAlpha=s.al;
    const w=lerp(wr,wr*.7,s.ink),L=s.len;
    if(s.ink<.5){ctx.fillStyle='rgba(0,0,0,.35)';pill(ctx,-L/2+2,-w/2+3,L,w,w/2);ctx.fill();}
    const g=ctx.createLinearGradient(0,-w/2,0,w/2);const mix=(a,b)=>Math.round(lerp(a,b,s.ink));
    g.addColorStop(0,`rgb(${mix(236,27)},${mix(218,27)},${mix(166,29)})`);g.addColorStop(1,`rgb(${mix(196,27)},${mix(166,27)},${mix(98,29)})`);
    ctx.fillStyle=g;pill(ctx,-L/2,-w/2,L,w,w/2);ctx.fill();
    if(s.ink<.6){ctx.strokeStyle=`rgba(60,40,15,${.5*(1-s.ink)})`;ctx.lineWidth=1;ctx.stroke();ctx.fillStyle=`rgba(120,90,40,${.45*(1-s.ink)})`;[-.3,.3].forEach(f=>ctx.fillRect(L*f-1,-w/2,2,w));}
    ctx.restore();
  }
  function darkScene(t,al){
    if(al<=0)return;ctx.save();ctx.globalAlpha=al;
    ctx.fillStyle='#120d08';ctx.fillRect(0,0,W,H);
    const fx=W*(G.portrait?.14:.16),fy=H*.46,fl=noise(t*3)*.25+noise(t*7.3)*.12;
    const glow=ctx.createRadialGradient(fx,fy,4,fx,fy,Math.max(W,H)*.7);glow.addColorStop(0,`rgba(255,196,120,${.34+fl*.2})`);glow.addColorStop(.35,'rgba(160,96,40,.12)');glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(210,160,100,.06)';ctx.lineWidth=2;for(let i=0;i<14;i++){const x=W*(i+.5)/14;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+18,H*.2,x-14,H*.4,x+6,H*.44);ctx.stroke();}
    ctx.fillStyle='rgba(120,40,24,.55)';ctx.beginPath();ctx.moveTo(0,0);for(let i=0;i<=10;i++){const x=W*i/10;ctx.quadraticCurveTo(x-W/20,H*.09,x,H*.05);}ctx.lineTo(W,0);ctx.fill();
    const ty=G.cy-G.Lr*1.9;ctx.fillStyle='#2b1d11';ctx.fillRect(0,ty,W,H-ty);
    const tg=ctx.createLinearGradient(0,ty,0,H);tg.addColorStop(0,'rgba(255,190,120,.12)');tg.addColorStop(1,'rgba(0,0,0,.35)');ctx.fillStyle=tg;ctx.fillRect(0,ty,W,H-ty);
    ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=1;for(let i=0;i<9;i++){const y=ty+(H-ty)*(i+.5)/9;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(W*.3,y+6,W*.6,y-6,W,y+3);ctx.stroke();}
    // 烛
    ctx.fillStyle='#e8dcc0';ctx.fillRect(fx-7,fy+10,14,H*.12);ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(fx+3,fy+10,4,H*.12);
    const fh=22+fl*10;const fg=ctx.createRadialGradient(fx,fy-2,1,fx,fy,fh);fg.addColorStop(0,'rgba(255,250,220,1)');fg.addColorStop(.4,'rgba(255,190,90,.95)');fg.addColorStop(1,'rgba(255,120,40,0)');
    ctx.fillStyle=fg;ctx.beginPath();ctx.ellipse(fx+noise(t*5)*2-1,fy-fh*.35,fh*.32,fh*.8,0,0,7);ctx.fill();
    // 算筹数目：小字
    ctx.font=`${Math.round(G.Lr*.26)}px ${BRUSH_FONT}`;ctx.textAlign='right';ctx.textBaseline='middle';
    const lx=G.tx-G.Lr*.75;
    ctx.fillStyle=`rgba(236,218,166,${.7*seg(t,2.2,2.8)*(1-seg(t,6.6,7.4))})`;ctx.fillText('一二',lx,G.yA);
    ctx.fillStyle=`rgba(236,218,166,${.7*seg(t,4,4.6)*(1-seg(t,6.6,7.4))})`;ctx.fillText('二五',lx,G.yB);
    ctx.fillStyle=`rgba(236,218,166,${.8*seg(t,8.2,8.9)*(1-seg(t,9.6,10.2))})`;ctx.fillText('三七',lx,G.yC);
    ctx.restore();
  }
  function paperScene(t,al){
    if(al<=0)return;ctx.save();ctx.globalAlpha=al;paperBase(ctx,0,0,W,H);
    const m=seg(t,12.4,13.8);if(m>0){ctx.globalAlpha=al*m;ctx.drawImage(mtn,0,0,W,H);}
    ctx.globalAlpha=al;paperGrain(ctx,0,0,W,H,false);ctx.restore();
  }
  function draw(t){
    const dawn=ease(seg(t,9.4,11.8));
    if(dawn<1)darkScene(t,1);
    paperScene(t,dawn);
    const rods=G.rods.map(q=>rodAt(q,t));
    const ex=G.extra.map((e,i)=>{const ap=seg(t,9.3+i*.04,9.9+i*.04);let s={x:e.x,y:e.y,a:e.a,len:e.len,al:ap,ink:0};if(ap>0)Object.assign(s,rise(s,e.ridge,e.ri,t));return s;});
    rods.concat(ex).forEach(drawRod);
    // 淡入黑幕开场
    const f=1-seg(t,0,1.2);if(f>0){ctx.fillStyle=`rgba(8,6,3,${f})`;ctx.fillRect(0,0,W,H);}
  }

  /* ---------- 字 ---------- */
  function showLine(i){
    const L=LINES[i];txt.innerHTML='';txt.className='itxt'+(L.dark?' light':'');
    const col=el('div','icol');writeChars(col,L.txt,0,reduceMotion()?0:70);txt.appendChild(col);
    if(L.src){const s=el('div','isrc','—— '+L.src);s.style.animationDelay='2.6s';txt.appendChild(s);}
  }
  function showTitle(){
    title.innerHTML='';const t1=el('div','it1'),t2=el('div','it2');const d=writeChars(t1,'千里江山',0,reduceMotion()?0:260);writeChars(t2,'运筹录',d+200,reduceMotion()?0:220);
    title.appendChild(t1);title.appendChild(t2);const sc=el('canvas','iseal');sc.width=sc.height=140;sealCanvas(sc,'运筹帷幄');title.appendChild(sc);
  }

  /* ---------- 时间线 ---------- */
  const fired=new Set(),once=(k,fn)=>{if(!fired.has(k)){fired.add(k);fn();}};
  const drops=G.rods.map(q=>q.drop+.38);
  let start=performance.now(),raf=0,finished=false;
  audio.setMood('prelude');audio.ambience('prelude');
  function frame(now){
    const t=(now-start)/1000;draw(Math.min(t,T_END));
    drops.forEach((d,i)=>{if(t>=d)once('d'+i,()=>audio.rods());});
    [6.9,7.4,7.9,8.4].forEach((d,i)=>{if(t>=d)once('m'+i,()=>audio.rods());});
    LINES.forEach((L,i)=>{if(t>=L.t0)once('l'+i,()=>showLine(i));if(t>=L.t1)once('f'+i,()=>txt.classList.add('fade'));});
    if(t>=10)once('whoosh',()=>audio.whoosh());
    if(t>=12.6)once('mood',()=>{audio.setMood('scroll');audio.ambience('scroll');});
    if(t>=14.3)once('title',()=>{showTitle();audio.bell();});
    if(t>=18.3)once('seal',()=>{title.classList.add('sealed');audio.thud();});
    if(t<T_END)raf=requestAnimationFrame(frame);else finish();
  }
  function finish(){
    if(finished)return;finished=true;cancelAnimationFrame(raf);removeEventListener('resize',onResize);removeEventListener('keydown',onKey);
    audio.setMood('scroll');audio.ambience('scroll');box.classList.add('out');
    setTimeout(()=>{box.hidden=true;box.classList.remove('out');txt.innerHTML='';title.innerHTML='';title.classList.remove('sealed');onDone&&onDone();},700);
  }
  const onResize=()=>{layout();};
  const onKey=e=>{if(e.key==='Escape')finish();};
  addEventListener('resize',onResize);addEventListener('keydown',onKey);
  $('introSkip').onclick=finish;
  if(reduceMotion()){start-=13000;}
  raf=requestAnimationFrame(frame);
  return{skip:finish,seek:t=>{start=performance.now()-t*1000;}};
}
