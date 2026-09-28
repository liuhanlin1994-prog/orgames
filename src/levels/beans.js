/* 撒豆 · 蒙特卡洛：撒豆算圆 → 量湖 → 分格撒
   手感：按住就撒，越撒越快；豆子落进水里泛起涟漪。数一数湖里的豆，就知道湖多大。 */
import {RNG} from '../core/rng.js';
import {INK,PAPER,BRUSH_FONT,paperBase,paperGrain,house,willow,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {inCircle,piOf,unevenness,handToss,gradeUneven,LAKES,LAKE3,MAP,PAY,cost,payout,expErrPct,areaIn,expPay,expert,gradeRatio,GRIDS,N3,scatter,estimate,trials,meanAbs} from './beans-core.js';

const ink=a=>`rgba(${INK},${a})`,RED='rgba(179,38,30,.92)',BLUE='rgba(30,91,115,.9)',WATER='rgba(70,120,140,',BEAN='rgba(150,95,45,.92)',GOLD='rgba(200,160,70,.95)';
const SPREAD=.1,TITLE=['第一回 · 撒豆算圆','第二回 · 量湖','第三回 · 分格撒'];
const INTRO=['方田正中一口圆塘。按住田里就撒豆，手移到哪、豆落到哪。<b>塘里的豆 ÷ 全部的豆 × 4</b>，就是圆周率。撒满两千颗——撒得越匀，算得越准；浅色的格子豆少，四角也要撒到。',
  '县令要量三片湖：量得准有赏，差 1% 扣 4 文；豆子一文钱 20 颗。先拖四角把<b>方框</b>框好（豆只落在框里），再按住撒豆，觉得够了就<b>报数</b>。',
  '同样 196 颗豆，撒法不同，准头大不同。先挑一种撒法：<b>乱撒</b>，或<b>分格撒</b>——每格撒一样多，手扫过哪一格，豆就落进哪一格。'];

export const beansLevel={
  id:'beans',title:'撒豆',concept:'蒙特卡洛',ambience:'sea',poem:['红豆生南国','春来发几枝','愿君多采撷'],poemSrc:'王维《相思》',
  colophon:{head:'蒙特卡洛',seal:'疏密',
    lines:['不会算的面积，撒豆去数：落进去的比例，就是面积的比例。','撒得越多越准，可准头只随豆数的平方根长：想准十倍，要撒百倍。撒不匀，撒再多也是偏的。','框紧了再撒，豆不白费；分格均匀地撒，同样的豆数准得多。'],
    note:'今之核反应、金融风险、天气与芯片设计，算不动的积分都靠「撒豆」——随机模拟，名曰蒙特卡洛。'},
  start(ui,audio){
    const S={round:1,pts:[],inN:0,fly:[],hold:null,holdT:0,acc:0,raf:0,last:0,done:false,
      lk:0,lake:null,frame:[0,0,1,1],spent:0,log:[],results:[],drag:null,grid:0,cells:null,cellCap:null,sim:null,r:RNG(1),tickT:0};
    const root=el('div','bn'),map=el('div','bn-map'),bg=el('canvas'),beanCv=el('canvas'),fg=el('canvas'),panel=el('div','bn-panel');
    [bg,beanCv,fg].forEach(c=>map.appendChild(c));root.appendChild(map);root.appendChild(panel);ui.stage.appendChild(root);
    panel.innerHTML='<div class="bn-stats"></div><canvas class="bn-chart"></canvas><div class="bn-note"></div>';
    const stats=panel.querySelector('.bn-stats'),chart=panel.querySelector('.bn-chart'),note=panel.querySelector('.bn-note');
    let W=0,H=0,side=300,mx=0,my=0;
    const $result=()=>document.getElementById('result');

    /* ---------- 版式：方田在左（窄屏在上），账在右（窄屏在下） ---------- */
    function layout(){W=root.clientWidth;H=root.clientHeight;const wide=W>H*1.1;
      if(wide){side=Math.floor(Math.min(H-24,W*.58));map.style.cssText=`left:12px;top:12px;width:${side}px;height:${side}px`;panel.style.cssText=`left:${side+28}px;top:12px;right:12px;bottom:${S.done&&!$result().hidden?150:12}px`;}
      else{const end=S.done&&!$result().hidden;side=Math.floor(Math.min(W-24,H*(end?.34:.58)));map.style.cssText=`left:${Math.round((W-side)/2)}px;top:10px;width:${side}px;height:${side}px`;panel.style.cssText=`left:12px;right:12px;top:${side+18}px;bottom:${end?Math.min(170,H*.3):8}px`;}
      mx=0;my=0;drawBg();redrawBeans();drawFg();drawChart();}
    /* ---------- 底图：第一回方田圆塘；之后是舆图上的湖 ---------- */
    function drawBg(){const c=fitCanvas(bg,side,side),r=RNG(5+S.round);paperBase(c,0,0,side,side);
      if(S.round===1){c.fillStyle='rgba(185,160,100,.18)';c.fillRect(0,0,side,side);c.strokeStyle='rgba(120,90,50,.18)';c.lineWidth=1;for(let i=1;i<24;i++){c.beginPath();c.moveTo(0,i*side/24);c.lineTo(side,i*side/24+(r()-.5)*2);c.stroke();}
        const g=c.createRadialGradient(side/2,side/2,side*.05,side/2,side/2,side/2);g.addColorStop(0,WATER+'.28)');g.addColorStop(1,WATER+'.5)');c.fillStyle=g;c.beginPath();c.arc(side/2,side/2,side/2,0,7);c.fill();
        c.strokeStyle=ink(.55);c.lineWidth=1.6;c.stroke();for(let i=0;i<14;i++){const a=r()*7,d=r()*side*.4;c.strokeStyle=WATER+'.25)';c.beginPath();c.arc(side/2+Math.cos(a)*d,side/2+Math.sin(a)*d,4+r()*10,Math.PI*1.1,Math.PI*1.9);c.stroke();}}
      else{const lake=S.lake;c.fillStyle='rgba(185,160,100,.12)';c.fillRect(0,0,side,side);
        c.strokeStyle='rgba(120,90,50,.12)';c.lineWidth=1;for(let i=1;i<10;i++){c.beginPath();c.moveTo(0,i*side/10);c.lineTo(side,i*side/10);c.stroke();c.beginPath();c.moveTo(i*side/10,0);c.lineTo(i*side/10,side);c.stroke();}
        for(let i=0;i<9;i++){const x=r(),y=r();if(lake&&lake.inside(x,y))continue;c.globalAlpha=.45;house(c,x*side,y*side,side*.05,.5);c.globalAlpha=1;}
        if(lake){const o=lake.outline(240);c.beginPath();o.forEach(([x,y],i)=>i?c.lineTo(x*side,y*side):c.moveTo(x*side,y*side));c.closePath();c.fillStyle=WATER+'.38)';c.fill();c.strokeStyle=ink(.5);c.lineWidth=1.3;c.stroke();
          c.save();c.clip();for(let i=0;i<30;i++){c.strokeStyle=WATER+'.3)';c.beginPath();const x=r()*side,y=r()*side;c.moveTo(x,y);c.quadraticCurveTo(x+8,y-3,x+16,y);c.stroke();}c.restore();}
        c.globalAlpha=.4;willow(c,RNG(9),side*.94,side*.98,side*.18);c.globalAlpha=1;}
      c.strokeStyle=ink(.6);c.lineWidth=2;c.strokeRect(1,1,side-2,side-2);paperGrain(c,0,0,side,side,false);}
    /* ---------- 豆子 ---------- */
    let bc=null;
    function redrawBeans(){bc=fitCanvas(beanCv,side,side);bc.clearRect(0,0,side,side);S.pts.forEach(p=>paintBean(p,false));}
    function paintBean(p,ring){const [x,y]=[p[0]*side,p[1]*side],s=Math.max(1.6,side/200);
      if(p[2]){bc.fillStyle='rgba(30,60,80,.75)';bc.beginPath();bc.arc(x,y,s*.9,0,7);bc.fill();if(ring){bc.strokeStyle=WATER+'.35)';bc.lineWidth=.8;bc.beginPath();bc.arc(x,y,s*2.6,0,7);bc.stroke();}}
      else{bc.fillStyle=BEAN;bc.beginPath();bc.ellipse(x,y,s*1.15,s*.8,(p[0]*37)%3,0,7);bc.fill();}}
    function inside(x,y){return S.round===1?inCircle(x,y):S.lake.inside(x,y);}
    function drop(x,y){const p=[x,y,inside(x,y)?1:0];S.pts.push(p);if(p[2])S.inN++;
      if(S.fly.length<70&&!reduceMotion())S.fly.push({p,t:0});else paintBean(p,true);
      if(S.pts.length%8===0)S.log.push([S.pts.length,S.round===1?piOf(S.inN,S.pts.length):frameArea()*S.inN/S.pts.length*MAP]);}
    const frameArea=()=>(S.frame[2]-S.frame[0])*(S.frame[3]-S.frame[1]);

    /* ---------- 按住就撒 ---------- */
    function loc(ev){const r=fg.getBoundingClientRect();return[(ev.clientX-r.left)/r.width,(ev.clientY-r.top)/r.height];}
    fg.addEventListener('pointerdown',ev=>{if(S.done||ev.button>0)return;const [x,y]=loc(ev);try{fg.setPointerCapture(ev.pointerId);}catch(_){}
      if(S.round===2){const h=handleAt(x,y);if(h&&!S.pts.length){S.drag={h,x,y,f:S.frame.slice()};return;}
        if(!(x>=S.frame[0]&&x<=S.frame[2]&&y>=S.frame[1]&&y<=S.frame[3])){ui.flash('在框里撒',ev.clientX-root.getBoundingClientRect().left,ev.clientY-root.getBoundingClientRect().top);return;}}
      if(S.round===3&&S.grid===null)return;
      S.hold={x,y};S.holdT=0;S.acc=0;});
    fg.addEventListener('pointermove',ev=>{const [x,y]=loc(ev);if(S.drag){moveHandle(x,y);return;}if(S.hold){S.hold.x=x;S.hold.y=y;}else if(S.round===2&&!S.pts.length)fg.style.cursor=handleAt(x,y)?'nwse-resize':'crosshair';});
    const up=()=>{if(S.drag){S.drag=null;drawFg();refresh();}S.hold=null;};fg.addEventListener('pointerup',up);fg.addEventListener('pointercancel',up);
    function rate(){const t=S.holdT;return S.round===1?Math.min(240,40+t*170):S.round===2?Math.min(320,30+t*220):S.grid>1?90:Math.min(160,40+t*120);}
    function loop(ts){S.raf=requestAnimationFrame(loop);if(!root.isConnected){cancelAnimationFrame(S.raf);return;}const dt=Math.min(.05,(ts-(S.last||ts))/1000);S.last=ts;
      if(S.hold&&!S.done){S.holdT+=dt;S.acc+=rate()*dt;let k=Math.floor(S.acc);S.acc-=k;let made=0;
        while(k-->0){if(!sow())break;made++;}
        if(made){S.tickT-=dt;if(S.tickT<=0){audio.tap(Math.floor(Math.random()*4)+1);S.tickT=.07;}refresh();}}
      if(S.fly.length){S.fly.forEach(f=>f.t+=dt/.2);S.fly.filter(f=>f.t>=1).forEach(f=>paintBean(f.p,true));S.fly=S.fly.filter(f=>f.t<1);}
      drawFg();}
    /* 撒一颗：第一回落在手边；第二回落在框里各处；第三回乱撒或落进手下那一格 */
    function sow(){const r=S.r;
      if(S.round===1){const p=handToss(r,S.hold.x,S.hold.y,SPREAD);if(p)drop(p[0],p[1]);return true;}
      if(S.round===2){const f=S.frame;drop(f[0]+r()*(f[2]-f[0]),f[1]+r()*(f[3]-f[1]));return true;}
      if(S.pts.length>=N3){finish3();return false;}
      const f=S.frame;if(S.grid===1){drop(f[0]+r()*(f[2]-f[0]),f[1]+r()*(f[3]-f[1]));if(S.pts.length>=N3)finish3();return true;}
      const g=S.grid,ci=Math.floor((S.hold.x-f[0])/(f[2]-f[0])*g),cj=Math.floor((S.hold.y-f[1])/(f[3]-f[1])*g);if(ci<0||cj<0||ci>=g||cj>=g)return false;
      const c=cj*g+ci;if(S.cells[c]>=S.cellCap[c])return false;S.cells[c]++;drop(f[0]+(ci+r())/g*(f[2]-f[0]),f[1]+(cj+r())/g*(f[3]-f[1]));if(S.pts.length>=N3)finish3();return true;}

    /* ---------- 前景：落下的豆、方框、手 ---------- */
    function drawFg(){const c=fitCanvas(fg,side,side);c.clearRect(0,0,side,side);const s=Math.max(1.6,side/200);
      if(S.round===1&&S.pts.length>60){const k=6,cnt=new Array(k*k).fill(0);S.pts.forEach(([x,y])=>cnt[Math.min(k-1,Math.floor(y*k))*k+Math.min(k-1,Math.floor(x*k))]++);const m=S.pts.length/(k*k);
        cnt.forEach((v,i)=>{const d=(v-m)/m;if(Math.abs(d)<.15)return;c.fillStyle=d<0?`rgba(255,250,235,${Math.min(.32,-d*.4)})`:`rgba(120,70,40,${Math.min(.14,d*.1)})`;c.fillRect((i%k)*side/k,Math.floor(i/k)*side/k,side/k,side/k);});
        c.strokeStyle=ink(.08);c.lineWidth=1;for(let i=1;i<k;i++){c.beginPath();c.moveTo(i*side/k,0);c.lineTo(i*side/k,side);c.moveTo(0,i*side/k);c.lineTo(side,i*side/k);c.stroke();}}
      if(S.round>1){const [x0,y0,x1,y1]=S.frame.map(v=>v*side);c.fillStyle='rgba(247,241,227,.45)';c.fillRect(0,0,side,y0);c.fillRect(0,y1,side,side-y1);c.fillRect(0,y0,x0,y1-y0);c.fillRect(x1,y0,side-x1,y1-y0);
        c.strokeStyle=RED;c.lineWidth=2;c.setLineDash(S.pts.length||S.round===3?[]:[7,4]);c.strokeRect(x0,y0,x1-x0,y1-y0);c.setLineDash([]);
        if(S.round===2&&!S.pts.length&&!S.done){c.fillStyle=RED;handles().forEach(([hx,hy])=>{c.fillRect(hx*side-6,hy*side-6,12,12);});}
        c.fillStyle=RED;c.font=`${Math.round(Math.max(12,side/34))}px sans-serif`;c.textAlign='left';c.textBaseline='bottom';c.fillText(`框 ${(frameArea()*MAP).toFixed(1)} 顷`,x0+6,y0<22?y0+20:y0-3);
        if(S.round===3&&S.grid>1){const g=S.grid;c.strokeStyle='rgba(179,38,30,.35)';c.lineWidth=1;for(let i=1;i<g;i++){c.beginPath();c.moveTo(x0+(x1-x0)*i/g,y0);c.lineTo(x0+(x1-x0)*i/g,y1);c.moveTo(x0,y0+(y1-y0)*i/g);c.lineTo(x1,y0+(y1-y0)*i/g);c.stroke();}
          S.cells.forEach((v,i)=>{if(v>=S.cellCap[i]){c.fillStyle='rgba(179,38,30,.08)';c.fillRect(x0+(x1-x0)*(i%g)/g,y0+(y1-y0)*Math.floor(i/g)/g,(x1-x0)/g,(y1-y0)/g);}});}}
      if(S.done&&S.round>1){const o=S.lake.outline(240);c.beginPath();o.forEach(([x,y],i)=>i?c.lineTo(x*side,y*side):c.moveTo(x*side,y*side));c.closePath();c.strokeStyle=RED;c.lineWidth=2.5;c.setLineDash([6,3]);c.stroke();c.setLineDash([]);}
      S.fly.forEach(f=>{const [x,y]=[f.p[0]*side,f.p[1]*side],h=(1-f.t)*side*.06;c.fillStyle=BEAN;c.beginPath();c.ellipse(x,y-h,s*1.2,s*.85,0,0,7);c.fill();c.fillStyle='rgba(0,0,0,.12)';c.beginPath();c.ellipse(x,y,s*1.2*(1-f.t*.3),s*.5,0,0,7);c.fill();});
      if(S.hold&&S.round!==2&&!(S.round===3&&S.grid===1)){const [x,y]=[S.hold.x*side,S.hold.y*side];c.strokeStyle=ink(.5);c.lineWidth=1.5;c.beginPath();c.arc(x,y,S.round===1?side*SPREAD:6,0,7);c.stroke();}}

    /* ---------- 第二回：拖四角框湖 ---------- */
    function handles(){const [a,b,c2,d]=S.frame;return[[a,b],[c2,b],[a,d],[c2,d],[(a+c2)/2,b],[(a+c2)/2,d],[a,(b+d)/2],[c2,(b+d)/2]];}
    function handleAt(x,y){const tol=Math.max(16,side*.04)/side;const hs=handles();for(let i=0;i<hs.length;i++)if(Math.abs(hs[i][0]-x)<tol&&Math.abs(hs[i][1]-y)<tol)return i+1;return 0;}
    function moveHandle(x,y){const d=S.drag,f=d.f.slice(),mn=.06;x=Math.max(0,Math.min(1,x));y=Math.max(0,Math.min(1,y));const h=d.h;
      if([1,3,7].includes(h))f[0]=Math.min(x,f[2]-mn);if([2,4,8].includes(h))f[2]=Math.max(x,f[0]+mn);if([1,2,5].includes(h))f[1]=Math.min(y,f[3]-mn);if([3,4,6].includes(h))f[3]=Math.max(y,f[1]+mn);
      S.frame=f;refresh();}

    /* ---------- 账与图 ---------- */
    const fmt1=v=>v.toFixed(1),sgn=v=>(v>0?'+':'')+v;
    function refresh(){const n=S.pts.length;
      if(S.round===1){const pi=piOf(S.inN,n),cv=unevenness(S.pts);stats.innerHTML=`<div class="big"><small>圆周率 ≈</small><b>${n?pi.toFixed(3):'—'}</b></div>
        <div class="row"><span>豆</span><b>${n}</b><span>塘里</span><b>${S.inN}</b></div><div class="row"><span>撒得匀吗</span><b class="${cv<=.3?'ok':cv>.45?'bad':''}">${n<60?'—':cv<=.2?'很匀':cv<=.3?'还匀':cv<=.45?'不太匀':'很不匀'}</b><span class="sm">${n<60?'':'（浅色格子豆少，往那里撒）'}</span></div>`;
        acts1();}
      else if(S.round===2){const p=n?S.inN/n:0,F=frameArea(),est=F*p*MAP,e=n&&p>0?100*Math.sqrt((1-p)/(p*n)):null,spent=S.spent+n,now=e==null?null:Math.round(PAY.base-PAY.perPct*.8*e-cost(spent));
        stats.innerHTML=`<div class="big"><small>${S.lake?LAKES[S.lk].nm:''} 约</small><b>${n?fmt1(est):'—'}</b><small>顷</small></div>
          <div class="row"><span>框</span><b>${fmt1(F*MAP)} 顷</b><span>豆</span><b>${n}</b><span>湖里</span><b>${S.inN}</b></div>
          <div class="row"><span>误差约</span><b>${e==null?'—':'±'+fmt1(e)+'%'}</b><span>豆钱</span><b>${cost(spent)} 文</b></div>
          <div class="row"><span>此刻报数，约得</span><b class="gold">${now==null?'—':now+' 文'}</b></div>
          <div class="ledger">${S.results.map(r=>`<span>${r.nm} <b class="${r.pay<0?'bad':''}">${sgn(r.pay)}</b></span>`).join('')}${S.results.length?`<span>合计 <b>${sgn(S.results.reduce((s,r)=>s+r.pay,0))}</b> 文</span>`:''}</div>`;
        acts2();}
      else{const est=S.pts.length?estimate(S.lake,S.frame,S.pts)*MAP:null;stats.innerHTML=`<div class="big"><small>巢湖 约</small><b>${est==null?'—':fmt1(est)}</b><small>顷</small></div>
          <div class="row"><span>撒法</span><b>${S.grid==null?'未选':GRIDS.find(g=>g.g===S.grid).nm}</b><span>豆</span><b>${S.pts.length} / ${N3}</b></div>`+(S.grid>1&&!S.done?`<div class="row sm">手扫过哪一格，豆就落进哪一格；每格撒满 ${Math.floor(N3/(S.grid*S.grid))} 颗为止</div>`:'');}
      drawChart();}
    function drawChart(){const w=chart.clientWidth||300,h=chart.clientHeight||160,c=fitCanvas(chart,w,h);c.clearRect(0,0,w,h);if(w<50||h<50)return;
      const L=38,R=w-10,T=12,B=h-22,fs=11;c.font=`${fs}px sans-serif`;c.textBaseline='middle';
      if(S.round===3){drawHist(c,w,h);return;}
      const n=S.pts.length,xs=v=>L+(Math.log10(Math.max(10,v))-1)/(Math.log10(S.round===1?20000:4000)-1)*(R-L);
      let lo,hi,truth,band;
      if(S.round===1){lo=2.6;hi=3.7;truth=Math.PI;band=k=>4*1.96*Math.sqrt(.7854*.2146/k);}
      else{const p=n?S.inN/n:.3,F=frameArea()*MAP,est=n?F*p:F*.3;truth=S.done?S.lake.area*MAP:null;const mid=truth||est;lo=Math.max(0,mid*.4);hi=mid*1.6;band=k=>1.96*F*Math.sqrt(Math.max(.01,p*(1-p))/k);}
      const ys=v=>B-(v-lo)/(hi-lo)*(B-T);
      c.strokeStyle=ink(.35);c.lineWidth=1;c.beginPath();c.moveTo(L,T);c.lineTo(L,B);c.lineTo(R,B);c.stroke();
      c.fillStyle=ink(.5);c.textAlign='center';[10,100,1000,10000].forEach(v=>{if(xs(v)<=R+1){c.fillText(v,xs(v),B+11);c.strokeStyle=ink(.08);c.beginPath();c.moveTo(xs(v),T);c.lineTo(xs(v),B);c.stroke();}});
      c.textAlign='right';[lo,(lo+hi)/2,hi].forEach(v=>c.fillText(S.round===1?v.toFixed(2):v.toFixed(0),L-4,ys(v)));
      const center=S.round===1?Math.PI:(truth||(n?frameArea()*MAP*S.inN/n:null));
      if(center!=null){c.fillStyle='rgba(30,91,115,.12)';c.beginPath();for(let k=10;k<=20000;k*=1.25){const x=xs(k);if(x>R)break;c.lineTo(x,ys(center+band(k)));}for(let k=20000;k>=10;k/=1.25){const x=xs(k);if(x>R)continue;c.lineTo(x,ys(center-band(k)));}c.closePath();c.fill();}
      if(truth!=null){c.strokeStyle=RED;c.lineWidth=1.5;c.setLineDash([5,3]);c.beginPath();c.moveTo(L,ys(truth));c.lineTo(R,ys(truth));c.stroke();c.setLineDash([]);c.fillStyle=RED;c.textAlign='left';c.fillText(S.round===1?'π':'真值',L+4,ys(truth)-8);}
      c.strokeStyle=ink(.85);c.lineWidth=1.4;c.beginPath();S.log.forEach(([k,v],i)=>{const x=xs(k),y=ys(Math.max(lo,Math.min(hi,v)));i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();
      c.fillStyle=ink(.55);c.textAlign='left';c.fillText(S.round===1?'豆数（对数刻度）· 蓝带：九成五的豆数落在这里':'豆数 · 蓝带：估计多半落在这里',L+4,T+2);}
    function drawHist(c,w,h){if(!S.sim){c.fillStyle=ink(.5);c.textAlign='left';c.fillText('撒完后，长卷替你把四种撒法各推演一千回',8,16);return;}
      const rows=GRIDS.length,top=18,rh=(h-top-18)/rows,L=Math.min(92,w*.28),R=w-50,span=12,X=v=>L+(v+span)/(2*span)*(R-L);
      c.fillStyle=ink(.55);c.textAlign='left';c.fillText('推演一千回 · 误差分布（%）',6,9);
      c.strokeStyle=RED;c.setLineDash([3,3]);c.beginPath();c.moveTo(X(0),top);c.lineTo(X(0),h-16);c.stroke();c.setLineDash([]);c.fillStyle=ink(.5);c.textAlign='center';[-10,-5,0,5,10].forEach(v=>c.fillText(v,X(v),h-7));
      GRIDS.forEach((G,k)=>{const d=S.sim[k],y0=top+k*rh,bins=new Array(48).fill(0);d.forEach(v=>{const b=Math.floor((v+span)/(2*span)*48);if(b>=0&&b<48)bins[b]++;});const mxb=Math.max(...bins),me=G.g===S.grid;
        c.fillStyle=me?RED:ink(.75);c.textAlign='left';c.fillText(G.nm,4,y0+rh/2);
        c.fillStyle=me?'rgba(179,38,30,.55)':'rgba(30,91,115,.45)';bins.forEach((v,i)=>{const bh=v/mxb*(rh-6);c.fillRect(L+i*(R-L)/48,y0+rh-3-bh,(R-L)/48-1,bh);});
        c.fillStyle=me?RED:ink(.7);c.textAlign='right';c.fillText('±'+meanAbs(d).toFixed(1)+'%',w-4,y0+rh/2);});}

    /* ---------- 回合 ---------- */
    function reset(){S.pts=[];S.inN=0;S.fly=[];S.log=[];S.hold=null;S.done=false;S.r=RNG(1000+S.round*37+S.lk*7+Math.floor(Math.random()*1e6));}
    function begin(n){S.round=n;S.lk=0;S.results=[];S.spent=0;S.sim=null;S.grid=null;reset();ui.hideResult();ui.meter('');ui.stageName(TITLE[n-1]);ui.say(INTRO[n-1]);
      if(n===1){S.lake=null;S.frame=[0,0,1,1];note.innerHTML='';}
      else if(n===2){loadLake(0);}
      else{S.lake=LAKE3.lake;S.frame=LAKE3.lake.bbox.slice();note.innerHTML='框已框好（湖的外接框）。';acts3();}
      layout();refresh();}
    function loadLake(k){S.lk=k;S.lake=LAKES[k].lake;S.frame=[0,0,1,1];S.spent=0;reset();note.innerHTML=`第 ${k+1} / ${LAKES.length} 片湖 · 先拖红框四角框好，再按住撒`;drawBg();redrawBeans();refresh();}
    function acts1(){if(S.done)return;const n=S.pts.length;ui.acts([[n<2000?`再撒 ${2000-n} 颗`:'收手，看算得准不准',finish1,true,n<2000]]);}
    function finish1(){if(S.done)return;S.done=true;S.hold=null;const n=S.pts.length,pi=piOf(S.inN,n),cv=unevenness(S.pts),err=pi-Math.PI,sd=4*Math.sqrt(.7854*.2146/n);
      const g=gradeUneven(cv/Math.sqrt(36/n),Math.abs(err));
      g==='至妙'||g==='上品'?audio.arp():g==='下品'?audio.low():audio.bell();
      ui.result(g,`π ≈ <b>${pi.toFixed(3)}</b>（差 ${Math.abs(err).toFixed(3)}）· ${n} 颗`,
        Math.abs(err)<=2.5*sd?`撒得匀，就只剩运气的误差：${n} 颗豆，误差多在 ±${(sd*1.96).toFixed(2)} 之间。想准十倍，要撒一百倍——看图上那条喇叭口。`:Math.abs(err)<=.1?`大体匀了，只是${err>0?'四角撒得略少':'四角撒得略多'}，偏了 ${Math.abs(err).toFixed(2)}：光靠运气，${n} 颗豆误差多在 ±${(sd*1.96).toFixed(2)} 之间。`:`撒得不匀：${err>0?'四角漏撒了，塘里的豆显得多':'四角的豆多、塘里的少'}，算出来就偏${err>0?'大':'小'}。随机撒豆，头一条是「处处机会均等」——四角也要撒到。`,false);
      ui.acts([['再撒一次',()=>begin(1)],['下一回 →',()=>begin(2),true]]);layout();}
    function acts2(){if(S.done)return;const n=S.pts.length;ui.acts([['撒 50 颗',()=>{if(!S.done){for(let i=0;i<50;i++)sow();refresh();audio.tap(3);}}],...(n?[['重新框',reframe]]:[]),['报数',submit,true,n<10]]);}
    function reframe(){S.spent+=S.pts.length;reset();drawBg();redrawBeans();refresh();note.innerHTML=`豆钱已花 ${cost(S.spent)} 文 · 重新拖框`;}
    function submit(){if(S.done)return;const n=S.pts.length;if(n<10)return;S.done=true;S.hold=null;const L=S.lake,est=frameArea()*S.inN/n,err=100*(est-L.area)/L.area,spent=S.spent+n,pay=payout(err,spent);
      const ex=expert(L),mine=PAY.base-PAY.perPct*expErrPct(frameArea(),areaIn(L,S.frame),L.area,n)-cost(spent);
      S.results.push({nm:LAKES[S.lk].nm,pay,exp:mine,best:ex.pay,err,n:spent,frame:S.frame.slice(),bestN:ex.n});
      pay>=60?audio.arp():pay<30?audio.low():audio.bell();drawFg();refresh();
      const cut=areaIn(L,S.frame)<L.area*.995;
      note.innerHTML=`真值 <b>${(L.area*MAP).toFixed(1)}</b> 顷 · 你报 ${(est*MAP).toFixed(1)}（差 ${err>0?'+':''}${err.toFixed(1)}%）· 得 <b>${pay}</b> 文<br><span class="sm">${cut?'框没框全：框外那截湖一颗豆也落不到，撒再多也偏小。':`按你的框和豆数，平均能得 ${Math.round(mine)} 文；行家框紧湖边、撒 ${ex.n} 颗，平均 ${Math.round(ex.pay)} 文。`}</span>`;
      ui.acts([[S.lk<LAKES.length-1?'下一片湖 →':'收官 →',()=>S.lk<LAKES.length-1?loadLake(S.lk+1):finish2(),true]]);}
    function finish2(){const m=S.results.reduce((s,r)=>s+r.exp,0),b=S.results.reduce((s,r)=>s+r.best,0),act=S.results.reduce((s,r)=>s+r.pay,0),g=gradeRatio(m/b);
      g==='至妙'||g==='上品'?audio.arp():audio.bell();
      const whole=S.results.filter(r=>(r.frame[2]-r.frame[0])*(r.frame[3]-r.frame[1])>.8).length;
      ui.result(g,`实得 <b>${act}</b> 文 · 按你的撒法平均 <b>${Math.round(m)}</b> · 行家平均 <b>${Math.round(b)}</b>`,
        whole?'框得太大，豆多半落在陆上白费；框紧湖边，同样的豆准得多。':'豆撒到误差和豆钱相当时就该停：再多撒，准头只随平方根长，豆钱却一颗颗往上加。',false);
      ui.acts([['再量一遍',()=>begin(2)],['下一回 →',()=>begin(3),true]]);layout();}
    function acts3(){if(S.pts.length||S.done)return;ui.acts(GRIDS.map(G=>[G.nm,()=>choose(G.g)]));}
    function choose(g){S.grid=g;reset();const cells=g*g;S.cells=new Array(cells).fill(0);S.cellCap=Array.from({length:cells},(_,i)=>Math.floor(N3/cells)+(i<N3%cells?1:0));
      ui.acts([['自动撒完',autoFill],['换撒法',()=>{S.grid=null;reset();redrawBeans();refresh();acts3();}]]);note.innerHTML=g===1?'按住框里就撒，豆落在框里各处。':'按住并扫过各格，豆落进手下那一格。';redrawBeans();refresh();}
    function autoFill(){if(S.done)return;const f=S.frame,g=S.grid,pts=scatter(S.r,f,g,N3-S.pts.length);
      if(g>1){/* 补满没满的格 */const need=[];S.cells.forEach((v,i)=>{for(let k=v;k<S.cellCap[i];k++)need.push(i);});need.forEach(i=>{const ci=i%g,cj=Math.floor(i/g);S.cells[i]++;drop(f[0]+(ci+S.r())/g*(f[2]-f[0]),f[1]+(cj+S.r())/g*(f[3]-f[1]));});}
      else pts.forEach(p=>drop(p[0],p[1]));finish3();}
    function finish3(){if(S.done)return;S.done=true;S.hold=null;const L=S.lake,est=estimate(L,S.frame,S.pts),err=100*(est-L.area)/L.area;
      S.sim=GRIDS.map(G=>trials(L,S.frame,G.g));S.done=true;const me=GRIDS.findIndex(G=>G.g===S.grid),errs=S.sim.map(meanAbs),best=Math.min(...errs),rand=scatter(RNG(99),S.frame,1,N3),re=100*(estimate(L,S.frame,rand)-L.area)/L.area;
      const g=['下品','中品','上品','至妙'][me];g==='至妙'?audio.arp():g==='下品'?audio.low():audio.bell();refresh();drawFg();
      ui.result(g,`你报 ${(est*MAP).toFixed(1)} 顷（差 ${err>0?'+':''}${err.toFixed(1)}%）· 老农乱撒 差 ${re>0?'+':''}${re.toFixed(1)}% · 真值 ${(L.area*MAP).toFixed(1)}`,
        me===3?`格分得越细，每一块都照顾到，平均只差 ±${best.toFixed(1)}%；乱撒平均差 ±${errs[0].toFixed(1)}%。`:`同样 ${N3} 颗：乱撒平均差 ±${errs[0].toFixed(1)}%，分 14×14 格只差 ±${best.toFixed(1)}%。格分得越细越准——一回的输赢是运气，一千回才看得出撒法。`,false);
      note.innerHTML='图上：四种撒法各推演一千回。分格越细，误差越集中在 0 附近（分层抽样）。';
      ui.acts([['换个撒法再撒',()=>{S.done=false;S.sim=null;S.grid=null;reset();ui.hideResult();layout();refresh();acts3();}],['题跋 · 钤印',()=>ui.colophon(),true]]);layout();}

    this._resize=()=>layout();
    let lastWH='',rq=0;const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{cancelAnimationFrame(rq);rq=requestAnimationFrame(()=>{const k=root.clientWidth+'x'+root.clientHeight;if(k!==lastWH){lastWH=k;layout();}});}):null;if(ro)ro.observe(root);
    this._stop=()=>{cancelAnimationFrame(S.raf);if(ro)ro.disconnect();};
    /* 自动化测试用 */
    beansLevel._dbg=S;beansLevel._go=n=>begin(n);
    beansLevel._play={sowAt:(x,y,k)=>{S.hold={x,y};for(let i=0;i<k;i++)if(!sow())break;S.hold=null;refresh();},frame:f=>{S.frame=f;refresh();},submit,finish1,choose,autoFill};
    begin(1);S.raf=requestAnimationFrame(loop);
  },
  resize(){this._resize&&this._resize();},
  stop(){this._stop&&this._stop();this._resize=null;}
};
