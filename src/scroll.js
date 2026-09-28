/* 长卷：构图、分块渲染、拖动、题签、册页、上色、钤印、云气与飞鸟 */
import {RNG} from './core/rng.js';
import {INK,PAPER,paperBase,paperGrain,drawPeak,tree,willow,house,pavilion,banner,wall,gate,bridge,pagoda,boat,horseGlyph,person,tent,fields,waterfall,waves,mistBand,sealCanvas} from './core/ink.js';
import {$,el,reduceMotion,writeChars} from './core/ui.js';

const H=900,TOTAL=7000,TILE=1000,REACH=1150;

/* ---------- 构图 ---------- */
const SCENE=[];let SEED=1;
function M(cfg){cfg.peaks.forEach(p=>p.seed=SEED++*7919);let x0=1e9,x1=-1e9;cfg.peaks.forEach(p=>{x0=Math.min(x0,p.x-p.wl*1.1);x1=Math.max(x1,p.x+p.wr*1.1);});
  const order=cfg.peaks.slice().sort((a,b)=>b.h-a.h);SCENE.push({x0,x1,z:cfg.z||0,draw:(ctx,col)=>order.forEach(p=>drawPeak(ctx,p,cfg,col))});}
function D(x0,x1,z,fn){const s=SEED++*104729;SCENE.push({x0,x1,z,draw:(ctx,col)=>fn(ctx,RNG(s),col)});}
function ridgeOf(x0,x1,n,hMin,hMax,wMin,wMax,kMin,kMax,round,seed){const r=RNG(seed),ps=[];for(let i=0;i<n;i++){const x=x0+(i+.5)/n*(x1-x0)+(r()-.5)*(x1-x0)/n*.6;ps.push({x,h:hMin+r()*(hMax-hMin),wl:wMin+r()*(wMax-wMin),wr:wMin+r()*(wMax-wMin),k:kMin+r()*(kMax-kMin),round:round?round*(0.5+r()):undefined});}return ps;}

function buildScene(){
  const FAR={a:.2,c:.45,ink:'70,80,92',cun:.35,lw:1.1,occ:.6};
  M(Object.assign({base:450,z:0,peaks:ridgeOf(0,7000,26,90,210,160,280,1.2,1.6,0,3)},FAR));
  D(0,7000,1,(c)=>mistBand(c,0,7000,492,55,.85,5));
  D(6290,6320,9,(c)=>{c.fillStyle='rgba(143,154,146,.55)';c.fillRect(6296,0,3,H);c.fillRect(6308,0,1.2,H);});
  /* 卷一 · 江南 */
  M({base:640,z:2,a:.5,c:.85,cun:.7,lw:1.8,peaks:ridgeOf(5000,6260,9,80,170,110,190,1.1,1.35,.06,21)});
  D(4980,6290,3,(c)=>mistBand(c,4980,6290,660,40,.9,7));
  D(4950,6290,3,(c,r,col)=>waves(c,r,4950,6290,690,900,260,col));
  M({base:760,z:4,a:.85,c:1,cun:1,lw:2.4,trees:1.2,dot:1.2,peaks:[{x:6180,h:95,wl:160,wr:120,k:1.3,round:.04},{x:5980,h:70,wl:120,wr:140,k:1.2,round:.06}]});
  D(6100,6260,5,(c)=>tent(c,6190,672,22));
  D(5930,6060,5,(c,r)=>{house(c,5990,700,38);pavilion(c,6040,702,14);banner(c,5955,700,12,'茶');willow(c,r,5915,710,46);});
  M({base:790,z:4,a:.8,c:1,cun:.9,lw:2.2,trees:1,dot:1.1,peaks:[{x:5620,h:60,wl:180,wr:160,k:1.1,round:.08},{x:5380,h:45,wl:150,wr:160,k:1.1,round:.08}]});
  D(5380,5680,5,(c,r)=>{c.strokeStyle=`rgba(${INK},.5)`;c.lineWidth=1;for(let i=0;i<2;i++){c.beginPath();c.moveTo(5400,756+i*14);c.lineTo(5660,756+i*14);c.stroke();}
    for(let x=5404;x<5660;x+=18){c.beginPath();c.moveTo(x,756);c.lineTo(x,770);c.stroke();}
    horseGlyph(c,5470,752,16,r);horseGlyph(c,5520,750,16,r);horseGlyph(c,5575,752,16,r);banner(c,5640,752,10,'齐');banner(c,5412,752,10,'田');});
  D(5040,5160,5,(c,r)=>{pavilion(c,5090,690,16);person(c,5135,700,16,true);willow(c,r,5055,700,40);});
  M({base:720,z:3,a:.7,c:.95,cun:.9,lw:2,trees:1,peaks:[{x:5090,h:60,wl:140,wr:120,k:1.2,round:.05}]});
  D(5200,5340,5,(c)=>{bridge(c,5270,738,110);boat(c,5230,800,14);});
  /* 卷二 · 市井 */
  M({base:600,z:2,a:.45,c:.8,cun:.6,lw:1.6,peaks:ridgeOf(3500,4980,8,70,140,120,200,1.2,1.5,.03,33)});
  D(4300,4960,4,(c)=>{wall(c,4320,4950,672,42);for(let x=4350;x<4930;x+=46)house(c,x,628,30,.7);gate(c,4610,672,40);});
  D(3860,4980,3,(c,r,col)=>waves(c,r,3860,4400,700,900,160,col));
  D(4300,4980,5,(c)=>{for(let x=4340;x<4940;x+=36)house(c,x+((x/36)%2)*8,760,26,.85);});
  D(3950,4330,5,(c)=>{bridge(c,4140,735,170);boat(c,4020,790,18,true);boat(c,4235,830,20,true);boat(c,4080,860,14,true);boat(c,4300,780,12);});
  M({base:700,z:4,a:.8,c:1,cun:1,lw:2.3,trees:1.1,dot:1.1,peaks:[{x:3720,h:150,wl:140,wr:150,k:1.5},{x:3600,h:100,wl:120,wr:110,k:1.4},{x:3850,h:70,wl:110,wr:120,k:1.3,round:.04}]});
  D(3650,3800,6,(c)=>{house(c,3715,690,40);house(c,3760,696,28);banner(c,3685,690,12,'客');});
  /* 卷三 · 山川 */
  M({base:620,z:2,a:.62,c:.95,cun:1,lw:2.1,peaks:[
    {x:3380,h:190,wl:170,wr:130,k:1.7},{x:3230,h:300,wl:130,wr:110,k:2.0},{x:3120,h:370,wl:130,wr:100,k:2.1},{x:2960,h:330,wl:95,wr:140,k:1.9},
    {x:2840,h:250,wl:130,wr:120,k:1.8},{x:2700,h:290,wl:140,wr:150,k:1.9},{x:2560,h:200,wl:150,wr:150,k:1.6},{x:3040,h:180,wl:160,wr:150,k:1.4,round:.03},{x:2430,h:130,wl:140,wr:150,k:1.4,round:.03}]});
  D(3020,3080,3,(c,r)=>waterfall(c,r,3048,440,630,14));
  D(2300,3500,3,(c)=>mistBand(c,2300,3500,640,38,.92,9));
  M({base:800,z:4,a:.85,c:1,cun:1,lw:2.4,trees:1,dot:1.2,peaks:[{x:3330,h:120,wl:200,wr:170,k:1.2,round:.06},{x:3440,h:80,wl:120,wr:130,k:1.2,round:.05}]});
  D(3240,3440,5,(c,r)=>{fields(c,r,3330,712,180,64);house(c,3410,705,24);});
  D(2440,3060,3,(c,r,col)=>waves(c,r,2440,3060,690,880,150,col));
  D(2560,2760,5,(c)=>{c.strokeStyle=`rgba(${INK},.6)`;c.lineWidth=1.3;for(let i=0;i<7;i++){const x=2640+i*9,y=772+i*4;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-12);c.stroke();}
    c.beginPath();c.moveTo(2630,768);c.quadraticCurveTo(2680,776,2710,800);c.stroke();});
  M({base:790,z:4,a:.8,c:1,cun:.8,lw:2.2,trees:1.1,peaks:[{x:2600,h:46,wl:120,wr:60,k:1.5},{x:2540,h:30,wl:90,wr:80,k:1.2,round:.05}]});
  M({base:760,z:4,a:.7,c:.95,cun:.8,lw:2,trees:.9,peaks:ridgeOf(1820,2400,4,50,90,150,210,1.1,1.25,.08,51)});
  D(1950,2300,5,(c,r)=>{c.strokeStyle=`rgba(${INK},.45)`;c.lineWidth=1;c.beginPath();c.moveTo(1990,770);c.lineTo(2240,770);c.stroke();for(let x=1994;x<2240;x+=20){c.beginPath();c.moveTo(x,770);c.lineTo(x,758);c.stroke();}
    for(let i=0;i<7;i++)horseGlyph(c,2010+i*32+r()*10,790+r()*20,13+r()*4,r);person(c,2255,795,15);});
  D(1860,1980,5,(c)=>pagoda(c,1920,742,26,5));
  /* 断桥：江上一座拆断的木桥 */
  D(2430,2560,5,(c)=>{const y=806;c.strokeStyle=`rgba(${INK},.7)`;c.lineWidth=1.6;
    [[2440,2482],[2506,2548]].forEach(([x0,x1])=>{c.beginPath();c.moveTo(x0,y);c.quadraticCurveTo((x0+x1)/2,y-10,x1,y-(x1>2500?0:6));c.stroke();for(let x=x0+4;x<x1;x+=8){c.beginPath();c.moveTo(x,y-5);c.lineTo(x,y+8);c.stroke();}});
    c.fillStyle='rgba(120,70,40,.7)';[[2488,814],[2496,820],[2492,826]].forEach(([x,y2])=>c.fillRect(x,y2,7,2));});
  /* 卷四 · 江海 */
  M({base:640,z:4,a:.8,c:1,cun:1,lw:2.3,trees:1,dot:1.1,peaks:[{x:1760,h:170,wl:160,wr:130,k:1.6},{x:1640,h:95,wl:150,wr:120,k:1.3,round:.04}]});
  D(80,1800,3,(c,r,col)=>waves(c,r,80,1800,600,900,420,col));
  [[1480,700,48],[1340,760,34],[1200,690,40],[1100,800,30],[980,720,52],[860,820,26],[760,690,36]].forEach(([x,y,h])=>
    M({base:y,z:5,a:.8,c:1,cun:.9,lw:2,trees:.8,dot:1,peaks:[{x,h,wl:h*1.4,wr:h*1.3,k:1.4},{x:x+h*.8,h:h*.55,wl:h,wr:h,k:1.2,round:.04}]}));
  D(700,1600,6,(c)=>{boat(c,1280,735,26,true);boat(c,1050,860,22,true);boat(c,900,760,18,true);});
  M({base:760,z:5,a:.75,c:1,cun:.9,lw:2,trees:1,peaks:[{x:380,h:110,wl:150,wr:160,k:1.3,round:.05},{x:200,h:70,wl:140,wr:120,k:1.2,round:.06}]});
  D(420,640,6,(c)=>boat(c,540,820,16));
  D(0,110,9,(c)=>{c.fillStyle='rgba(143,154,146,.55)';c.fillRect(96,0,3,H);c.fillRect(84,0,1.2,H);});
  SCENE.sort((a,b)=>a.z-b.z);
}

/* 游动的云气：[x, y, 宽, 高, 周期秒, 漂移] */
const MISTS=[[6500,560,900,120,110,160],[5600,520,1100,110,95,200],[4700,610,900,90,120,150],[3900,500,1000,120,100,180],[3100,560,1300,150,130,220],[2300,620,900,100,105,160],[1500,560,1100,120,115,200],[600,590,900,110,100,160]];

/* 行船：[起点, 终点, 水面高度, 大小, 是否挂帆, 周期秒] */
const BOATS=[[6150,5000,812,14,0,150],[4380,3920,806,18,1,95],[3000,2480,842,12,0,120],[1650,250,772,24,1,190],[1400,150,858,18,1,230]];
/* 炊烟：屋舍的烟囱 */
const SMOKES=[[5990,664],[4400,596],[4750,596],[3715,652],[3410,684],[1920,600]];
/* 卷终题跋里每关的一句 */
const LESSON={tea:'茶有先后',race:'驷有上下',pack:'箧有取舍',gate:'门有开合',match:'士有良配',inn:'房有留余',auction:'价有虚实',beacon:'燧有远近',bridge:'桥有通塞',horse:'马有去留',tsp:'舟有远近'};
const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;

export function createScroll({levels,audio,onEnter}){
  let S=1,DPR=1,offset=0,tiles=[],preview=false;
  const done=new Set();try{JSON.parse(localStorage.getItem('qianli_done')||'[]').forEach(id=>done.add(id));}catch(e){}
  const persist=()=>{try{localStorage.setItem('qianli_done',JSON.stringify([...done]));}catch(e){}};
  const reveal={};let finaleCut=null,zoom={z:1,px:0,py:0};

  function computeScale(){
    const vw=innerWidth,vh=innerHeight;
    S=Math.min((vh-120)/H,Math.max(vw/1100,vh/1500));S=Math.max(.38,Math.min(1.25,S));
    DPR=Math.min(window.devicePixelRatio||1,(navigator.deviceMemory&&navigator.deviceMemory<4)?1:1.5);
    document.documentElement.style.setProperty('--s',S);
  }
  function makeTiles(){
    const track=$('track');track.querySelectorAll('.tile').forEach(t=>t.remove());tiles=[];track.style.width=TOTAL*S+'px';
    for(let x0=0;x0<TOTAL;x0+=TILE){
      const x1=Math.min(TOTAL,x0+TILE+3),e=el('div','tile');e.style.left=x0*S+'px';e.style.width=(x1-x0)*S+'px';
      const ci=el('canvas'),cc=el('canvas','c');e.appendChild(ci);e.appendChild(cc);track.insertBefore(e,$('life'));
      tiles.push({x0,x1,el:e,ci,cc,inkDone:false,colDone:false});
    }
  }
  function renderTile(t,colored){
    const cv=colored?t.cc:t.ci,w=t.x1-t.x0,k=S*DPR;cv.width=Math.ceil(w*k);cv.height=Math.ceil(H*k);
    const ctx=cv.getContext('2d');ctx.setTransform(k,0,0,k,-t.x0*k,0);
    paperBase(ctx,t.x0,0,w,H);
    for(const c of SCENE){if(c.x1<t.x0-4||c.x0>t.x1+4)continue;ctx.save();c.draw(ctx,colored);ctx.restore();}
    paperGrain(ctx,t.x0,0,w,H);
    if(colored)t.colDone=true;else t.inkDone=true;
  }
  let queue=[],busy=false;
  const distTo=(t,[a,b])=>t.x1<a?a-t.x1:t.x0>b?t.x0-b:0;
  const visibleRange=()=>[-offset/S,(-offset+innerWidth)/S];
  function schedule(t,colored){if(colored?t.colDone:t.inkDone)return;if(queue.some(q=>q.t===t&&q.c===colored))return;queue.push({t,c:colored});pump();}
  function pump(){if(busy)return;busy=true;
    const step=()=>{
      if(!queue.length){busy=false;return;}
      const vis=visibleRange();queue.sort((a,b)=>distTo(a.t,vis)-distTo(b.t,vis)+(a.c-b.c)*.1);
      const q=queue.shift();if(!(q.c?q.t.colDone:q.t.inkDone))renderTile(q.t,q.c);
      if(!q.c)$('loading').style.opacity=tiles.filter(t=>t.inkDone).some(t=>t.x1>vis[0]&&t.x0<vis[1])?0:1;
      applyMasks();setTimeout(step,0);
    };setTimeout(step,0);}
  function applyMasks(){
    for(const t of tiles){
      if(finaleCut!=null){if(!t.colDone){t.cc.style.opacity=0;continue;}const a=(finaleCut-t.x0)*S;
        t.cc.style.webkitMaskImage=t.cc.style.maskImage=`linear-gradient(to right, transparent ${a-260*S}px, #000 ${a+40*S}px)`;t.cc.style.opacity=1;continue;}
      if(preview){t.cc.style.webkitMaskImage=t.cc.style.maskImage='none';t.cc.style.opacity=t.colDone?1:0;continue;}
      const layers=[];
      for(const L of levels){const rr=reveal[L.id];if(!rr)continue;if(L.x+rr+200<t.x0||L.x-rr-200>t.x1)continue;
        const cx=(L.x-t.x0)*S,cy=(L.y+140)*S,r0=rr*S;layers.push(`radial-gradient(circle at ${cx}px ${cy}px, #000 0, #000 ${r0}px, transparent ${r0+160*S}px)`);}
      if(layers.length&&t.colDone){t.cc.style.webkitMaskImage=t.cc.style.maskImage=layers.join(',');t.cc.style.opacity=1;}else t.cc.style.opacity=0;
    }
  }
  function needColorFor(id){const L=levels.find(l=>l.id===id);tiles.forEach(t=>{if(L.x+REACH>t.x0&&L.x-REACH<t.x1)schedule(t,true);});}

  /* ---------- 云气与飞鸟 ---------- */
  function placeLife(){
    const life=$('life');life.innerHTML='';
    if(reduceMotion())return;
    MISTS.forEach(([x,y,w,h,dur,dx],i)=>{const m=el('div','mist');m.style.cssText=`left:${(x-w/2)*S}px;top:${(y-h/2)*S}px;width:${w*S}px;height:${h*S}px;--dur:${dur}s;--dx:${dx*S}px;animation-delay:${-i*17}s`;life.appendChild(m);});
    const svgNS='http://www.w3.org/2000/svg',svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 90 40');svg.setAttribute('class','birds');
    [[8,22,1],[22,14,.9],[36,24,1.1],[52,10,.8],[66,20,.95]].forEach(([x,y,s],i)=>{const p=document.createElementNS(svgNS,'path');
      p.setAttribute('d',`M${x-6*s},${y} q${3*s},${-4*s} ${6*s},0 q${3*s},${-4*s} ${6*s},0`);p.setAttribute('fill','none');p.setAttribute('stroke','#1b1b1d');p.setAttribute('stroke-width','1.3');p.setAttribute('stroke-linecap','round');
      p.style.transformBox='fill-box';p.style.transformOrigin='center';p.animate([{transform:'scaleY(1)'},{transform:'scaleY(.35)'},{transform:'scaleY(1)'}],{duration:520+i*40,iterations:Infinity});svg.appendChild(p);});
    life.appendChild(svg);
    BOATS.forEach(([x0,x1,y,sz,sail,dur],i)=>{const w=el('div','lboat'),c=el('canvas');c.width=c.height=Math.ceil(sz*4.4*S*2);const cx=c.getContext('2d');cx.scale(2*S,2*S);boat(cx,sz*2.2,sz*2.6,sz,!!sail);
      c.style.cssText=`width:${sz*4.4*S}px;height:${sz*4.4*S}px;transform:scaleX(${x1<x0?-1:1})`;w.appendChild(c);
      w.style.cssText=`left:${(x0-sz*2.2)*S}px;top:${(y-sz*2.6)*S}px;--dx:${(x1-x0)*S}px;--dur:${dur}s;animation-delay:${-dur*(.2+i*.17)}s`;life.appendChild(w);});
    SMOKES.forEach(([x,y],i)=>{for(let k=0;k<3;k++){const m=el('div','smoke');m.style.cssText=`left:${(x-13)*S}px;top:${(y-13)*S}px;animation-delay:${-(k*2.4+i*.9)}s`;life.appendChild(m);}});
    const fall=el('div','fall');fall.style.cssText=`left:${3040*S}px;top:${442*S}px;width:${16*S}px;height:${186*S}px`;life.appendChild(fall);
    const fly=()=>{if(!document.body.contains(svg))return;if($('level').hidden)audio.chirp();const vis=visibleRange(),x=vis[0]+(vis[1]-vis[0])*(.55+Math.random()*.4),y=120+Math.random()*160;
      svg.style.left=x*S+'px';svg.style.top=y*S+'px';
      svg.animate([{transform:'translate(0,0)',opacity:0},{opacity:.8,offset:.15},{opacity:.8,offset:.8},{transform:`translate(${-520*S}px,${-50*S}px)`,opacity:0}],{duration:16000,easing:'linear'});
      setTimeout(fly,26000+Math.random()*18000);};
    setTimeout(fly,6000);
  }

  /* ---------- 题签 ---------- */
  function placeMarks(){
    const m=$('marks');m.innerHTML='';
    const ht=el('div','head-title','<div class="t">千里江山</div><div class="t2">运筹录</div><div class="q">运筹帷幄之中　决胜千里之外</div>');ht.style.left=6690*S+'px';ht.style.top=90*S+'px';m.appendChild(ht);
    const hs=el('canvas');hs.width=hs.height=120;hs.style.cssText=`position:absolute;left:${6420*S}px;top:${560*S}px;width:${64*S}px;height:${64*S}px;transform:rotate(-4deg)`;m.appendChild(hs);sealCanvas(hs,'运筹帷幄');
    [['卷一　江南',6230],['卷二　市井',4930],['卷三　山川',3470],['卷四　江海',1790]].forEach(([t,x])=>{const c=el('div','chapter',t);c.style.left=x*S+'px';c.style.top=120*S+'px';m.appendChild(c);});
    const co=el('div','colophon','全卷无一张图片　山石皴擦皆由代码落笔<br>刘翰林@SUSTech　·　Claude');co.style.left=48*S+'px';co.style.top=140*S+'px';m.appendChild(co);
    levels.forEach(L=>{
      const t=el('div','tag'+(L.play&&!done.has(L.id)?' play':'')+(L.play?'':' locked')+(done.has(L.id)?' done':''));t.tabIndex=0;t.setAttribute('role','button');
      t.setAttribute('aria-label',L.nm+'，'+L.cp+(L.play?'':'，尚未开放'));t.dataset.id=L.id;t.style.left=L.x*S+'px';t.style.top=L.y*S+'px';
      t.innerHTML=`<div class="strip"><span class="nm">${L.nm}</span><span class="cp">${L.cp}</span></div><div class="pin"></div><canvas class="stamp" width="80" height="80"></canvas>`;
      sealCanvas(t.querySelector('.stamp'),L.nm.length>2?L.nm.slice(0,2):L.nm);
      t.addEventListener('click',()=>{if(dragMoved)return;openLeaf(L);});
      t.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openLeaf(L);}});
      m.appendChild(t);
    });
    $('sealCount').textContent=done.size;if($('sealTotal'))$('sealTotal').textContent=levels.length;
  }

  /* ---------- 拖动 ---------- */
  let dragging=false,dragMoved=false,startX=0,lastX=0,vel=0,raf=0,pid=null;
  function applyT(){$('track').style.transform=`translate3d(${offset}px,0,0)`+(zoom.z!==1?` translate(${zoom.px}px,${zoom.py}px) scale(${zoom.z}) translate(${-zoom.px}px,${-zoom.py}px)`:'');}
  function setOffset(o){const min=Math.min(0,innerWidth-TOTAL*S);offset=Math.max(min,Math.min(0,o));applyT();}
  function afterPan(){const vis=visibleRange();tiles.forEach(t=>{if(t.x1>vis[0]-TILE&&t.x0<vis[1]+TILE)schedule(t,false);});}
  const sc=$('scroll');
  sc.addEventListener('pointerdown',e=>{if(e.button>0)return;dragging=true;dragMoved=false;startX=lastX=e.clientX;vel=0;pid=e.pointerId;cancelAnimationFrame(raf);});
  sc.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==pid)return;
    if(!dragMoved&&Math.abs(e.clientX-startX)>6){dragMoved=true;sc.classList.add('drag');try{sc.setPointerCapture(pid);}catch(_){}}
    if(!dragMoved)return;const dx=e.clientX-lastX;lastX=e.clientX;vel=dx;setOffset(offset+dx);});
  const endDrag=()=>{if(!dragging)return;dragging=false;sc.classList.remove('drag');
    if(dragMoved){const glide=()=>{vel*=.93;if(Math.abs(vel)<.3){afterPan();return;}setOffset(offset+vel);raf=requestAnimationFrame(glide);};glide();setTimeout(()=>dragMoved=false,40);}};
  sc.addEventListener('pointerup',endDrag);sc.addEventListener('pointercancel',endDrag);
  sc.addEventListener('wheel',e=>{e.preventDefault();setOffset(offset-(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY));afterPan();},{passive:false});
  addEventListener('keydown',e=>{if(!$('level').hidden||!$('leafModal').hidden||$('cover'))return;if(e.key==='ArrowLeft')panTo(offset+innerWidth*.6);if(e.key==='ArrowRight')panTo(offset-innerWidth*.6);});
  function panTo(target,ms,done){ms=ms==null?900:ms;const from=offset,t0=performance.now();cancelAnimationFrame(raf);
    const f=now=>{const k=Math.min(1,(now-t0)/ms),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;setOffset(from+(target-from)*e);if(k<1)raf=requestAnimationFrame(f);else{afterPan();done&&done();}};raf=requestAnimationFrame(f);}
  const centerOn=x=>innerWidth/2-x*S;

  /* ---------- 册页 ---------- */
  function openLeaf(L){
    audio.paper();
    $('leafName').textContent=L.nm;$('leafConcept').textContent=L.cp;$('leafStory').textContent=L.story;$('leafPlay').textContent=L.play1;$('leafAha').textContent=L.aha;
    const a=$('leafActs');a.innerHTML='';
    if(L.play){const b=el('button','btn red',done.has(L.id)?'再入画':'入画');b.onclick=()=>{closeLeaf();onEnter(L.id);};a.appendChild(b);}
    else a.appendChild(el('span','note','此处正在绘制，敬请期待'));
    $('leafModal').hidden=false;setTimeout(()=>(a.querySelector('button')||$('leafX')).focus(),30);
  }
  function closeLeaf(){$('leafModal').hidden=true;}
  $('leafX').onclick=closeLeaf;$('leafModal').addEventListener('click',e=>{if(e.target===$('leafModal'))closeLeaf();});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('leafModal').hidden)closeLeaf();});

  /* ---------- 布局 ---------- */
  function layout(){computeScale();makeTiles();placeMarks();placeLife();setOffset(innerWidth-TOTAL*S);
    done.forEach(id=>{reveal[id]=860;needColorFor(id);});
    const vis=visibleRange();tiles.slice().sort((a,b)=>distTo(a,vis)-distTo(b,vis)).forEach(t=>schedule(t,false));}
  addEventListener('resize',()=>{clearTimeout(window.__rz);window.__rz=setTimeout(()=>{const s0=S;computeScale();
    if(Math.abs(S-s0)/s0>.08){const center=(-offset+innerWidth/2)/s0;queue=[];layout();setOffset(innerWidth/2-center*S);afterPan();}
    else{S=s0;document.documentElement.style.setProperty('--s',s0);setOffset(offset);}},200);});
  buildScene();

  return{
    layout,
    togglePreview(){preview=!preview;
      if(preview){tiles.forEach(t=>schedule(t,true));document.querySelectorAll('.tag').forEach(t=>t.classList.add('done'));}
      else document.querySelectorAll('.tag').forEach(t=>t.classList.toggle('done',done.has(t.dataset.id)));
      applyMasks();return preview;},
    /* 下一处：阅读顺序（自右向左）里第一个还没参透的已开放关卡 */
    next(){const order=levels.filter(l=>l.play&&!done.has(l.id)).sort((a,b)=>b.x-a.x);const L=order[0];
      if(!L){panTo(centerOn(60),2200);return null;}
      panTo(centerOn(L.x),1400,()=>{const s=document.querySelector(`.tag[data-id="${L.id}"] .strip`);s&&s.animate([{transform:'translateY(0)'},{transform:'translateY(-10px)'},{transform:'translateY(0)'}],{duration:600,iterations:2});});return L;},
    complete(id){
      const L=levels.find(l=>l.id===id),first=!done.has(id);done.add(id);persist();$('sealCount').textContent=done.size;
      const tag=document.querySelector(`.tag[data-id="${id}"]`);tag.classList.remove('play');
      panTo(centerOn(L.x),first?700:10,()=>{
        needColorFor(id);
        const grow=()=>{const t0=performance.now();const f=now=>{const k=Math.min(1,(now-t0)/2600);reveal[id]=40+Math.pow(k,.8)*820;applyMasks();if(k<1)requestAnimationFrame(f);else{tag.classList.add('done');audio.thud();}};requestAnimationFrame(f);};
        const wait=()=>{if(tiles.filter(t=>L.x+REACH>t.x0&&L.x-REACH<t.x1).every(t=>t.colDone))grow();else setTimeout(wait,60);};wait();
      });
    },
    isDone:id=>done.has(id),
    /* 入画：把题签移到中央，镜头推近，云气合拢 */
    zoomIn(id){return new Promise(res=>{
      const L=levels.find(l=>l.id===id),veil=$('veil');
      const go=()=>{zoom.px=L.x*S;zoom.py=(L.y+110)*S;const r=$('scroll').getBoundingClientRect();
        veil.style.setProperty('--vx',(offset+zoom.px)+'px');veil.style.setProperty('--vy',(r.top+zoom.py)+'px');veil.hidden=false;veil.style.opacity=0;audio.whoosh();
        const t0=performance.now(),dur=reduceMotion()?10:820,R=Math.hypot(innerWidth,innerHeight);
        const f=now=>{const k=Math.min(1,(now-t0)/dur),e=k*k*(3-2*k);zoom.z=1+1.9*e;applyT();veil.style.setProperty('--vr',(e*R)+'px');veil.style.opacity=Math.min(1,e*1.3);
          if(k<1)requestAnimationFrame(f);else res();};requestAnimationFrame(f);};
      const target=centerOn(L.x);if(Math.abs(target-offset)>4)panTo(target,420,go);else go();});},
    zoomOut(){const veil=$('veil');if(veil.hidden&&zoom.z===1)return;const t0=performance.now(),dur=reduceMotion()?10:820,R=Math.hypot(innerWidth,innerHeight);
      const f=now=>{const k=Math.min(1,(now-t0)/dur),e=k*k*(3-2*k);zoom.z=1+1.9*(1-e);applyT();veil.style.opacity=1-e;veil.style.setProperty('--vr',((1-e)*R)+'px');
        if(k<1)requestAnimationFrame(f);else{zoom.z=1;applyT();veil.hidden=true;}};requestAnimationFrame(f);},
    allPlayableDone:()=>levels.filter(l=>l.play).every(l=>done.has(l.id)),
    /* 卷终：一个长镜头从引首摇到拖尾，青绿随镜头晕开，诸印依次钤上，最后写题跋 */
    finale(onEnd){
      const box=$('finale'),col=$('finaleText');box.hidden=true;col.innerHTML='';
      tiles.forEach(t=>schedule(t,true));
      const begin=()=>{
        $('app').classList.add('cine');closeLeaf();audio.setMood('finale');audio.ambience('scroll');
        const tags=[...document.querySelectorAll('.tag')];tags.forEach(t=>t.classList.remove('done'));
        setOffset(innerWidth-TOTAL*S);finaleCut=TOTAL+600;applyMasks();$('loading').style.opacity=0;
        const startOff=offset,dur=reduceMotion()?10:26000,t0=performance.now(),stamped=new Set();
        /* 长镜头可跳过：点「跳过」或按 Esc */
        let skip=false;const sk=el('button','btn cine-skip','跳过');$('app').appendChild(sk);
        const onKey=e=>{if(e.key==='Escape')skip=true;};sk.onclick=()=>{skip=true;};addEventListener('keydown',onKey);
        const f=now=>{
          const k=skip?1:Math.min(1,(now-t0)/dur);setOffset(startOff*(1-ease(k)));
          const cx=(-offset+innerWidth/2)/S;finaleCut=Math.min(finaleCut,cx-innerWidth/S*.04);applyMasks();
          let n=0;levels.forEach(L=>{if(done.has(L.id)&&!stamped.has(L.id)&&L.x>finaleCut+60){stamped.add(L.id);const t=document.querySelector(`.tag[data-id="${L.id}"]`);t&&t.classList.add('done');if(!n++)audio.thud();}});
          if(k<1){raf=requestAnimationFrame(f);return;}
          sk.remove();removeEventListener('keydown',onKey);
          const c0=finaleCut,t1=performance.now();
          const g=now=>{const q=Math.min(1,(now-t1)/1600);finaleCut=c0+(-400-c0)*ease(q);applyMasks();if(q<1)requestAnimationFrame(g);else writeColophon();};requestAnimationFrame(g);
        };
        raf=requestAnimationFrame(f);
      };
      const writeColophon=()=>{
        const ids=levels.filter(l=>done.has(l.id)).sort((a,b)=>b.x-a.x).map(l=>LESSON[l.id]);
        const cols=['千里江山　一卷运筹'];for(let i=0;i<ids.length;i+=2)cols.push(ids.slice(i,i+2).join('　'));
        cols.push('凡此诸策　皆运筹也');if(done.size<levels.length)cols.push('余下诸处　尚待续笔');cols.push('得之者　可以决胜千里之外');
        col.innerHTML='';let t=300;const step=reduceMotion()?0:110;
        cols.forEach((c,i)=>{const p=el('p',i===0?'fh':'');t=writeChars(p,c,t,step)+320;col.appendChild(p);});
        const sig=el('p','fs');t=writeChars(sig,'刘翰林 @ SUSTech · Claude　丙午年秋',t,step*.5);col.appendChild(sig);
        const sc=el('canvas','fseal');sc.width=sc.height=160;sealCanvas(sc,'运筹帷幄');col.appendChild(sc);
        box.hidden=false;box.classList.remove('sealed');audio.paper();
        setTimeout(()=>{box.classList.add('sealed');audio.thud();audio.bell();},t+400);
        setTimeout(()=>{$('finaleActs').hidden=false;},t+1300);
      };
      const wait=()=>{if(tiles.every(t=>t.colDone))begin();else{$('loading').style.opacity=1;setTimeout(wait,120);}};
      $('finaleActs').hidden=true;
      $('finaleAgain').onclick=()=>{box.hidden=true;this.finale(onEnd);};
      $('finaleHome').onclick=()=>{box.hidden=true;finaleCut=null;$('app').classList.remove('cine');applyMasks();
        document.querySelectorAll('.tag').forEach(t=>t.classList.toggle('done',done.has(t.dataset.id)));audio.setMood('scroll');
        panTo(innerWidth-TOTAL*S,2600,()=>onEnd&&onEnd());};
      wait();
    },
    /* 测试用 */
    _debug:{setOffset,centerOn,afterPan,get S(){return S;}}
  };
}
