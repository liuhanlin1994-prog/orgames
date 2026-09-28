/* 马市 · 最优停止：亲自相马 → 定规矩推演一千次 → 百匹马 */
import {RNG,Noise1} from '../core/rng.js';
import {INK,BRUSH_FONT,paperBase,paperGrain,brush,inkHorse,drawPeak,person,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {stopWinExact,stopBestK,stopSimulate,stopGrade,relRank} from './horse-core.js';

const CN='〇一二三四五六七八九十';
const COATS=[{nm:'乌骓',coat:.88},{nm:'青骢',coat:.5},{nm:'白驹',coat:.16},{nm:'花骢',coat:.42,spots:1},{nm:'黄骠',coat:.3},{nm:'赤骝',coat:.64}];
const cnNum=n=>n<=10?CN[n]:n<20?'十'+CN[n-10]:CN[Math.floor(n/10)]+'十'+(n%10?CN[n%10]:'');
const pct=p=>(p*100).toFixed(1)+'%';

export const horseLevel={
  id:'horse',title:'马市',concept:'最优停止',ambience:'market',poem:['世有伯乐','然后有千里马'],poemSrc:'韩愈《马说》',
  colophon:{head:'最优停止',seal:'伯乐',
    lines:['马一匹匹过，看过不能回头，何时出手？','先只看不买约三成七，记住其中最好的；','之后遇到比它更好的，立刻买下。','此法不能保证每回都得千里马，却是赢面最大的规矩：人越多，赢面越近三成七。'],
    note:'今之招聘、租房、定价、择时，皆可借此。'},
  start(ui,audio){
    const S={round:1,n:10,vals:[],horses:[],idx:0,tries:new Map(),k:3,curve:false,anim:0};
    const root=el('div','hm');ui.stage.appendChild(root);
    let cvBg,cvFg,card,pips;

    /* ---------- 第一回：亲自相马 ---------- */
    function drawYard(){
      const W=root.clientWidth,H=root.clientHeight,c=fitCanvas(cvBg,W,H);paperBase(c,0,0,W,H);
      const g=H*.8;
      const hills={base:g-H*.18,a:.3,c:0,ink:'70,80,92',cun:.4,lw:1.2,occ:.6,peaks:[{x:W*.2,h:H*.16,wl:W*.2,wr:W*.16,k:1.3,seed:11},{x:W*.55,h:H*.24,wl:W*.18,wr:W*.2,k:1.5,seed:12},{x:W*.86,h:H*.14,wl:W*.2,wr:W*.2,k:1.2,seed:13}]};
      [...hills.peaks].sort((a,b)=>b.h-a.h).forEach(p=>drawPeak(c,p,hills,false));
      c.strokeStyle=`rgba(${INK},.45)`;c.lineWidth=1.2;c.beginPath();c.moveTo(0,g);c.lineTo(W,g);c.stroke();
      const n=Noise1(RNG(4));c.strokeStyle=`rgba(${INK},.35)`;c.lineWidth=1;
      const fy=g-H*.12;c.beginPath();c.moveTo(W*.02,fy);c.lineTo(W*.98,fy);c.moveTo(W*.02,fy+H*.05);c.lineTo(W*.98,fy+H*.05);c.stroke();
      for(let x=W*.03;x<W*.98;x+=Math.max(26,W/28)){c.beginPath();c.moveTo(x,fy-6);c.lineTo(x,g-H*.04);c.stroke();}
      const r=RNG(8);for(let i=0;i<60;i++){const x=r()*W,y=g+r()*H*.16,L=4+r()*8;c.strokeStyle=`rgba(${INK},${.1+r()*.2})`;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+(r()-.5)*4,y-L*.6,x+(r()-.5)*6,y-L);c.stroke();}
      person(c,W*.86,g,Math.min(70,H*.2));
      paperGrain(c,0,0,W,H,false);
    }
    function horseSize(){return Math.min(root.clientWidth*.46,root.clientHeight*.58*1.25);}
    function drawHorseAt(x,phase,bob){const W=root.clientWidth,H=root.clientHeight,c=fitCanvas(cvFg,W,H);c.clearRect(0,0,W,H);
      const h=S.horses[S.idx];inkHorse(c,x,H*.8+(bob||0),horseSize(),{coat:h.coat,spots:h.spots,seed:h.seed,phase,head:h.head});}
    function walk(from,to,done){
      const t0=performance.now(),dur=reduceMotion()?1:950;S.anim++;const my=S.anim;
      const f=now=>{if(!root.isConnected||my!==S.anim)return;const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,2),x=from+(to-from)*e;
        drawHorseAt(x,Math.floor((now-t0)/190)%2,k<1?-Math.abs(Math.sin((now-t0)/190*Math.PI))*3:0);if(k<1)requestAnimationFrame(f);else done&&done();};requestAnimationFrame(f);
    }
    function round1(){
      S.round=1;S.n=10;S.idx=0;root.innerHTML='';ui.hideResult();ui.stageName('第一回 · 亲自相马');ui.meter('');
      cvBg=el('canvas','hm-bg');cvFg=el('canvas','hm-fg');card=el('div','hm-card');pips=el('div','hm-pips');[cvBg,cvFg,card,pips].forEach(e=>root.appendChild(e));
      const r=Math.random;S.vals=Array.from({length:S.n},()=>r());
      S.horses=S.vals.map((v,i)=>{const c=COATS[Math.floor(r()*COATS.length)];return{nm:c.nm,coat:c.coat,spots:c.spots,seed:Math.floor(r()*1e6),head:r()<.4?1:0};});
      pips.innerHTML=Array.from({length:S.n},()=>'<i></i>').join('');
      drawYard();
      ui.say('马贩牵马一匹匹过，一共<b>十匹</b>。每匹只能当场<b>买下</b>或<b>放走</b>，放走的就被牵走了，不能回头。<br>你只知道它在已看过的马里排第几。挑中全场最好的那匹，才算买到千里马。');
      show();
    }
    function show(){
      const W=root.clientWidth,h=S.horses[S.idx],rank=relRank(S.vals,S.idx);
      pips.querySelectorAll('i').forEach((p,i)=>{p.className=i<S.idx?'seen':i===S.idx?'cur':'';});
      card.style.opacity=0;audio.tap(S.idx);
      walk(W+horseSize()*.6,W*.48,()=>{
        card.innerHTML=`<div class="n">第${cnNum(S.idx+1)}匹 · ${h.nm}</div><div class="r">已看 ${cnNum(S.idx+1)} 匹　居第 <b>${cnNum(rank)}</b>${rank===1?'　至今最好':''}</div>`;card.style.opacity=1;
        const last=S.idx===S.n-1;
        ui.acts(last?[['买下（最后一匹）',buy,true]]:[['放走 →',pass],['买下',buy,true]]);
      });
      ui.acts([]);
    }
    function pass(){const W=root.clientWidth;ui.acts([]);card.style.opacity=0;walk(W*.48,-horseSize()*.7,()=>{S.idx++;show();});}
    function buy(){
      ui.acts([]);card.style.opacity=0;audio.rise();
      const best=S.vals.indexOf(Math.max(...S.vals)),got=S.idx===best;
      setTimeout(()=>revealAll(S.idx,best,got),450);
    }
    function revealAll(pick,best,got){
      const W=root.clientWidth,H=root.clientHeight,c=fitCanvas(cvFg,W,H);c.clearRect(0,0,W,H);
      const ranks=S.vals.map(v=>1+S.vals.filter(u=>u>v).length),cols=S.n,cw=W/cols,s=Math.min(cw*1.05,H*.3),y=H*.62;
      c.fillStyle=`rgba(242,233,214,.82)`;c.fillRect(0,0,W,H);
      S.horses.forEach((h,i)=>{const x=cw*(i+.5);inkHorse(c,x,y,s,{coat:h.coat,spots:h.spots,seed:h.seed,phase:i%2,head:h.head});
        c.fillStyle=ranks[i]===1?'rgba(179,38,30,.95)':`rgba(${INK},.8)`;c.font=`${Math.max(14,Math.min(22,cw*.3))}px ${BRUSH_FONT}`;c.textAlign='center';
        c.fillText(ranks[i]===1?'千里马':'第'+cnNum(ranks[i]),x,y+Math.max(18,s*.22));
        if(i===pick){c.strokeStyle='rgba(179,38,30,.85)';c.lineWidth=2;c.beginPath();c.ellipse(x,y-s*.3,cw*.46,s*.42,0,0,7);c.stroke();c.fillStyle='rgba(179,38,30,.9)';c.font=`${Math.max(12,Math.min(16,cw*.22))}px ${BRUSH_FONT}`;c.fillText('你买的',x,y-s*.78);}
        if(i>pick){c.fillStyle='rgba(242,233,214,.45)';c.fillRect(cw*i,y-s*.8,cw,s*1.1);}
      });
      pips.innerHTML='';
      if(got)audio.arp();else audio.low();
      ui.result(got?'得之':'失之',`你在第 <b>${cnNum(pick+1)}</b> 匹出手　·　千里马是第 <b>${cnNum(best+1)}</b> 匹`,
        got?'买到了千里马。可这一回靠的是眼力，还是运气？':best<pick?'千里马早被你放走了。':'出手早了，千里马还在后头。');
      ui.say('只相一次，分不出方法的好坏：好方法也会走眼，乱买也会撞上。<br>下一回，定一条规矩，让长卷替你推演一千次。');
      ui.acts([['再相一次',round1],['下一回 →',()=>lab(10),true]]);
    }

    /* ---------- 第二、三回：定规矩，推演一千次 ---------- */
    let grid,chart,rule,big,slider,lastRun=null;
    function lab(n){
      S.round=n===10?2:3;S.n=n;S.tries=new Map();S.curve=false;S.k=n===10?1:10;lastRun=null;
      root.innerHTML='';ui.hideResult();ui.stageName(n===10?'第二回 · 定规矩':'第三回 · 百匹马');
      const wrap=el('div','hm-lab'),panel=el('div','hm-panel');
      rule=el('div','hm-rule');
      rule.innerHTML=`<div>规矩：先只看不买 <b id="hmK">${S.k}</b> 匹；之后遇到比前面都好的，立刻买下。</div><input type="range" id="hmSlider" min="0" max="${n-1}" value="${S.k}" aria-label="先只看不买的匹数">`;
      big=el('div','hm-big','推演一千次，看这条规矩有几回买到千里马。');grid=el('div','hm-grid');grid.appendChild(el('canvas'));
      panel.appendChild(rule);panel.appendChild(big);panel.appendChild(grid);
      chart=el('div','hm-chart');chart.appendChild(el('canvas'));
      wrap.appendChild(panel);wrap.appendChild(chart);root.appendChild(wrap);
      slider=rule.querySelector('input');slider.oninput=()=>{S.k=+slider.value;rule.querySelector('#hmK').textContent=S.k;drawChart();};
      ui.meter('');
      ui.say(n===10?`还是十匹马。拖动滑杆定下规矩，点<b>推演一千次</b>。多试几条规矩，看看赢面怎么变。`
                    :`这回马市来了<b>一百匹</b>马。先看多少匹最好？`);
      setActs();drawGrid(null);drawChart();
    }
    function setActs(){
      const list=[['推演一千次',run,true]];
      if(S.tries.size>=3&&!S.curve)list.push(['看完整曲线',()=>{S.curve=true;audio.gliss();drawChart();setActs();ui.say(curveSay());}]);
      if(S.tries.size>=1)list.push(['定下这条规矩',settle]);
      ui.acts(list);
    }
    function curveSay(){const b=stopBestK(S.n);return S.n===10?`墨线是每条规矩的真实赢面。山顶在<b>先看 ${b.k} 匹</b>，约 ${pct(b.p)}；先看 4 匹几乎一样好。`
      :`山顶在<b>先看 ${b.k} 匹</b>，约 ${pct(b.p)}。一百匹里先看三成七——人越多，这个比例越接近 1/e ≈ 36.8%。`;}
    function run(){
      const trials=1000,res=stopSimulate(S.n,S.k,trials,Math.random),wins=res.reduce((a,b)=>a+b,0);
      S.tries.set(S.k,wins/trials);lastRun=res;audio.tap(3);
      big.innerHTML=`先看 ${S.k} 匹：一千回里买到千里马 <b>${wins}</b> 回`;
      drawGrid(res,true);drawChart();setActs();
      if(S.tries.size===1)ui.say('每个朱点是一回买到了千里马。换一条规矩再推演，右边的图会记下每一次。');
      else if(S.tries.size===3&&!S.curve)ui.say('已经试了三条规矩。可以接着试，也可以看看完整的曲线。');
    }
    function drawGrid(res,animate){
      const cv=grid.querySelector('canvas'),W=grid.clientWidth,H=grid.clientHeight,c=fitCanvas(cv,W,H);
      const cols=50,rows=20,cw=W/cols,rh=H/rows,r=Math.max(1.2,Math.min(cw,rh)*.32);
      const paint=upto=>{c.clearRect(0,0,W,H);for(let i=0;i<1000;i++){const x=(i%cols+.5)*cw,y=(Math.floor(i/cols)+.5)*rh;
        if(res&&i<upto){c.fillStyle=res[i]?'rgba(179,38,30,.9)':`rgba(${INK},.22)`;c.beginPath();c.arc(x,y,res[i]?r*1.15:r*.8,0,7);c.fill();}
        else{c.fillStyle=`rgba(${INK},.06)`;c.beginPath();c.arc(x,y,r*.7,0,7);c.fill();}}};
      if(!res||!animate||reduceMotion()){paint(res?1000:0);return;}
      let upto=0;const step=()=>{if(!grid.isConnected)return;upto+=45;paint(upto);if(upto<1000)requestAnimationFrame(step);};step();
    }
    function drawChart(){
      const cv=chart.querySelector('canvas'),W=chart.clientWidth,H=chart.clientHeight,c=fitCanvas(cv,W,H);c.clearRect(0,0,W,H);
      const L=42,R=W-14,T=16,B=H-34,maxY=S.n===10?.5:.45,X=k=>L+(R-L)*k/(S.n-1),Y=p=>B-(B-T)*p/maxY,n=Noise1(RNG(2));
      c.font='12px "Noto Serif SC",serif';c.fillStyle=`rgba(${INK},.6)`;c.textAlign='right';c.textBaseline='middle';
      for(let p=0;p<=maxY+1e-9;p+=.1){c.strokeStyle=`rgba(${INK},${p?.08:.4})`;c.lineWidth=1;c.beginPath();c.moveTo(L,Y(p));c.lineTo(R,Y(p));c.stroke();c.fillText(Math.round(p*100)+'%',L-6,Y(p));}
      c.textAlign='center';c.textBaseline='top';const st=S.n===10?1:10;
      for(let k=0;k<S.n;k+=st){c.fillText(k,X(k),B+6);}if(S.n===100)c.fillText('99',X(99),B+6);
      c.fillText('先只看不买的匹数',(L+R)/2,B+20);
      c.save();c.translate(12,(T+B)/2);c.rotate(-Math.PI/2);c.fillText('买到千里马的赢面',0,-6);c.restore();
      if(S.curve){const pts=[];for(let k=0;k<S.n;k+=S.n===10?.25:1){const kk=Math.floor(k),fr=k-kk,p=kk>=S.n-1?stopWinExact(S.n,S.n-1):stopWinExact(S.n,kk)*(1-fr)+stopWinExact(S.n,kk+1)*fr;pts.push([X(k),Y(p)]);}
        brush(c,pts,{noise:n,w:2.6,a:.8,dry:.15,off:3,taper:.2});
        const b=stopBestK(S.n);c.fillStyle=`rgba(${INK},.85)`;c.beginPath();c.arc(X(b.k),Y(b.p),4,0,7);c.fill();c.font=`15px ${BRUSH_FONT}`;c.textBaseline='bottom';c.fillText('山顶 · 先看 '+b.k,X(b.k),Y(b.p)-8);c.textBaseline='top';c.font='12px "Noto Serif SC",serif';}
      // 当前规矩
      c.strokeStyle='rgba(179,38,30,.35)';c.setLineDash([3,4]);c.beginPath();c.moveTo(X(S.k),T);c.lineTo(X(S.k),B);c.stroke();c.setLineDash([]);
      S.tries.forEach((p,k)=>{c.fillStyle='rgba(179,38,30,.92)';c.beginPath();c.arc(X(k),Y(p),5,0,7);c.fill();
        c.fillStyle=`rgba(${INK},.8)`;c.textBaseline='bottom';c.fillText(Math.round(p*100)+'%',X(k),Y(p)-7);c.textBaseline='top';});
    }
    function settle(){
      const p=stopWinExact(S.n,S.k),b=stopBestK(S.n),g=stopGrade(S.n,S.k);audio.arp();
      ui.result(g,`你的规矩：先看 <b>${S.k}</b> 匹，赢面 <b>${pct(p)}</b>　·　最好的规矩：先看 <b>${b.k}</b> 匹，<b>${pct(b.p)}</b>`,
        g==='至妙'?'正落在山顶。评的是规矩本身，不是某一回的运气。':S.k<b.k?'看得太少：心里还没数，就急着出手了。':'看得太多：好马多半已经被你放走了。');
      if(!S.curve){S.curve=true;drawChart();}
      if(S.round===2){ui.say(curveSay()+'<br>下一回马多了，这座山的山顶会移到哪里？');ui.acts([['再试试',()=>{ui.hideResult();setActs();}],['下一回 →',()=>lab(100),true]]);}
      else{ui.say(curveSay());ui.acts([['再试试',()=>{ui.hideResult();setActs();}],['题跋 · 钤印',()=>ui.colophon(),true]]);}
    }
    this._resize=()=>{if(S.round===1){if(cvBg){drawYard();if(S.horses.length)drawHorseAt(root.clientWidth*.48,0,0);}}else{drawGrid(lastRun,false);drawChart();}};
    round1();
  },
  resize(){this._resize&&this._resize();},
  stop(){this._resize=null;}
};
