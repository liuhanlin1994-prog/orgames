/* 城门 · 排队论：开几道门（活的一天）→ 逼近满载（推演百日）→ 怎么排队（各排各队 / 一条长队 / 快者先行） */
import {RNG} from '../core/rng.js';
import {INK,PAPER,BRUSH_FONT,paperBase,paperGrain,house,roof,figure,fitCanvas} from '../core/ink.js';
import {labChart} from '../core/chart.js';
import {el,reduceMotion} from '../core/ui.js';
import {wqMMc,genArrivals,simulate,waitStats,MU,R1,R2,R3,r1Grade,r2MaxLambda,r2Grade,labRun,r3Stats,r3Grade} from './queue-core.js';

const CLOCK=['卯初','卯正','辰初','辰正','巳初','巳正','午初'];
const ARR={separate:'各门各排',pooled:'一条长队',spt:'快者先行'};

/* ---------- 来客的样子（s ≈ 一个人的身高；y 为落脚处） ---------- */
const TINTS=[`rgba(${INK},.16)`,'rgba(170,128,72,.42)','rgba(30,91,115,.3)'];
function drawTraveler(c,type,x,y,s,v){
  c.save();const tint=TINTS[v%3],ink=a=>`rgba(${INK},${a})`;c.lineCap='round';c.lineJoin='round';
  if(type===0){figure(c,x,y,s,tint,v%3);
    if(v%2){c.fillStyle=`rgba(${PAPER},.97)`;c.strokeStyle=ink(.75);c.lineWidth=Math.max(.8,s*.04);c.beginPath();c.ellipse(x-s*.2,y-s*.58,s*.1,s*.14,.2,0,7);c.fill();c.stroke();}}
  else if(type===1){figure(c,x,y,s,tint,1);c.strokeStyle=ink(.88);c.lineWidth=Math.max(1,s*.05);
    c.beginPath();c.moveTo(x-s*.62,y-s*.64);c.quadraticCurveTo(x,y-s*.78,x+s*.62,y-s*.64);c.stroke();c.lineWidth=Math.max(.6,s*.025);
    [-1,1].forEach(d=>{const bx=x+d*s*.52;c.beginPath();c.moveTo(bx,y-s*.67);c.lineTo(bx-s*.1,y-s*.38);c.moveTo(bx,y-s*.67);c.lineTo(bx+s*.1,y-s*.38);c.stroke();
      c.beginPath();c.moveTo(bx-s*.14,y-s*.38);c.lineTo(bx+s*.14,y-s*.38);c.lineTo(bx+s*.1,y-s*.13);c.lineTo(bx-s*.1,y-s*.13);c.closePath();c.fillStyle=`rgba(${PAPER},.97)`;c.fill();c.fillStyle='rgba(150,112,60,.45)';c.fill();c.strokeStyle=ink(.75);c.stroke();
      c.beginPath();c.moveTo(bx-s*.12,y-s*.29);c.lineTo(bx+s*.12,y-s*.29);c.moveTo(bx-s*.11,y-s*.21);c.lineTo(bx+s*.11,y-s*.21);c.stroke();c.strokeStyle=ink(.88);});}
  else if(type===2){const cx=x+s*.2;c.strokeStyle=ink(.85);c.lineWidth=Math.max(1,s*.065);
    [[-.3,-.36],[-.17,-.12],[.22,.16],[.34,.4]].forEach(([u,w],i)=>{c.strokeStyle=ink(i%2?.85:.55);c.beginPath();c.moveTo(cx+s*u,y-s*.52);c.quadraticCurveTo(cx+s*(u+w)*.5+s*.02,y-s*.27,cx+s*w,y);c.stroke();});
    c.fillStyle=ink(.8);c.beginPath();c.ellipse(cx,y-s*.6,s*.42,s*.16,0,0,7);c.fill();
    c.beginPath();c.ellipse(cx-s*.15,y-s*.74,s*.13,s*.12,0,0,7);c.ellipse(cx+s*.17,y-s*.74,s*.13,s*.12,0,0,7);c.fill();
    c.fillStyle='rgba(179,38,30,.72)';c.fillRect(cx-s*.06,y-s*.83,s*.14,s*.2);c.fillStyle='rgba(170,128,72,.8)';c.fillRect(cx-s*.34,y-s*.62,s*.12,s*.16);c.fillRect(cx+s*.26,y-s*.62,s*.12,s*.16);
    c.strokeStyle=ink(.82);c.lineWidth=Math.max(1.2,s*.1);c.beginPath();c.moveTo(cx-s*.36,y-s*.62);c.quadraticCurveTo(cx-s*.62,y-s*.64,cx-s*.6,y-s*.96);c.stroke();
    c.fillStyle=ink(.85);c.beginPath();c.ellipse(cx-s*.66,y-s*.98,s*.11,s*.06,.25,0,7);c.fill();c.lineWidth=Math.max(.8,s*.04);c.beginPath();c.moveTo(cx+s*.41,y-s*.62);c.quadraticCurveTo(cx+s*.5,y-s*.5,cx+s*.47,y-s*.4);c.stroke();
    c.strokeStyle=ink(.45);c.lineWidth=Math.max(.5,s*.02);c.beginPath();c.moveTo(cx-s*.7,y-s*.95);c.quadraticCurveTo(cx-s*.85,y-s*.6,x-s*.8,y-s*.55);c.stroke();figure(c,x-s*.82,y,s*.95,tint,1);}
  else{c.strokeStyle=ink(.85);c.lineWidth=Math.max(1,s*.06);
    [[-.62,-.66],[-.52,-.5],[-.34,-.3],[-.24,-.2]].forEach(([u,w],i)=>{c.strokeStyle=ink(i%2?.85:.55);c.beginPath();c.moveTo(x+s*u,y-s*.36);c.lineTo(x+s*w,y);c.stroke();});
    c.fillStyle=ink(.78);c.beginPath();c.ellipse(x-s*.43,y-s*.44,s*.26,s*.13,0,0,7);c.fill();c.beginPath();c.ellipse(x-s*.74,y-s*.4,s*.1,s*.075,-.3,0,7);c.fill();
    c.strokeStyle=ink(.8);c.lineWidth=Math.max(.8,s*.035);c.beginPath();c.moveTo(x-s*.78,y-s*.46);c.quadraticCurveTo(x-s*.86,y-s*.56,x-s*.8,y-s*.6);c.moveTo(x-s*.72,y-s*.47);c.quadraticCurveTo(x-s*.68,y-s*.58,x-s*.62,y-s*.6);c.stroke();
    c.lineWidth=Math.max(1,s*.05);c.beginPath();c.moveTo(x-s*.28,y-s*.5);c.lineTo(x+s*.04,y-s*.44);c.stroke();
    c.beginPath();c.moveTo(x+s*.02,y-s*.36);c.lineTo(x+s*.78,y-s*.36);c.lineTo(x+s*.78,y-s*.64);c.lineTo(x+s*.02,y-s*.64);c.closePath();c.fillStyle=`rgba(${PAPER},.97)`;c.fill();c.fillStyle='rgba(150,112,60,.3)';c.fill();c.lineWidth=Math.max(.8,s*.04);c.stroke();
    c.beginPath();c.moveTo(x+s*.02,y-s*.64);c.quadraticCurveTo(x+s*.4,y-s*.98,x+s*.78,y-s*.64);c.closePath();c.fillStyle=`rgba(${PAPER},.97)`;c.fill();c.fillStyle=tint;c.fill();c.stroke();
    const wx=x+s*.4,wy=y-s*.24,wr=s*.24;c.fillStyle=`rgba(${PAPER},.9)`;c.beginPath();c.arc(wx,wy,wr,0,7);c.fill();c.lineWidth=Math.max(1,s*.05);c.stroke();c.lineWidth=Math.max(.6,s*.025);
    for(let k=0;k<6;k++){const an=k*Math.PI/3;c.beginPath();c.moveTo(wx,wy);c.lineTo(wx+Math.cos(an)*wr,wy+Math.sin(an)*wr);c.stroke();}}
  c.restore();
}
/* 垂柳：一根斜干，几枝先扬后垂，枝上挂满柳丝（清明时节，带一点新绿） */
function bigWillow(c,r,x,y,s,dir){
  const ink=a=>`rgba(${INK},${a})`,Q=(p0,p1,p2,t)=>[(1-t)*(1-t)*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0],(1-t)*(1-t)*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]];
  c.save();c.lineCap='round';
  const b0=[x,y],b1=[x+dir*s*.09,y-s*.42],b2=[x+dir*s*.04,y-s*.78];
  c.fillStyle=ink(.72);c.beginPath();c.moveTo(x-s*.028,y);c.quadraticCurveTo(b1[0]-s*.012,b1[1],b2[0]-s*.006,b2[1]);c.lineTo(b2[0]+s*.006,b2[1]);c.quadraticCurveTo(b1[0]+s*.02,b1[1],x+s*.028,y);c.closePath();c.fill();
  c.strokeStyle=ink(.25);c.lineWidth=1;for(let k=0;k<5;k++){const t=.15+k*.15,p=Q(b0,b1,b2,t);c.beginPath();c.moveTo(p[0]-s*.008,p[1]);c.quadraticCurveTo(p[0],p[1]-s*.02,p[0]+s*.008,p[1]-s*.01);c.stroke();}
  for(let i=0;i<7;i++){const t=.42+i*.085,st=Q(b0,b1,b2,Math.min(1,t)),side=i%3===1?-1:1,len=s*(.22+r()*.3);
    const e=[st[0]+dir*side*len,st[1]-s*(.06+r()*.12)],m=[(st[0]+e[0])/2,Math.min(st[1],e[1])-s*(.08+r()*.06)];
    c.strokeStyle=ink(.55);c.lineWidth=Math.max(1,s*(.012-i*.001));c.beginPath();c.moveTo(st[0],st[1]);c.quadraticCurveTo(m[0],m[1],e[0],e[1]);c.stroke();
    for(let k=1;k<=9;k++){const p=Q(st,m,e,k/9);for(let j=0;j<2;j++){const L=s*(.16+r()*.42)*(0.6+k/18),sw=(r()-.5)*s*.05+dir*side*s*.015,green=r()<.45;
      c.strokeStyle=green?`rgba(86,120,70,${.2+r()*.3})`:ink(.14+r()*.3);c.lineWidth=.5+r()*.8;c.beginPath();c.moveTo(p[0],p[1]);c.quadraticCurveTo(p[0]+sw,p[1]+L*.55,p[0]+sw*1.8,p[1]+L);c.stroke();}}}
  c.restore();
}

export const gateLevel={
  id:'gate',title:'城门',concept:'排队论',ambience:'city',poem:['八荒争凑','万国咸通'],poemSrc:'孟元老《东京梦华录》',
  colophon:{head:'排队论',seal:'疏通',
    lines:['来者如流，去者如缕；门若恰好够用，队伍便无尽头。','忙到九成，尚可周旋；再进一步，等候便如山崩。','诸门共用一条长队，胜过各排各队；快者先行，平均更短，却失了公平。'],
    note:'今之医院挂号、客服热线、机场安检、服务器扩容，皆算此账。'},
  start(ui,audio){
    const S={round:1,c:4,day:null,t:0,playing:false,speed:1,disc:'pooled',sprites:null,pos:new Map(),lab:{tries:new Map(),curve:false,lam:40},arrSeen:{},r3:null,raf:0};
    const root=el('div','gate');ui.stage.appendChild(root);
    let W=0,H=0,bg,fg,hud,spark,ctl,tabs=null,table=null;

    /* ---------- 城门与街面 ---------- */
    function gatesX(c){const all=[.14,.29,.43,.57,.71,.86];const pick=[2,3,1,4,0,5].slice(0,c).sort((a,b)=>a-b);return pick.map(i=>all[i]*W);}
    function geo(){const wt=H*.19,wb=H*.36;return{wt,wb,gy:wb+H*.045,front:wb+H*.14,dy:Math.max(20,H*.062),s:Math.max(16,Math.min(38,H*.062,W*.045))};}
    function drawScene(){
      W=root.clientWidth;H=root.clientHeight;const c=fitCanvas(bg,W,H),G=geo(),r=RNG(3),ink=a=>`rgba(${INK},${a})`;paperBase(c,0,0,W,H);
      /* 远山 */
      const n=[];for(let i=0;i<=24;i++)n.push(r());const ridge=x=>{const u=x/W*24,i=Math.floor(u),f=u-i,a=n[i],b=n[Math.min(24,i+1)];return a+(b-a)*(f*f*(3-2*f));};
      const hg=c.createLinearGradient(0,H*.02,0,G.wt);hg.addColorStop(0,ink(.13));hg.addColorStop(1,ink(0));c.fillStyle=hg;c.beginPath();c.moveTo(0,G.wt);
      for(let x=0;x<=W;x+=6)c.lineTo(x,H*.035+ridge(x)*H*.08+Math.sin(x*.02)*H*.008);c.lineTo(W,G.wt);c.fill();
      /* 城里的屋脊、树与塔 */
      for(let i=0;i<Math.ceil(W/38)+1;i++){const x=i*38+(i%2)*12,w=26+r()*16;house(c,x,G.wt-2-(i%3)*2,w,.38+r()*.12);}
      for(let i=0;i<Math.round(W/140);i++){const x=r()*W;c.fillStyle=ink(.12+r()*.1);for(let k=0;k<5;k++){c.beginPath();c.ellipse(x+(r()-.5)*16,G.wt-18-r()*14,6+r()*6,4+r()*4,0,0,7);c.fill();}}
      /* 城墙 */
      c.fillStyle=`rgba(${PAPER},.97)`;c.fillRect(0,G.wt,W,G.wb-G.wt);
      const g=c.createLinearGradient(0,G.wt,0,G.wb);g.addColorStop(0,ink(.26));g.addColorStop(.85,ink(.1));g.addColorStop(1,ink(.2));c.fillStyle=g;c.fillRect(0,G.wt,W,G.wb-G.wt);
      c.strokeStyle=ink(.8);c.lineWidth=1.5;c.beginPath();c.moveTo(0,G.wt);c.lineTo(W,G.wt);c.moveTo(0,G.wb);c.lineTo(W,G.wb);c.stroke();
      const mh=Math.max(4,H*.012);c.fillStyle=ink(.72);for(let x=2;x<W;x+=mh*2.6)c.fillRect(x,G.wt-mh,mh*1.6,mh);
      c.strokeStyle=ink(.09);c.lineWidth=.7;const bh=Math.max(6,H*.012);for(let y=G.wt+bh,row=0;y<G.wb;y+=bh,row++){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();
        c.beginPath();for(let x=(row%2)*bh*1.5;x<W;x+=bh*3){c.moveTo(x,y-bh);c.lineTo(x,y);}c.stroke();}
      /* 城楼 */
      const tw=Math.min(W*.3,300),th=Math.min(H*.15,110),cx=W/2;
      c.fillStyle=`rgba(${PAPER},.97)`;c.fillRect(cx-tw*.36,G.wt-th*.5,tw*.72,th*.5);c.strokeStyle=ink(.6);c.lineWidth=1;c.strokeRect(cx-tw*.36,G.wt-th*.5,tw*.72,th*.5);
      c.strokeStyle=ink(.45);for(let k=1;k<8;k++){const x=cx-tw*.36+tw*.72*k/8;c.beginPath();c.moveTo(x,G.wt-th*.44);c.lineTo(x,G.wt);c.stroke();}
      c.fillStyle=ink(.08);c.fillRect(cx-tw*.36,G.wt-th*.5,tw*.72,th*.12);
      roof(c,cx,G.wt-th*.48,tw,th*.24,.88);
      c.fillStyle=`rgba(${PAPER},.97)`;c.fillRect(cx-tw*.22,G.wt-th*.86,tw*.44,th*.2);c.strokeStyle=ink(.55);c.strokeRect(cx-tw*.22,G.wt-th*.86,tw*.44,th*.2);
      roof(c,cx,G.wt-th*.84,tw*.64,th*.2,.92);
      const pw=Math.max(12,th*.13),ph=pw*2.1;c.fillStyle=ink(.85);c.fillRect(cx-pw/2,G.wt-th*.47,pw,ph);c.fillStyle='rgba(200,160,70,.95)';c.font=`${Math.round(pw*.72)}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';
      c.fillText('汴',cx,G.wt-th*.47+ph*.3);c.fillText('京',cx,G.wt-th*.47+ph*.72);
      /* 六道门 */
      const open=new Set(gatesX(S.round===3?R3.c:S.round===2?5:S.c).map(Math.round)),gw=Math.min(W/10,G.s*2.1),gh=(G.wb-G.wt)*.8;
      [.14,.29,.43,.57,.71,.86].forEach(f=>{const x=f*W,isOpen=open.has(Math.round(x));
        c.fillStyle=`rgba(${PAPER},.97)`;c.beginPath();c.moveTo(x-gw/2-4,G.wb);c.lineTo(x-gw/2-4,G.wb-gh*.6);c.arc(x,G.wb-gh*.6,gw/2+4,Math.PI,0);c.lineTo(x+gw/2+4,G.wb);c.fill();
        c.strokeStyle=ink(.5);c.lineWidth=1;c.stroke();
        c.fillStyle=ink(isOpen?.2:.84);c.beginPath();c.moveTo(x-gw/2,G.wb);c.lineTo(x-gw/2,G.wb-gh*.6);c.arc(x,G.wb-gh*.6,gw/2,Math.PI,0);c.lineTo(x+gw/2,G.wb);c.fill();
        if(isOpen){const dg=c.createLinearGradient(0,G.wb-gh,0,G.wb);dg.addColorStop(0,ink(.25));dg.addColorStop(1,ink(.04));c.fillStyle=dg;c.fill();
          c.fillStyle=ink(.78);c.fillRect(x-gw/2-gw*.14,G.wb-gh*.62,gw*.14,gh*.62);c.fillRect(x+gw/2,G.wb-gh*.62,gw*.14,gh*.62);
          c.fillStyle=`rgba(${PAPER},.97)`;c.fillRect(x+gw*.55,G.wb+3,gw*.55,G.s*.26);c.strokeStyle=ink(.6);c.strokeRect(x+gw*.55,G.wb+3,gw*.55,G.s*.26);figure(c,x+gw*.9,G.wb+3,G.s*.92,TINTS[2],2);}
        else{c.fillStyle=`rgba(${PAPER},.35)`;for(let k=0;k<3;k++)for(let j=0;j<2;j++){c.beginPath();c.arc(x-gw*.2+j*gw*.4,G.wb-gh*(.2+k*.2),1.6,0,7);c.fill();}
          c.strokeStyle=`rgba(${PAPER},.3)`;c.beginPath();c.moveTo(x,G.wb-gh*.95);c.lineTo(x,G.wb);c.stroke();}});
      /* 街面：土路、车辙、草 */
      const rg=c.createLinearGradient(0,G.wb,0,H);rg.addColorStop(0,'rgba(180,150,100,.1)');rg.addColorStop(1,'rgba(180,150,100,.2)');c.fillStyle=rg;c.fillRect(0,G.wb,W,H-G.wb);
      c.fillStyle=ink(.05);c.fillRect(0,G.wb,W,H*.012);
      c.strokeStyle=ink(.07);for(let i=0;i<70;i++){const x=r()*W,y=G.wb+10+r()*(H-G.wb),L=10+r()*40;c.lineWidth=.6+r()*.6;c.beginPath();c.moveTo(x,y);c.lineTo(x+L,y+(r()-.5)*2);c.stroke();}
      for(let i=0;i<40;i++){const side=i%2,x=side?W-r()*W*.08:r()*W*.08,y=G.wb+H*.03+r()*(H-G.wb-H*.03);c.strokeStyle=ink(.25+r()*.25);c.lineWidth=.7;
        for(let k=0;k<4;k++){c.beginPath();c.moveTo(x+k*2,y);c.quadraticCurveTo(x+k*2+(r()-.5)*3,y-4,x+k*2+(r()-.5)*6,y-6-r()*5);c.stroke();}}
      const ws=Math.min(H*.55,W*.28);bigWillow(c,RNG(11),W*.012,H+4,ws,1);bigWillow(c,RNG(12),W*.99,H+4,ws*.9,-1);
      paperGrain(c,0,0,W,H,false);
      S.sprites=null;
    }
    function sprites(){const G=geo();if(S.sprites&&S.sprites.s===G.s)return S.sprites;const dpr=Math.min(2,window.devicePixelRatio||1),out={s:G.s,img:[]};
      for(let t=0;t<4;t++)for(let v=0;v<3;v++){const cv=document.createElement('canvas');cv.width=Math.ceil(G.s*2.2*dpr);cv.height=Math.ceil(G.s*1.6*dpr);const x=cv.getContext('2d');x.scale(dpr,dpr);drawTraveler(x,t,G.s*1.1,G.s*1.5,G.s,v);out.img.push(cv);}
      return S.sprites=out;}
    const typeOf=x=>S.round===3?(x.cls===0?(x.id%3===0?1:0):(x.id%2?2:3)):(x.id%7===0?2:x.id%5===0?3:x.id%3===0?1:0);
    const spriteOf=x=>typeOf(x)*3+(x.id*7)%3;

    /* ---------- 活的一天 ---------- */
    function newDay(c,disc,seed){const r=RNG(seed);const cl=S.round===3?R3.classes:R1.classes,lam=S.round===3?R3.lambda:R1.lambda,T=S.round===3?R3.T:R1.T;
      const cust=simulate(genArrivals(lam,T,cl,r),c,disc);cust.forEach((x,i)=>x.id=i);return{cust,c,disc,T,hist:[],gx:gatesX(c)};}
    function layoutQ(){const G=geo(),per=Math.max(4,Math.floor(W*.8/(G.s*1.5))),bottom=H-(table&&table.offsetHeight?table.offsetHeight+10:0)-G.s*.5,rows=Math.max(2,Math.floor((bottom-G.front)/G.dy)+1);
      return{G,per,rows,colsPerLane:Math.max(3,Math.floor((bottom-G.front)/(G.dy*.85))+1)};}
    function targets(t){
      const D=S.day,Q=layoutQ(),G=Q.G,tg=new Map(),waiting=[];
      for(const x of D.cust){if(x.t>t)break;if(x.start>t)waiting.push(x);else if(x.end>t)tg.set(x.id,{x:D.gx[x.gate],y:G.gy+G.s*.3,a:1});else if(t-x.end<.06)tg.set(x.id,{x:D.gx[x.gate],y:G.wb-G.s*.6,a:1-(t-x.end)/.06});}
      if(D.disc==='separate'){const lanes=D.gx.map(()=>[]);waiting.forEach(x=>lanes[x.gate].push(x));const m=Q.colsPerLane;
        lanes.forEach((L,g)=>L.forEach((x,k)=>{const col=Math.floor(k/m),row=k%m;tg.set(x.id,{x:D.gx[g]+(col?(col%2?1:-1)*G.s*1.1*Math.ceil(col/2):0),y:G.front+row*G.dy*.85,a:1});}));}
      else{if(D.disc==='spt')waiting.sort((a,b)=>(a.cls-b.cls)||(a.t-b.t));
        waiting.forEach((x,k)=>{const row=Math.floor(k/Q.per),col=k%Q.per;const off=(col-(Q.per-1)/2)*G.s*1.5*(row%2?-1:1);tg.set(x.id,{x:W/2+off,y:G.front+row*G.dy,a:row>=Q.rows?0:1});});}
      return{tg,waiting,Q};
    }
    /* 一米线：蛇形长队的绳栏，只拉到有人排的那几行 */
    function ropes(c,Q,n){const G=Q.G,used=Math.min(Q.rows,Math.ceil(n/Q.per)),half=(Q.per-1)/2*G.s*1.5+G.s*.9;if(used<1)return;
      c.save();c.lineCap='round';
      for(let r=0;r<used;r++){const y=G.front+(r+.5)*G.dy-G.s*.05,turnRight=r%2===0,x0=W/2-half,x1=W/2+half,gap=G.s*1.6;
        const a=turnRight?x0:x0+gap,b=turnRight?x1-gap:x1;if(r<used-1||r===0){c.strokeStyle='rgba(179,38,30,.35)';c.lineWidth=1.2;c.beginPath();c.moveTo(a,y);c.quadraticCurveTo((a+b)/2,y+4,b,y);c.stroke();
          c.fillStyle=`rgba(${INK},.7)`;[a,b].forEach(x=>{c.fillRect(x-1.2,y-G.s*.3,2.4,G.s*.34);});}}
      c.restore();}
    function drawDay(t,dt){
      const D=S.day,c=fg.getContext('2d'),sp=sprites();c.setTransform(1,0,0,1,0,0);const dpr=fg.width/W;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
      const {tg,waiting,Q}=targets(t),G=Q.G,k=Math.min(1,dt*7);
      if(D.disc!=='separate')ropes(c,Q,waiting.length);
      const list=[...tg.entries()].map(([id,p])=>{let cur=S.pos.get(id);if(!cur){cur={x:p.x+(Math.random()-.5)*20,y:H+G.s};S.pos.set(id,cur);}cur.x+=(p.x-cur.x)*k;cur.y+=(p.y-cur.y)*k;return{id,cur,a:p.a};});
      for(const id of [...S.pos.keys()])if(!tg.has(id))S.pos.delete(id);
      list.sort((a,b)=>a.cur.y-b.cur.y).forEach(({id,cur,a})=>{if(a<=0)return;const x=D.cust[id];c.globalAlpha=Math.min(1,a);c.drawImage(sp.img[spriteOf(x)],cur.x-G.s*1.1,cur.y-G.s*1.5,G.s*2.2,G.s*1.6);});
      c.globalAlpha=1;
      if(D.disc!=='separate'&&waiting.length>0){const shown=Math.min(waiting.length,Q.rows*Q.per);if(waiting.length>shown){const y=G.front+(Q.rows-.35)*G.dy;
        c.font=`${Math.round(Math.max(14,G.s*.6))}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';const txt=`后面还有 ${waiting.length-shown} 位`,tw=c.measureText(txt).width+18;
        c.fillStyle='rgba(247,241,227,.9)';c.fillRect(W/2-tw/2,y-G.s*.4,tw,G.s*.8);c.fillStyle='rgba(179,38,30,.92)';c.fillText(txt,W/2,y);}}
      return waiting.length;
    }
    function hudUpdate(t,wq){
      const D=S.day,started=D.cust.filter(x=>x.start<=t&&x.t<=t),ws=started.map(x=>(x.start-x.t)*60);
      const oldest=D.cust.find(x=>x.t<=t&&x.start>t),maxNow=Math.max(ws.length?Math.max(...ws):0,oldest?(t-oldest.t)*60:0),avg=ws.length?ws.reduce((a,b)=>a+b,0)/ws.length:0;
      const ci=Math.min(CLOCK.length-1,Math.floor(t));
      hud.innerHTML=`<div class="gh-clock">${CLOCK[ci]}</div><div>候者 <b>${wq}</b> 人</div><div>平均候 <b>${avg.toFixed(1)}</b> 分</div><div>最久 <b>${maxNow.toFixed(0)}</b> 分</div>`;
      hud.appendChild(spark);
      D.hist.push([t,wq]);const sc=fitCanvas(spark,120,36);sc.clearRect(0,0,120,36);const mx=Math.max(10,...D.hist.map(h=>h[1]));
      sc.strokeStyle='rgba(179,38,30,.85)';sc.lineWidth=1.4;sc.beginPath();D.hist.forEach(([tt,q],i)=>{const x=tt/D.T*118+1,y=34-q/mx*32;i?sc.lineTo(x,y):sc.moveTo(x,y);});sc.stroke();
      return{avg,maxNow};
    }
    function play(onEnd){
      cancelAnimationFrame(S.raf);S.playing=true;S.t=0;S.pos.clear();const D=S.day;let last=performance.now(),acc=0;
      const secPerHour=()=>reduceMotion()?.3:(S.round===3?3:7)/S.speed;
      const f=now=>{if(!root.isConnected||!S.playing)return;const dt=Math.min(.05,(now-last)/1000);last=now;S.t+=dt/secPerHour();const t=Math.min(S.t,D.T);
        const wq=drawDay(t,dt);acc+=dt;if(acc>.12||t>=D.T){acc=0;hudUpdate(t,wq);}
        if(t>=D.T){S.playing=false;onEnd&&onEnd();return;}S.raf=requestAnimationFrame(f);};
      S.raf=requestAnimationFrame(f);
    }
    function buildLive(){
      root.innerHTML='';bg=el('canvas','gate-bg');fg=el('canvas','gate-fg');hud=el('div','gate-hud');spark=el('canvas','gate-spark');ctl=el('div','gate-ctl');
      [bg,fg,hud,ctl].forEach(e=>root.appendChild(e));drawScene();fitCanvas(fg,W,H);
    }
    function stepper(){
      ctl.innerHTML='';if(S.round!==1)return;
      const minus=el('button','btn','−'),plus=el('button','btn','＋'),v=el('b','',String(S.c));
      minus.setAttribute('aria-label','少开一道门');plus.setAttribute('aria-label','多开一道门');
      minus.onclick=()=>{if(S.playing||S.c<=1)return;S.c--;audio.tap(S.c);refresh1();};plus.onclick=()=>{if(S.playing||S.c>=6)return;S.c++;audio.tap(S.c+2);refresh1();};
      ctl.appendChild(el('span','','开门'));ctl.appendChild(minus);ctl.appendChild(v);ctl.appendChild(plus);
    }
    function refresh1(){drawScene();stepper();S.day=newDay(S.c,'pooled',R1.seed);S.t=0;S.pos.clear();fitCanvas(fg,W,H);drawDay(0,0);hudUpdate(0,0);ui.meter(`<small>开门</small><b>${S.c}</b><small>道 · 每小时验 ${S.c*MU} 位</small>`);}

    /* ---------- 第一回 ---------- */
    function round1(){
      S.round=1;S.c=4;S.speed=1;ui.hideResult();ui.stageName('第一回 · 开几道门');buildLive();refresh1();
      ui.say(`清明时节，驼队、担夫、车马涌向汴京城门，每小时约来 <b>${R1.lambda}</b> 位；每道门查验一位约 5 分钟。<br>要让大家平均等候<b>不过一刻（15 分钟）</b>，门又开得越少越好。开几道？（每次开城，来的都是同一个上午的客人。）`);
      ui.acts([['开城',run1,true]]);
    }
    function run1(){
      if(S.playing)return;S.day=newDay(S.c,'pooled',R1.seed);S.speed=1;ui.hideResult();
      ui.acts([['快进 ×3',()=>{S.speed=S.speed===1?3:1;},false],['收门重来',()=>{S.playing=false;refresh1();ui.acts([['开城',run1,true]]);}]]);
      play(()=>{const s=waitStats(S.day.cust,0,S.day.T),g=r1Grade(S.c),cap=S.c*MU;audio.arp();
        const line=S.c<=4?`${S.c} 道门每小时验 ${cap} 位，来的却有 ${R1.lambda} 位——差得不多，队伍却越排越长，永远排不完。`
          :S.c===5?`每小时能验 ${cap} 位，比来客多出一成出头，队伍就稳住了。`:`稳妥，可多开了门：门吏的工钱，也是一笔账。`;
        ui.result(g,`${S.c} 道门　·　平均候 <b>${s.avg.toFixed(1)}</b> 分　·　最久 <b>${s.max.toFixed(0)}</b> 分`,line,true);
        ui.say(S.c<=4?'换几道门再开一天看看。':'门数定得好。下一回看看：来客越来越多时，等候会怎么变。');
        ui.acts([['再开一天',()=>{ui.hideResult();ui.acts([['开城',run1,true]]);}],['下一回 →',round2,S.c>=5]]);});
    }
    /* ---------- 第二回：推演百日 ---------- */
    let chart,slider,big;
    function round2(){
      S.round=2;S.playing=false;cancelAnimationFrame(S.raf);ui.hideResult();ui.stageName('第二回 · 逼近满载');ui.meter('');S.lab={tries:new Map(),curve:false,lam:40};
      root.innerHTML='';const wrap=el('div','hm-lab'),panel=el('div','hm-panel'),rule=el('div','hm-rule');
      rule.innerHTML=`<div>五道门，每小时最多验 60 位。每小时来客 <b id="gLam">${S.lab.lam}</b> 位，城门忙碌 <b id="gRho">${Math.round(S.lab.lam/60*100)}%</b> 的时间。</div><input type="range" id="gSlider" min="${R2.lamMin}" max="${R2.lamMax}" value="${S.lab.lam}" aria-label="每小时来客">`;
      big=el('div','hm-big','推演百日（城门日夜不闭），看平均等候。');chart=el('div','hm-chart gate-chart');chart.appendChild(el('canvas'));
      panel.appendChild(rule);panel.appendChild(big);wrap.appendChild(panel);wrap.appendChild(chart);root.appendChild(wrap);
      slider=rule.querySelector('input');slider.oninput=()=>{S.lab.lam=+slider.value;rule.querySelector('#gLam').textContent=S.lab.lam;rule.querySelector('#gRho').textContent=Math.round(S.lab.lam/60*100)+'%';draw2();};
      ui.say('来客越多，城门越忙。忙到几成，队伍会失控？拖动滑杆，点<b>推演百日</b>，多试几个。');acts2();draw2();
    }
    function acts2(){const L=[['推演百日',()=>{const w=labRun(S.lab.lam,Math.random);S.lab.tries.set(S.lab.lam,w);audio.tap(4);
        big.innerHTML=`每小时来 ${S.lab.lam} 位：平均候 <b>${w.toFixed(1)}</b> 分`;draw2();acts2();
        if(S.lab.tries.size===3&&!S.lab.curve)ui.say('再往满载那头试试。也可以看看理论曲线。');},true]];
      if(S.lab.tries.size>=3&&!S.lab.curve)L.push(['看理论曲线',()=>{S.lab.curve=true;audio.gliss();draw2();acts2();
        ui.say('墨线是排队论算出的等候（Erlang C 公式）。忙到九成还算平缓，过了九成半就直往上窜。<br>要平均候不过一刻，五道门最多接得住每小时多少位？把滑杆停在答案上。');}]);
      if(S.lab.tries.size>=1)L.push(['就定这个数',settle2]);ui.acts(L);}
    function draw2(){
      const cv=chart.querySelector('canvas'),pts=[...S.lab.tries.entries()].map(([l,w])=>({x:l/60,y:w,l:w.toFixed(0)+'分'}));
      const curve=S.lab.curve?Array.from({length:120},(_,i)=>{const l=R2.lamMin+(R2.lamMax+1.5-R2.lamMin)*i/119;return[l/60,wqMMc(l,MU,5)*60];}):null;
      labChart(cv,chart.clientWidth,chart.clientHeight,{xmin:.5,xmax:1,ymin:0,ymax:40,xticks:[.5,.6,.7,.8,.9,1].map(v=>({v,l:Math.round(v*100)+'%'})),yticks:[0,10,20,30,40].map(v=>({v,l:v+'分'})),
        xlabel:'城门忙碌的时间（利用率）',ylabel:'平均等候',threshold:{y:15,l:'一刻'},points:pts,curve,cursor:S.lab.lam/60});
    }
    function settle2(){const m=r2MaxLambda(),g=r2Grade(S.lab.lam);audio.arp();if(!S.lab.curve){S.lab.curve=true;draw2();}
      ui.result(g,`你的答案：每小时 <b>${S.lab.lam}</b> 位　·　最多接得住 <b>${m}</b> 位（忙碌 ${Math.round(m/60*100)}%）`,
        g==='至妙'?`再多来一位（${m+1}），平均候就从 ${(wqMMc(m,MU,5)*60).toFixed(0)} 分涨到 ${(wqMMc(m+1,MU,5)*60).toFixed(0)} 分。越逼近满载，等候越是陡涨。`:S.lab.lam>m?'这个数接不住：平均候超过了一刻。':'还接得住更多，只是余量留得宽了些。');
      ui.say('五道门忙到九成三还能稳住，是因为五道门共用一条长队。下一回就看看这条长队。');ui.acts([['再试试',()=>{ui.hideResult();acts2();}],['下一回 →',round3,true]]);}
    /* ---------- 第三回：怎么排队 ---------- */
    function round3(){
      S.round=3;ui.hideResult();ui.stageName('第三回 · 怎么排队');ui.meter('');S.arrSeen={};
      buildLive();tabs=el('div','gate-tabs');table=el('div','gate-table');root.appendChild(tabs);root.appendChild(table);
      Object.entries(ARR).forEach(([k,nm])=>{const b=el('button','btn'+(k===S.disc?' on':''),nm);b.onclick=()=>{S.disc=k;show3();};tabs.appendChild(b);});
      if(!S.r3){const r=RNG(2026),acc={separate:{},pooled:{},spt:{}};for(let d=0;d<120;d++){const arr=genArrivals(R3.lambda,R3.T,R3.classes,r);for(const k in acc){const s=r3Stats(arr,k);for(const f in s)acc[k][f]=(acc[k][f]||0)+s[f]/120;}}S.r3=acc;}
      ui.say(`只开四道门，每小时来 ${R3.lambda} 位：七成是担夫行人（查验约 3 分钟），三成是驼队车马（约 10 分钟）。<br>点上面三种排法，看看这一上午的城门口。`);
      S.disc='separate';show3();
    }
    function show3(){
      tabs.querySelectorAll('.btn').forEach((b,i)=>b.classList.toggle('on',Object.keys(ARR)[i]===S.disc));
      S.day=newDay(R3.c,S.disc,31337);S.arrSeen[S.disc]=1;S.speed=1;ui.hideResult();drawTable();
      play(()=>{ui.say(`「${ARR[S.disc]}」看完了。三种都看看，再定下一种。`);});
      ui.acts([['定下「'+ARR[S.disc]+'」',settle3,true]]);
    }
    function drawTable(){
      const rows=Object.keys(ARR).filter(k=>S.arrSeen[k]);
      table.innerHTML=`<table><thead><tr><th>推演百日</th><th>平均候</th><th>最久候</th><th>被后来者抢先</th><th>担夫行人</th><th>驼队车马</th></tr></thead><tbody>${rows.map(k=>{const a=S.r3[k];
        return`<tr class="${k===S.disc?'cur':''}"><th>${ARR[k]}</th><td>${a.avg.toFixed(1)} 分</td><td>${a.max.toFixed(0)} 分</td><td>${Math.round(a.over*100)}%</td><td>${a.fast.toFixed(1)} 分</td><td>${a.slow.toFixed(1)} 分</td></tr>`;}).join('')}</tbody></table>`;
    }
    function settle3(){S.playing=false;const g=r3Grade(S.disc),a=S.r3;audio.arp();drawTable();
      const line={separate:`各排各队：有的门闲着，有的队却很长。三成多的人被后来者抢先，最久要等 ${a.separate.max.toFixed(0)} 分钟。`,
        pooled:`一条长队、哪门空了去哪门：平均更短，最久候减半，没有人被插队。银行和机场的一米线，就是这个道理。`,
        spt:`快者先行：平均最短，担夫几乎不用等；可驼队要多等 ${(a.spt.slow-a.pooled.slow).toFixed(0)} 分钟，还有人被插队。效率和公平，要你来权衡。`}[S.disc];
      ui.result(g,`定下「${ARR[S.disc]}」　·　平均候 <b>${a[S.disc].avg.toFixed(1)}</b> 分`,line,true);
      ui.say(S.disc==='separate'?'换一种排法试试？':'这一处参透了。');
      ui.acts(S.disc==='separate'?[['再看看',()=>{ui.hideResult();show3();}]]:[['再看看',()=>{ui.hideResult();show3();}],['题跋 · 钤印',()=>ui.colophon(),true]]);}

    this._resize=()=>{if(S.round===2){draw2();return;}drawScene();fitCanvas(fg,W,H);if(S.day)drawDay(Math.min(S.t,S.day.T),1);};
    this._stop=()=>{S.playing=false;cancelAnimationFrame(S.raf);};
    round1();
  },
  resize(){this._resize&&this._resize();},
  stop(){this._stop&&this._stop();this._resize=null;}
};
