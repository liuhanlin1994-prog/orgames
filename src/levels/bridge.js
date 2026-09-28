/* 断桥 · 最小割 / 最大流：断桥 → 运粮 → 江防
   手感：点一下桥就拆（再点修回），敌军够得着的洲立刻染红；运粮时从左岸拖一笔、经过各洲拖到京城，这一路就运上最窄处还剩的车数。 */
import {RNG} from '../core/rng.js';
import {INK,PAPER,BRUSH_FONT,paperBase,paperGrain,house,willow,tent,banner,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {ROUNDS,maxFlow,reach,enemyPath,costOf,wasted,load,roomOf,decompose,gradeCut,gradeFlow} from './bridge-core.js';

const ink=a=>`rgba(${INK},${a})`,RED='rgba(179,38,30,.92)';
const HUES=['rgba(30,91,115,.85)','rgba(46,120,80,.85)','rgba(150,95,30,.85)','rgba(110,60,130,.8)','rgba(20,120,140,.8)','rgba(160,70,40,.8)','rgba(80,90,40,.85)','rgba(40,60,140,.8)'];
const TITLE=['第一回 · 断桥','第二回 · 运粮','第三回 · 江防'];
const INTRO=['敌军屯在左岸，要过江心诸洲直取京城。桥有宽窄，数字是拆它要费的工夫。<b>点一下桥就拆</b>，再点一下修回；红色是敌军够得着的地方。截断敌军，工夫越省越好——至妙线已经亮在左上角。',
  '敌军退了。同一张河网，这回从左岸粮仓往京城运粮：桥越宽，一天过的车越多（还是那个数）。<b>从左岸按住，经过各洲拖到京城</b>，这一路就运上它最窄处还剩的车数。点路签上的 ✕ 可以撤回。',
  '江防更大，还有两座<b>石桥</b>拆不动。截断敌军，工夫越省越好。'];

export const bridgeLevel={
  id:'bridge',title:'断桥',concept:'最小割 · 最大流',ambience:'sea',poem:['据水断桥','瞋目横矛'],poemSrc:'《三国志·张飞传》',
  colophon:{head:'最小割 · 最大流',seal:'通塞',
    lines:['截断敌军，不必拆尽岸边的桥，也不必先拣窄桥拆：要找整张河网最细的那道「腰」。','同一张河网往京城运粮，最多运得的车数，恰好等于截断它最少的工夫；运到最多时，满载的正是那道腰上的桥。','拆得最少＝运得最多：这就是最大流最小割定理。探马数得出能同时过来几路人马，也就知道至少要拆多少。'],
    note:'今之路网疏堵、电网与通信网的抗毁、供应链的瓶颈，皆用此理。'},
  start(ui,audio){
    const S={round:1,map:null,cut:new Set(),paths:[],draft:null,best:0,opt:null,done:false,view:'mine',raf:0,t:0,flash:null};
    const root=el('div','br'),bg=el('canvas'),fg=el('canvas'),hud=el('div','br-hud'),chips=el('div','br-chips');
    [bg,fg,hud,chips].forEach(e=>root.appendChild(e));ui.stage.appendChild(root);
    let W=0,H=0,G=null;

    /* ---------- 版式：横屏左岸在左、京城在右；竖屏左岸在上、京城在下 ---------- */
    function geom(){W=root.clientWidth;H=root.clientHeight;const port=H>W*1.05,top=S.done?Math.min(170,H*.24):port?74:64;
      const bank=port?Math.max(46,(H-top)*.08):Math.max(56,W*.075),m=S.map;
      const inner=port?{x0:14,x1:W-14,y0:top+bank,y1:H-bank}:{x0:bank,x1:W-bank,y0:top,y1:H-14};
      const P=(x,y)=>port?[inner.x0+y*(inner.x1-inner.x0),inner.y0+x*(inner.y1-inner.y0)]:[inner.x0+x*(inner.x1-inner.x0),inner.y0+y*(inner.y1-inner.y0)];
      const isl=m.nodes.filter((_,i)=>i!==m.s&&i!==m.t),cols=new Set(isl.map(n=>Math.round(n.x*10))).size,rows=Math.ceil(isl.length/cols);
      const r=Math.max(18,Math.min(60,(port?(inner.y1-inner.y0):(inner.x1-inner.x0))/(cols+1)*.34,(port?(inner.x1-inner.x0):(inner.y1-inner.y0))/(rows+.6)*.3));
      return{port,top,bank,inner,P,r};}
    const pos=i=>{const n=S.map.nodes[i];return G.P(n.x,n.y);};
    /* 桥的两头：洲的岸边，或左右岸（上下岸）的岸线 */
    function ends(e){const m=S.map,bankPt=(side,other)=>{const [ox,oy]=pos(other);return G.port?[ox,side===m.s?G.inner.y0:G.inner.y1]:[side===m.s?G.inner.x0:G.inner.x1,oy];};
      let pa=e.a===m.s||e.a===m.t?bankPt(e.a,e.b):pos(e.a),pb=e.b===m.s||e.b===m.t?bankPt(e.b,e.a):pos(e.b);
      const dx=pb[0]-pa[0],dy=pb[1]-pa[1],L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,ta=(e.a===m.s||e.a===m.t)?0:G.r*.8,tb=(e.b===m.s||e.b===m.t)?0:G.r*.8;
      return[[pa[0]+ux*ta,pa[1]+uy*ta],[pb[0]-ux*tb,pb[1]-uy*tb]];}
    const bw=e=>e.stone?12:4+e.w*1.7;

    /* ---------- 底图：江水、两岸、诸洲 ---------- */
    let blobs=[];
    function drawBg(){G=geom();const c=fitCanvas(bg,W,H),r=RNG(40+S.round),m=S.map;paperBase(c,0,0,W,H);
      c.fillStyle='rgba(110,150,160,.2)';c.fillRect(0,0,W,H);
      for(let i=0;i<90;i++){const x=r()*W,y=r()*H,L=10+r()*30;c.strokeStyle=`rgba(40,90,110,${.08+r()*.1})`;c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+L/2,y-3,x+L,y);c.stroke();}
      /* 两岸 */
      const shore=(side)=>{c.fillStyle='rgba(205,190,145,.95)';c.beginPath();
        if(G.port){const y=side===m.s?G.inner.y0:G.inner.y1,y0=side===m.s?0:H;c.moveTo(0,y0);for(let x=0;x<=W;x+=W/16)c.lineTo(x,y+(side===m.s?1:-1)*(r()*6-3));c.lineTo(W,y0);}
        else{const x=side===m.s?G.inner.x0:G.inner.x1,x0=side===m.s?0:W;c.moveTo(x0,0);for(let y=0;y<=H;y+=H/14)c.lineTo(x+(side===m.s?1:-1)*(r()*6-3),y);c.lineTo(x0,H);}
        c.closePath();c.fill();c.strokeStyle=ink(.55);c.lineWidth=1.4;c.stroke();};
      shore(m.s);shore(m.t);
      /* 左岸：敌营或粮仓；右岸：京城 */
      const bankC=(side,f)=>G.port?[W*f,side===m.s?G.inner.y0*.62:(G.inner.y1+H)/2]:[side===m.s?G.inner.x0*.45:(G.inner.x1+W)/2,H*f];
      if(S.round===2){[[.3],[.62]].forEach(([f])=>{const [x,y]=bankC(m.s,f);house(c,x,y+10,Math.min(40,G.bank*.7),.9);});const [bx,by]=bankC(m.s,.46);banner(c,bx,by+18,16,'粮');}
      else{[.22,.4,.6,.78].forEach(f=>{const [x,y]=bankC(m.s,f);tent(c,x,y+12,Math.min(22,G.bank*.38));});const [bx,by]=bankC(m.s,.5);banner(c,bx,by+18,16,'金');}
      {c.strokeStyle=ink(.75);c.lineWidth=2;c.fillStyle='rgba(120,70,40,.55)';
        if(G.port){const y=G.inner.y1+G.bank*.35;c.fillRect(W*.08,y,W*.84,G.bank*.28);c.strokeRect(W*.08,y,W*.84,G.bank*.28);for(let x=W*.08;x<W*.92;x+=12)c.fillRect(x,y-5,7,5);}
        else{const x=G.inner.x1+G.bank*.35;c.fillRect(x,H*.1,G.bank*.28,H*.8);c.strokeRect(x,H*.1,G.bank*.28,H*.8);for(let y=H*.1;y<H*.9;y+=12)c.fillRect(x-5,y,5,7);}
        const [gx,gy]=bankC(m.t,.5);c.fillStyle=ink(.9);c.font=`${Math.round(Math.min(34,G.bank*.55))}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText('京',gx+(G.port?0:G.bank*.1),gy+(G.port?G.bank*.1:0));}
      /* 诸洲 */
      blobs=[];m.nodes.forEach((n,i)=>{if(i===m.s||i===m.t)return;const [x,y]=pos(i),rr=RNG(i*7+3),pts=[];for(let k=0;k<16;k++){const a=k/16*Math.PI*2,d=G.r*(.86+rr()*.26)*(1+.15*Math.cos(a*2+i));pts.push([x+Math.cos(a)*d*1.15,y+Math.sin(a)*d*.9]);}
        blobs[i]=pts;c.beginPath();pts.forEach(([px,py],k)=>k?c.lineTo(px,py):c.moveTo(px,py));c.closePath();c.fillStyle='rgba(205,190,145,.95)';c.fill();c.strokeStyle=ink(.55);c.lineWidth=1.3;c.stroke();
        if(G.r>26)willow(c,rr,x+G.r*.55,y+G.r*.35,G.r*.55);
        c.fillStyle=ink(.85);c.font=`${Math.round(Math.max(12,Math.min(18,G.r*.36)))}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(n.nm,x-G.r*.1,y-G.r*.12);});
      paperGrain(c,0,0,W,H,false);}

    /* ---------- 前景：桥、敌军、粮车 ---------- */
    function drawBridge(c,e,i,used){const [p1,p2]=ends(e),dx=p2[0]-p1[0],dy=p2[1]-p1[1],L=Math.hypot(dx,dy),w=bw(e),cut=S.cut.has(i);
      c.save();c.translate(p1[0],p1[1]);c.rotate(Math.atan2(dy,dx));
      const deck=(a,b)=>{c.fillStyle=e.stone?'rgba(150,150,145,.95)':'rgba(150,100,55,.95)';c.fillRect(a,-w/2,b-a,w);c.strokeStyle=ink(.6);c.lineWidth=1;c.strokeRect(a,-w/2,b-a,w);
        if(!e.stone){c.strokeStyle='rgba(90,55,25,.55)';for(let x=a+4;x<b;x+=6){c.beginPath();c.moveTo(x,-w/2);c.lineTo(x,w/2);c.stroke();}}
        else{c.strokeStyle=ink(.35);for(let x=a+8;x<b;x+=14){c.beginPath();c.arc(x,w/2,4,Math.PI,0);c.stroke();}}};
      if(cut){deck(0,L*.34);deck(L*.66,L);c.fillStyle='rgba(120,70,40,.55)';for(let k=0;k<4;k++)c.fillRect(L*(.4+k*.05),w*(k%2?.3:-.5),5,2);}
      else deck(0,L);
      c.restore();
      const mx=(p1[0]+p2[0])/2,my=(p1[1]+p2[1])/2;
      if(S.round===2&&!e.stone){const u=used[i],full=u>=e.w;const t=`${u}/${e.w}`;c.font='600 12px sans-serif';const tw=c.measureText(t).width+10;
        c.fillStyle=full?RED:u?'rgba(30,91,115,.92)':`rgba(${PAPER},.95)`;c.beginPath();c.roundRect?c.roundRect(mx-tw/2,my-9,tw,18,9):c.rect(mx-tw/2,my-9,tw,18);c.fill();c.strokeStyle=ink(.4);c.stroke();
        c.fillStyle=full||u?'#fff':ink(.85);c.textAlign='center';c.textBaseline='middle';c.fillText(t,mx,my+.5);return;}
      const R=Math.max(10,Math.min(13,G.r*.3));c.beginPath();c.arc(mx,my,R,0,7);c.fillStyle=cut?'rgba(200,190,170,.95)':e.stone?'rgba(120,120,115,.95)':`rgba(${PAPER},.97)`;c.fill();c.strokeStyle=cut?RED:ink(.55);c.lineWidth=cut?2:1.2;c.stroke();
      c.fillStyle=e.stone?'#fff':cut?ink(.45):ink(.9);c.font=`${Math.round(R*1.15)}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(e.stone?'石':e.w,mx,my+1);
      if(cut){c.strokeStyle=RED;c.lineWidth=2;c.beginPath();c.moveTo(mx-R*.7,my+R*.7);c.lineTo(mx+R*.7,my-R*.7);c.stroke();}}
    function polyOf(nodes,off){const m=S.map;return nodes.map((v,k)=>{if(v===m.s||v===m.t){const other=nodes[k===0?1:k-1];const e=m.edges.find(e=>(e.a===v&&e.b===other)||(e.b===v&&e.a===other));const [p1,p2]=ends(e);return (e.a===v?p1:p2).map((q,j)=>q+(j===(G.port?0:1)?off:0));}const [x,y]=pos(v);return[x+(G.port?off:0),y+(G.port?0:off)];});}
    function along(poly,t){let L=0;const seg=[];for(let k=1;k<poly.length;k++){const d=Math.hypot(poly[k][0]-poly[k-1][0],poly[k][1]-poly[k-1][1]);seg.push(d);L+=d;}let s=((t%1)+1)%1*L;
      for(let k=0;k<seg.length;k++){if(s<=seg[k]){const f=s/seg[k];return[poly[k][0]+(poly[k+1][0]-poly[k][0])*f,poly[k][1]+(poly[k+1][1]-poly[k][1])*f];}s-=seg[k];}return poly[poly.length-1];}
    function drawFg(){if(!G)return;const c=fitCanvas(fg,W,H),m=S.map;c.clearRect(0,0,W,H);const tt=S.t;
      const showCut=S.view==='best'&&S.round!==2?new Set(S.opt.cut):S.cut;
      /* 敌军够得着的洲 */
      if(S.round!==2){const r=reach(m,showCut);m.nodes.forEach((n,i)=>{if(i===m.s||i===m.t||!r.has(i)||!blobs[i])return;c.beginPath();blobs[i].forEach(([x,y],k)=>k?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle='rgba(179,38,30,.22)';c.fill();
          const [x,y]=pos(i);c.fillStyle=RED;c.beginPath();c.moveTo(x+G.r*.3,y+G.r*.45);c.lineTo(x+G.r*.3,y+G.r*.05);c.lineTo(x+G.r*.6,y+G.r*.15);c.lineTo(x+G.r*.3,y+G.r*.25);c.fill();});
        if(r.has(m.t)){c.fillStyle='rgba(179,38,30,.16)';if(G.port)c.fillRect(0,G.inner.y1,W,H-G.inner.y1);else c.fillRect(G.inner.x1,0,W-G.inner.x1,H);}}
      const used=load(m,S.paths);
      const saveCut=S.cut;S.cut=showCut;m.edges.forEach((e,i)=>drawBridge(c,e,i,used));S.cut=saveCut;
      if(S.view==='best'){S.opt.cut.forEach(i=>{const [p1,p2]=ends(m.edges[i]);const mx=(p1[0]+p2[0])/2,my=(p1[1]+p2[1])/2;c.strokeStyle=RED;c.lineWidth=3;c.beginPath();c.arc(mx,my,G.r*.5,0,7);c.stroke();});}
      /* 敌军的来路 */
      if(S.round!==2&&S.view==='mine'&&!S.done){const path=enemyPath(m,S.cut);if(path){const nodes=[m.s];path.forEach(i=>{const e=m.edges[i],last=nodes[nodes.length-1];nodes.push(e.a===last?e.b:e.a);});const poly=polyOf(nodes,0);
          c.strokeStyle=RED;c.lineWidth=3;c.setLineDash([10,8]);c.lineDashOffset=-tt*30;c.beginPath();poly.forEach(([x,y],k)=>k?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.setLineDash([]);
          const [ex,ey]=poly[poly.length-1];c.fillStyle=RED;c.font=`${Math.round(Math.max(14,G.r*.4))}px ${BRUSH_FONT}`;c.textAlign=G.port?'center':'right';c.textBaseline='middle';c.fillText('敌军从这里过来',ex-(G.port?0:G.r*.9),ey-(G.port?G.r*.8:G.r*.75));}}
      /* 粮车：一路一种颜色 */
      const drawPaths=S.view==='scout'?decompose(m):S.paths;
      drawPaths.forEach((p,k)=>{const off=(k-(drawPaths.length-1)/2)*Math.min(6,G.r*.12),poly=polyOf(p.nodes,off),col=HUES[k%HUES.length];
        c.strokeStyle=col.replace(/[\d.]+\)$/,'.45)');c.lineWidth=Math.min(10,2+p.carts*1.1);c.lineJoin='round';c.beginPath();poly.forEach(([x,y],j)=>j?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
        const n=Math.min(8,p.carts);for(let q=0;q<n;q++){const [x,y]=along(poly,tt*.08+q/n);c.fillStyle=col;c.beginPath();c.arc(x,y,3.5,0,7);c.fill();}});
      if(S.draft){const poly=S.draft.nodes.length>1?polyOf(S.draft.nodes,0):[S.draft.start];if(S.draft.pt)poly.push(S.draft.pt);c.strokeStyle='rgba(30,91,115,.9)';c.lineWidth=4;c.setLineDash([6,5]);c.beginPath();poly.forEach(([x,y],j)=>j?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.setLineDash([]);}
    }
    function loop(ts){S.raf=requestAnimationFrame(loop);if(!root.isConnected){cancelAnimationFrame(S.raf);return;}const dt=Math.min(.05,(ts-(S.last||ts))/1000);S.last=ts;S.t+=reduceMotion()?0:dt;drawFg();}

    /* ---------- 点桥、拖粮路 ---------- */
    function hitBridge(x,y){const m=S.map;let best=-1,bd=1e9;m.edges.forEach((e,i)=>{const [p1,p2]=ends(e),dx=p2[0]-p1[0],dy=p2[1]-p1[1],L2=dx*dx+dy*dy||1;let t=((x-p1[0])*dx+(y-p1[1])*dy)/L2;t=Math.max(0,Math.min(1,t));
        const d=Math.hypot(x-(p1[0]+dx*t),y-(p1[1]+dy*t));if(d<Math.max(16,bw(e)/2+10)&&d<bd){bd=d;best=i;}});return best;}
    function nodeAt(x,y){const m=S.map;if(G.port){if(y<G.inner.y0+6)return m.s;if(y>G.inner.y1-6)return m.t;}else{if(x<G.inner.x0+6)return m.s;if(x>G.inner.x1-6)return m.t;}
      let best=-1;m.nodes.forEach((n,i)=>{if(i===m.s||i===m.t)return;const [px,py]=pos(i);if(Math.hypot(x-px,y-py)<G.r*1.15)best=i;});return best;}
    const edgeBetween=(a,b)=>S.map.edges.findIndex(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a));
    const loc=ev=>{const r=fg.getBoundingClientRect();return[ev.clientX-r.left,ev.clientY-r.top];};
    fg.addEventListener('pointerdown',ev=>{if(S.done||!G||ev.button>0)return;const [x,y]=loc(ev);
      if(S.round===2){if(nodeAt(x,y)!==S.map.s){ui.flash('从左岸的粮仓起步',x,y);return;}try{fg.setPointerCapture(ev.pointerId);}catch(_){}S.draft={nodes:[S.map.s],edges:[],pt:[x,y],start:[x,y]};return;}
      const i=hitBridge(x,y);if(i<0)return;const e=S.map.edges[i];if(e.stone){ui.flash('石桥拆不动',x,y);audio.thud();return;}
      if(S.cut.has(i)){S.cut.delete(i);audio.tap(5);}else{S.cut.add(i);audio.thud();}afterChange();});
    fg.addEventListener('pointermove',ev=>{if(!S.draft)return;const [x,y]=loc(ev);S.draft.pt=[x,y];const d=S.draft,v=nodeAt(x,y),last=d.nodes[d.nodes.length-1];
      if(v<0||v===last)return;if(d.nodes.length>1&&v===d.nodes[d.nodes.length-2]){d.nodes.pop();d.edges.pop();return;}
      if(d.nodes.includes(v))return;const ei=edgeBetween(last,v);if(ei<0)return;d.nodes.push(v);d.edges.push(ei);audio.tap(3+d.nodes.length%4);
      if(v===S.map.t)commit();});
    const endDraft=()=>{if(S.draft){S.draft=null;}};fg.addEventListener('pointerup',endDraft);fg.addEventListener('pointercancel',endDraft);
    function commit(){const d=S.draft;S.draft=null;const room=roomOf(S.map,S.paths,d.edges);const [x,y]=pos(d.nodes[d.nodes.length-2]);
      if(room<=0){ui.flash('这一路有桥已经满了',x,y);audio.low();return;}
      S.paths.push({nodes:d.nodes,edges:d.edges,carts:room});audio.coin();ui.flash(`运上 ${room} 车`,x,y);afterChange();}

    /* ---------- 账 ---------- */
    function afterChange(){hudDraw();acts();}
    function hudDraw(){const m=S.map;
      if(S.round===2){const tot=S.paths.reduce((s,p)=>s+p.carts,0);hud.innerHTML=`<div class="big"><small>运到京城</small><b>${tot}</b><small>车 / 天</small></div><div class="goal">至妙：${S.best} 车</div>`;
        chips.innerHTML=S.paths.map((p,k)=>`<span class="chip" style="border-color:${HUES[k%HUES.length]}"><i style="background:${HUES[k%HUES.length]}"></i>${p.carts} 车<button data-k="${k}" aria-label="撤回这一路">✕</button></span>`).join('');
        chips.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(S.done)return;S.paths.splice(+b.dataset.k,1);audio.tap(2);afterChange();});return;}
      chips.innerHTML='';const cost=costOf(m,S.cut),blocked=!reach(m,S.cut).has(m.t),w=wasted(m,S.cut).length;
      hud.innerHTML=`<div class="big"><small>拆桥工夫</small><b>${cost}</b></div><div class="goal">至妙：${S.best} 工</div><div class="st ${blocked?'ok':'bad'}">${blocked?'截断了！':'敌军还能到京城'}${blocked&&w?` · 有 ${w} 座白拆了`:''}</div>`;}
    function acts(){if(S.done)return;const m=S.map;
      if(S.round===2){const tot=S.paths.reduce((s,p)=>s+p.carts,0);ui.acts([['全部撤回',()=>{S.paths=[];afterChange();}],['就这样',finish,true,tot===0]]);return;}
      const blocked=!reach(m,S.cut).has(m.t);ui.acts([['全部修回',()=>{S.cut=new Set();afterChange();}],['就这样',finish,true,!blocked]]);}

    /* ---------- 回合 ---------- */
    function begin(n){S.round=n;S.map=ROUNDS[n-1].map;S.cut=new Set();S.paths=[];S.draft=null;S.done=false;S.view='mine';const f=maxFlow(S.map);S.best=f.value;S.opt=f;
      ui.hideResult();ui.meter('');ui.stageName(TITLE[n-1]);ui.say(INTRO[n-1]);drawBg();afterChange();}
    function finish(){const m=S.map;let g,nums,line;const L=[];
      if(S.round===2){const tot=S.paths.reduce((s,p)=>s+p.carts,0);g=gradeFlow(tot,S.best);nums=`运到京城 <b>${tot}</b> 车 · 最多能运 <b>${S.best}</b> 车 · 第一回最省要拆 <b>${S.best}</b> 工`;
        line=tot>=S.best?`运得最多正好 ${S.best} 车，和第一回最省的拆法一样多——看满载的桥，正是第一回该拆的那几座。拆得最少＝运得最多。`:`还能再运：撤回一路、换个走法。第一回最省要拆 ${S.best} 工，这里就一定能运到 ${S.best} 车。`;
        if(tot>=S.best)S.view='best';}
      else{const cost=costOf(m,S.cut),w=wasted(m,S.cut).length;g=gradeCut(cost,S.best);nums=`拆桥工夫 <b>${cost}</b> · 最省 <b>${S.best}</b>`+(w?` · 白拆 ${w} 座`:'');
        line=cost<=S.best?(S.round===1?'最省的一刀，不在岸边，也不是专拣窄桥拆：是整张河网最细的那道「腰」。':'石桥拆不动，就绕开它找腰。点「看探马的回报」：有这么多路人马能各走各的桥同时过来，所以至少得拆这么多。')
          :(w?`有 ${w} 座桥白拆了：两头在同一边，拆不拆都一样。`:'')+'岸边的桥加起来并不便宜，专拣窄桥拆也会绕远。换一道「腰」试试。';}
      S.done=true;g==='至妙'?audio.arp():g==='下品'?audio.low():audio.bell();drawBg();ui.result(g,nums,line,true);
      if(S.round!==2)L.push(['看最省的拆法',()=>{S.view=S.view==='best'?'mine':'best';}]);
      if(S.round===3)L.push(['看探马的回报',()=>{S.view=S.view==='scout'?'mine':'scout';ui.say(`探马回报：敌军能分 ${decompose(m).length} 路、合计 ${S.best} 份人马，各走各的桥同时过来；每一份都得拆掉一份工夫才拦得住——所以至少要拆 ${S.best}。`);}]);
      L.push(['再来一次',()=>begin(S.round)]);L.push(S.round<3?['下一回 →',()=>begin(S.round+1),true]:['题跋 · 钤印',()=>ui.colophon(),true]);ui.acts(L);}

    function layout(){if(!S.map)return;drawBg();}
    this._resize=()=>layout();
    let lastWH='',rq=0;const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{cancelAnimationFrame(rq);rq=requestAnimationFrame(()=>{const k=root.clientWidth+'x'+root.clientHeight;if(k!==lastWH){lastWH=k;layout();}});}):null;if(ro)ro.observe(root);
    this._stop=()=>{cancelAnimationFrame(S.raf);if(ro)ro.disconnect();};
    /* 自动化测试用 */
    bridgeLevel._dbg=S;bridgeLevel._go=n=>begin(n);
    bridgeLevel._play={toggle:i=>{if(S.map.edges[i].stone)return;S.cut.has(i)?S.cut.delete(i):S.cut.add(i);afterChange();},route:(nodes)=>{const edges=[];for(let k=1;k<nodes.length;k++)edges.push(edgeBetween(nodes[k-1],nodes[k]));S.draft={nodes,edges};commit();},finish,geom:()=>G,ends:i=>ends(S.map.edges[i]),pos};
    begin(1);S.raf=requestAnimationFrame(loop);
  },
  resize(){this._resize&&this._resize();},
  stop(){this._stop&&this._stop();this._resize=null;}
};
