/* 烽燧 · 选址与覆盖：烽燧 → 粮仓 → 两仓
   手感：点山头就修烽火台（再点拆掉），望得见烽火的村寨立刻亮起；拖着粮仓沿山谷走，总运程随手变；点村子修粮仓，车马沿路奔最近的那座。 */
import {RNG} from '../core/rng.js';
import {INK,PAPER,BRUSH_FONT,paperBase,paperGrain,house,tree,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {ASPECT,COVER,COVER_K,coverOf,covered,minCover,VALLEY,haul,centroid,median,NET,dist,cost,best2,gradeCover,gradeCost} from './beacon-core.js';

const ink=a=>`rgba(${INK},${a})`,RED='rgba(179,38,30,.92)',FIRE='rgba(235,120,40,',HUE=['rgba(30,91,115,.85)','rgba(160,70,40,.85)'];
const TITLE=['第一回 · 烽燧','第二回 · 粮仓','第三回 · 两仓'];
const INTRO=[`边关十四寨，敌骑一来，要让每个寨子都望得见烽火。烽火台只能修在山头上（圆台），<b>钱只够修 ${COVER_K} 座</b>。点山头就修，再点拆掉；望得见的寨子会亮起来。`,
  '山谷里七个村，要修一座粮仓，各村按户数往粮仓运粮。<b>按住粮仓沿山谷拖</b>，看总运程（户数 × 路程）怎么变，放在最省的地方。',
  '路网上十三个村，这回修<b>两座粮仓</b>，各村往近的那座运。点村子修粮仓（最多两座，再点拆掉），车马沿路走。'];

export const beaconLevel={
  id:'beacon',title:'烽燧',concept:'选址 · 覆盖',ambience:'scroll',poem:['烽火连三月','家书抵万金'],poemSrc:'杜甫《春望》',
  colophon:{head:'选址 · 覆盖',seal:'远近',
    lines:['烽火台修在哪，要看整张山川图：先修「望得最多」的那座，剩下的钱反倒顾不全。','一座粮仓：放在户数过半的那个村最省，往任一边挪一步，身后的人家总比身前的多——在中位，不在重心。','两座粮仓：先修一座最好的、再补一座，不如一起想；两片各取中位。'],
    note:'今之消防站、急救站、仓库与基站选址，都分「管得到」与「走得近」两种算法。'},
  start(ui,audio){
    const S={round:1,built:[],x:null,picks:[],done:false,view:'mine',raf:0,t:0,drag:false,D:null,best:0,opt:null};
    const root=el('div','bc'),bg=el('canvas'),fg=el('canvas'),hud=el('div','bc-hud');[bg,fg,hud].forEach(e=>root.appendChild(e));ui.stage.appendChild(root);
    let W=0,H=0,G=null;

    /* ---------- 地图：宽高 1.6 : 1，竖屏时转九十度 ---------- */
    function geom(){W=root.clientWidth;H=root.clientHeight;const port=H>W*1.05,top=S.done?Math.min(160,H*.22):port?70:60,pad=12;
      const s=port?Math.min((W-2*pad)/1,(H-top-pad)/ASPECT):Math.min((W-2*pad)/ASPECT,(H-top-pad)/1);
      const w=port?s:s*ASPECT,h=port?s*ASPECT:s,ox=(W-w)/2,oy=top+(H-top-pad-h)/2;
      const P=(x,y)=>port?[ox+(1-y)*s,oy+x*s]:[ox+x*s,oy+y*s];return{port,s,ox,oy,w,h,P,top};}
    const P=(x,y)=>G.P(x,y);
    function roadPts(){return VALLEY.road.map(([x,y])=>P(x,y));}
    /* 山谷驿路上「离谷口多远」→ 屏幕坐标 */
    function along(f){const pts=roadPts();const seg=[];let L=0;for(let k=1;k<pts.length;k++){const d=Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]);seg.push(d);L+=d;}
      let s=f*L;for(let k=0;k<seg.length;k++){if(s<=seg[k]){const q=s/seg[k];return[pts[k][0]+(pts[k+1][0]-pts[k][0])*q,pts[k][1]+(pts[k+1][1]-pts[k][1])*q];}s-=seg[k];}return pts[pts.length-1];}
    function nearestF(x,y){let best=0,bd=1e9;for(let i=0;i<=400;i++){const f=i/400,[px,py]=along(f),d=Math.hypot(px-x,py-y);if(d<bd){bd=d;best=f;}}return{f:best,d:bd};}

    /* ---------- 底图：山、村、驿路 ---------- */
    function mountains(c,r,n){for(let i=0;i<n;i++){const x=r()*ASPECT,y=r(),hh=.05+r()*.09,[px,py]=P(x,y),s=G.s;
        const g=c.createLinearGradient(px,py-hh*s,px,py);g.addColorStop(0,'rgba(60,80,70,.28)');g.addColorStop(1,'rgba(60,80,70,.02)');c.fillStyle=g;
        c.beginPath();c.moveTo(px-hh*s*1.6,py);c.quadraticCurveTo(px-hh*s*.4,py-hh*s*.9,px,py-hh*s);c.quadraticCurveTo(px+hh*s*.5,py-hh*s*.8,px+hh*s*1.7,py);c.closePath();c.fill();
        c.strokeStyle=ink(.25);c.lineWidth=1;c.beginPath();c.moveTo(px-hh*s*1.4,py-hh*s*.1);c.quadraticCurveTo(px-hh*s*.4,py-hh*s*.9,px,py-hh*s);c.quadraticCurveTo(px+hh*s*.5,py-hh*s*.8,px+hh*s*1.5,py-hh*s*.1);c.stroke();}}
    function village(c,x,y,nm,pop){const [px,py]=P(x,y);villageAt(c,px,py,nm,pop);}
    function villageAt(c,px,py,nm,pop){const s=Math.max(14,Math.min(34,G.s*.045));
      house(c,px-s*.3,py+s*.3,s,.95);if(s>18)house(c,px+s*.45,py+s*.42,s*.75,.9);
      c.fillStyle=ink(.85);c.font=`${Math.round(Math.max(12,Math.min(17,G.s*.032)))}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='top';c.fillText(nm,px,py+s*.55);
      if(pop){c.fillStyle='rgba(120,70,40,.9)';c.font=`${Math.round(Math.max(10,Math.min(13,G.s*.026)))}px sans-serif`;c.fillText(pop+' 户',px,py+s*.55+Math.max(13,G.s*.034));}}
    function drawBg(){G=geom();const c=fitCanvas(bg,W,H),r=RNG(60+S.round);paperBase(c,0,0,W,H);
      c.fillStyle='rgba(185,165,120,.14)';c.fillRect(G.ox,G.oy,G.w,G.h);
      c.save();c.beginPath();c.rect(G.ox,G.oy,G.w,G.h);c.clip();mountains(c,r,S.round===2?26:18);c.restore();c.strokeStyle=ink(.35);c.lineWidth=1.5;c.strokeRect(G.ox,G.oy,G.w,G.h);
      if(S.round===1){COVER.sites.forEach((q,i)=>{const [px,py]=P(q.x,q.y),s=Math.max(12,G.s*.03);c.fillStyle='rgba(120,110,90,.55)';c.beginPath();c.moveTo(px-s*1.6,py+s*.6);c.quadraticCurveTo(px,py-s*1.6,px+s*1.6,py+s*.6);c.closePath();c.fill();c.strokeStyle=ink(.5);c.stroke();
          c.fillStyle=`rgba(${PAPER},.95)`;c.beginPath();c.ellipse(px,py-s*.4,s*.6,s*.28,0,0,7);c.fill();c.strokeStyle=ink(.55);c.stroke();});
        COVER.villages.forEach(v=>village(c,v.x,v.y,v.nm,0));}
      if(S.round===2){const pts=roadPts();c.strokeStyle='rgba(150,120,80,.7)';c.lineWidth=Math.max(6,G.s*.022);c.lineCap='round';c.lineJoin='round';c.beginPath();pts.forEach(([x,y],k)=>k?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
        c.strokeStyle=ink(.35);c.lineWidth=1;c.setLineDash([4,5]);c.stroke();c.setLineDash([]);
        VALLEY.villages.forEach(v=>{const [px,py]=along(v.x);villageAt(c,px,py,v.nm,v.pop);});}
      if(S.round===3){c.strokeStyle='rgba(150,120,80,.65)';c.lineWidth=Math.max(4,G.s*.012);c.lineCap='round';NET.edges.forEach(([a,b])=>{const [x1,y1]=P(NET.nodes[a].x,NET.nodes[a].y),[x2,y2]=P(NET.nodes[b].x,NET.nodes[b].y);c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();});
        NET.nodes.forEach(v=>village(c,v.x,v.y,v.nm,v.pop));}
      for(let i=0;i<10;i++){const x=.05+r()*(ASPECT-.1),y=.08+r()*.84;const [px,py]=P(x,y);c.globalAlpha=.5;tree(c,r,px,py,Math.max(8,G.s*.02),.6);c.globalAlpha=1;}
      paperGrain(c,0,0,W,H,false);}

    /* ---------- 前景 ---------- */
    function tower(c,px,py,s,t){c.fillStyle='rgba(120,100,80,.95)';c.beginPath();c.moveTo(px-s*.5,py);c.lineTo(px-s*.32,py-s*1.3);c.lineTo(px+s*.32,py-s*1.3);c.lineTo(px+s*.5,py);c.closePath();c.fill();c.strokeStyle=ink(.7);c.lineWidth=1.2;c.stroke();
      for(let k=0;k<3;k++){const f=.6+.4*Math.sin(t*9+k*2);c.fillStyle=`${FIRE}${.8*f})`;c.beginPath();c.ellipse(px+(k-1)*s*.14,py-s*1.4-s*.2*f,s*.13,s*.3*f,0,0,7);c.fill();}
      for(let k=0;k<4;k++){const ph=(t*.35+k/4)%1;c.fillStyle=`rgba(80,80,80,${.25*(1-ph)})`;c.beginPath();c.arc(px+Math.sin(ph*6+k)*s*.3,py-s*1.7-ph*s*2.6,s*(.18+ph*.4),0,7);c.fill();}}
    function drawFg(){if(!G)return;const c=fitCanvas(fg,W,H);c.clearRect(0,0,W,H);const t=S.t;
      if(S.round===1){const built=S.view==='best'?S.opt:S.built,lit=covered(COVER,built);
        built.forEach(i=>{const q=COVER.sites[i],[px,py]=P(q.x,q.y),rr=COVER.r*G.s;c.fillStyle='rgba(235,150,60,.08)';c.beginPath();c.arc(px,py,rr,0,7);c.fill();c.strokeStyle='rgba(200,110,40,.45)';c.setLineDash([6,5]);c.lineWidth=1.4;c.stroke();c.setLineDash([]);});
        COVER.villages.forEach((v,k)=>{const [px,py]=P(v.x,v.y),s=Math.max(14,Math.min(34,G.s*.045));if(lit.has(k)){const g=c.createRadialGradient(px,py,2,px,py,s*1.4);g.addColorStop(0,'rgba(255,200,90,.55)');g.addColorStop(1,'rgba(255,200,90,0)');c.fillStyle=g;c.beginPath();c.arc(px,py,s*1.4,0,7);c.fill();}
          else{c.fillStyle='rgba(40,40,50,.2)';c.beginPath();c.arc(px,py+s*.2,s*.9,0,7);c.fill();}});
        built.forEach(i=>{const q=COVER.sites[i],[px,py]=P(q.x,q.y);tower(c,px,py-Math.max(12,G.s*.03)*.3,Math.max(16,G.s*.045),t);});}
      if(S.round===2&&S.x!=null){const [gx,gy]=along(S.x);
        VALLEY.villages.forEach(v=>{const [px,py]=along(v.x);const w=Math.min(9,1+v.pop);c.strokeStyle='rgba(30,91,115,.35)';c.lineWidth=w;c.beginPath();c.moveTo(px,py-6);c.quadraticCurveTo((px+gx)/2,Math.min(py,gy)-G.s*.06,gx,gy-6);c.stroke();});
        if(S.done){[[centroid(VALLEY.villages),'重心',ink(.7)],[median(VALLEY.villages),'中位 · 最省',RED]].forEach(([f,lab,col],k)=>{const [px,py]=along(f);c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.moveTo(px,py-G.s*.13);c.lineTo(px,py+G.s*.05);c.stroke();
            c.fillStyle=col;c.font=`${Math.round(Math.max(13,G.s*.032))}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='bottom';c.fillText(lab,px,py-G.s*.14-(k?G.s*.04:0));});}
        granary(c,gx,gy,Math.max(18,G.s*.05),HUE[0]);}
      if(S.round===3){const picks=S.view==='best'?S.opt:S.picks;if(picks.length){const D=S.D;
          NET.nodes.forEach((v,i)=>{let b=picks[0];picks.forEach(p=>{if(D[i][p]<D[i][b])b=p;});const path=pathTo(i,b);if(path.length<2)return;const col=HUE[picks.indexOf(b)%2];
            c.strokeStyle=col.replace(/[\d.]+\)$/,'.5)');c.lineWidth=Math.min(8,1.5+v.pop*.9);c.lineCap='round';c.beginPath();path.forEach((n,k)=>{const [x,y]=P(NET.nodes[n].x,NET.nodes[n].y);k?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();
            const L=path.length-1,ph=((t*.5+i*.13)%1)*L,seg=Math.floor(ph),q=ph-seg,[x1,y1]=P(NET.nodes[path[seg]].x,NET.nodes[path[seg]].y),[x2,y2]=P(NET.nodes[path[Math.min(L,seg+1)]].x,NET.nodes[path[Math.min(L,seg+1)]].y);
            c.fillStyle=col;c.beginPath();c.arc(x1+(x2-x1)*q,y1+(y2-y1)*q,3.5,0,7);c.fill();});
          picks.forEach((p,k)=>{const [x,y]=P(NET.nodes[p].x,NET.nodes[p].y);granary(c,x,y-Math.max(10,G.s*.03),Math.max(18,G.s*.05),HUE[k%2]);});}}}
    function granary(c,x,y,s,col){c.fillStyle='rgba(200,170,110,.97)';c.fillRect(x-s*.45,y-s*.7,s*.9,s*.7);c.strokeStyle=ink(.7);c.lineWidth=1.3;c.strokeRect(x-s*.45,y-s*.7,s*.9,s*.7);
      c.fillStyle=col;c.beginPath();c.moveTo(x-s*.65,y-s*.68);c.lineTo(x,y-s*1.15);c.lineTo(x+s*.65,y-s*.68);c.closePath();c.fill();c.stroke();
      c.fillStyle=ink(.85);c.font=`${Math.round(s*.42)}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText('仓',x,y-s*.34);}
    /* 路网上的最短路（按距离矩阵回溯） */
    function pathTo(i,j){const D=S.D,n=NET.nodes.length,adj=NET.nodes.map(()=>[]);NET.edges.forEach(([a,b])=>{const L=Math.hypot(NET.nodes[a].x-NET.nodes[b].x,NET.nodes[a].y-NET.nodes[b].y);adj[a].push([b,L]);adj[b].push([a,L]);});
      const path=[i];let u=i;for(let g=0;g<n&&u!==j;g++){const nx=adj[u].find(([v,L])=>Math.abs(L+D[v][j]-D[u][j])<1e-9);if(!nx)break;u=nx[0];path.push(u);}return path;}
    function loop(ts){S.raf=requestAnimationFrame(loop);if(!root.isConnected){cancelAnimationFrame(S.raf);return;}const dt=Math.min(.05,(ts-(S.last||ts))/1000);S.last=ts;S.t+=reduceMotion()?0:dt;drawFg();}

    /* ---------- 操作 ---------- */
    const loc=ev=>{const r=fg.getBoundingClientRect();return[ev.clientX-r.left,ev.clientY-r.top];};
    function nearest(list,x,y,rad){let best=-1,bd=rad;list.forEach((q,i)=>{const [px,py]=P(q.x,q.y),d=Math.hypot(px-x,py-y);if(d<bd){bd=d;best=i;}});return best;}
    fg.addEventListener('pointerdown',ev=>{if(S.done||!G||ev.button>0)return;const [x,y]=loc(ev);
      if(S.round===1){const i=nearest(COVER.sites,x,y,Math.max(26,G.s*.06));if(i<0)return;
        if(S.built.includes(i)){S.built=S.built.filter(j=>j!==i);audio.tap(2);}
        else if(S.built.length>=COVER_K){ui.flash(`钱只够修 ${COVER_K} 座，先拆一座`,x,y);audio.low();return;}
        else{S.built.push(i);audio.whoosh();const n=coverOf(COVER,i).length;ui.flash(`望得见 ${n} 寨`,x,y-20);}afterChange();return;}
      if(S.round===2){const q=nearestF(x,y);if(q.d>Math.max(40,G.s*.12))return;S.drag=true;try{fg.setPointerCapture(ev.pointerId);}catch(_){}S.x=Math.round(q.f*100)/100;audio.tap(3);afterChange();return;}
      if(S.round===3){const i=nearest(NET.nodes,x,y,Math.max(28,G.s*.06));if(i<0)return;
        if(S.picks.includes(i)){S.picks=S.picks.filter(j=>j!==i);audio.tap(2);}
        else if(S.picks.length>=2){ui.flash('只修两座，先拆一座',x,y);audio.low();return;}
        else{S.picks.push(i);audio.thud();}afterChange();}});
    fg.addEventListener('pointermove',ev=>{if(!S.drag)return;const [x,y]=loc(ev),q=nearestF(x,y),nx=Math.round(q.f*100)/100;if(nx!==S.x){S.x=nx;if(Math.round(nx*100)%5===0)audio.tap(1);afterChange();}});
    const up=()=>{S.drag=false;};fg.addEventListener('pointerup',up);fg.addEventListener('pointercancel',up);

    /* ---------- 账 ---------- */
    function value(){if(S.round===1)return covered(COVER,S.built).size;if(S.round===2)return S.x==null?null:haul(VALLEY.villages,S.x);return S.picks.length===2?cost(NET,S.D,S.picks):null;}
    const fmt=v=>v==null?'—':(v*10).toFixed(1);
    function afterChange(){const v=value();
      if(S.round===1){const all=COVER.villages.length;hud.innerHTML=`<div class="big"><small>望得见</small><b>${v}</b><small>/ ${all} 寨</small></div><div class="goal">烽火台 ${S.built.length} / ${COVER_K} 座 · 至妙：${COVER_K} 座望遍</div>${v>=all?'<div class="st ok">处处望得见！</div>':''}`;}
      else{hud.innerHTML=`<div class="big"><small>总运程</small><b>${fmt(v)}</b><small>户·里</small></div><div class="goal">至妙：${fmt(S.best)}</div>${S.round===3&&S.picks.length<2?`<div class="st">还要修 ${2-S.picks.length} 座</div>`:''}`;}
      if(!S.done)ui.acts([[S.round===1?'全部拆掉':S.round===2?'放回谷口':'全部拆掉',()=>{S.built=[];S.picks=[];S.x=S.round===2?0:null;afterChange();}],['就这样',finish,true,v==null||(S.round===1&&S.built.length===0)]]);}
    function begin(n){S.round=n;S.built=[];S.picks=[];S.x=n===2?0:null;S.done=false;S.view='mine';S.D=n===3?dist(NET):null;
      if(n===1){S.opt=minCover(COVER).covers[0];S.best=COVER.villages.length;}else if(n===2){S.best=haul(VALLEY.villages,median(VALLEY.villages));}else{const b=best2(NET,S.D);S.best=b.c;S.opt=b.p;}
      ui.hideResult();ui.meter('');ui.stageName(TITLE[n-1]);ui.say(INTRO[n-1]);drawBg();afterChange();}
    function finish(){const v=value();let g,nums,line;const L=[];
      if(S.round===1){const all=COVER.villages.length;g=gradeCover(v,all);nums=`望得见 <b>${v}</b> / ${all} 寨 · ${S.built.length} 座烽火台`;
        line=v>=all?'三座望遍十四寨。那座「望得最多」的山头，恰恰不在里面：它望到的寨子，别的山头也望得到。':'先修望得最多的那座，剩下的钱常常顾不全边角的寨子。从最难望到的寨子想起：谁能照到它？';
        if(v<all)L.push(['看最省的修法',()=>{S.view=S.view==='best'?'mine':'best';}]);}
      else if(S.round===2){g=gradeCost(v,S.best);nums=`总运程 <b>${fmt(v)}</b> · 最省 <b>${fmt(S.best)}</b> · 修在重心 ${fmt(haul(VALLEY.villages,centroid(VALLEY.villages)))}`;
        line='最省的地方在马岭：从谷口数户数，数到过半的那个村（中位）。往任一边挪一步，身后的人家总比身前的多。重心看着居中，却多走一成多。';}
      else{g=gradeCost(v,S.best);nums=`总运程 <b>${fmt(v)}</b> · 最省 <b>${fmt(S.best)}</b>`;
        line=v<=S.best*1.001?'两座粮仓把路网分成两片，各在自己那片的中位。单修一座时最好的马岭，这回反而不在里面。':'先修单座最好的马岭、再补一座，要多走两成：两座要一起想，把路网分成两片，各取中位。';
        L.push(['看最省的修法',()=>{S.view=S.view==='best'?'mine':'best';}]);}
      S.done=true;g==='至妙'?audio.arp():g==='下品'?audio.low():audio.bell();drawBg();ui.result(g,nums,line,true);
      L.push(['再来一次',()=>begin(S.round)]);L.push(S.round<3?['下一回 →',()=>begin(S.round+1),true]:['题跋 · 钤印',()=>ui.colophon(),true]);ui.acts(L);}

    function layout(){if(S.round)drawBg();}
    this._resize=()=>layout();
    let lastWH='',rq=0;const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{cancelAnimationFrame(rq);rq=requestAnimationFrame(()=>{const k=root.clientWidth+'x'+root.clientHeight;if(k!==lastWH){lastWH=k;layout();}});}):null;if(ro)ro.observe(root);
    this._stop=()=>{cancelAnimationFrame(S.raf);if(ro)ro.disconnect();};
    /* 自动化测试用 */
    beaconLevel._dbg=S;beaconLevel._go=n=>begin(n);
    beaconLevel._play={build:i=>{if(!S.built.includes(i)&&S.built.length<COVER_K)S.built.push(i);afterChange();},setX:x=>{S.x=x;afterChange();},pick:i=>{if(!S.picks.includes(i)&&S.picks.length<2)S.picks.push(i);afterChange();},finish,P:(x,y)=>P(x,y),along:f=>along(f),sites:()=>COVER.sites.map(q=>P(q.x,q.y)),nodes:()=>NET.nodes.map(q=>P(q.x,q.y))};
    begin(1);S.raf=requestAnimationFrame(loop);
  },
  resize(){this._resize&&this._resize();},
  stop(){this._stop&&this._stop();this._resize=null;}
};
