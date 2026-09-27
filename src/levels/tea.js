/* 茶寮 · 统筹方法：一壶茶（排工序）→ 三枚巧字签（关键路径会转移） */
import {INK,BRUSH_FONT,PAPER,paperBase,paperGrain,stove,kettle,teapot,cup,caddy,steam,fitCanvas,brush} from '../core/ink.js';
import {Noise1,RNG} from '../core/rng.js';
import {el,reduceMotion} from '../core/ui.js';
import {TEA_R1,TEA_R2,TEA_TOKENS,TEA_R2_TARGET,teaDur,teaSchedule,teaCanPlace,teaBest,teaBestOrder,teaCritical,teaGrade1,teaGrade2} from './tea-core.js';

const ICON={kettle:(c,s)=>kettle(c,s*.46,s*.86,s*.95),boil:(c,s)=>{stove(c,s*.5,s*.98,s*.8,true);kettle(c,s*.5,s*.45,s*.62);},pot:(c,s)=>teapot(c,s*.52,s*.8,s*1.35),cups:(c,s)=>{cup(c,s*.33,s*.78,s*1.6);cup(c,s*.68,s*.78,s*1.6);},leaf:(c,s)=>caddy(c,s*.5,s*.86,s*1.9)};

export const teaLevel={
  id:'tea',title:'茶寮',
  colophon:{head:'统筹方法',seal:'统筹',
    lines:['烧水之时，洗壶洗杯拿茶叶——事有先后，亦可同时。','诸事首尾相接最长的一条，谓之关键路径，总工期由它而定。','欲求其快，须快在关键路径上；快到一定，关键路径亦会转移。'],
    note:'华罗庚《统筹方法》以泡茶为例推广此法。宋时丁谓修宫，挖街取土、引水行舟、以渣填渠，一举而三役济，亦统筹之妙。'},
  start(ui,audio){
    const S={round:1,tasks:TEA_R1,order:[],tokens:{},history:[],sched:null,crit:new Set(),play:-1,done:false};
    const root=el('div','tea'),scene=el('div','tea-scene'),gantt=el('div','tea-gantt'),cards=el('div','tea-cards'),tok=el('div','tea-tokens');
    const cvScene=el('canvas'),cvGantt=el('canvas');scene.appendChild(cvScene);gantt.appendChild(cvGantt);
    root.appendChild(scene);root.appendChild(gantt);root.appendChild(cards);ui.stage.appendChild(root);scene.appendChild(tok);tok.hidden=true;

    const dur=()=>teaDur(S.tasks,S.tokens);
    const byId=id=>S.tasks.find(t=>t.id===id);
    const minTxt=m=>m+' 分';

    /* ---------- 茶席 ---------- */
    function drawScene(t){
      const W=scene.clientWidth,H=scene.clientHeight,c=fitCanvas(cvScene,W,H);paperBase(c,0,0,W,H);
      const s=Math.min(H*.56,W<600?W/6.4:W*.13),base=H*.84,r=RNG(3),ox=Math.max(0,(W-s*6.2)/2-W*.08);
      // 竹影
      c.save();for(let i=0;i<3;i++){const x=W*(.9+i*.03),n=Noise1(RNG(i+5));const pts=[];for(let y=0;y<H*.9;y+=6)pts.push([x+Math.sin(y*.01+i)*3,y]);brush(c,pts,{noise:n,w:3.5,a:.16,dry:.2,bristles:3,off:i*9,flat:1});
        for(let k=0;k<4;k++){const yy=H*(.15+k*.18)+i*9,lp=[[x,yy],[x-26-r()*14,yy+8+r()*6]];const pts2=[];for(let q=0;q<=8;q++){const u=q/8;pts2.push([lp[0][0]+(lp[1][0]-lp[0][0])*u,lp[0][1]+(lp[1][1]-lp[0][1])*u+Math.sin(u*3)*2]);}brush(c,pts2,{noise:n,w:5,a:.14,off:k*5+i});}}c.restore();
      // 案
      c.strokeStyle=`rgba(${INK},.55)`;c.lineWidth=1.6;c.beginPath();c.moveTo(W*.04,base+2);c.lineTo(W*.96,base+2);c.stroke();
      c.fillStyle=`rgba(${INK},.06)`;c.fillRect(W*.04,base+2,W*.92,H*.1);
      const sched=S.sched,has=id=>S.order.includes(id)||S.round===2;
      const boilIt=sched&&sched.items.find(i=>i.id==='boil');
      const lit=t!=null&&boilIt&&t>=boilIt.start&&t<boilIt.end;
      const onStove=has('boil')&&(t==null||!boilIt||t>=boilIt.start);
      const sx=ox+s*.9,px=ox+s*2.6,cx0=ox+s*3.4;
      stove(c,sx,base,s*.9,lit);
      if(onStove)kettle(c,sx,base-s*.58,s*.72);else kettle(c,sx+s*.62,base,s*.55);
      if(lit)steam(c,sx+s*.33,base-s*.9,s*.8,performance.now()/1000);
      const done=t!=null&&sched&&t>=sched.total;
      teapot(c,px,base,s*.95);if(done)steam(c,px,base-s*.28,s*.6,performance.now()/1000);
      const nc=S.round===2?6:3;for(let i=0;i<nc;i++)cup(c,cx0+i*s*.22,base,s*.9);
      caddy(c,cx0+nc*s*.22+s*.2,base,s*.9);
      // 已排上的工序：朱砂圈点
      const mark=(x,y,rr)=>{c.strokeStyle='rgba(179,38,30,.8)';c.lineWidth=1.6;c.beginPath();c.ellipse(x,y,rr,rr*.8,0,0,7);c.stroke();};
      if(S.round===1){
        if(S.order.includes('kettle'))mark(onStove?sx:sx+s*.62,onStove?base-s*.78:base-s*.14,s*.26);
        if(S.order.includes('pot'))mark(px,base-s*.14,s*.28);
        if(S.order.includes('cups'))mark(cx0+s*.22,base-s*.07,s*.32);
        if(S.order.includes('leaf'))mark(cx0+nc*s*.22+s*.2,base-s*.14,s*.18);
      }
      if(done){c.fillStyle='rgba(179,38,30,.88)';c.font=`${Math.round(s*.34)}px ${BRUSH_FONT}`;c.textAlign='center';c.fillText('茶成',px,base-s*.62);}
      paperGrain(c,0,0,W,H,false);
    }
    /* ---------- 时间轴 ---------- */
    function drawGantt(t){
      const W=gantt.clientWidth,H=gantt.clientHeight,c=fitCanvas(cvGantt,W,H);c.clearRect(0,0,W,H);
      const L=34,R=W-10,maxT=S.round===1?21:17,x=m=>L+(R-L)*m/maxT,laneH=Math.min(46,(H-34)/2),lane={hands:6,stove:14+laneH},axisY=18+laneH*2+10;
      c.font=`18px ${BRUSH_FONT}`;c.fillStyle=`rgba(${INK},.85)`;c.textAlign='center';c.textBaseline='middle';
      c.fillText('手',16,lane.hands+laneH/2);c.fillText('炉',16,lane.stove+laneH/2);
      c.strokeStyle=`rgba(${INK},.18)`;c.lineWidth=1;
      [lane.hands,lane.stove].forEach(y=>{c.beginPath();c.moveTo(L,y+laneH);c.lineTo(R,y+laneH);c.stroke();});
      c.strokeStyle=`rgba(${INK},.5)`;c.beginPath();c.moveTo(L,axisY);c.lineTo(R,axisY);c.stroke();
      c.font='11px "Noto Serif SC",serif';c.fillStyle=`rgba(${INK},.6)`;
      const step=(R-L)/maxT<14?5:(R-L)/maxT<24?2:1;
      for(let m=0;m<=maxT;m++){const xx=x(m);c.beginPath();c.moveTo(xx,axisY);c.lineTo(xx,axisY+(m%5?3:6));c.stroke();if(m%step===0)c.fillText(m,xx,axisY+14);}
      if(!S.sched)return;
      const n=Noise1(RNG(9));
      S.sched.items.forEach((it,i)=>{
        const t0=byId(it.id),x0=x(it.start)+1,x1=x(it.end)-1,y=lane[it.lane]+3,h=laneH-6,crit=S.crit.has(it.id);
        const shown=t==null?1:Math.max(0,Math.min(1,(t-it.start)/(it.end-it.start)));
        c.fillStyle=crit?'rgba(179,38,30,.13)':`rgba(${INK},.12)`;c.fillRect(x0,y,x1-x0,h);
        if(shown>0){c.fillStyle=crit?'rgba(179,38,30,.22)':`rgba(${INK},.2)`;c.fillRect(x0,y,(x1-x0)*shown,h);}
        const edge=[[x0,y],[x1,y],[x1,y+h],[x0,y+h],[x0,y]];const pts=[];for(let k=0;k<4;k++)for(let u=0;u<1;u+=.1)pts.push([edge[k][0]+(edge[k+1][0]-edge[k][0])*u,edge[k][1]+(edge[k+1][1]-edge[k][1])*u]);
        brush(c,pts,{noise:n,w:crit?2.2:1.4,a:crit?.9:.6,col:crit?'179,38,30':INK,dry:.15,off:i*13,flat:1,wet:false,bristles:2});
        c.fillStyle=crit?'rgba(150,30,24,.95)':`rgba(${INK},.88)`;const bw=x1-x0;
        if(bw>=26){c.font=`${Math.min(18,h*.42)}px ${BRUSH_FONT}`;c.fillText(t0.sh,(x0+x1)/2,y+h/2);}
        else{c.save();c.font=`${Math.min(14,bw*.8)}px ${BRUSH_FONT}`;const ch=t0.sh.split('');ch.forEach((q,j)=>c.fillText(q,(x0+x1)/2,y+h/2+(j-(ch.length-1)/2)*Math.min(14,bw*.8)));c.restore();}
      });
      // 手闲着的时候
      let hEnd=0;S.sched.items.filter(i=>i.lane==='hands').sort((a,b)=>a.start-b.start).forEach(i=>{if(i.start>hEnd+.01){dash(c,x(hEnd),x(i.start),lane.hands+laneH/2);}hEnd=i.end;});
      if(S.order.length===S.tasks.length||S.round===2){if(hEnd<S.sched.total-.01)dash(c,x(hEnd),x(S.sched.total),lane.hands+laneH/2,'手闲');
        const xt=x(S.sched.total);c.strokeStyle='rgba(179,38,30,.85)';c.lineWidth=1.6;c.beginPath();c.moveTo(xt,2);c.lineTo(xt,axisY);c.stroke();
        c.fillStyle='rgba(179,38,30,.95)';c.font=`15px ${BRUSH_FONT}`;c.textAlign=xt>R-40?'right':'left';c.fillText('茶成 '+S.sched.total+'′',xt+(xt>R-40?-4:4),axisY-8);c.textAlign='center';}
      if(t!=null){const xt=x(Math.min(t,maxT));c.strokeStyle=`rgba(${INK},.8)`;c.lineWidth=1.2;c.setLineDash([3,3]);c.beginPath();c.moveTo(xt,0);c.lineTo(xt,axisY);c.stroke();c.setLineDash([]);}
    }
    function dash(c,a,b,y,txt){if(b-a<4)return;c.save();c.setLineDash([2,4]);c.strokeStyle=`rgba(${INK},.35)`;c.lineWidth=1;c.beginPath();c.moveTo(a+2,y);c.lineTo(b-2,y);c.stroke();c.restore();
      if(txt&&b-a>40){c.fillStyle=`rgba(${INK},.45)`;c.font='12px "Noto Serif SC",serif';c.fillText(txt,(a+b)/2,y-9);}}
    /* ---------- 工序签 ---------- */
    function buildCards(){
      cards.innerHTML='';const d=dur();
      S.tasks.forEach(t=>{const b=el('button','tcard'),cv=el('canvas');cv.width=cv.height=80;const cx=cv.getContext('2d');cx.scale(80/40,80/40);ICON[t.id](cx,40);
        const used=S.round===1&&S.order.includes(t.id);if(used)b.classList.add('used');if(S.round===2&&S.crit.has(t.id))b.classList.add('crit');
        b.appendChild(cv);b.appendChild(el('div','tx',`<b>${t.nm}</b><small>${minTxt(d[t.id])}${t.d!==d[t.id]?'（原 '+t.d+'）':''}</small>`));
        const k=S.tokens[t.id]||0;if(k){const tk=el('div','tok');for(let i=0;i<k;i++)tk.appendChild(el('i','','巧'));b.appendChild(tk);}
        b.setAttribute('aria-label',t.nm+'，'+d[t.id]+' 分钟');b.onclick=()=>tapCard(t.id);cards.appendChild(b);});
      if(S.round===2){tok.hidden=false;const left=TEA_TOKENS-used();tok.innerHTML='巧字签 '+Array.from({length:TEA_TOKENS},(_,i)=>`<i class="${i<left?'':'spent'}">巧</i>`).join('');}else tok.hidden=true;
    }
    const used=()=>Object.values(S.tokens).reduce((a,b)=>a+b,0);
    function recompute(){
      if(S.round===1){S.sched=S.order.length?teaSchedule(S.order,S.tasks,dur()):null;S.crit=new Set();}
      else{const d=dur(),o=teaBestOrder(S.tasks);S.sched=teaSchedule(o,S.tasks,d);S.crit=teaCritical(S.tasks,d,o);}
      const total=S.sched?S.sched.total:0;
      ui.meter(`<small>${S.round===1&&S.order.length<S.tasks.length?'已排到':'上茶'}</small><b>${total}</b><small>分钟</small>`);
      buildCards();drawGantt();drawScene();
    }
    /* ---------- 流程 ---------- */
    function round1(){
      S.round=1;S.tasks=TEA_R1;S.order=[];S.tokens={};S.history=[];S.done=false;ui.hideResult();ui.stageName('第一回 · 一壶茶');
      ui.say('客至。水壶要洗，开水没有，茶壶茶杯要洗，茶叶也得去拿。<br>按你想的先后，依次点下面的工序。烧水交给炉子，不占手。');
      ui.acts([['撤回',undo1],['重排',round1]]);recompute();
    }
    function tapCard(id){
      if(S.play>=0)return;
      if(S.round===1){
        if(S.done||S.order.includes(id))return;
        if(!teaCanPlace(S.order,S.tasks,id)){audio.low();ui.say('水壶还没洗，不能烧水。');return;}
        S.order.push(id);audio.tap(S.order.length+2);recompute();
        if(S.order.length===S.tasks.length){S.done=true;replay(()=>finish1());}
        else if(id==='boil')ui.say('水上炉了。炉子在烧，你的手可以接着做别的。');
        return;
      }
      // 第二回：用签
      if(S.done)return;
      if(used()>=TEA_TOKENS){ui.say('三枚签都用了。撤回一签，换个地方试试。');audio.low();return;}
      const d=dur();if(Math.ceil(d[id]/2)>=d[id]){ui.say(`「${byId(id).nm}」只要一分钟，快不了了。`);audio.low();return;}
      const before=S.sched.total,critBefore=new Set(S.crit);
      S.tokens[id]=(S.tokens[id]||0)+1;S.history.push(id);audio.rise();recompute();
      const after=S.sched.total,nm=byId(id).nm;
      let msg=after<before?`茶早了 <b>${before-after}</b> 分钟，现在 <b>${after}</b> 分钟上茶。`:`这一签用在「${nm}」上，茶一分钟也没早——它不在朱色的关键路径上。`;
      if(critBefore.has('boil')&&!S.crit.has('boil'))msg+='<br>留意：朱色挪到手上的活了。现在卡住你的，是那双手。';
      else if(critBefore.has('boil')&&S.crit.has('boil')&&[...S.crit].some(x=>x!=='boil'&&x!=='kettle'))msg+='<br>炉子和那双手同时卡住了你：两条都成了关键路径。';
      ui.say(msg);
      if(used()===TEA_TOKENS)finish2();
    }
    function undo1(){if(S.play>=0||!S.order.length)return;S.done=false;ui.hideResult();S.order.pop();recompute();ui.acts([['撤回',undo1],['重排',round1]]);}
    function replay(done){
      const total=S.sched.total,dur=reduceMotion()?1:Math.min(3200,1200+total*120),t0=performance.now();S.play=0;
      const f=now=>{if(!root.isConnected)return;const k=Math.min(1,(now-t0)/dur),t=k*total*1.02;drawGantt(t);drawScene(t);
        if(k<1)requestAnimationFrame(f);else{S.play=-1;hold(total);done();}};requestAnimationFrame(f);
    }
    let holdRaf=0;
    function hold(total){cancelAnimationFrame(holdRaf);const f=()=>{if(!root.isConnected)return;drawScene(total);holdRaf=requestAnimationFrame(f);};if(!reduceMotion())holdRaf=requestAnimationFrame(f);setTimeout(()=>cancelAnimationFrame(holdRaf),4000);}
    function finish1(){
      const total=S.sched.total,best=teaBest(S.tasks),g=teaGrade1(total,best),b=S.sched.items.find(i=>i.id==='boil');
      S.crit=teaCritical(S.tasks,dur(),S.order);drawGantt();buildCards();audio.arp();
      const why=total<=best?'等水开的十五分钟里，洗壶、洗杯、拿茶叶都做完了。华罗庚管这叫「办法甲」。'
        :b.start>1?`水壶洗好后，隔了 ${b.start-1} 分钟才烧上水。烧水要十五分钟，它该最先上炉，别的活塞进这段空当里。`
        :'水早早烧上了，可手上的活排得比水开还晚。';
      ui.result(g,`你的办法 <b>${total}</b> 分钟　·　最快 <b>${best}</b> 分钟`,why,true);
      ui.say('时间轴上<b>朱色</b>的那几道工序首尾相接、一步都慢不得，这就是<b>关键路径</b>。其余的活，早做晚做都一样。');
      ui.acts([['再排一次',round1],['下一回 →',round2,true]]);
    }
    function round2(){
      S.round=2;S.tasks=TEA_R2;S.order=teaBestOrder(TEA_R2);S.tokens={};S.history=[];S.done=false;ui.hideResult();ui.stageName('第二回 · 三枚巧字签');
      ui.say(`来了六位客人，杯子多，洗杯要 <b>4</b> 分钟。你有三枚「巧」字签：点哪道工序，它就快一倍。<br>能在 <b>${TEA_R2_TARGET}</b> 分钟内上茶吗？`);
      ui.acts([['撤回一签',undo2],['重来',round2]]);recompute();
    }
    function undo2(){if(!S.history.length)return;const id=S.history.pop();S.tokens[id]--;if(!S.tokens[id])delete S.tokens[id];S.done=false;ui.hideResult();recompute();
      ui.say(`收回一枚签，现在 <b>${S.sched.total}</b> 分钟上茶。`);ui.acts([['撤回一签',undo2],['重来',round2]]);}
    function finish2(){
      const total=S.sched.total,g=teaGrade2(total);
      if(total<=TEA_R2_TARGET){S.done=true;replay(()=>{
        ui.result(g,`<b>${total}</b> 分钟上茶　·　烧水两签、洗杯一签`,'前两签给烧水，关键路径就从炉子挪到了手上；最后一签必须跟过去，给洗杯。',true);
        ui.say('这一处妙策参透了。');audio.arp();
        ui.acts([['重来',round2],['题跋 · 钤印',()=>ui.colophon(),true]]);});}
      else{ui.result(g,`三签用完：<b>${total}</b> 分钟上茶　·　目标 <b>${TEA_R2_TARGET}</b> 分钟`,'撤回几签看看：每用一签，朱色的关键路径落在哪里？签要跟着它走。',true);}
    }
    this._resize=()=>{drawGantt();drawScene();};
    round1();
  },
  resize(){this._resize&&this._resize();},
  stop(){this._resize=null;}
};
