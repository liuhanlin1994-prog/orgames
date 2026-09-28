/* 赛马 · 田忌赛马（指派）：孙膑献策 → 擂台（明牌、限一炷香）→ 暗盘（一场一场翻开）
   手感：马是一张张卡，拖进赛道或先点马、再点赛道；几场同时开跑，一秒多出结果。 */
import {RNG} from '../core/rng.js';
import {INK,BRUSH_FONT,paperBase,paperGrain,inkHorse,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {CNUM,beats,maxWins,bestAssign,countWins,sunbinPick,onlineSolver,R1,R2,R3,gradeR2,gradeR3,runTime} from './race-core.js';

const LANE_CN=['一','二','三','四','五','六','七'];
const KING='179,38,30',TIAN='30,91,115';
const coatOf=v=>Math.min(.95,.16+v/12*.8);

/* ---------- 马的画像：按（哪一方, 脚力, 大小）缓存 ---------- */
const spriteCache=new Map();
function sprite(side,v,size,frame){
  const key=side+v+'|'+size+'|'+frame;let c=spriteCache.get(key);if(c)return c;
  const dpr=Math.min(2,window.devicePixelRatio||1);c=document.createElement('canvas');c.width=Math.ceil(size*1.25*dpr);c.height=Math.ceil(size*.95*dpr);
  const x=c.getContext('2d');x.scale(dpr,dpr);
  inkHorse(x,size*.62,size*.86,size,{coat:coatOf(v),seed:(side==='K'?100:200)+v*7,gallop:frame<4?frame:null,rider:side==='K'?KING:TIAN,head:frame===4?0:undefined});
  if(spriteCache.size>400)spriteCache.clear();spriteCache.set(key,c);return c;
}

export const raceLevel={
  id:'race',title:'赛马',concept:'博弈 · 指派',ambience:'race',poem:['今以君之下驷与彼上驷','取君上驷与彼中驷','取君中驷与彼下驷'],poemSrc:'《史记·孙子吴起列传》',
  colophon:{head:'田忌赛马',seal:'孙膑',
    lines:['马不如人，次序可以胜人。','能赢的，用刚好能赢的那匹去赢；赢不了的，派最弱的那匹去输。','马一多，这条规矩依然最好；对方暗出，也照此一场一场地算，步步不吃亏。','谁对谁，胜负全在搭配——此即「指派」之学。'],
    note:'今之派工、排班、配送、竞标，皆是此术。'},
  start(ui,audio){
    const S={round:1,idx:0,opp:[],mine:[],lanes:[],racing:false,sel:-1,faceDown:false,active:-1,tally:{won:0,best:0,good:0,total:0},timer:0,deadline:0,first:true,raf:0};
    const root=el('div','rc'),bar=el('div','rc-bar'),lanesBox=el('div','rc-lanes'),stable=el('div','rc-stable');
    const bg=el('canvas','rc-bg'),fx=el('canvas','rc-fx');lanesBox.appendChild(bg);lanesBox.appendChild(fx);
    root.appendChild(bar);root.appendChild(lanesBox);root.appendChild(stable);ui.stage.appendChild(root);
    let laneEls=[],slotEls=[],cards=[],stamps=[];

    /* ---------- 布局 ---------- */
    function sizes(){const n=S.opp.length||3,h=lanesBox.clientHeight||300;const ch=Math.round(Math.max(38,Math.min(64,h/n*.72,innerWidth<560?50:64)));
      root.style.setProperty('--ch',ch+'px');root.style.setProperty('--cw',Math.round(ch*1.55)+'px');return ch;}
    function drawTrack(){
      const W=lanesBox.clientWidth,H=lanesBox.clientHeight,c=fitCanvas(bg,W,H);paperBase(c,0,0,W,H);
      const n=S.opp.length,lh=H/n;c.fillStyle='rgba(180,150,100,.08)';c.fillRect(0,0,W,H);
      for(let k=1;k<n;k++){c.strokeStyle=`rgba(${INK},.18)`;c.lineWidth=1;c.beginPath();c.moveTo(0,k*lh);c.lineTo(W,k*lh);c.stroke();}
      const r=RNG(5);c.strokeStyle=`rgba(${INK},.07)`;for(let i=0;i<Math.round(W*H/5000);i++){const x=r()*W,y=r()*H;c.beginPath();c.moveTo(x,y);c.lineTo(x+6+r()*14,y+(r()-.5));c.stroke();}
      const fx0=finishX();c.strokeStyle=`rgba(${INK},.8)`;c.lineWidth=2;c.beginPath();c.moveTo(fx0,4);c.lineTo(fx0,H-4);c.stroke();
      c.fillStyle='rgba(179,38,30,.85)';c.beginPath();c.moveTo(fx0,4);c.quadraticCurveTo(fx0+16,8,fx0+22,14);c.lineTo(fx0,20);c.fill();
      paperGrain(c,0,0,W,H,false);
    }
    const finishX=()=>{const lab=laneEls[0]&&laneEls[0].querySelector('.rc-lab');return lab?lab.offsetLeft+lab.offsetWidth+6:66;};

    function buildLanes(){
      [...lanesBox.querySelectorAll('.rc-lane')].forEach(e=>e.remove());laneEls=[];slotEls=[];stamps=[];
      S.opp.forEach((v,k)=>{
        const lane=el('div','rc-lane'),lab=el('div','rc-lab','第'+LANE_CN[k]+'场'),st=el('div','rc-stamp');lab.appendChild(st);
        const slot=el('button','rc-slot');slot.setAttribute('aria-label','第'+LANE_CN[k]+'场，放你的马');slot.dataset.k=k;slot.innerHTML='<span class="ph">派马</span>';
        const opp=horseCard('K',v,k);opp.classList.add('opp');
        lane.appendChild(lab);lane.appendChild(el('div','rc-run'));lane.appendChild(slot);lane.appendChild(el('div','rc-vs','对'));lane.appendChild(opp);
        slot.onclick=()=>{if(dragEnd)return;tapSlot(k);};
        lanesBox.appendChild(lane);laneEls.push(lane);slotEls.push(slot);stamps.push(st);});
    }
    function horseCard(side,v,k){
      const b=el(side==='K'?'div':'button','hc'+(side==='K'?'':' mine'));const cv=el('canvas');cv.width=96;cv.height=72;b.appendChild(cv);
      const num=el('span','v'+(CNUM[v].length>1?' two':''),CNUM[v]);b.appendChild(num);
      if(S.round===1)b.appendChild(el('span','t',R1.tier[k]||''));
      const sp=sprite(side,v,80,4),x=cv.getContext('2d');x.drawImage(sp,0,0,96,72);
      b.setAttribute('aria-label',(side==='K'?'对手的马':'你的马')+'，脚力'+CNUM[v]);return b;
    }
    function setFace(k,down){const card=laneEls[k].querySelector('.hc.opp');card.classList.toggle('face-down',down);card.querySelector('.v').textContent=down?'？':CNUM[S.opp[k]];card.querySelector('canvas').style.visibility=down?'hidden':'';}
    function buildStable(){
      stable.innerHTML='';stable.appendChild(el('div','lbl','田忌'));cards=S.mine.map((v,i)=>{const c=horseCard('T',v,i);c.dataset.i=i;wireCard(c,i);return c;});
      cards.forEach(c=>stable.appendChild(c));
    }
    function returnToStable(i){const c=cards[i];const after=cards.slice(i+1).find(x=>x.parentNode===stable);if(after)stable.insertBefore(c,after);else stable.appendChild(c);}
    function laneOf(i){return S.lanes.indexOf(i);}

    /* ---------- 放马：拖放或点选 ---------- */
    let drag=null,dragEnd=false;
    function wireCard(c,i){
      c.addEventListener('pointerdown',e=>{if(S.racing||e.button>0)return;drag={i,x0:e.clientX,y0:e.clientY,moved:false,pid:e.pointerId};try{c.setPointerCapture(e.pointerId);}catch(_){}});
      c.addEventListener('pointermove',e=>{if(!drag||drag.i!==i)return;
        if(!drag.moved&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)>6){drag.moved=true;const g=c.cloneNode(true);g.classList.add('ghost');g.classList.remove('sel');g.style.width=c.offsetWidth+'px';g.style.height=c.offsetHeight+'px';const gc=g.querySelector('canvas');gc.getContext('2d').drawImage(c.querySelector('canvas'),0,0);ui.stage.closest('#level').appendChild(g);drag.g=g;c.classList.add('lift');select(-1);}
        if(drag.moved){drag.g.style.left=(e.clientX-c.offsetWidth/2)+'px';drag.g.style.top=(e.clientY-c.offsetHeight/2)+'px';const k=slotAt(e.clientX,e.clientY);slotEls.forEach((s,j)=>s.classList.toggle('hot',j===k));}});
      const up=e=>{if(!drag||drag.i!==i)return;const d=drag;drag=null;
        if(d.moved){d.g.remove();c.classList.remove('lift');slotEls.forEach(s=>s.classList.remove('hot'));const k=slotAt(e.clientX,e.clientY);
          if(k>=0)place(i,k);else if(e.type==='pointerup'&&stable.contains(document.elementFromPoint(e.clientX,e.clientY)))unplace(i);
          dragEnd=true;setTimeout(()=>dragEnd=false,0);}};
      c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
      c.addEventListener('click',()=>{if(dragEnd||S.racing)return;tapCard(i);});
    }
    function slotAt(x,y){for(let k=0;k<slotEls.length;k++){const s=slotEls[k];if(s.classList.contains('off'))continue;const r=s.getBoundingClientRect(),pad=10;if(x>=r.left-pad&&x<=r.right+pad&&y>=r.top-pad&&y<=r.bottom+pad)return k;}return -1;}
    function select(i){S.sel=i;cards.forEach((c,j)=>c.classList.toggle('sel',j===i));slotEls.forEach((s,k)=>s.classList.toggle('hot',i>=0&&S.lanes[k]<0&&!s.classList.contains('off')));}
    function tapCard(i){
      const k=laneOf(i);
      if(S.faceDown){if(k<0&&S.active>=0)place(i,S.active);return;}
      if(k>=0){if(S.sel>=0&&S.sel!==i){const j=S.sel;const kj=laneOf(j);place(j,k);if(kj>=0)place(i,kj);}else unplace(i);select(-1);return;}
      if(S.sel===i){select(-1);return;}
      const empty=S.lanes.map((v,kk)=>v<0?kk:-1).filter(kk=>kk>=0);
      if(empty.length===1){place(i,empty[0]);return;}
      select(i);audio.tap(3+i%4);
    }
    function tapSlot(k){
      if(S.racing)return;if(S.faceDown&&k!==S.active)return;
      if(S.sel>=0){const j=S.sel,kj=laneOf(j),prev=S.lanes[k];place(j,k);if(prev>=0&&prev!==j){if(kj>=0)place(prev,kj);else returnToStable(prev);}select(-1);return;}
      if(S.lanes[k]>=0)unplace(S.lanes[k]);
    }
    function place(i,k){
      if(S.racing||(S.faceDown&&k!==S.active))return;const old=laneOf(i);if(old>=0){S.lanes[old]=-1;markSlot(old);}
      const prev=S.lanes[k];if(prev>=0&&prev!==i){S.lanes[k]=-1;returnToStable(prev);}
      S.lanes[k]=i;slotEls[k].appendChild(cards[i]);markSlot(k);audio.tap(5+k%3);select(-1);afterPlace(k);
    }
    function unplace(i){const k=laneOf(i);if(k<0)return;S.lanes[k]=-1;markSlot(k);returnToStable(i);audio.tap(2);refreshActs();}
    function markSlot(k){slotEls[k].classList.toggle('filled',S.lanes[k]>=0);const ph=slotEls[k].querySelector('.ph');if(ph)ph.style.display=S.lanes[k]>=0?'none':'';}
    function afterPlace(k){if(S.faceDown){slotEls[k].classList.remove('active');raceLanes([k],()=>afterReveal(k));return;}refreshActs();}

    /* ---------- 跑马：几场同时开跑 ---------- */
    function raceLanes(ks,done){
      S.racing=true;select(-1);clearInterval(S.timer);if(drag&&drag.g){drag.g.remove();cards[drag.i].classList.remove('lift');}drag=null;document.querySelectorAll('.hc.ghost').forEach(g=>g.remove());const W=lanesBox.clientWidth,H=lanesBox.clientHeight,n=S.opp.length,lh=H/n;
      const size=Math.round(Math.min(lh*.8,W*.16,120)),x1=finishX()+size*.44,cc=fitCanvas(fx,W,H);
      const runs=ks.map(k=>{const slot=slotEls[k],sr=slot.getBoundingClientRect(),br=lanesBox.getBoundingClientRect(),x0=sr.left-br.left+sr.width*.9;
        const kv=S.opp[k],tv=S.mine[S.lanes[k]];laneEls[k].classList.add('racing');
        return{k,kv,tv,x0,tk:runTime(kv,true),tt:runTime(tv,false),yK:k*lh+lh*.66,yT:k*lh+lh*.98,done:false};});
      const still=S.doneRuns||[];
      const quick=reduceMotion(),T=Math.max(...runs.map(r=>Math.max(r.tk,r.tt)));audio.gallop(Math.min(1.8,T),.4);
      let t0=null;
      const f=now=>{if(!root.isConnected)return;if(t0==null)t0=now;const el_=quick?1e4:(now-t0)/1000,fr=Math.floor(el_*1000/80)%4;cc.clearRect(0,0,W,H);
        const nums=r=>{cc.font=`${Math.round(Math.max(14,size*.3))}px ${BRUSH_FONT}`;cc.textAlign='left';cc.textBaseline='middle';cc.fillStyle=`rgba(${KING},.9)`;cc.fillText(CNUM[r.kv],x1+size*.66,r.yK-size*.45);cc.fillStyle=`rgba(${TIAN},.95)`;cc.fillText(CNUM[r.tv],x1+size*.66,r.yT-size*.45);};
        for(const r of still){cc.drawImage(sprite('K',r.kv,size,4),x1-size*.62,r.yK-size*.86,size*1.25,size*.95);cc.drawImage(sprite('T',r.tv,size,4),x1-size*.62,r.yT-size*.86,size*1.25,size*.95);nums(r);}
        for(const r of runs){const pk=Math.min(1,el_/r.tk),pt=Math.min(1,el_/r.tt),ease=p=>p<.15?p*p/.3:p-.075;
          const xk=r.x0+(x1-r.x0)*Math.min(1,ease(pk)/.925),xt=r.x0+(x1-r.x0)*Math.min(1,ease(pt)/.925);
          cc.drawImage(sprite('K',r.kv,size,pk>=1?4:fr),xk-size*.62,r.yK-size*.86,size*1.25,size*.95);
          cc.drawImage(sprite('T',r.tv,size,pt>=1?4:(fr+2)%4),xt-size*.62,r.yT-size*.86,size*1.25,size*.95);
          if(pk>=1&&pt>=1)nums(r);
          if(!r.done&&pk>=1&&pt>=1){r.done=true;r.win=beats(r.tv,r.kv);const st=stamps[r.k];st.textContent=r.win?'胜':'负';st.className='rc-stamp '+(r.win?'win':'lose');r.win?audio.cheer(.06):audio.low();}}
        if(runs.every(r=>r.done)){S.racing=false;if(S.faceDown){S.doneRuns=still.concat(runs);runs.forEach(r=>slotEls[r.k].classList.add('lock'));}done(runs);return;}
        S.raf=requestAnimationFrame(f);};
      S.raf=requestAnimationFrame(f);
    }
    function clearRace(){cancelAnimationFrame(S.raf);S.doneRuns=[];const W=lanesBox.clientWidth,H=lanesBox.clientHeight;fitCanvas(fx,W,H);laneEls.forEach(l=>l.classList.remove('racing'));stamps.forEach(s=>{s.className='rc-stamp';s.textContent='';});
      lanesBox.querySelectorAll('.rc-ghostv').forEach(g=>g.remove());}

    /* ---------- 摆一局 ---------- */
    function setup(opp,mine,faceDown){
      clearRace();S.opp=opp;S.mine=mine;S.lanes=opp.map(()=>-1);S.sel=-1;S.faceDown=!!faceDown;S.active=-1;S.racing=false;
      sizes();buildLanes();buildStable();requestAnimationFrame(()=>{sizes();drawTrack();});
      if(faceDown){opp.forEach((v,k)=>{setFace(k,true);slotEls[k].classList.add('off');});}
    }
    function refreshActs(){if(S.round===1)ui.acts([['开赛',go1,true,S.lanes.some(v=>v<0)]]);else if(S.round===2)ui.acts([['开赛',()=>go2(false),true,S.lanes.some(v=>v<0)]]);}

    /* ---------- 第一回：孙膑献策 ---------- */
    function round1(){
      S.round=1;ui.hideResult();ui.stageName('第一回 · 孙膑献策');ui.meter('');bar.innerHTML='<span class="nm">齐威王</span><span>按上、中、下出马，三场两胜，赌千金</span>';
      setup(R1.king.slice(),R1.mine.slice());
      ui.say('每匹马上的数字是脚力，同场相遇，脚力高的先到；一样快，齐王胜。你的三匹每一等都比齐王的慢一截。<br>把你的马<b>拖进</b>各场的空位（或先点马、再点空位），排好了开赛。');refreshActs();
    }
    function go1(){if(S.racing||S.lanes.some(v=>v<0))return;ui.acts([]);
      raceLanes(S.opp.map((v,k)=>k),runs=>{const w=runs.filter(r=>r.win).length;
        if(w>=2){audio.arp();ui.result('千金',`三场 <b>${w}</b> 胜 <b>${3-w}</b> 负`,'下驷对上驷，上驷对中驷，中驷对下驷：输一场，赢两场。马一匹没换，只换了次序。',true);
          ui.say('孙膑的道理：<b>赢不了的，派最弱的去输；能赢的，用刚好能赢的去赢。</b>下一回，马多了，还要跟时间赛跑。');ui.acts([['再赛一局',round1],['下一回 →',round2,true]]);}
        else{ui.result('输了',`三场 <b>${w}</b> 胜 <b>${3-w}</b> 负`,w===0?'同等相对，每一场都慢一截。':'赢了一场还不够。哪一场可以故意输掉？',true);
          ui.say('把马拖回来换个次序再试。');ui.acts([['再排',()=>{ui.hideResult();clearRace();refreshActs();},true]]);}});}

    /* ---------- 第二回：擂台（明牌，限一炷香） ---------- */
    function round2(){S.round=2;S.idx=0;S.tally={won:0,best:0,good:0,total:0};ui.stageName('第二回 · 擂台');ui.hideResult();
      ui.say('三位诸侯轮番上擂台，他们的次序明摆着。<b>一炷香</b>之内排好你的马，香尽了就按现在的样子开跑。');next2();}
    function next2(){
      const c=R2[S.idx];S.first=true;ui.hideResult();setup(c.opp.slice(),c.mine.slice());
      bar.innerHTML=`<span class="nm">${c.nm}</span><span>第 ${S.idx+1} / ${R2.length} 位 · ${c.opp.length} 场</span>`;
      const inc=el('div','rc-incense','<span>一炷香</span><div class="stick"><div class="burn"></div></div>');bar.appendChild(inc);
      meter2();refreshActs();S.deadline=performance.now()+(reduceMotion()?c.secs*2:c.secs)*1000;const burn=inc.querySelector('.burn'),total=c.secs*1000;
      clearInterval(S.timer);S.timer=setInterval(()=>{if(!root.isConnected){clearInterval(S.timer);return;}const left=S.deadline-performance.now(),k=Math.max(0,left/total);
        burn.style.width=(k*100)+'%';inc.classList.toggle('low',k<.25);if(left<=0){clearInterval(S.timer);go2(true);}},100);
    }
    function meter2(){ui.meter(`<small>已胜</small><b>${S.tally.won}</b><small>场 · 最多 ${S.tally.best}</small>`);}
    function go2(timeout){
      if(S.racing)return;clearInterval(S.timer);const c=R2[S.idx];
      if(timeout){const free=S.mine.map((v,i)=>i).filter(i=>laneOf(i)<0);S.lanes.forEach((v,k)=>{if(v<0){const i=free.splice(Math.floor(Math.random()*free.length),1)[0];S.lanes[k]=i;slotEls[k].appendChild(cards[i]);markSlot(k);}});ui.say('香尽了！没排的马随便上了场。');}
      ui.acts([]);raceLanes(S.opp.map((v,k)=>k),runs=>{
        const w=runs.filter(r=>r.win).length,best=maxWins(c.mine,c.opp);
        if(S.first){S.tally.won+=w;S.tally.best+=best;S.first=false;}meter2();
        const perfect=w>=best;perfect?audio.arp():audio.low();
        ui.result(perfect?'妙':'可惜',`${c.nm}：你赢 <b>${w}</b> 场 · 最多能赢 <b>${best}</b> 场（共 ${c.opp.length} 场）`,
          perfect?'能赢的用刚好能赢的，赢不了的派最弱的去送——一场不亏。':'有的马赢得太「奢侈」：用快马去赢慢马，便没有快马去赢该赢的那场了。',true);
        const L=[];if(!perfect)L.push(['看孙膑怎么排',showBest]);L.push(['再排一次（不计分）',retry2]);
        L.push(S.idx<R2.length-1?['下一位 →',()=>{S.idx++;next2();},true]:['擂台收官 →',finish2,true]);ui.acts(L);
      });
    }
    function showBest(){const lanes=bestAssign(S.mine,S.opp);lanes.forEach((i,k)=>{const g=el('div','rc-ghostv',CNUM[S.mine[i]]);slotEls[k].appendChild(g);});
      ui.say('朱字是孙膑的排法：从对手最弱的马看起，用<b>刚好能赢它</b>的那匹去赢；实在赢不了的，就派你最弱的马去送。');}
    function retry2(){const c=R2[S.idx];const first=S.first;setup(c.opp.slice(),c.mine.slice());S.first=first;ui.hideResult();bar.querySelector('.rc-incense')&&bar.querySelector('.rc-incense').remove();refreshActs();ui.say('不计分，慢慢排。');}
    function finish2(){ui.hideResult();const g=gradeR2(S.tally.won,S.tally.best);audio.arp();
      ui.result(g,`三位诸侯：你赢 <b>${S.tally.won}</b> 场 · 最多能赢 <b>${S.tally.best}</b> 场`,g==='至妙'?'场场算尽。马不如人，次序可以胜人。':'规矩只有一句：能赢，用刚好能赢的；赢不了，派最弱的。',true);
      ui.say('下一回，诸侯们学精了：<b>不亮次序</b>，一场一场地翻牌。');ui.acts([['再打擂台',round2],['下一回 →',round3,true]]);}

    /* ---------- 第三回：暗盘（一场一场翻开） ---------- */
    function round3(){S.round=3;S.idx=0;S.tally={won:0,best:0,good:0,total:0};ui.stageName('第三回 · 暗盘');ui.hideResult();
      ui.say('诸侯只让你知道他有哪几匹马，出场次序不亮。每翻开一场，就从剩下的马里派一匹上场——<b>点一下马就派上去</b>。');next3();}
    function next3(){
      const c=R3[S.idx],order=c.opp.map((v,k)=>k).sort(()=>Math.random()-.5);S.cur={c,opp:order.map(k=>c.opp[k]),good:0,won:0,mm:0,om:0};
      setup(S.cur.opp.slice(),c.mine.slice(),true);S.solver=onlineSolver(c.mine,S.cur.opp);S.cur.mm=S.solver.full;S.cur.om=S.solver.full;
      bar.innerHTML=`<span class="nm">${c.nm}</span><span>的马：</span><span class="chips">${[...c.opp].sort((a,b)=>b-a).map(v=>`<span class="chip" data-v="${v}">${CNUM[v]}</span>`).join('')}</span><span class="rc-prog">第 ${S.idx+1} / ${R3.length} 位</span>`;
      ui.acts([]);meter3();setTimeout(()=>reveal(0),450);
    }
    function meter3(){ui.meter(`<small>妙手</small><b>${S.tally.good}</b><small>/ ${S.tally.total} 步</small>`);}
    function reveal(k){if(!root.isConnected)return;S.active=k;setFace(k,false);slotEls[k].classList.remove('off');slotEls[k].classList.add('active');audio.paper();
      const chip=[...bar.querySelectorAll('.chip:not(.gone)')].find(x=>+x.dataset.v===S.opp[k]);chip&&chip.classList.add('gone');
      ui.say(`第${LANE_CN[k]}场翻开：对手出脚力<b>${CNUM[S.opp[k]]}</b>的马。派哪一匹？`);}
    function afterReveal(k){
      const i=S.lanes[k],c=S.cur,good=S.solver.isBest(c.mm,c.om,k,i);slotEls[k].classList.remove('active');
      c.mm&=~(1<<i);c.om&=~(1<<k);if(good)c.good++;if(beats(S.mine[i],S.opp[k]))c.won++;S.tally.good+=good?1:0;S.tally.total++;meter3();
      if(!good){const avail=[];for(let j=0;j<S.mine.length;j++)if((c.mm|(1<<i))>>j&1)avail.push(j);const g=sunbinPick(S.mine,avail,S.opp[k]);const sr=slotEls[k].getBoundingClientRect(),st=ui.stage.getBoundingClientRect();ui.flash('派'+CNUM[S.mine[g]]+'更好',sr.left-st.left+sr.width/2,sr.top-st.top);}
      S.active=-1;
      if(k+1<S.opp.length){setTimeout(()=>reveal(k+1),good?350:900);return;}
      const hind=maxWins(c.c.mine,S.opp);audio.arp();
      ui.result(c.good===S.opp.length?'妙':'复盘',`${c.c.nm}：赢 <b>${c.won}</b> 场 · 妙手 <b>${c.good}</b> / ${S.opp.length} · 若次序全亮，最多赢 ${hind} 场`,
        c.good===S.opp.length?'步步不亏。暗牌时一场一场算，还是那句话：能赢用刚好赢的，赢不了派最弱的。':'不是妙手的那几步，要么用快马去赢了本可以用慢马赢的，要么赢不了却没派最弱的马去送。',true);
      ui.acts(S.idx<R3.length-1?[['下一位 →',()=>{S.idx++;ui.hideResult();next3();},true]]:[['收官 →',finish3,true]]);
    }
    function finish3(){ui.hideResult();const g=gradeR3(S.tally.good,S.tally.total);audio.arp();
      ui.result(g,`三位诸侯：妙手 <b>${S.tally.good}</b> / ${S.tally.total} 步`,'明牌能排尽，暗牌也不慌：一场一场地算「刚好能赢」和「最弱去送」，每一步都是最好的一步——我们用精确解逐一验过。',true);
      ui.say('马不如人，次序可以胜人。这一处参透了。');ui.acts([['再来暗盘',round3],['题跋 · 钤印',()=>ui.colophon(),true]]);}

    this._resize=()=>{if(!S.opp.length)return;sizes();drawTrack();};
    this._stop=()=>{clearInterval(S.timer);cancelAnimationFrame(S.raf);document.querySelectorAll('.hc.ghost').forEach(g=>g.remove());};
    round1();
  },
  resize(){this._resize&&this._resize();},
  stop(){this._stop&&this._stop();this._resize=null;}
};
