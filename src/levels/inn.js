/* 客栈 · 收益管理（动态定价）：正月初五到十五，几间上房只卖上元灯会那一夜。
   手感：挂牌价随时加减（＋／－ 或 ↑↓）；客人远远看见挂牌就定了主意——进门订房，或摇头走开；灯会那夜空房一文不值。 */
import {RNG} from '../core/rng.js';
import {INK,PAPER,BRUSH_FONT,paperBase,paperGrain,house,roof,figure,willow,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {SCENES,TYPES,P_MIN,P_MAX,P_STEP,DAYS,solve,priceAt,bidPrice,genGuests,runPolicy,bestFixed,gradeRatio} from './inn-core.js';

const DATE=['初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五'];
const TINT=[`rgba(${INK},.16)`,'rgba(170,128,72,.45)','rgba(165,42,32,.62)'],GOLD='rgba(200,160,70,.95)';
const SEC_PER_DAY=5,WALK=2.4;
const SAY={
  1:'正月初五到十五，悦来客栈八间上房，<b>只卖十五上元灯会那一夜</b>。客人远远看见挂牌价就定了主意：贵了扭头走，便宜了进门订房。灯会那夜空着的房一文不值。<br>用左下角的 <b>＋ ／ －</b> 调挂牌价（键盘 ↑ ↓ 也行），右上角可暂停、调快。',
  2:'今年灯会格外热闹：<b>头几天只有书生、商贾路过，灯会前三四天盐商才蜂拥而来</b>，出手阔绰。早早把房贱卖了，就没房留给他们。',
  3:'账房先生把算盘打给你看：挂牌旁那个数，是<b>「这一间房留到后面，平均还值多少文」</b>。挂牌低于它就是贱卖；房多日子少时，它会往下掉。'};

export const innLevel={
  id:'inn',title:'客栈',concept:'收益管理',ambience:'market',poem:['渭城朝雨浥轻尘','客舍青青柳色新'],poemSrc:'王维《送元二使安西》',
  colophon:{head:'收益管理',seal:'留余',
    lines:['房只有这几间，灯会一过，空房一文不值。','贵客来得晚：早先挂高些，把房留给后来的人；临近灯会还空着，就降价。','一间房卖不卖，看它留到后面还值多少——卖价胜过它，才卖（此即 Littlewood 法则的推广）。'],
    note:'今之机票舱位、酒店房价、演出票价随日子涨落，皆用此术。'},
  start(ui,audio){
    const S={round:0,sc:null,dp:null,guests:[],gi:0,t:0,price:55,rooms:0,rev:0,sold:[],walkers:[],lit:0,speed:1,paused:true,running:false,done:false,path:[],raf:0,night:0,fireworks:[],endAt:0};
    const root=el('div','inn2');ui.stage.appendChild(root);
    const bg=el('canvas','inn-bg'),fg=el('canvas','inn-fg'),hud=el('div','inn-hud'),ctl=el('div','gate-ctl inn-ctl'),pricer=el('div','inn-price'),hint=el('div','inn-hint');
    [bg,fg,hud,ctl,pricer,hint].forEach(e=>root.appendChild(e));hint.hidden=true;
    let W=0,H=0,review=null;const dpCache={};
    const G=()=>{const narrow=W<700,s=Math.max(22,Math.min(58,H*.1,narrow?W*.1:W*.05)),walk=H*.88,fx0=W*(narrow?.42:.56),fx1=W*.985,top=H*.08,f1=H*.63;
      const C=S.sc?S.sc.rooms:8,per=Math.ceil(C/2),door={x:fx0+(fx1-fx0)*.2,w:s*1.1,top:walk-s*1.55};
      const wins=[];for(let r=0;r<2;r++)for(let k=0;k<per&&wins.length<C;k++){const ww=(fx1-fx0)*.8/per,x=fx0+(fx1-fx0)*.12+k*(fx1-fx0)*.8/per+ww*.12,y=top+(f1-top)*(.2+r*.42);wins.push({x,y,w:ww*.76,h:(f1-top)*.26});}
      return{s,walk,fx0,fx1,top,f1,door,wins,board:{x:fx0-s*.9,y:H*.5},narrow};};

    /* ---------- 街景：远处屋脊、别家店铺、柳、客栈门面 ---------- */
    function drawScene(){
      W=root.clientWidth;H=root.clientHeight;const c=fitCanvas(bg,W,H),g=G(),r=RNG(21),ink=a=>`rgba(${INK},${a})`;paperBase(c,0,0,W,H);
      for(let i=0;i<Math.ceil(W/44)+1;i++)house(c,i*44+(i%2)*14,H*.34+(i%3)*3,30+r()*14,.25+r()*.1);
      const rg=c.createLinearGradient(0,H*.6,0,H);rg.addColorStop(0,'rgba(180,150,100,.08)');rg.addColorStop(1,'rgba(180,150,100,.2)');c.fillStyle=rg;c.fillRect(0,H*.6,W,H*.4);
      c.strokeStyle=ink(.3);c.lineWidth=1;c.beginPath();c.moveTo(0,g.walk+g.s*.12);c.lineTo(W,g.walk+g.s*.12);c.stroke();
      for(let i=0;i<60;i++){const x=r()*W,y=H*.64+r()*H*.36,L=8+r()*26;c.strokeStyle=ink(.06);c.beginPath();c.moveTo(x,y);c.lineTo(x+L,y+(r()-.5));c.stroke();}
      /* 对街两家铺子 */
      const shop=(x0,x1,flag)=>{const y1=g.walk-g.s*.1,y0=H*.4;c.fillStyle=`rgba(${PAPER},.97)`;c.fillRect(x0,y0,x1-x0,y1-y0);c.fillStyle='rgba(120,70,40,.28)';c.fillRect(x0,y0,x1-x0,y1-y0);
        c.strokeStyle=ink(.55);c.strokeRect(x0,y0,x1-x0,y1-y0);roof(c,(x0+x1)/2,y0,(x1-x0)*1.1,g.s*.7,.82);
        c.fillStyle=ink(.5);c.fillRect(x0+(x1-x0)*.3,y1-(y1-y0)*.55,(x1-x0)*.4,(y1-y0)*.55);c.fillStyle='rgba(30,91,115,.6)';c.fillRect(x0+(x1-x0)*.3,y1-(y1-y0)*.55,(x1-x0)*.4,g.s*.35);
        [[.08,.2],[.72,.2]].forEach(([fx,fw])=>{const wx=x0+(x1-x0)*fx,wy=y0+(y1-y0)*.14,ww=(x1-x0)*fw,wh=(y1-y0)*.26;c.fillStyle=`rgba(${PAPER},.9)`;c.fillRect(wx,wy,ww,wh);c.strokeStyle='rgba(120,70,40,.8)';c.lineWidth=1.2;c.strokeRect(wx,wy,ww,wh);
          c.lineWidth=.8;for(let k=1;k<3;k++){c.beginPath();c.moveTo(wx+ww*k/3,wy);c.lineTo(wx+ww*k/3,wy+wh);c.stroke();}});
        c.fillStyle='rgba(120,70,40,.7)';c.fillRect(x0-g.s*.1,y1-(y1-y0)*.62,x1-x0+g.s*.2,g.s*.1);
        const fx=x1-(x1-x0)*.08,fy=y0-g.s*.2;c.strokeStyle=ink(.8);c.lineWidth=1.5;c.beginPath();c.moveTo(fx,fy);c.lineTo(fx,fy-g.s*1.6);c.stroke();c.fillStyle=`rgba(${PAPER},.97)`;c.fillRect(fx-g.s*.55,fy-g.s*1.55,g.s*.5,g.s*1.1);c.strokeStyle=ink(.6);c.lineWidth=1;c.strokeRect(fx-g.s*.55,fy-g.s*1.55,g.s*.5,g.s*1.1);
        c.fillStyle='rgba(179,38,30,.85)';c.font=`${Math.round(g.s*.36)}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(flag,fx-g.s*.3,fy-g.s*1.0);};
      if(!g.narrow){shop(W*.04,W*.2,'茶');shop(W*.27,W*.44,'酒');}else shop(W*.03,W*.3,'茶');
      willow(c,RNG(8),g.fx0-g.s*2.2,g.walk,g.s*3.2);
      /* 客栈：三层门面 */
      const {fx0,fx1,top,f1,walk}=g;c.fillStyle=`rgba(${PAPER},.98)`;c.fillRect(fx0,top,fx1-fx0,walk-top);c.fillStyle='rgba(120,70,40,.18)';c.fillRect(fx0,top,fx1-fx0,walk-top);
      c.strokeStyle=ink(.6);c.lineWidth=1.3;c.strokeRect(fx0,top,fx1-fx0,walk-top);
      [top+(f1-top)*.5,f1].forEach(y=>{c.fillStyle='rgba(120,70,40,.7)';c.fillRect(fx0-g.s*.2,y-g.s*.08,fx1-fx0+g.s*.4,g.s*.12);roof(c,(fx0+fx1)/2,y-g.s*.06,(fx1-fx0)*1.02,g.s*.34,.75);});
      roof(c,(fx0+fx1)/2,top,(fx1-fx0)*1.12,g.s*.8,.9);
      for(let k=0;k<=6;k++){const x=fx0+(fx1-fx0)*k/6;c.fillStyle='rgba(120,70,40,.5)';c.fillRect(x-2,f1,4,walk-f1);}
      const D=g.door;c.fillStyle=ink(.55);c.fillRect(D.x-D.w/2,D.top,D.w,walk-D.top);c.fillStyle='rgba(30,91,115,.75)';c.fillRect(D.x-D.w/2,D.top,D.w,g.s*.42);
      const pw=Math.min(g.s*2.4,(fx1-fx0)*.5),ph=g.s*.5,py=f1+g.s*.12;c.fillStyle=ink(.86);c.fillRect(D.x-pw/2+g.s*.6,py,pw,ph);c.fillStyle=GOLD;c.font=`${Math.round(ph*.62)}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText('悦来客栈',D.x+g.s*.6,py+ph/2+1);
      g.wins.forEach(w=>{c.fillStyle=ink(.12);c.fillRect(w.x,w.y,w.w,w.h);c.strokeStyle='rgba(120,70,40,.85)';c.lineWidth=Math.max(1.5,g.s*.05);c.strokeRect(w.x,w.y,w.w,w.h);
        c.lineWidth=1;for(let k=1;k<3;k++){c.beginPath();c.moveTo(w.x+w.w*k/3,w.y);c.lineTo(w.x+w.w*k/3,w.y+w.h);c.stroke();}c.beginPath();c.moveTo(w.x,w.y+w.h/2);c.lineTo(w.x+w.w,w.y+w.h/2);c.stroke();});
      /* 挂牌的杆子 */
      const B=g.board;c.strokeStyle=ink(.8);c.lineWidth=2;c.beginPath();c.moveTo(B.x,walk);c.lineTo(B.x,B.y-g.s*.9);c.lineTo(B.x+g.s*.7,B.y-g.s*.9);c.stroke();
      paperGrain(c,0,0,W,H,false);
    }

    /* ---------- 前景：灯笼、客房灯火、挂牌、行人、烟花 ---------- */
    function guest(c,x,y,s,type){figure(c,x,y,s,TINT[type],type,type===2?GOLD:null);}
    function drawFrame(dt){
      const c=fg.getContext('2d'),dpr=fg.width/W,g=G(),s=g.s;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
      const day=Math.min(DAYS,S.t);
      /* 满街灯笼：一天多挂一串 */
      const strings=Math.min(6,1+Math.floor(day*.6));for(let k=0;k<strings;k++){const y0=H*(.1+k*.045),x0=0,x1=g.fx0-s*.3;c.strokeStyle=`rgba(${INK},.35)`;c.lineWidth=1;c.beginPath();c.moveTo(x0,y0);c.quadraticCurveTo((x0+x1)/2,y0+s*.5,x1,y0);c.stroke();
        const n=Math.max(3,Math.floor((x1-x0)/(s*1.3)));for(let i=1;i<n;i++){const u=i/n,x=x0+(x1-x0)*u,y=y0+s*.5*2*u*(1-u)+s*.2;const glow=S.night;
          if(glow>0){c.save();c.globalCompositeOperation='lighter';const gl=c.createRadialGradient(x,y,1,x,y,s*.8);gl.addColorStop(0,`rgba(255,170,80,${.45*glow})`);gl.addColorStop(1,'rgba(255,170,80,0)');c.fillStyle=gl;c.fillRect(x-s*.8,y-s*.8,s*1.6,s*1.6);c.restore();}
          c.fillStyle=`rgba(200,54,36,${.7+.3*glow})`;c.beginPath();c.ellipse(x,y,s*.14,s*.18,0,0,7);c.fill();c.fillStyle=`rgba(${INK},.7)`;c.fillRect(x-s*.07,y-s*.21,s*.14,s*.04);}}
      if(S.night>0){c.fillStyle=`rgba(14,14,34,${.45*S.night})`;c.fillRect(0,0,W,H);}
      /* 客房：订出去的亮灯 */
      g.wins.forEach((w,i)=>{if(i<S.lit){c.save();c.globalCompositeOperation='lighter';const gl=c.createRadialGradient(w.x+w.w/2,w.y+w.h/2,2,w.x+w.w/2,w.y+w.h/2,w.w*(1+S.night*.6));gl.addColorStop(0,`rgba(255,180,90,${.5+.3*S.night})`);gl.addColorStop(1,'rgba(255,180,90,0)');c.fillStyle=gl;c.fillRect(w.x-w.w,w.y-w.h,w.w*3,w.h*3);c.restore();
          c.fillStyle='rgba(255,206,120,.85)';c.fillRect(w.x+2,w.y+2,w.w-4,w.h-4);c.fillStyle=`rgba(${INK},.55)`;c.beginPath();c.arc(w.x+w.w*.5,w.y+w.h*.42,w.h*.12,0,7);c.fill();c.fillRect(w.x+w.w*.38,w.y+w.h*.55,w.w*.24,w.h*.4);}});
      /* 挂牌 */
      const B=g.board,bw=s*1.2,bh=s*1.6;c.fillStyle=`rgba(${PAPER},.98)`;c.fillRect(B.x+s*.1,B.y-s*.8,bw,bh);c.strokeStyle='rgba(120,70,40,.9)';c.lineWidth=2;c.strokeRect(B.x+s*.1,B.y-s*.8,bw,bh);
      c.fillStyle=`rgba(${INK},.6)`;c.font=`${Math.round(s*.26)}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText('房价',B.x+s*.1+bw/2,B.y-s*.55);
      c.fillStyle='rgba(179,38,30,.95)';c.font=`${Math.round(s*.56)}px ${BRUSH_FONT}`;c.fillText(String(S.price),B.x+s*.1+bw/2,B.y+s*.05);c.fillStyle=`rgba(${INK},.6)`;c.font=`${Math.round(s*.26)}px ${BRUSH_FONT}`;c.fillText('文',B.x+s*.1+bw/2,B.y+s*.55);
      /* 行人 */
      const doorX=g.door.x;
      for(const w of S.walkers){c.globalAlpha=w.a;const bob=Math.abs(Math.sin(w.ph))*s*.05;guest(c,w.x,g.walk-bob-(w.up||0),s,w.g.type);c.globalAlpha=1;
        if(w.say&&w.sayT>0){c.font=`${Math.round(s*.32)}px ${BRUSH_FONT}`;const tw=c.measureText(w.say).width+12;c.fillStyle='rgba(247,241,227,.92)';c.fillRect(w.x-tw/2,g.walk-s*1.55,tw,s*.42);c.strokeStyle=`rgba(${INK},.35)`;c.strokeRect(w.x-tw/2,g.walk-s*1.55,tw,s*.42);
          c.fillStyle=w.res==='book'?'rgba(30,91,115,.95)':'rgba(179,38,30,.9)';c.textAlign='center';c.textBaseline='middle';c.fillText(w.say,w.x,g.walk-s*1.34);}}
      /* 烟花 */
      for(const f of S.fireworks){for(const p of f.p){const a=Math.max(0,1-f.age/1.6);c.fillStyle=`rgba(${f.col},${a})`;c.beginPath();c.arc(f.x+p[0]*f.age*s*2,f.y+p[1]*f.age*s*2+f.age*f.age*s*.6,Math.max(.8,s*.05*(1-f.age/2)),0,7);c.fill();}}
    }
    function stepWalkers(dt){
      const g=G(),doorX=g.door.x,v=(doorX+g.s)/WALK;
      for(const w of S.walkers){w.ph+=dt*9;if(w.sayT>0)w.sayT-=dt;
        if(w.stage===0){w.x+=v*dt;if(w.x>=doorX-g.s*.2){w.stage=1;
            if(w.res==='book'){S.lit++;S.revShown+=w.p;w.say='订一间';w.sayT=.9;audio.coin();const sr=root.getBoundingClientRect();ui.flash('+'+w.p+' 文',w.x,g.walk-g.s*1.9);}
            else{w.say=w.res==='full'?'客满了':(w.g.w<w.p*.8?'太贵了！':'贵了点……');w.sayT=1;}}}
        else if(w.res==='book'){w.a-=dt*1.6;w.x+=(doorX-w.x)*Math.min(1,dt*6);}
        else w.x+=v*dt*.9;}
      S.walkers=S.walkers.filter(w=>w.a>0&&w.x<W+g.s*2);
    }
    function spawn(gst){const p=S.price;let res;S.path.push([gst.t,p]);
      if(S.rooms>0&&gst.w>=p){S.rooms--;S.rev+=p;S.sold.push({t:gst.t,p});res='book';}else res=S.rooms>0?'no':'full';
      S.walkers.push({g:gst,x:-G().s,res,p,stage:0,a:1,ph:Math.random()*3,say:'',sayT:0});}
    function hudUpdate(){
      const d=Math.min(DAYS,Math.floor(S.t)),left=DAYS-S.t;
      hud.innerHTML=`<div class="ih-date">正月${DATE[Math.min(10,d)]}</div><div>${S.t>=DAYS?'上元灯会':'距灯会 <b>'+Math.ceil(left)+'</b> 日'}</div><div>已订 <b>${S.lit}</b> / ${S.sc.rooms} 间</div><div>进账 <b>${S.revShown}</b> 文</div>`;
      const strip=el('div','ih-strip');for(let k=0;k<DAYS;k++){const i=el('i');if(k<d)i.className='past';if(k===d&&S.t<DAYS)i.className='now';strip.appendChild(i);}hud.appendChild(strip);
      if(S.sc.hint){hint.hidden=false;const bp=bidPrice(S.dp,Math.min(DAYS-1e-6,S.t),S.rooms);const show=S.rooms>0&&isFinite(bp)?Math.round(bp):'—';
        hint.innerHTML=`<span>账房：这一间留着值</span><b>${show}</b><span>文</span>${S.rooms>0&&S.price<bp-2?'<em>贱卖了</em>':''}`;}
    }
    /* ---------- 挂牌价与速度 ---------- */
    function setPrice(p){p=Math.max(P_MIN,Math.min(P_MAX,p));if(p===S.price)return;S.price=p;pricer.querySelector('.pv b').textContent=p;audio.tap(p>60?6:3);if(S.running)S.path.push([S.t,p]);if(S.sc.hint)hudUpdate();}
    function buildPricer(){
      pricer.innerHTML='<div class="lbl">挂牌价</div>';const minus=el('button','btn pm','－'),plus=el('button','btn pm','＋'),pv=el('div','pv',`<b>${S.price}</b><span>文</span>`);
      minus.setAttribute('aria-label','降价五文');plus.setAttribute('aria-label','涨价五文');
      const hold=(b,d)=>{let t1=0,t2=0;const stop=()=>{clearTimeout(t1);clearInterval(t2);};b.addEventListener('pointerdown',e=>{e.preventDefault();setPrice(S.price+d);t1=setTimeout(()=>{t2=setInterval(()=>setPrice(S.price+d),90);},320);});
        ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,stop));b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setPrice(S.price+d);}});};
      hold(minus,-P_STEP);hold(plus,P_STEP);pricer.appendChild(minus);pricer.appendChild(pv);pricer.appendChild(plus);
    }
    function buildCtl(){ctl.innerHTML='';const pause=el('button','btn','暂停');pause.onclick=()=>{if(!S.running||S.done)return;S.paused=!S.paused;pause.textContent=S.paused?'继续':'暂停';pause.setAttribute('aria-pressed',S.paused);};ctl.appendChild(pause);S.pauseBtn=pause;
      [1,2].forEach(v=>{const b=el('button','btn spd',v+'×');b.setAttribute('aria-pressed',v===S.speed);b.onclick=()=>{S.speed=v;ctl.querySelectorAll('.spd').forEach(x=>x.setAttribute('aria-pressed',x===b));};ctl.appendChild(b);});}
    const onKey=e=>{if(!root.isConnected||document.getElementById('level').hidden)return;if(e.key==='ArrowUp'){e.preventDefault();setPrice(S.price+P_STEP);}else if(e.key==='ArrowDown'){e.preventDefault();setPrice(S.price-P_STEP);}};
    addEventListener('keydown',onKey);

    /* ---------- 一旬 ---------- */
    function loop(){cancelAnimationFrame(S.raf);let last=performance.now();
      const f=now=>{if(!root.isConnected)return;const dt=Math.min(.05,(now-last)/1000);last=now;const sp=reduceMotion()?4:S.speed;
        if(S.running&&!S.paused&&!S.done){S.t=Math.min(DAYS,S.t+dt*sp/SEC_PER_DAY);while(S.gi<S.guests.length&&S.guests[S.gi].t<=S.t)spawn(S.guests[S.gi++]);
          S.hudAcc=(S.hudAcc||0)+dt;if(S.hudAcc>.15){S.hudAcc=0;hudUpdate();}
          if(S.t>=DAYS&&!S.walkers.some(w=>w.stage===0)){S.done=true;festival();}}
        if(!S.paused||S.done)stepWalkers(dt*(S.done?1:sp));
        if(S.done&&S.night<1)S.night=Math.min(1,S.night+dt*.8);
        for(const fw of S.fireworks)fw.age+=dt;S.fireworks=S.fireworks.filter(fw=>fw.age<2);
        drawFrame(dt);S.raf=requestAnimationFrame(f);};
      S.raf=requestAnimationFrame(f);}
    function setup(n){
      S.round=n;const sc=S.sc=SCENES[n-1];S.dp=dpCache[n]||(dpCache[n]=solve(sc));S.fixed=S.fixed&&S.fixed.n===n?S.fixed:Object.assign(bestFixed(sc,160),{n});
      S.guests=genGuests(sc,RNG(sc.seed));S.gi=0;S.t=0;S.rooms=sc.rooms;S.rev=0;S.sold=[];S.walkers=[];S.lit=0;S.revShown=0;S.running=false;S.paused=true;S.done=false;S.night=0;S.fireworks=[];S.path=[[0,S.price]];
      if(review){review.remove();review=null;}hint.hidden=!sc.hint;
      drawScene();fitCanvas(fg,W,H);buildPricer();buildCtl();hudUpdate();ui.hideResult();ui.stageName(['第一回 · ','第二回 · ','第三回 · '][n-1]+sc.nm);ui.meter('');
      ui.say(SAY[n]);ui.acts([['开张',begin,true]]);
    }
    function begin(){S.running=true;S.paused=false;S.path=[[0,S.price]];audio.bell();ui.acts([['重开一旬',()=>setup(S.round)]]);}
    function festival(){
      audio.bell();let k=0;const boom=()=>{if(!root.isConnected||k>=6)return;k++;const g=G(),cols=['255,190,90','255,120,80','250,230,160','180,220,255'];
        S.fireworks.push({x:W*(.1+Math.random()*.4),y:H*(.12+Math.random()*.15),age:0,col:cols[k%4],p:Array.from({length:22},(_,i)=>{const a=i/22*Math.PI*2;return[Math.cos(a),Math.sin(a)];})});audio.thud();setTimeout(boom,320);};
      setTimeout(boom,300);setTimeout(showResult,reduceMotion()?200:2400);
    }
    function showResult(){
      if(!root.isConnected)return;hudUpdate();const sc=S.sc,dpRun=runPolicy(sc,S.guests,(t,c)=>priceAt(S.dp,t,c)),fixRun=runPolicy(sc,S.guests,()=>S.fixed.price);
      const ratio=S.rev/Math.max(1,dpRun.rev),g=gradeRatio(ratio);audio.arp();
      const soldOutAt=S.rooms===0&&S.sold.length?S.sold[S.sold.length-1].t:null;let line;
      if(g==='至妙')line=ratio>1.005?'比账房先生还赚！挂牌跟着日子和余房走：早先不贱卖，临近灯会还空着就降。':'和账房先生不相上下：早先不贱卖，临近灯会还空着就降。';
      else if(soldOutAt!=null&&soldOutAt<6.5&&S.round>1)line=`正月${DATE[Math.floor(soldOutAt)]}房就卖光了，盐商来时已无房可订。早些日子挂高些，把房留给后来的贵客。`;
      else if(S.rooms>=2)line=`灯会那夜还空着 ${S.rooms} 间房——空房一文不值，最后几天该降价。`;
      else if(S.sold.length&&S.rev/S.sold.length<dpRun.rev/Math.max(1,dpRun.sold.length)*.85)line='房是卖出去了，可卖得太便宜。';
      else line='价钱要跟着形势变：房多日子少就降，房少客多就涨。';
      ui.result(g,`你 <b>${S.rev}</b> 文（订出 ${sc.rooms-S.rooms} 间） · 账房先生 <b>${dpRun.rev}</b> 文（${dpRun.sold.length} 间） · 事前挑的一口价 ${S.fixed.price} 文得 ${fixRun.rev} 文`,line,true);
      showReview(dpRun);
      ui.acts([['重开一旬',()=>setup(S.round)],S.round<3?['下一回 →',()=>setup(S.round+1),true]:['题跋 · 钤印',()=>ui.colophon(),true]]);
      ui.say(S.round===1?'复盘图：红线是你的挂牌价，墨线是账房先生的；圆点是订出的房。':S.round===2?'贵客来得晚：早先挂高、留住房，临近灯会看余房多少再定。':'卖价胜过「这间房留着值的钱」才卖——这就是收益管理。这一处参透了。');
    }
    function showReview(dpRun){
      review=el('div','gate-review inn-review');const cv=el('canvas');review.appendChild(cv);review.appendChild(el('div','gr-leg','<span class="me">— 你的挂牌</span><span class="old">┄ 账房先生</span><span>● 订出的房</span>'));root.appendChild(review);
      requestAnimationFrame(()=>{const w=review.clientWidth-16,h=Math.min(150,Math.max(110,H*.22)),c=fitCanvas(cv,w,h),X=t=>28+(w-36)*Math.min(1,t/DAYS),Y=p=>h-16-(h-26)*(p-P_MIN)/(P_MAX-P_MIN);
        c.fillStyle=`rgba(${INK},.5)`;c.font='10px serif';c.textAlign='right';[20,60,100].forEach(p=>{c.fillText(p,24,Y(p)+3);c.strokeStyle=`rgba(${INK},.08)`;c.beginPath();c.moveTo(28,Y(p));c.lineTo(w-8,Y(p));c.stroke();});
        c.textAlign='center';for(let d=0;d<=DAYS;d+=2)c.fillText(DATE[d],X(d),h-3);
        const step=(pts,col,dash)=>{c.save();c.setLineDash(dash);c.strokeStyle=col;c.lineWidth=1.6;c.beginPath();pts.forEach((p,i)=>{const x=X(p[0]),y=Y(p[1]);if(i){c.lineTo(x,Y(pts[i-1][1]));c.lineTo(x,y);}else c.moveTo(x,y);});c.lineTo(X(DAYS),Y(pts[pts.length-1][1]));c.stroke();c.restore();};
        step(dpRun.path.length?[[0,dpRun.path[0][1]],...dpRun.path]:[[0,60]],`rgba(${INK},.7)`,[4,3]);step(S.path,'rgba(179,38,30,.9)',[]);
        dpRun.sold.forEach(s=>{c.fillStyle=`rgba(${INK},.6)`;c.beginPath();c.arc(X(s.t),Y(s.p),2.6,0,7);c.fill();});S.sold.forEach(s=>{c.fillStyle='rgba(179,38,30,.95)';c.beginPath();c.arc(X(s.t),Y(s.p),3.2,0,7);c.fill();});});
    }
    this._resize=()=>{if(!S.sc)return;drawScene();fitCanvas(fg,W,H);};
    this._stop=()=>{cancelAnimationFrame(S.raf);removeEventListener('keydown',onKey);};
    innLevel._dbg=S;innLevel._go=n=>setup(n);   /* 自动化测试用 */
    setup(1);loop();
  },
  resize(){this._resize&&this._resize();},
  stop(){this._stop&&this._stop();this._resize=null;}
};
