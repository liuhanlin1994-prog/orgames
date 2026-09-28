/* 客栈 · 准入控制：一夜（亲手收客）→ 留几座（推演一千夜）→ 三种夜晚（Littlewood 法则） */
import {RNG} from '../core/rng.js';
import {INK,PAPER,BRUSH_FONT,paperBase,paperGrain,figure,fitCanvas} from '../core/ink.js';
import {labChart} from '../core/chart.js';
import {el,reduceMotion} from '../core/ui.js';
import {SEATS,LOW,BASE,SCENES,tailProb,expRevenue,bestProtect,sampleHigh,nightRevenue,simNights,innGrade,labSeed} from './inn-core.js';

const CN='〇一二三四五六七八九十';
const LOW_TINT=[`rgba(${INK},.16)`,'rgba(170,128,72,.42)','rgba(30,91,115,.3)'],VIP_TINT='rgba(165,42,32,.62)',GOLD='rgba(200,160,70,.95)';
/* 客人：散客布袍，贵客朱袍、幞头、金带 */
function guest(c,x,y,s,p){if(p.vip)figure(c,x,y,s,VIP_TINT,2,GOLD);else figure(c,x,y,s,LOW_TINT[p.v%3],p.v%2?1:0);}
function distBars(cv,dist,w,h){const c=fitCanvas(cv,w,h);c.clearRect(0,0,w,h);const bw=w/dist.length;c.font=`11px "Noto Serif SC",serif`;c.textAlign='center';
  dist.forEach((p,i)=>{const bh=(h-16)*p/.5;c.fillStyle=`rgba(${INK},.45)`;c.fillRect(i*bw+bw*.2,h-14-bh,bw*.6,bh);c.fillStyle=`rgba(${INK},.7)`;c.fillText(i<dist.length-1?i:'4+',i*bw+bw/2,h-2);});}

export const innLevel={
  id:'inn',title:'客栈',concept:'准入控制',ambience:'inn',poem:['渭城朝雨浥轻尘','客舍青青柳色新'],poemSrc:'王维《送元二使安西》',
  colophon:{head:'收益管理',seal:'留余',
    lines:['座有定数，客有贵贱；收下眼前的散客，便可能没座留给贵客。','留不留这一座，看它等来贵客的机会：机会乘以贵客价，胜过散客价，便留。','差价越大、贵客越常来，便留得越多。'],
    note:'今之机票舱位、酒店留房、门诊号源，皆用此术，名曰 Littlewood 法则。'},
  start(ui,audio){
    const S={round:1,seats:[],coins:0,queue:[],night:false,anim:0,lab:{tries:new Map(),curve:false,y:1},picks:[null,null,null]};
    const root=el('div','inn');ui.stage.appendChild(root);
    let W=0,H=0,bg,fg,raf=0,people=[];
    /* 版式：宽屏四桌一排；窄屏两排 */
    const T=()=>{const wide=W/H>1.2,s=wide?Math.max(30,Math.min(H*.19,W*.068,124)):Math.max(30,Math.min(H*.15,W*.17,124)),wallB=H*(wide?.56:.5),beam=H*.05;
      const tables=wide?[.4,.545,.69,.835].map(f=>({x:f*W,y:H*.9})):[[.52,.74],[.82,.74],[.46,.94],[.78,.94]].map(([a,b])=>({x:a*W,y:b*H}));
      const door={x:wide?W*.93:W*.87,w:s*1.15,top:wallB-s*1.8},kx0=W*.02,kbot=H*(wide?.92:.95);
      return{wide,s,wallB,beam,tables,door,counter:{x0:kx0,x1:kx0+s*(wide?2.6:1.6),top:kbot-s*.62,bot:kbot},
        wins:wide?[[.31,.44],[.57,.7]]:[[.24,.5]],scroll:wide?.505:.62,posts:wide?[.27,.75]:[.18]};};
    const ink=a=>`rgba(${INK},${a})`;

    /* ---------- 堂中：梁柱、窗、中堂、酒架、柜台、门 ---------- */
    function drawRoom(){
      W=root.clientWidth;H=root.clientHeight;const c=fitCanvas(bg,W,H),G=T(),s=G.s,r=RNG(9);paperBase(c,0,0,W,H);
      const wg=c.createLinearGradient(0,0,0,G.wallB);wg.addColorStop(0,'rgba(120,96,60,.16)');wg.addColorStop(1,'rgba(120,96,60,.05)');c.fillStyle=wg;c.fillRect(0,0,W,G.wallB);
      /* 地面：方砖，越近越疏 */
      c.fillStyle='rgba(120,96,60,.09)';c.fillRect(0,G.wallB,W,H-G.wallB);c.strokeStyle=ink(.12);c.lineWidth=.8;
      for(let k=0,y=G.wallB;y<H;k++){y+=6+k*5;c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
      for(let i=-12;i<=12;i++){const x0=W/2+i*W*.06,x1=W/2+i*W*.12;c.beginPath();c.moveTo(x0,G.wallB);c.lineTo(x1,H);c.stroke();}
      c.strokeStyle=ink(.55);c.lineWidth=1.4;c.beginPath();c.moveTo(0,G.wallB);c.lineTo(W,G.wallB);c.stroke();c.fillStyle=ink(.12);c.fillRect(0,G.wallB-s*.08,W,s*.08);
      /* 梁、柱 */
      c.fillStyle=ink(.72);c.fillRect(0,G.beam,W,s*.2);c.fillStyle=ink(.35);c.fillRect(0,G.beam+s*.2,W,s*.05);
      c.fillStyle='rgba(165,42,32,.5)';for(let x=W*.08;x<W;x+=W*.16)c.fillRect(x,G.beam+s*.04,W*.05,s*.12);
      G.posts.forEach(f=>{const x=f*W,w=s*.2;c.fillStyle='rgba(120,70,40,.55)';c.fillRect(x-w/2,G.beam,w,G.wallB-G.beam);c.fillStyle=ink(.25);c.fillRect(x-w/2,G.beam,w*.28,G.wallB-G.beam);
        c.fillStyle=ink(.5);c.fillRect(x-w*.8,G.wallB-s*.14,w*1.6,s*.14);});
      /* 中堂：宾至如归 */
      const sx=G.scroll*W,sw=Math.min(s*.9,W*.07),st=G.beam+s*.5,sb=Math.min(G.wallB-s*.9,st+s*3.6);
      c.fillStyle='rgba(247,241,227,.98)';c.fillRect(sx-sw/2,st,sw,sb-st);c.strokeStyle=ink(.45);c.lineWidth=1;c.strokeRect(sx-sw/2,st,sw,sb-st);
      c.fillStyle='rgba(120,96,60,.18)';c.fillRect(sx-sw/2,st,sw,sw*.3);c.fillRect(sx-sw/2,sb-sw*.3,sw,sw*.3);
      c.fillStyle=ink(.8);c.fillRect(sx-sw*.62,st-3,sw*1.24,4);c.fillRect(sx-sw*.62,sb-1,sw*1.24,5);c.strokeStyle=ink(.5);c.beginPath();c.moveTo(sx-sw*.3,st-3);c.lineTo(sx,st-sw*.5);c.lineTo(sx+sw*.3,st-3);c.stroke();
      const fs=Math.min(sw*.62,(sb-st-sw*.7)/4.4);c.font=`${Math.round(fs)}px ${BRUSH_FONT}`;c.fillStyle=ink(.85);c.textAlign='center';c.textBaseline='middle';
      '宾至如归'.split('').forEach((ch,i)=>c.fillText(ch,sx,st+sw*.35+fs*(.7+i*1.05)));
      c.fillStyle='rgba(179,38,30,.8)';c.fillRect(sx-fs*.22,st+sw*.35+fs*4.5,fs*.44,fs*.44);
      /* 酒架与酒坛 */
      const K=G.counter,shelfY=[G.wallB-s*1.9,G.wallB-s*1.15];c.fillStyle='rgba(120,70,40,.5)';
      shelfY.forEach(y=>{c.fillRect(K.x0,y,K.x1-K.x0,s*.07);});
      shelfY.forEach((y,j)=>{const n=Math.max(2,Math.floor((K.x1-K.x0)/(s*.42)));for(let i=0;i<n;i++){const jx=K.x0+(i+.5)*(K.x1-K.x0)/n,jh=s*(.42+((i+j)%2)*.06);
        c.fillStyle=`rgba(${PAPER},.97)`;c.beginPath();c.ellipse(jx,y-jh*.45,s*.15,jh*.45,0,0,7);c.fill();c.fillStyle=ink(.22+((i*3+j)%3)*.12);c.fill();c.strokeStyle=ink(.6);c.lineWidth=1;c.stroke();
        c.fillStyle=ink(.7);c.fillRect(jx-s*.06,y-jh*.98,s*.12,s*.06);c.fillStyle='rgba(179,38,30,.85)';c.fillRect(jx-s*.06,y-jh*.62,s*.12,s*.16);
        c.fillStyle=`rgba(${PAPER},.9)`;c.font=`${Math.round(s*.1)}px ${BRUSH_FONT}`;c.fillText('酒',jx,y-jh*.54);}});
      /* 门：门框、门外、半截门帘、匾 */
      const D=G.door;c.fillStyle='rgba(210,200,175,.9)';c.fillRect(D.x-D.w/2,D.top,D.w,G.wallB-D.top);
      const og=c.createLinearGradient(0,D.top,0,G.wallB);og.addColorStop(0,'rgba(236,230,212,1)');og.addColorStop(1,'rgba(200,188,160,1)');c.fillStyle=og;c.fillRect(D.x-D.w/2,D.top,D.w,G.wallB-D.top);
      c.strokeStyle=ink(.3);c.lineWidth=1;for(let i=0;i<8;i++){const x=D.x-D.w*.4+r()*D.w*.8,y=D.top+D.w*.2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+(r()-.5)*6,y+D.w*.3,x+(r()-.5)*8,y+D.w*(.5+r()*.4));c.stroke();}
      c.fillStyle='rgba(120,70,40,.75)';c.fillRect(D.x-D.w/2-s*.14,D.top-s*.12,s*.14,G.wallB-D.top+s*.12);c.fillRect(D.x+D.w/2,D.top-s*.12,s*.14,G.wallB-D.top+s*.12);c.fillRect(D.x-D.w/2-s*.2,D.top-s*.16,D.w+s*.4,s*.16);
      c.fillStyle='rgba(30,91,115,.72)';c.fillRect(D.x-D.w/2,D.top,D.w,s*.5);c.strokeStyle=`rgba(${PAPER},.5)`;c.beginPath();c.moveTo(D.x,D.top);c.lineTo(D.x,D.top+s*.5);c.stroke();
      const pw=Math.min(D.w*1.5,s*1.7,2*(W-D.x)-8),ph=Math.min(s*.46,pw*.3),py=D.top-s*.3-ph;c.fillStyle=ink(.86);c.fillRect(D.x-pw/2,py,pw,ph);c.strokeStyle=GOLD;c.lineWidth=1;c.strokeRect(D.x-pw/2+2,py+2,pw-4,ph-4);
      c.fillStyle=GOLD;c.font=`${Math.round(ph*.62)}px ${BRUSH_FONT}`;c.fillText('悦来客栈',D.x,py+ph/2+1);
      /* 盆栽 */
      const px=D.x-D.w/2-s*.55,pyb=G.wallB;c.fillStyle='rgba(120,70,40,.6)';c.beginPath();c.moveTo(px-s*.16,pyb-s*.28);c.lineTo(px+s*.16,pyb-s*.28);c.lineTo(px+s*.11,pyb);c.lineTo(px-s*.11,pyb);c.closePath();c.fill();
      c.lineCap='round';for(let i=0;i<9;i++){const a=-Math.PI/2+(i-4)*.28,L=s*(.35+r()*.35);c.strokeStyle=`rgba(70,105,60,${.5+r()*.3})`;c.lineWidth=1.3;c.beginPath();c.moveTo(px,pyb-s*.28);c.quadraticCurveTo(px+Math.cos(a)*L*.5,pyb-s*.28+Math.sin(a)*L*.8,px+Math.cos(a)*L,pyb-s*.28+Math.sin(a)*L*.6);c.stroke();}
      /* 柜台：掌柜、算盘、账簿 */
      figure(c,(K.x0+K.x1)/2+s*.2,K.top+s*.42,s,'rgba(120,70,40,.4)',2);
      c.fillStyle=`rgba(${PAPER},.98)`;c.fillRect(K.x0,K.top,K.x1-K.x0,K.bot-K.top);c.fillStyle='rgba(120,70,40,.42)';c.fillRect(K.x0,K.top,K.x1-K.x0,K.bot-K.top);
      c.strokeStyle=ink(.6);c.lineWidth=1.2;c.strokeRect(K.x0,K.top,K.x1-K.x0,K.bot-K.top);c.fillStyle='rgba(120,70,40,.8)';c.fillRect(K.x0-s*.06,K.top-s*.08,K.x1-K.x0+s*.12,s*.1);
      c.strokeStyle=ink(.3);const np=Math.max(2,Math.round((K.x1-K.x0)/(s*.7)));for(let i=0;i<np;i++){const x=K.x0+(K.x1-K.x0)*(i+.12)/np,w=(K.x1-K.x0)/np*.76;c.strokeRect(x,K.top+s*.2,w,K.bot-K.top-s*.34);}
      const ax=K.x0+s*.12,aw=Math.min(s*1.1,(K.x1-K.x0)*.5),ah=s*.34,ay=K.top-s*.08;c.fillStyle='rgba(120,70,40,.85)';c.fillRect(ax,ay-ah,aw,ah);c.fillStyle=`rgba(${PAPER},.9)`;c.fillRect(ax+2,ay-ah+2,aw-4,ah-4);
      c.strokeStyle=ink(.7);c.lineWidth=1;c.beginPath();c.moveTo(ax,ay-ah*.64);c.lineTo(ax+aw,ay-ah*.64);c.stroke();const nb=9;
      for(let i=0;i<nb;i++){const x=ax+aw*(i+.5)/nb;c.strokeStyle=ink(.35);c.beginPath();c.moveTo(x,ay-ah+2);c.lineTo(x,ay-2);c.stroke();c.fillStyle=ink(.8);
        [[.82,1],[.5,0],[.38,0],[.26,0],[.14,0]].forEach(([f,up],j)=>{const yy=ay-ah*f+(j===0?0:(i%3===0&&j===1?-2:0));c.beginPath();c.ellipse(x,yy,aw/nb*.42,ah*.06,0,0,7);c.fill();});}
      const bx=ax+aw+s*.15;c.fillStyle='rgba(240,232,210,1)';c.fillRect(bx,ay-s*.08,s*.46,s*.08);c.strokeStyle=ink(.6);c.strokeRect(bx,ay-s*.08,s*.46,s*.08);c.fillStyle='rgba(30,91,115,.6)';c.fillRect(bx,ay-s*.08,s*.06,s*.08);
      /* 店小二 */
      if(G.wide){const wx=K.x1+s*.6,wy=H*.86;figure(c,wx,wy,s,'rgba(242,233,214,.2)',0);c.fillStyle='rgba(250,248,240,1)';c.strokeStyle=ink(.5);c.beginPath();c.moveTo(wx-s*.12,wy-s*.74);c.lineTo(wx-s*.02,wy-s*.74);c.lineTo(wx-s*.05,wy-s*.46);c.lineTo(wx-s*.14,wy-s*.5);c.closePath();c.fill();c.stroke();}
      paperGrain(c,0,0,W,H,false);
    }
    /* ---------- 前景：窗外、灯笼、桌、客 ---------- */
    function table(c,t,s,who){
      const top=t.y-s*.5,w=s*.85,sat=who&&!who.pending;
      c.fillStyle='rgba(120,70,40,.45)';c.fillRect(t.x-w*.8,top-s*.02,w*1.6,s*.06);
      if(sat){c.save();c.beginPath();c.rect(0,0,W,top+1);c.clip();guest(c,t.x,t.y-s*.1,s,who);c.restore();}
      c.fillStyle=`rgba(${PAPER},.98)`;c.fillRect(t.x-w,top,w*2,s*.09);c.fillStyle='rgba(120,70,40,.66)';c.fillRect(t.x-w,top,w*2,s*.09);
      c.fillStyle='rgba(120,70,40,.42)';c.fillRect(t.x-w*.9,top+s*.09,w*1.8,s*.08);c.fillStyle='rgba(120,70,40,.78)';
      [-w*.86,w*.86-s*.07].forEach(dx=>c.fillRect(t.x+dx,top+s*.09,s*.07,s*.41));
      c.fillStyle='rgba(120,70,40,.55)';c.fillRect(t.x-w*1.25,t.y-s*.24,s*.46,s*.05);c.fillRect(t.x+w*1.25-s*.46,t.y-s*.24,s*.46,s*.05);
      c.fillRect(t.x-w*1.2,t.y-s*.19,s*.04,s*.19);c.fillRect(t.x+w*1.2-s*.04,t.y-s*.19,s*.04,s*.19);
      if(sat){c.fillStyle=`rgba(${PAPER},.98)`;c.strokeStyle=ink(.7);c.lineWidth=1;
        c.beginPath();c.moveTo(t.x+w*.35,top);c.lineTo(t.x+w*.33,top-s*.16);c.quadraticCurveTo(t.x+w*.45,top-s*.26,t.x+w*.57,top-s*.16);c.lineTo(t.x+w*.55,top);c.closePath();c.fill();c.stroke();
        c.beginPath();c.ellipse(t.x-w*.42,top-s*.03,s*.07,s*.03,0,0,7);c.fill();c.stroke();c.beginPath();c.ellipse(t.x+w*.72,top-s*.03,s*.13,s*.035,0,0,7);c.fill();c.stroke();
        if(who.vip){c.fillStyle='rgba(179,38,30,.8)';c.beginPath();c.ellipse(t.x+w*.72,top-s*.06,s*.08,s*.03,0,0,7);c.fill();}}
    }
    function drawFg(){
      const c=fg.getContext('2d'),dpr=fg.width/W,G=T(),s=G.s,nk=S.nk||0;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
      const wt=G.beam+s*.8,wb=Math.min(G.wallB-s*1.1,wt+s*2.4);
      G.wins.forEach(([a,b],wi)=>{const x0=a*W,x1=b*W;const sky=c.createLinearGradient(0,wt,0,wb);
        sky.addColorStop(0,`rgba(${Math.round(236-200*nk)},${Math.round(232-196*nk)},${Math.round(214-150*nk)},1)`);sky.addColorStop(1,`rgba(${Math.round(226-196*nk)},${Math.round(222-190*nk)},${Math.round(200-140*nk)},1)`);
        c.fillStyle=sky;c.fillRect(x0,wt,x1-x0,wb-wt);
        if(wi===0&&nk>.05){c.fillStyle=`rgba(250,240,200,${nk*.95})`;c.beginPath();c.arc(x0+(x1-x0)*.72,wt+(wb-wt)*.28,Math.min(s*.28,(x1-x0)*.12),0,7);c.fill();}
        c.strokeStyle=`rgba(${nk>.5?'200,190,160':INK},${.25})`;c.lineWidth=1;for(let i=0;i<6;i++){const x=x0+(x1-x0)*(.1+i*.16);c.beginPath();c.moveTo(x,wb);c.quadraticCurveTo(x+4,wb-(wb-wt)*.3,x+2,wb-(wb-wt)*(.35+(i%3)*.12));c.stroke();}
        c.strokeStyle='rgba(120,70,40,.85)';c.lineWidth=Math.max(2,s*.06);c.strokeRect(x0,wt,x1-x0,wb-wt);c.lineWidth=Math.max(1,s*.025);
        const nx=Math.max(3,Math.round((x1-x0)/(s*.36))),ny=Math.max(3,Math.round((wb-wt)/(s*.36)));
        for(let i=1;i<nx;i++){const x=x0+(x1-x0)*i/nx;c.beginPath();c.moveTo(x,wt);c.lineTo(x,wb);c.stroke();}for(let j=1;j<ny;j++){const y=wt+(wb-wt)*j/ny;c.beginPath();c.moveTo(x0,y);c.lineTo(x1,y);c.stroke();}
        c.lineWidth=Math.max(2,s*.05);c.strokeRect(x0+(x1-x0)*.08,wt+(wb-wt)*.08,(x1-x0)*.84,(wb-wt)*.84);
        c.fillStyle='rgba(120,70,40,.8)';c.fillRect(x0-s*.08,wb,x1-x0+s*.16,s*.08);});
      if(nk>0){const ng=c.createLinearGradient(0,0,0,H);ng.addColorStop(0,`rgba(14,14,28,${.5*nk})`);ng.addColorStop(1,`rgba(34,24,14,${.42*nk})`);c.fillStyle=ng;c.fillRect(0,0,W,H);}
      G.tables.forEach((t,i)=>{const lx=G.wide?t.x:W*(.3+.19*i),ly=G.beam+s*.25+s*(1.3+(i%2)*.25),lit=nk>.3||S.seats[i];
        c.strokeStyle=ink(.55);c.lineWidth=1;c.beginPath();c.moveTo(lx,G.beam+s*.25);c.lineTo(lx,ly-s*.3);c.stroke();
        if(lit){c.save();c.globalCompositeOperation='lighter';const R=G.wide?s*(2.2+nk*1.2):s*(1.3+nk*.6),g=c.createRadialGradient(lx,ly,2,lx,ly,R);g.addColorStop(0,`rgba(255,160,70,${(G.wide?.3:.22)+(G.wide?.28:.16)*nk})`);g.addColorStop(.5,`rgba(255,150,60,${.08+.1*nk})`);g.addColorStop(1,'rgba(255,150,60,0)');c.fillStyle=g;c.fillRect(lx-R,ly-R,R*2,R*2);c.restore();}
        c.fillStyle=lit?'rgba(205,56,38,.95)':'rgba(190,80,60,.55)';c.strokeStyle=ink(.75);c.lineWidth=1.2;c.beginPath();c.ellipse(lx,ly,s*.24,s*.3,0,0,7);c.fill();c.stroke();
        c.strokeStyle=ink(.25);c.beginPath();c.ellipse(lx,ly,s*.12,s*.3,0,0,7);c.stroke();
        c.fillStyle=ink(.85);c.fillRect(lx-s*.13,ly-s*.36,s*.26,s*.07);c.fillRect(lx-s*.13,ly+s*.29,s*.26,s*.07);c.strokeStyle='rgba(179,38,30,.8)';c.beginPath();c.moveTo(lx,ly+s*.36);c.lineTo(lx,ly+s*.5);c.stroke();});
      const order=G.tables.map((t,i)=>i).sort((a,b)=>G.tables[a].y-G.tables[b].y);
      const walkers=people.slice().sort((a,b)=>a.y-b.y);let wi=0;
      order.forEach(i=>{const t=G.tables[i];while(wi<walkers.length&&walkers[wi].y<t.y-s*.2)drawWalker(c,walkers[wi++],s);table(c,t,s,S.seats[i]);
        if(S.seats[i]&&!S.seats[i].pending&&nk>.3){const cx=t.x-s*.62,cy=t.y-s*.5;c.save();c.globalCompositeOperation='lighter';const g=c.createRadialGradient(cx,cy-s*.2,1,cx,cy-s*.2,s*1.1);g.addColorStop(0,'rgba(255,190,90,.55)');g.addColorStop(1,'rgba(255,190,90,0)');c.fillStyle=g;c.fillRect(cx-s*1.1,cy-s*1.3,s*2.2,s*2.2);c.restore();
          c.fillStyle=`rgba(${PAPER},1)`;c.fillRect(cx-s*.025,cy-s*.18,s*.05,s*.18);c.fillStyle='rgba(255,200,90,.95)';c.beginPath();c.ellipse(cx,cy-s*.23,s*.025,s*.05,0,0,7);c.fill();}});
      while(wi<walkers.length)drawWalker(c,walkers[wi++],s);
    }
    function drawWalker(c,p,s){c.globalAlpha=p.a;guest(c,p.x,p.y,s,p);if(p.tag){c.font=`${Math.round(Math.max(13,s*.24))}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='alphabetic';const tw=c.measureText(p.tag).width+12;
      c.fillStyle='rgba(247,241,227,.85)';c.fillRect(p.x-tw/2,p.y-s*1.36,tw,s*.3);c.fillStyle=p.vip?'rgba(179,38,30,.95)':ink(.85);c.fillText(p.tag,p.x,p.y-s*1.14);}c.globalAlpha=1;}
    function loop(){cancelAnimationFrame(raf);let last=performance.now();const f=now=>{if(!root.isConnected)return;const dt=Math.min(.05,(now-last)/1000);last=now;const k=Math.min(1,dt*(reduceMotion()?60:3.6));
      S.nk=(S.nk||0)+((S.night?1:0)-(S.nk||0))*Math.min(1,dt*(reduceMotion()?60:1.6));
      people.forEach(p=>{p.x+=(p.tx-p.x)*k;p.y+=(p.ty-p.y)*k;if(p.leaving)p.a=Math.max(0,p.a-dt*1.2);});people=people.filter(p=>p.a>0);drawFg();raf=requestAnimationFrame(f);};raf=requestAnimationFrame(f);}
    function buildRoom(){root.innerHTML='';bg=el('canvas','inn-bg');fg=el('canvas','inn-fg');root.appendChild(bg);root.appendChild(fg);drawRoom();fitCanvas(fg,W,H);loop();}
    /* 进门：先在门口站定，再走到桌边；婉拒就退回门外 */
    const atDoor=()=>{const G=T();return{x:G.door.x,y:G.wallB+G.s*.02};};
    const waitSpot=()=>{const G=T();return{x:G.door.x-G.s*.9,y:G.wallB+G.s*.55};};
    /* 先占座（pending），走到桌边再坐下 */
    function seatGuest(p,i){const G=T(),t=G.tables[i];S.seats[i]={vip:p.vip,v:p.v,pending:true};p.tx=t.x;p.ty=t.y-G.s*.3;
      setTimeout(()=>{if(S.seats[i])S.seats[i].pending=false;people=people.filter(q=>q!==p);},650);}
    const free=()=>S.seats.findIndex(s=>!s);
    const meter=()=>ui.meter(`<small>进账</small><b>${S.coins}</b><small>文 · 空座 ${S.seats.filter(s=>!s).length}</small>`);

    /* ---------- 第一回：一夜 ---------- */
    function round1(){
      S.round=1;S.seats=[null,null,null,null];S.coins=0;S.night=false;people=[];ui.hideResult();ui.stageName('第一回 · 一夜');buildRoom();meter();
      const r=Math.random;S.nLow=6+Math.floor(r()*3);S.dHigh=sampleHigh(BASE,r);S.idx=0;S.lostVip=0;S.lowTaken=0;
      ui.say(`悦来客栈四张雅座，一夜只坐一轮。散客晌午就来，每位 <b>${LOW}</b> 文；贵客入夜才到，每位 <b>${BASE.high}</b> 文，可来几位说不准。<br>散客一位位上门，收，还是婉拒？`);
      setTimeout(nextLow,600);
    }
    function nextLow(){
      if(!root.isConnected)return;const G=T();
      if(S.idx>=S.nLow){toNight();return;}
      if(free()<0){ui.say('雅座满了，后面的散客只好请回。');S.idx=S.nLow;setTimeout(toNight,900);return;}
      const d=atDoor(),w=waitSpot(),p={x:d.x,y:d.y,tx:w.x,ty:w.y,a:1,vip:false,v:S.idx,tag:'散客 · 十文'};people.push(p);S.cur=p;audio.tap(2);
      ui.say(`第 ${CN[S.idx+1]||S.idx+1} 位散客上门。还空 <b>${S.seats.filter(s=>!s).length}</b> 座。`);
      ui.acts([['婉拒',()=>decide(false)],['请坐 · 十文',()=>decide(true),true]]);
    }
    function decide(take){
      const p=S.cur,G=T();ui.acts([]);if(!p)return;p.tag='';
      if(take){seatGuest(p,free());S.coins+=LOW;S.lowTaken++;audio.coin();}
      else{const d=atDoor();p.tx=d.x;p.ty=d.y-G.s*.05;p.leaving=true;audio.low();}
      meter();S.idx++;setTimeout(nextLow,750);
    }
    function toNight(){
      S.night=true;audio.bell();ui.say(`入夜了，灯笼点起。今晚来了 <b>${S.dHigh}</b> 位贵客……`);ui.acts([]);let k=0;
      const nextVip=()=>{if(!root.isConnected)return;if(k>=S.dHigh){setTimeout(end1,700);return;}const G=T(),i=free();
        const d=atDoor(),w=waitSpot(),p={x:d.x,y:d.y,tx:w.x,ty:w.y,a:1,vip:true,v:k,tag:'贵客 · 五十文'};people.push(p);k++;
        setTimeout(()=>{p.tag='';if(i>=0){seatGuest(p,i);S.coins+=BASE.high;audio.coin();}
          else{p.tx=d.x;p.ty=d.y-G.s*.05;p.leaving=true;S.lostVip++;audio.low();ui.say('雅座满了，贵客叹了口气，走了。');}meter();setTimeout(nextVip,900);},900);};
      setTimeout(nextVip,900);
    }
    function end1(){
      const best=[0,1,2,3,4].map(y=>nightRevenue(y,S.dHigh,BASE)),bm=Math.max(...best);
      audio.arp();
      ui.result('一夜',`今夜进账 <b>${S.coins}</b> 文　·　来了 <b>${S.dHigh}</b> 位贵客${S.lostVip?`，走了 ${S.lostVip} 位`:''}`,
        `事后回看：留 ${best.map((v,y)=>v===bm?y:null).filter(v=>v!=null).join(' 或 ')} 座最好（${bm} 文）。可事前谁也不知道今晚会来几位贵客。`,true);
      ui.say('只看一夜，好规矩也会吃亏，乱收也会碰巧赚到。下一回，定一条规矩，推演一千夜。');
      ui.acts([['再开一夜',round1],['下一回 →',round2,true]]);
    }
    /* ---------- 第二回：留几座 ---------- */
    let chart,big,rule;
    function round2(){
      S.round=2;cancelAnimationFrame(raf);ui.hideResult();ui.stageName('第二回 · 留几座');ui.meter('');S.lab={tries:new Map(),curve:false,y:1,seed:labSeed(Math.random)};
      root.innerHTML='';const wrap=el('div','hm-lab'),panel=el('div','hm-panel');rule=el('div','hm-rule');
      rule.innerHTML=`<div>规矩：为贵客留 <b id="iY">${S.lab.y}</b> 座——散客收到只剩这几座，就不再收。</div><input type="range" id="iSlider" min="0" max="${SEATS}" value="${S.lab.y}" aria-label="为贵客留几座">`;
      const book=el('div','inn-book','<div>往年账本：一夜来几位贵客</div>'),bc=el('canvas');book.appendChild(bc);
      big=el('div','hm-big','每条规矩都推演同样的一千夜，看平均每夜进账多少。');panel.appendChild(rule);panel.appendChild(book);panel.appendChild(big);
      chart=el('div','hm-chart');chart.appendChild(el('canvas'));wrap.appendChild(panel);wrap.appendChild(chart);root.appendChild(wrap);
      requestAnimationFrame(()=>distBars(bc,BASE.dist,Math.min(220,book.clientWidth),64));
      const sl=rule.querySelector('input');sl.oninput=()=>{S.lab.y=+sl.value;rule.querySelector('#iY').textContent=S.lab.y;draw2();};
      ui.say('贵客一位抵五位散客。留几座最划算？拖动滑杆，推演一千夜，多试几种。');acts2();draw2();
    }
    function acts2(){const L=[['推演一千夜',()=>{const v=simNights(S.lab.y,BASE,1000,RNG(S.lab.seed));S.lab.tries.set(S.lab.y,v);audio.coin();
        big.innerHTML=`留 ${S.lab.y} 座：平均每夜 <b>${v.toFixed(1)}</b> 文`;draw2();acts2();},true]];
      if(S.lab.tries.size>=3&&!S.lab.curve)L.push(['看期望进账',()=>{S.lab.curve=true;audio.gliss();draw2();acts2();ui.say(sayCurve());}]);
      if(S.lab.tries.size>=1)L.push(['定下这条规矩',settle2]);ui.acts(L);}
    function sayCurve(){const b=bestProtect(BASE);return`虚框是每条规矩的期望进账。最高在<b>留 ${b} 座</b>（每夜 ${expRevenue(b,BASE).toFixed(1)} 文）。<br>为什么？第三座等来贵客的机会是 ${Math.round(tailProb(BASE.dist,3)*100)}%，${Math.round(tailProb(BASE.dist,3)*100)}% × 50 = ${(tailProb(BASE.dist,3)*50).toFixed(1)} 文，胜过散客的 10 文；第四座只有 ${Math.round(tailProb(BASE.dist,4)*100)}% × 50 = ${(tailProb(BASE.dist,4)*50).toFixed(1)} 文，不值。`;}
    function draw2(){
      const pts=[...S.lab.tries.entries()].map(([y,v])=>({x:y,y:v,l:v.toFixed(0)}));
      const bars=S.lab.curve?[0,1,2,3,4].map(y=>({x:y,y:expRevenue(y,BASE)})):null;const b=bestProtect(BASE);
      labChart(chart.querySelector('canvas'),chart.clientWidth,chart.clientHeight,{xmin:-.5,xmax:4.5,ymin:0,ymax:120,xticks:[0,1,2,3,4].map(v=>({v,l:'留'+v+'座'})),yticks:[0,20,40,60,80,100,120].map(v=>({v,l:v+'文'})),
        xlabel:'为贵客留的座数',ylabel:'平均每夜进账',points:pts,bars,cursor:S.lab.y,peak:S.lab.curve?{x:b,y:expRevenue(b,BASE),l:'最高'}:null});
    }
    function settle2(){const g=innGrade(S.lab.y,BASE),b=bestProtect(BASE);audio.arp();if(!S.lab.curve){S.lab.curve=true;draw2();}
      ui.result(g,`你的规矩：留 <b>${S.lab.y}</b> 座，每夜 <b>${expRevenue(S.lab.y,BASE).toFixed(1)}</b> 文　·　最好：留 <b>${b}</b> 座，<b>${expRevenue(b,BASE).toFixed(1)}</b> 文`,
        g==='至妙'?'宁可让座空着，也把它留给更值钱的客人。':S.lab.y<b?'留得太少：贵客来了没座。':'留得太多：空座等不来贵客。');
      ui.say(sayCurve()+'<br>下一回换几种夜晚，看你能不能先算出该留几座。');ui.acts([['再试试',()=>{ui.hideResult();acts2();}],['下一回 →',round3,true]]);}
    /* ---------- 第三回：三种夜晚 ---------- */
    function round3(){
      S.round=3;ui.hideResult();ui.stageName('第三回 · 三种夜晚');ui.meter('');S.picks=[null,null,null];
      root.innerHTML='';const grid=el('div','inn-scenes');root.appendChild(grid);
      SCENES.forEach((sc,i)=>{const card=el('div','inn-sc');card.innerHTML=`<div class="n">${sc.nm}</div><div class="h">${sc.hint}　散客 10 文</div>`;
        const bc=el('canvas');card.appendChild(bc);const row=el('div','inn-pick');
        for(let y=0;y<=SEATS;y++){const b=el('button','btn','留'+y);b.onclick=()=>{S.picks[i]=y;audio.tap(y+2);row.querySelectorAll('.btn').forEach((q,j)=>q.classList.toggle('on',j===y));acts3();};row.appendChild(b);}
        card.appendChild(row);card.appendChild(el('div','ans'));grid.appendChild(card);requestAnimationFrame(()=>distBars(bc,sc.dist,Math.min(200,card.clientWidth-24),58));});
      ui.say('三种夜晚，各留几座？先用上一回的算法想一想：这一座等来贵客的机会，乘上贵客价，比 10 文多还是少？');acts3();
    }
    function acts3(){const ok=S.picks.every(p=>p!=null);ui.acts([['揭晓',reveal3,true,!ok]]);}
    function reveal3(){
      const cards=root.querySelectorAll('.inn-sc');let right=0;
      SCENES.forEach((sc,i)=>{const b=bestProtect(sc),y=S.picks[i];if(y===b)right++;
        cards[i].querySelector('.ans').innerHTML=`${y===b?'<b class="ok">对了</b>':'<b>应留 '+b+' 座</b>'}　留 ${y} 座每夜 ${expRevenue(y,sc).toFixed(1)} 文，最好 ${expRevenue(b,sc).toFixed(1)} 文`;});
      const g=['下品','中品','上品','至妙'][right];audio.arp();
      ui.result(g,`三种夜晚答对 <b>${right}</b> 种`,'贵客价廉，留得少；贵客价昂，全留也值；贵客罕至，也得少留。差价越大、贵客越常来，就留得越多。',true);
      ui.say('这一处参透了。');ui.acts([['再想想',round3],['题跋 · 钤印',()=>ui.colophon(),true]]);
    }
    this._resize=()=>{if(S.round===1){drawRoom();fitCanvas(fg,W,H);}else if(S.round===2)draw2();};
    this._stop=()=>cancelAnimationFrame(raf);
    round1();
  },
  resize(){this._resize&&this._resize();},
  stop(){this._stop&&this._stop();this._resize=null;}
};
