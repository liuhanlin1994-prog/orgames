/* 七洲洋 · 旅行商：凭直觉落笔 → 替老舵工解结 → 群岛巧解 */
import {RNG,Noise1} from '../core/rng.js';
import {INK,paperBase,paperGrain,brush,drawPeak,pagoda,boat,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {tourLen,geng,heldKarp,nearestTour,crossings,twoOptMove,bestImprove,orOpt,bestKnown,genIslands,tangledTour,tspGrade} from './tsp-core.js';

const GAN='甲乙丙丁戊己庚辛壬癸子丑';
const STAGES={1:{name:'第一程 · 凭直觉',n:6,seed:1207},2:{name:'第二程 · 解结',n:11,seed:2311},3:{name:'第三程 · 群岛',n:29,seed:4409}};

export const tspLevel={
  id:'tsp',title:'七洲洋',concept:'旅行商问题',ambience:'sea',poem:['云帆高张','昼夜星驰'],poemSrc:'郑和《天妃灵应之记》',
  colophon:{head:'旅行商问题',seal:'巧解',
    lines:['遍访诸岛而返，求其至短。','岛愈多，路数愈是爆炸，逐条枚举永不能尽。','然航线相交，必有更短之走法；','就近而行，再逐一解结，顷刻可得近优之解。'],
    note:'今之快递派送、巡检排程、电路钻孔，皆用此术。'},
  start(ui,audio){
    const S={stage:0,pts:[],route:[],closed:false,W:0,H:0,A:1.5,k:1,ox:0,oy:0,opt:null,busy:false,mode:'draw',sawDark:false,startLen:0};
    this._s=S;
    const box=el('div','tsp-sea');
    const cvInk=el('canvas'),cvCol=el('canvas','col'),cvRoute=el('canvas'),nodes=el('div','tsp-nodes'),boatCv=el('canvas','tsp-boat'),count=el('div','tsp-count');
    boatCv.width=88;boatCv.height=72;count.hidden=true;
    [cvInk,cvCol,cvRoute,nodes,boatCv,count].forEach(e=>box.appendChild(e));ui.stage.appendChild(box);

    const P=p=>[S.ox+p[0]*S.k,S.oy+p[1]*S.k];
    function layoutSea(){S.W=box.clientWidth;S.H=box.clientHeight;const pad=Math.min(S.W,S.H)*.07,sx=(S.W-2*pad)/S.A,sy=S.H-2*pad;S.k=Math.min(sx,sy);S.ox=(S.W-S.A*S.k)/2;S.oy=(S.H-S.k)/2;}
    function drawSea(){
      layoutSea();
      for(const [cv,col] of [[cvInk,false],[cvCol,true]]){
        const c=fitCanvas(cv,S.W,S.H);paperBase(c,0,0,S.W,S.H);
        const r=RNG(S.stage*31+7);
        if(col){const g=c.createLinearGradient(0,0,0,S.H);g.addColorStop(0,'rgba(60,130,140,.05)');g.addColorStop(1,'rgba(60,130,140,.16)');c.fillStyle=g;c.fillRect(0,0,S.W,S.H);}
        for(let i=0;i<Math.round(S.W*S.H/2600);i++){const x=r()*S.W,y=r()*S.H,L=14+r()*60;c.strokeStyle=`rgba(${INK},${.04+r()*.09})`;c.lineWidth=.6+r()*.6;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+L*.3,y-1.2,x+L*.6,y+1.2,x+L,y);c.stroke();}
        const sz=Math.max(.55,Math.min(1.1,S.k/560)),pp=P(S.pts[0]);
        const coast={base:pp[1]+10,a:.85,c:1,cun:.8,lw:2.2,trees:.8,peaks:[{x:pp[0]+60*sz,h:70*sz,wl:110*sz,wr:120*sz,k:1.4,seed:77},{x:pp[0]+150*sz,h:110*sz,wl:90*sz,wr:120*sz,k:1.6,seed:78}]};
        [...coast.peaks].sort((a,b)=>b.h-a.h).forEach(p=>drawPeak(c,p,coast,col));
        pagoda(c,pp[0]+14*sz,pp[1]+2,16*sz,4);
        S.pts.forEach((p,i)=>{if(i===0)return;const q=P(p),rr=RNG(1000+i*13+S.stage*977),h=(20+rr()*18)*sz*(S.pts.length>20?.8:1);
          const cfg={base:q[1]+6*sz,a:.82,c:1,cun:.8,lw:1.8,trees:.6*sz,dot:.9,peaks:[{x:q[0]-h*.3,h,wl:h*1.3,wr:h*1.1,k:1.4,seed:2000+i*7+S.stage*131},{x:q[0]+h*.6,h:h*.55,wl:h*.9,wr:h*.9,k:1.2,round:.04,seed:3000+i*7+S.stage*131}]};
          [...cfg.peaks].sort((a,b)=>b.h-a.h).forEach(pk=>drawPeak(c,pk,cfg,col));
          c.strokeStyle=`rgba(${INK},.25)`;c.lineWidth=.7;for(let k=0;k<3;k++){c.beginPath();c.moveTo(q[0]-h*1.2+k*6,q[1]+8*sz+k*3);c.lineTo(q[0]+h*.9-k*4,q[1]+8*sz+k*3);c.stroke();}});
        paperGrain(c,0,0,S.W,S.H);
      }
    }
    function drawRoute(ghost){
      const c=fitCanvas(cvRoute,S.W,S.H);
      if(ghost){c.save();c.setLineDash([2,7]);c.lineCap='round';c.strokeStyle='rgba(30,91,115,.75)';c.lineWidth=2.2;c.beginPath();ghost.forEach((k,i)=>{const q=P(S.pts[k]);i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]);});c.closePath();c.stroke();c.restore();}
      const r=S.route,n=r.length,segs=S.closed?n:n-1;
      for(let i=0;i<segs;i++){const a=r[i],b=r[(i+1)%n],p=P(S.pts[a]),q=P(S.pts[b]);
        const rr=RNG(Math.min(a,b)*977+Math.max(a,b)*131+7),L=Math.hypot(q[0]-p[0],q[1]-p[1]),bow=(rr()-.5)*L*.1;
        const mx=(p[0]+q[0])/2+(q[1]-p[1])/L*bow,my=(p[1]+q[1])/2-(q[0]-p[0])/L*bow,pts=[],inset=Math.min(16,L*.2);
        for(let t=0;t<=1.0001;t+=1/Math.max(8,L/6)){const tt=inset/L+t*(1-2*inset/L);pts.push([(1-tt)*(1-tt)*p[0]+2*(1-tt)*tt*mx+tt*tt*q[0],(1-tt)*(1-tt)*p[1]+2*(1-tt)*tt*my+tt*tt*q[1]]);}
        brush(c,pts,{noise:Noise1(rr),w:3.4,a:.82,dry:.22,bristles:3,off:rr()*40,taper:.45});
      }
      return c;
    }
    function buildNodes(){
      nodes.innerHTML='';
      S.pts.forEach((p,i)=>{const q=P(p),b=el('button','isl'+(i===0?' port':''));b.style.left=q[0]+'px';b.style.top=q[1]+'px';
        b.setAttribute('aria-label',i===0?'刘家港':'岛'+(GAN[i-1]||i));
        b.innerHTML='<span class="ring"></span>'+(S.stage<3?`<span class="nm">${i===0?'刘家港':(GAN[i-1]||'')}</span>`:(i===0?'<span class="nm">刘家港</span>':''));
        b.onclick=()=>tap(i);nodes.appendChild(b);});
      refresh();
    }
    function refresh(){
      const els=nodes.querySelectorAll('.isl'),vis=new Set(S.route),cur=S.route[S.route.length-1];
      els.forEach((e,i)=>{e.classList.toggle('on',vis.has(i)&&i!==0);e.classList.toggle('cur',!S.closed&&i===cur&&S.mode==='draw');});
      const g=geng(tourLen(S.route,S.pts,S.closed));ui.meter(`<small>航程</small><b>${g}</b><small>更 · 约 ${(g*60).toLocaleString('zh-CN')} 里</small>`);
    }
    const clearKnots=()=>nodes.querySelectorAll('.knot').forEach(k=>k.remove());
    /* 挨得太近的结先只露一个：解开一个后交叉会重算，其余的再出来 */
    function showKnots(){clearKnots();const cs=crossings(S.route,S.pts),placed=[];
      cs.forEach(cx=>{const q=P([cx.x,cx.y]);if(placed.some(o=>Math.hypot(o[0]-q[0],o[1]-q[1])<34))return;placed.push(q);
        const b=el('button','knot');b.style.left=q[0]+'px';b.style.top=q[1]+'px';b.setAttribute('aria-label','解开这个交叉');b.onclick=()=>untie(cx);nodes.appendChild(b);});
      return cs.length;}
    function showDark(){
      const mv=bestImprove(S.route,S.pts);if(!mv)return false;const n=S.route.length,[i,j]=mv;
      const a=S.pts[S.route[i]],b=S.pts[S.route[i+1]],c=S.pts[S.route[j]],e=S.pts[S.route[(j+1)%n]];
      const x=(a[0]+b[0]+c[0]+e[0])/4,y=(a[1]+b[1]+c[1]+e[1])/4,q=P([x,y]);
      const k=el('button','knot dark');k.style.left=q[0]+'px';k.style.top=q[1]+'px';k.setAttribute('aria-label','解开这个暗结');k.onclick=()=>untie({i,j,x,y});nodes.appendChild(k);
      const cx=cvRoute.getContext('2d');cx.save();cx.setLineDash([3,5]);cx.strokeStyle='rgba(179,38,30,.5)';cx.lineWidth=4;
      [[a,b],[c,e]].forEach(([u,v])=>{const pu=P(u),pv=P(v);cx.beginPath();cx.moveTo(pu[0],pu[1]);cx.lineTo(pv[0],pv[1]);cx.stroke();});cx.restore();
      return true;
    }
    function setup(stage){
      S.stage=stage;const st=STAGES[stage];S.A=Math.max(.72,Math.min(1.9,box.clientWidth/box.clientHeight));
      S.pts=genIslands(st.n,st.seed,S.A);S.closed=false;S.route=[0];S.mode='draw';S.busy=false;
      ui.stageName(st.name);count.hidden=true;ui.hideResult();clearKnots();box.classList.remove('colored');boatCv.style.opacity=0;
      drawSea();buildNodes();
      if(stage===1){S.opt=heldKarp(S.pts);
        ui.say('宝船自<b>刘家港</b>出发，访遍六岛再回港。<br>依次点岛落笔，最后点回刘家港收笔。');
        ui.acts([['撤回一笔',undo],['重画',()=>setup(1)]]);}
      if(stage===2){S.opt=heldKarp(S.pts);S.route=tangledTour(S.pts,55,9);S.closed=true;S.mode='untie';S.sawDark=false;S.startLen=tourLen(S.route,S.pts,true);
        ui.say('老舵工画的航线缠成了一团。每个<b>红圈</b>是一处交叉——点它，把这个结解开，看航程怎么变。');
        ui.acts([['还原老航线',()=>setup(2)]]);}
      if(stage===3){S.opt=bestKnown(S.pts,24);
        const n=S.pts.length-1;let lg=0;for(let i=2;i<=n;i++)lg+=Math.log10(i);lg-=Math.log10(2);
        const e=Math.floor(lg),m=Math.pow(10,lg-e).toFixed(1),years=lg-8-Math.log10(3.15e7);
        count.innerHTML=`${n} 座岛，可走的航线约有 <b>${m} × 10<sup>${e}</sup></b> 条<br>每秒验一亿条，也要验 10<sup>${Math.floor(years)}</sup> 多年`;count.hidden=false;
        ui.say('二十九座岛，一条条比是比不完的。可以自己落笔，也可以请出两件巧器。');
        ui.acts([['就近而行',runNearest],['解结',runTwoOpt,true],['自己画',()=>setup(3)]]);}
      refresh();drawRoute();if(stage===2)showKnots();
    }
    function undo(){if(S.busy||S.closed||S.route.length<=1)return;S.route.pop();refresh();drawRoute();}
    function tap(i){
      if(S.busy||S.mode!=='draw'||S.closed)return;const r=S.route;
      if(i===0){if(r.length===S.pts.length){S.closed=true;audio.arp();refresh();drawRoute();sail(finishDraw);}
        else{ui.say(`还有 <b>${S.pts.length-r.length}</b> 座岛没去。访遍了再回刘家港。`);audio.low();}return;}
      if(r.includes(i)){if(i===r[r.length-1])undo();return;}
      r.push(i);audio.tap(i);refresh();drawRoute();
      if(r.length===S.pts.length)ui.say('诸岛已访遍，<b>点刘家港</b>收笔回港。');
    }
    function sail(done){
      const c=boatCv.getContext('2d');c.clearRect(0,0,88,72);c.save();c.scale(2,2);boat(c,22,28,16,true);c.restore();
      const pts=S.route.concat([S.route[0]]).map(k=>P(S.pts[k]));let total=0;const segL=[];for(let i=0;i<pts.length-1;i++){const l=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]);segL.push(l);total+=l;}
      const dur=reduceMotion()?10:Math.min(3200,900+total*1.6),t0=performance.now();S.busy=true;boatCv.style.opacity=1;
      const f=now=>{if(!box.isConnected)return;const k=Math.min(1,(now-t0)/dur);let dd=k*total,i=0;while(i<segL.length-1&&dd>segL[i]){dd-=segL[i];i++;}
        const t=segL[i]?dd/segL[i]:0,x=pts[i][0]+(pts[i+1][0]-pts[i][0])*t,y=pts[i][1]+(pts[i+1][1]-pts[i][1])*t,flip=pts[i+1][0]<pts[i][0]?-1:1;
        boatCv.style.transform=`translate(${x-22}px,${y-28}px) scaleX(${flip})`;
        if(k<1)requestAnimationFrame(f);else{boatCv.style.opacity=0;S.busy=false;done();}};requestAnimationFrame(f);
    }
    function finishDraw(){
      const mine=tourLen(S.route,S.pts,true),opt=S.opt.len,ratio=mine/opt,g=tspGrade(ratio),cs=crossings(S.route,S.pts).length;
      if(S.stage===1){
        drawRoute(ratio<1.0005?null:S.opt.route);
        ui.result(g,`你的航程 <b>${geng(mine)}</b> 更　·　最短 <b>${geng(opt)}</b> 更`,
          ratio<1.0005?'一笔落成，正是最短航线。':cs?`多走了 ${Math.round((ratio-1)*100)}%。你的航线有 <b>${cs}</b> 处自己交叉——虚线是最短航线，它从不交叉。`:`多走了 ${Math.round((ratio-1)*100)}%。虚线是最短航线。`);
        ui.say(ratio<1.0005?'好眼力。下一程，老舵工的航线可没这么顺。':'留意你的航线和虚线差在哪里。下一程，替老舵工改航线。');
        ui.acts([['再画一次',()=>setup(1)],['下一程 →',()=>setup(2),true]]);
      } else if(S.stage===3)finish3(mine);
    }
    function untie(cx){
      if(S.busy)return;const before=tourLen(S.route,S.pts,true);
      S.route=twoOptMove(S.route,cx.i,cx.j);audio.rise();
      const after=tourLen(S.route,S.pts,true);drawRoute();refresh();const left=showKnots();
      const q=P([cx.x,cx.y]);ui.flash(`−${geng(before)-geng(after)} 更`,q[0],q[1]);
      if(S.stage!==2)return;
      if(left){ui.say(`解开一个结，航程从 ${geng(before)} 更缩到 <b>${geng(after)}</b> 更。还剩 <b>${left}</b> 处交叉。`);return;}
      if(showDark()){
        if(!S.sawDark){S.sawDark=true;ui.say(`明面上的交叉都解开了，航程 <b>${geng(after)}</b> 更。可还有<b>暗结</b>：两段航线虽不交叉，换个接法照样更短。点墨圈试试。`);}
        else ui.say(`又省一段：<b>${geng(after)}</b> 更。`);
        return;}
      const ratio=after/S.opt.len;
      ui.result(tspGrade(ratio),`老航线 <b>${geng(S.startLen)}</b> 更 → 解结后 <b>${geng(after)}</b> 更　·　最短 <b>${geng(S.opt.len)}</b> 更`,
        '你只反复做了一件事：拆掉两段航线，换个接法再连上。交叉是最显眼的结，每解一个，航程一定变短（三角形两边之和大于第三边）。');
      ui.say('这条规矩记下了：<b>航线相交，必有更短</b>。下一程岛多了，要靠它。');
      ui.acts([['下一程 →',()=>setup(3),true]]);drawRoute(ratio<1.0005?null:S.opt.route);
    }
    function animate(steps,delay,done){S.busy=true;let i=0;const f=()=>{if(!box.isConnected)return;if(i>=steps.length){S.busy=false;done&&done();return;}steps[i++]();setTimeout(f,delay);};f();}
    function runNearest(){
      if(S.busy)return;ui.hideResult();clearKnots();S.mode='tool';S.closed=false;S.route=[0];
      const nn=nearestTour(S.pts,0),steps=[];
      for(let k=1;k<nn.length;k++)steps.push(()=>{S.route.push(nn[k]);audio.tap(k,.12);refresh();drawRoute();});
      steps.push(()=>{S.closed=true;refresh();drawRoute();});
      ui.say('就近而行：每到一岛，就去离它最近、还没去过的岛。');
      animate(steps,70,()=>{const c=showKnots(),L=tourLen(S.route,S.pts,true);
        ui.say(`就近而行得 <b>${geng(L)}</b> 更，又快又不错，但留下了 <b>${c}</b> 处交叉。点「解结」，或者自己点红圈。`);S.mode='untie3';});
    }
    function runTwoOpt(){
      if(S.busy)return;
      if(!S.closed||S.route.length<S.pts.length){if(S.route.length<=1){runNearest();return;}ui.say('先把航线画完（回到刘家港），再解结。');return;}
      ui.hideResult();clearKnots();const start=tourLen(S.route,S.pts,true);S.busy=true;
      const tick=()=>{if(!box.isConnected)return;const mv=bestImprove(S.route,S.pts);
        if(!mv){S.busy=false;S.route=orOpt(S.route,S.pts);drawRoute();refresh();finish3(tourLen(S.route,S.pts,true),start);return;}
        S.route=twoOptMove(S.route,mv[0],mv[1]);audio.tap(6+Math.floor(Math.random()*4),.1);drawRoute();refresh();setTimeout(tick,110);};
      ui.say('解结：一处处找出能让航程变短的两段航线，换个接法，直到一个也不剩。');tick();
    }
    function finish3(mine,start){
      clearKnots();const opt=S.opt.len,ratio=mine/opt,pct=Math.max(0,Math.round((ratio-1)*1000)/10);
      ui.result(tspGrade(Math.max(1,ratio)),(start?`解结前 <b>${geng(start)}</b> 更 → 解结后 <b>${geng(mine)}</b> 更　·　`:`你的航程 <b>${geng(mine)}</b> 更　·　`)+`已知最好 <b>${geng(opt)}</b> 更`,
        ratio<1.0005?'和长卷反复推演出的最好航线一样短。':`只比已知最好的航线多 ${pct}%，而用时不到一眨眼。`);
      box.classList.add('colored');audio.arp();
      ui.say('岛上着了青绿。这一处妙策参透了。');
      ui.acts([['自己再画',()=>setup(3)],['题跋 · 钤印',()=>ui.colophon(),true]]);
    }
    this._resize=()=>{if(!S.pts.length)return;layoutSea();drawSea();buildNodes();drawRoute();if(S.mode==='untie'||S.mode==='untie3'){if(!showKnots()&&S.stage===2&&document.getElementById('result').hidden)showDark();}};
    setup(1);
  },
  resize(){this._resize&&this._resize();},
  stop(){this._resize=null;}
};
