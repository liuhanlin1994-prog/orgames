/* 城门 · 排队论（实时守门）：开门迎客（随时开关城门）→ 驼队进城（一米线）→ 上元灯会（工时有限）
   手感：点城门即开即关；右上角可暂停、一倍、两倍、四倍速；左上角是来客预报与账目。 */
import {RNG} from '../core/rng.js';
import {INK,PAPER,BRUSH_FONT,paperBase,paperGrain,house,roof,figure,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {GATES,ROUNDS,ANGRY,PENALTY,MU,dayLen,lambdaAt,genDay,createGateSim,bench,gradeRatio} from './queue-core.js';

const SAY={1:'你是今天的门官。<b>点城门</b>即开即关；右上角可暂停、调快。门吏每道门每小时工钱 40 文；来客每等一刻折钱约 4 文，等过二十分钟的还会去告状（一状 20 文）。<br>左上角是<b>来客预报</b>，蓝虚线是开着的门每小时能验多少人——柱子高过虚线，队伍就越排越长。赶在人潮前开门，人少了就关。',
  2:'今天有几支驼队（预报上的「驼」）。各门各排：来客挑人少的门排，驼队结伴排一起，一堵一大片。右上角可以<b>拉一米线</b>：所有人排成一条长队，哪道门空了去哪道。',
  3:'上元灯会，申时开城、亥时收灯。门吏只剩 18 个<b>加班工时</b>（第一道门不算），用完了只剩一道门。戌时人潮最大——工时要留给灯会。'};
const GX=[.14,.29,.43,.57,.71,.86],OPEN_ORDER=[2,3,1,4,0,5],SPEEDS=[1,2,4],SEC_PER_HOUR=12;

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
    lines:['来者如流，门若恰好够用，队伍便无尽头；忙到九成以上，等候陡涨。','看预报，赶在人潮之前开门；人潮一过，便该收门省钱。','诸门共用一条长队，胜过各排各队：没人被插队，最久的等候也短。','人手有限时，留给最挤的时辰。'],
    note:'今之医院挂号、客服排班、机场安检、服务器扩容，皆算此账。'},
  start(ui,audio){
    const S={round:0,sc:null,arr:null,sim:null,bench:null,speed:2,paused:true,running:false,done:false,pos:new Map(),series:[],lastRec:-1,raf:0,sprites:null,angry:new Set(),hudAcc:0,maxQ:0};
    const root=el('div','gate');ui.stage.appendChild(root);
    const bg=el('canvas','gate-bg'),fg=el('canvas','gate-fg'),gbtns=el('div','gate-btns'),hud=el('div','gate-hud'),ctl=el('div','gate-ctl');
    [bg,fg,gbtns,hud,ctl].forEach(e=>root.appendChild(e));
    let W=0,H=0,review=null;
    function geo(){const wt=H*.19,wb=H*.36,s=Math.max(16,Math.min(38,H*.062,W*.07));return{wt,wb,gy:wb+H*.045,front:wb+H*.14,dy:Math.max(20,Math.min(H*.062,s*1.9)),s};}
    const gateW=()=>Math.min(W/10,geo().s*2.1);
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
      /* 六道门：底图只画门洞，门扇与门吏画在前景（随开随关） */
      const gw=gateW(),gh=(G.wb-G.wt)*.8;
      GX.forEach(f=>{const x=f*W;
        c.fillStyle=`rgba(${PAPER},.97)`;c.beginPath();c.moveTo(x-gw/2-4,G.wb);c.lineTo(x-gw/2-4,G.wb-gh*.6);c.arc(x,G.wb-gh*.6,gw/2+4,Math.PI,0);c.lineTo(x+gw/2+4,G.wb);c.fill();
        c.strokeStyle=ink(.5);c.lineWidth=1;c.stroke();
        c.fillStyle=ink(.2);c.beginPath();c.moveTo(x-gw/2,G.wb);c.lineTo(x-gw/2,G.wb-gh*.6);c.arc(x,G.wb-gh*.6,gw/2,Math.PI,0);c.lineTo(x+gw/2,G.wb);c.fill();
        const dg=c.createLinearGradient(0,G.wb-gh,0,G.wb);dg.addColorStop(0,ink(.25));dg.addColorStop(1,ink(.04));c.fillStyle=dg;c.fill();
        c.fillStyle=ink(.78);c.fillRect(x-gw/2-gw*.14,G.wb-gh*.62,gw*.14,gh*.62);c.fillRect(x+gw/2,G.wb-gh*.62,gw*.14,gh*.62);});
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
    const spriteOf=x=>(x.cls===0?(x.id%3===0?1:0):(x.id%2?2:3))*3+(x.id*7)%3;

    /* ---------- 城门按钮（叠在门洞上） ---------- */
    function layoutButtons(){
      gbtns.innerHTML='';const G=geo(),gw=gateW(),gh=(G.wb-G.wt)*.8;
      GX.forEach((f,i)=>{const b=el('button','gate-btn');b.style.left=(f*W-gw/2-8)+'px';b.style.top=(G.wb-gh-4)+'px';b.style.width=(gw+16)+'px';b.style.height=(gh+G.s*.6)+'px';
        b.setAttribute('aria-label','第'+(i+1)+'道门');b.onclick=()=>toggle(i);b.appendChild(el('span','tag',''));gbtns.appendChild(b);});
      updateButtons();
    }
    function updateButtons(){if(!S.sim)return;[...gbtns.children].forEach((b,i)=>{const g=S.sim.G[i];b.classList.toggle('open',g.open);b.querySelector('.tag').textContent=g.open?'关':'开';b.setAttribute('aria-pressed',g.open);});}
    function toggle(i){
      if(!S.sim||S.done)return;const g=S.sim.G[i],was=g.open,ok=S.sim.setOpen(i,!was);
      if(ok){audio.tap(was?2:6);if(!S.running&&!S.done){/* 开城前也可以先排好门 */}}
      else if(S.sim.forced){const b=gbtns.children[i];ui.flash('工时用尽',b.offsetLeft+b.offsetWidth/2,b.offsetTop);audio.low();}
      updateButtons();
    }

    /* ---------- 速度与一米线 ---------- */
    function buildCtl(){
      ctl.innerHTML='';const pause=el('button','btn','暂停');pause.onclick=()=>{if(!S.running)return;S.paused=!S.paused;pause.textContent=S.paused?'继续':'暂停';pause.setAttribute('aria-pressed',S.paused);};ctl.appendChild(pause);S.pauseBtn=pause;
      SPEEDS.forEach(v=>{const b=el('button','btn spd',v+'×');b.setAttribute('aria-pressed',v===S.speed);b.onclick=()=>{S.speed=v;ctl.querySelectorAll('.spd').forEach(x=>x.setAttribute('aria-pressed',x===b));if(S.paused&&S.running){S.paused=false;pause.textContent='暂停';pause.setAttribute('aria-pressed',false);}audio.tap(3+v);};ctl.appendChild(b);});
      if(S.sc.canPool){const b=el('button','btn rope','拉一米线');b.setAttribute('aria-pressed',S.sim.pooled);b.onclick=()=>{if(S.done)return;S.sim.setPooled(!S.sim.pooled);b.setAttribute('aria-pressed',S.sim.pooled);b.textContent=S.sim.pooled?'撤一米线':'拉一米线';audio.paper();S.usedRope=S.usedRope||S.sim.pooled;};ctl.appendChild(b);}
    }

    /* ---------- 画面 ---------- */
    function layoutQ(){const G=geo(),per=Math.max(4,Math.floor(W*.8/(G.s*1.5))),bottom=H-G.s*.6-(review?review.offsetHeight+8:0),rows=Math.max(2,Math.floor((bottom-G.front)/G.dy)+1);
      return{G,per,rows,colsPerLane:Math.max(3,Math.floor((bottom-G.front)/(G.dy*.85))+1)};}
    function targets(){
      const sim=S.sim,Q=layoutQ(),G=Q.G,tg=new Map(),t=sim.t;
      sim.G.forEach(g=>{if(g.cur)tg.set(g.cur.id,{x:GX[g.i]*W,y:G.gy+G.s*.3,a:1});});
      for(let k=sim.served.length-1;k>=0;k--){const x=sim.served[k];if(t-x.end>.05)break;tg.set(x.id,{x:GX[x.gate]*W,y:G.wb-G.s*.5,a:Math.max(0,1-(t-x.end)/.05)});}
      const snake=list=>list.forEach((x,k)=>{const row=Math.floor(k/Q.per),col=k%Q.per;const off=(col-(Q.per-1)/2)*G.s*1.5*(row%2?-1:1);tg.set(x.id,{x:W/2+off,y:G.front+row*G.dy,a:row>=Q.rows?0:1,w:1});});
      if(sim.pooled)snake(sim.pool);
      else{sim.G.forEach(g=>g.line.forEach((x,k)=>{const m=Q.colsPerLane,col=Math.floor(k/m),row=k%m;tg.set(x.id,{x:GX[g.i]*W+(col?(col%2?1:-1)*G.s*1.1*Math.ceil(col/2):0),y:G.front+row*G.dy*.85,a:1,w:1});}));snake(sim.pool);}
      return{tg,Q};
    }
    function ropes(c,Q,n){const G=Q.G,used=Math.min(Q.rows,Math.ceil(n/Q.per)),half=(Q.per-1)/2*G.s*1.5+G.s*.9;if(used<1)return;c.save();c.lineCap='round';
      for(let r=0;r<used;r++){const y=G.front+(r+.5)*G.dy-G.s*.05,turnRight=r%2===0,x0=W/2-half,x1=W/2+half,gap=G.s*1.6,a=turnRight?x0:x0+gap,b=turnRight?x1-gap:x1;
        if(r<used-1||r===0){c.strokeStyle='rgba(179,38,30,.4)';c.lineWidth=1.3;c.beginPath();c.moveTo(a,y);c.quadraticCurveTo((a+b)/2,y+4,b,y);c.stroke();c.fillStyle=`rgba(${INK},.7)`;[a,b].forEach(x=>c.fillRect(x-1.2,y-G.s*.3,2.4,G.s*.34));}}
      c.restore();}
    function drawDoors(c){
      const G=geo(),gw=gateW(),gh=(G.wb-G.wt)*.8,t=S.sim.t;
      S.sim.G.forEach(g=>{const x=GX[g.i]*W,top=G.wb-gh;let open=g.open?(g.ready>t?1-(g.ready-t)/(1/60):1):0;if(!g.open&&g.cur)open=.6;
        const pw=gw/2*(1-open*.85);
        if(pw>1){c.fillStyle=`rgba(${INK},.86)`;c.save();c.beginPath();c.moveTo(x-gw/2,G.wb);c.lineTo(x-gw/2,G.wb-gh*.6);c.arc(x,G.wb-gh*.6,gw/2,Math.PI,0);c.lineTo(x+gw/2,G.wb);c.closePath();c.clip();
          c.fillRect(x-gw/2,top,pw,gh);c.fillRect(x+gw/2-pw,top,pw,gh);c.fillStyle=`rgba(${PAPER},.4)`;
          for(let k=0;k<3;k++)for(const sx of [x-gw/2+pw*.5,x+gw/2-pw*.5]){c.beginPath();c.arc(sx,G.wb-gh*(.22+k*.18),1.6,0,7);c.fill();}c.restore();}
        if(g.open&&g.ready<=t){c.fillStyle=`rgba(${PAPER},.97)`;c.fillRect(x+gw*.55,G.wb+3,gw*.55,G.s*.26);c.strokeStyle=`rgba(${INK},.6)`;c.lineWidth=1;c.strokeRect(x+gw*.55,G.wb+3,gw*.55,G.s*.26);figure(c,x+gw*.9,G.wb+3,G.s*.92,TINTS[2],2);}
      });
    }
    function drawFrame(dt){
      const sim=S.sim,c=fg.getContext('2d'),sp=sprites(),dpr=fg.width/W;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
      if(S.sc.night){const k=Math.min(1,sim.t/3.2),G=geo();c.fillStyle=`rgba(16,18,40,${.38*k})`;c.fillRect(0,0,W,H);
        for(let i=0;i<9;i++){const x=W*(.06+i*.11),y=G.wt-geo().s*.2;c.save();c.globalCompositeOperation='lighter';const gl=c.createRadialGradient(x,y,1,x,y,G.s*1.4);gl.addColorStop(0,`rgba(255,170,80,${.5*k})`);gl.addColorStop(1,'rgba(255,170,80,0)');c.fillStyle=gl;c.fillRect(x-G.s*1.4,y-G.s*1.4,G.s*2.8,G.s*2.8);c.restore();
          c.fillStyle=`rgba(205,56,38,${.25+.7*k})`;c.beginPath();c.ellipse(x,y,G.s*.22,G.s*.28,0,0,7);c.fill();}}
      drawDoors(c);
      const {tg,Q}=targets(),G=Q.G,k=Math.min(1,dt*7*Math.max(1,S.speed*.7));
      if(sim.pooled)ropes(c,Q,sim.pool.length);
      const list=[];for(const [id,p] of tg){let cur=S.pos.get(id);if(!cur){cur={x:p.x+(Math.random()-.5)*20,y:H+G.s};S.pos.set(id,cur);}cur.x+=(p.x-cur.x)*k;cur.y+=(p.y-cur.y)*k;list.push({id,cur,p});}
      for(const id of [...S.pos.keys()])if(!tg.has(id))S.pos.delete(id);
      list.sort((a,b)=>a.cur.y-b.cur.y);const t=sim.t;
      for(const {id,cur,p} of list){if(p.a<=0)continue;const x=S.arr[id];c.globalAlpha=p.a;c.drawImage(sp.img[spriteOf(x)],cur.x-G.s*1.1,cur.y-G.s*1.5,G.s*2.2,G.s*1.6);c.globalAlpha=1;
        if(p.w&&t-x.t>ANGRY){c.font=`${Math.round(G.s*.5)}px ${BRUSH_FONT}`;c.fillStyle='rgba(179,38,30,.95)';c.textAlign='center';c.fillText('怒',cur.x,cur.y-G.s*1.12);
          if(!S.angry.has(id)){S.angry.add(id);if(S.running)audio.low();}}}
      const n=sim.waiting(),shown=[...tg.values()].filter(p=>p.w&&p.a>0).length;
      if(n>shown){const y=G.front+(Q.rows-.35)*G.dy;c.font=`${Math.round(Math.max(14,G.s*.6))}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';const txt=`后面还有 ${n-shown} 位`,tw=c.measureText(txt).width+18;
        c.fillStyle='rgba(247,241,227,.9)';c.fillRect(W/2-tw/2,y-G.s*.4,tw,G.s*.8);c.fillStyle='rgba(179,38,30,.92)';c.fillText(txt,W/2,y);c.textBaseline='alphabetic';}
    }
    function hudUpdate(){
      const sim=S.sim,sc=S.sc,cost=sim.costs(),T=dayLen(sc),ci=Math.min(sc.clock.length-1,Math.floor(sim.t)),n=sim.waiting();
      const money=sc.budget?`<div>加班工时 剩 <b>${Math.max(0,sc.budget-cost.used).toFixed(1)}</b></div>`:`<div>工钱 <b>${Math.round(cost.wage)}</b> · 等候 <b>${Math.round(cost.wait)}</b></div>`;
      hud.innerHTML=`<div class="gh-clock">${sc.clock[ci]}</div><div>候者 <b>${n}</b> · 最久 <b>${Math.round(sim.maxWaitNow())}</b> 分</div>${money}<div>告状 <b>${cost.angry}</b> · 合计 <b>${Math.round(cost.total)}</b> 文</div>`;
      const cv=el('canvas','gh-fore');hud.appendChild(cv);const w=cv.clientWidth||150,h=44,x=fitCanvas(cv,w,h);const mx=Math.max(...sc.script,GATES*MU);
      sc.script.forEach((l,i)=>{const bw=w/sc.script.length,bh=(h-12)*l/mx,cur=sim.t>=i*sc.slot&&sim.t<(i+1)*sc.slot;x.fillStyle=cur?'rgba(179,38,30,.85)':`rgba(${INK},${sim.t>(i+1)*sc.slot?.18:.42})`;x.fillRect(i*bw+1,h-10-bh,bw-2,bh);});
      (sc.caravans||[]).forEach(([t0])=>{const xx=t0/T*w;x.fillStyle='rgba(170,128,72,.95)';x.font=`10px ${BRUSH_FONT}`;x.textAlign='center';x.fillText('驼',xx,9);});
      const mxx=Math.min(1,sim.t/T)*w;x.strokeStyle='rgba(179,38,30,.9)';x.lineWidth=1.5;x.beginPath();x.moveTo(mxx,0);x.lineTo(mxx,h-10);x.stroke();
      const cap=sim.openCount()*MU,cy=h-10-(h-12)*cap/mx;x.save();x.setLineDash([3,2]);x.strokeStyle='rgba(30,91,115,.95)';x.lineWidth=1.3;x.beginPath();x.moveTo(0,cy);x.lineTo(w,cy);x.stroke();x.restore();
      x.fillStyle=`rgba(${INK},.6)`;x.font='9px serif';x.textAlign='left';x.fillText('来客预报',0,h-1);x.fillStyle='rgba(30,91,115,.95)';x.textAlign='right';x.fillText('虚线：每时能验 '+Math.round(cap),w,h-1);
      S.maxQ=Math.max(S.maxQ,n);
    }
    function loop(){cancelAnimationFrame(S.raf);let last=performance.now();
      const f=now=>{if(!root.isConnected)return;const dt=Math.min(.05,(now-last)/1000);last=now;
        if(S.running&&!S.paused&&!S.done){const sim=S.sim,T=dayLen(S.sc),tn=Math.min(T,sim.t+dt*(reduceMotion()?4:S.speed)/SEC_PER_HOUR);sim.advance(tn);
          if(sim.forced&&!S.forcedSaid){S.forcedSaid=true;ui.say('加班工时用尽了，只剩一道门！');audio.low();}
          while(S.lastRec<sim.t*60){S.lastRec++;S.series.push([sim.t,sim.waiting(),sim.openCount()]);}
          S.hudAcc+=dt;if(S.hudAcc>.12){S.hudAcc=0;hudUpdate();updateButtons();}
          if(tn>=T)endDay();}
        drawFrame(dt);S.raf=requestAnimationFrame(f);};
      S.raf=requestAnimationFrame(f);}

    /* ---------- 一天 ---------- */
    function setupDay(n){
      S.round=n;const sc=S.sc=ROUNDS[n-1];S.arr=genDay(sc,RNG(sc.seed));S.sim=createGateSim(sc,S.arr);for(let k=0;k<sc.open0;k++)S.sim.setOpen(OPEN_ORDER[k],true);
      S.bench=S.bench&&S.bench.round===n?S.bench:Object.assign(bench(sc,S.arr),{round:n});
      S.running=false;S.paused=true;S.done=false;S.pos.clear();S.series=[];S.lastRec=-1;S.angry.clear();S.maxQ=0;S.forcedSaid=false;S.usedRope=false;
      if(review){review.remove();review=null;}
      W=root.clientWidth;H=root.clientHeight;drawScene();fitCanvas(fg,W,H);layoutButtons();buildCtl();hudUpdate();ui.hideResult();
      ui.stageName(['第一回 · ','第二回 · ','第三回 · '][n-1]+sc.nm);ui.meter('');
      ui.acts([['开城',begin,true]]);ui.say(SAY[n]);
    }
    function begin(){S.running=true;S.paused=false;if(S.pauseBtn){S.pauseBtn.textContent='暂停';S.pauseBtn.setAttribute('aria-pressed',false);}audio.bell();ui.acts([['收门重来',()=>setupDay(S.round)]]);}
    function endDay(){
      const sim=S.sim;S.done=true;sim.finish();S.series.push([sim.t,0,0]);hudUpdate();updateButtons();
      const c=sim.costs(),b=S.bench.cost,ratio=c.total/Math.max(1,b.total),g=gradeRatio(ratio,S.sc.grades);audio.arp();
      const parts=S.sc.budget?`等候 ${Math.round(c.wait)} · 告状 ${c.angry}`:`工钱 ${Math.round(c.wage)} · 等候 ${Math.round(c.wait)} · 告状 ${c.angry}`;
      let line;
      if(g==='至妙')line=ratio<1?'比老门官还省！人潮前开门，人潮后收门，一步不差。':'和老门官不相上下：人潮前开门，人潮后收门。';
      else if(S.sc.canPool&&!S.usedRope)line='驼队堵住一道门，别的门却闲着，后来的人还插了队。拉起一米线，大家排成一条长队，哪道门空了去哪道。';
      else if(S.sc.budget&&c.forced)line='工时在人潮之前就用光了。人少时一道门就够，工时要留给戌时的灯会。';
      else if(c.wage>b.wage*1.25&&!S.sc.budget)line='门开得太多：人少的时候，门吏闲着也要工钱。';
      else line='人潮来了才开门，队伍已经排长了——队伍一长，要很久才消得下去。看着预报，早一步开门。';
      ui.result(g,`你花 <b>${Math.round(c.total)}</b> 文（${parts}） · 老门官 <b>${Math.round(b.total)}</b> 文`,line,true);
      showReview();
      const L=[['再守一天',()=>setupDay(S.round)]];L.push(S.round<3?['下一回 →',()=>setupDay(S.round+1),true]:['题跋 · 钤印',()=>ui.colophon(),true]);ui.acts(L);
      ui.say(S.round===1?'复盘图：红线是你，墨线是老门官。看看人潮前后，你们的门数差在哪里。':S.round===2?'一条长队：谁也不会被后来的人插队，最久的等候也短得多。':'人手有限时，把它留给最挤的时辰。这一处参透了。');
    }
    function showReview(){
      review=el('div','gate-review');const cv=el('canvas');review.appendChild(cv);review.appendChild(el('div','gr-leg','<span class="me">— 你</span><span class="old">┄ 老门官</span><span>上：候者　下：开门数</span>'));root.appendChild(review);
      requestAnimationFrame(()=>{const w=review.clientWidth-16,h=Math.min(150,Math.max(110,H*.22));const c=fitCanvas(cv,w,h),T=dayLen(S.sc),me=S.series,old=S.bench.series;
        const qmax=Math.max(5,...me.map(p=>p[1]),...old.map(p=>p[1])),X=t=>6+(w-12)*Math.min(1,t/T),top=h*.62;
        c.strokeStyle=`rgba(${INK},.15)`;c.beginPath();c.moveTo(6,top);c.lineTo(w-6,top);c.moveTo(6,h-4);c.lineTo(w-6,h-4);c.stroke();
        const line=(pts,f,col,dash)=>{c.save();c.setLineDash(dash);c.strokeStyle=col;c.lineWidth=1.6;c.beginPath();pts.forEach((p,i)=>{const x=X(p[0]),y=f(p);i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();c.restore();};
        line(old,p=>top-4-(top-10)*p[1]/qmax,`rgba(${INK},.7)`,[4,3]);line(me,p=>top-4-(top-10)*p[1]/qmax,'rgba(179,38,30,.9)',[]);
        const gy=p=>h-5-(h-top-10)*p[2]/GATES;line(old,gy,`rgba(${INK},.7)`,[4,3]);line(me,gy,'rgba(179,38,30,.9)',[]);
        c.fillStyle=`rgba(${INK},.55)`;c.font='10px serif';c.textAlign='left';c.fillText('候者 '+qmax,8,11);c.fillText('门 6',8,top+11);
        S.sc.clock.forEach((l,i)=>{if(i%2)return;c.textAlign='center';c.fillText(l,X(i),top+1);});
        layoutQ();});
    }
    this._resize=()=>{if(!S.sim)return;W=root.clientWidth;H=root.clientHeight;drawScene();fitCanvas(fg,W,H);layoutButtons();};
    this._stop=()=>{S.running=false;cancelAnimationFrame(S.raf);};
    gateLevel._dbg=S;gateLevel._go=n=>setupDay(n);   /* 自动化测试用 */
    setupDay(1);loop();
  },
  resize(){this._resize&&this._resize();},
  stop(){this._stop&&this._stop();this._resize=null;}
};
