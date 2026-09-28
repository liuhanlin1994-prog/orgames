/* 斗宝 · 拍卖：落价 → 暗标 → 只付次高价
   手感：落价时盯着价码往下掉，看准了喊「要了」；暗标时在尺上点一下出价、封标。开标后当场鉴定真值——看谁赢了反亏。 */
import {RNG} from '../core/rng.js';
import {INK,PAPER,BRUSH_FONT,paperBase,paperGrain,roof,house,figure,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {NAMES,R1,R2,LOTS3,sealed,aiBid,startOf,expert,runSealed,vickrey,payoffAt,truthful,gradeProfit} from './auction-core.js';

const ink=a=>`rgba(${INK},${a})`,RED='rgba(179,38,30,.92)',BLUE='rgba(30,91,115,.9)',GOLD='rgba(200,160,70,.95)',GREEN='rgba(46,110,80,.9)';
const LOOK=[null,['rgba(150,60,40,.34)',1],['rgba(60,80,100,.3)',2],['rgba(120,90,50,.32)',1],['rgba(40,70,60,.32)',2]];
const SHORT=['你','赵','钱','孙','李'],TITLE=['第一回 · 落价','第二回 · 暗标','第三回 · 只付次高价'];
const INTRO=['大相国寺斗宝。这回是<b>落价</b>：价码从高处一路往下落，谁先喊「要了」，宝物就按那个价归谁。你只凭眼力估个数——真值多半在你估价上下 30 贯之内。',
  '改投<b>暗标</b>：各人写个价封进信封，价高者得、照自己写的付。有的宝物<b>一眼看得准</b>（上下 15 贯），有的<b>看不准</b>（上下 45 贯）。在尺上点一下出价，再封标。',
  '最后一场换了规矩：<b>价高者得，但只付第二高的价</b>。这回各人心里的价不同——这几件对你值多少，你自己清楚（金线）。在尺上点一下出价，再封标。'];
const DUTCH_MS=70,BID_SECS=12,AUTO_MS=5200;

/* ---------- 宝物的画法：(x,y) 为底部中点，s 为高 ---------- */
function drawWare(c,nm,x,y,K){
  c.save();c.translate(x,y);c.lineJoin='round';c.lineCap='round';
  const glaze=col=>{c.fillStyle=col;c.fill();c.strokeStyle=ink(.6);c.lineWidth=Math.max(1,K*.012);c.stroke();};
  const legs=(col,list)=>{c.strokeStyle=col;c.lineWidth=K*.035;list.forEach(([a,b,cx,d])=>{c.beginPath();c.moveTo(a*K,b*K);c.lineTo(cx*K,d*K);c.stroke();});};
  switch(nm){
    case '青瓷坛':{c.beginPath();c.moveTo(-K*.12,-K);c.lineTo(K*.12,-K);c.quadraticCurveTo(K*.14,-K*.86,K*.3,-K*.72);c.quadraticCurveTo(K*.46,-K*.45,K*.28,-K*.08);c.lineTo(K*.2,0);c.lineTo(-K*.2,0);c.lineTo(-K*.28,-K*.08);c.quadraticCurveTo(-K*.46,-K*.45,-K*.3,-K*.72);c.quadraticCurveTo(-K*.14,-K*.86,-K*.12,-K);c.closePath();glaze('rgba(120,165,140,.92)');
      c.strokeStyle='rgba(60,90,80,.35)';c.lineWidth=.8;for(let i=0;i<5;i++){c.beginPath();c.moveTo(-K*.28+i*K*.14,-K*.62);c.lineTo(-K*.24+i*K*.12,-K*.22);c.stroke();}
      c.strokeStyle='rgba(250,245,230,.5)';c.lineWidth=K*.03;c.beginPath();c.moveTo(-K*.22,-K*.62);c.quadraticCurveTo(-K*.3,-K*.4,-K*.2,-K*.18);c.stroke();break;}
    case '铜镜':{c.fillStyle='rgba(92,48,30,.9)';c.fillRect(-K*.25,-K*.08,K*.5,K*.08);c.beginPath();c.arc(0,-K*.52,K*.42,0,7);glaze('rgba(150,120,60,.92)');
      c.beginPath();c.arc(0,-K*.52,K*.32,0,7);c.strokeStyle='rgba(90,60,20,.6)';c.lineWidth=K*.02;c.stroke();c.fillStyle='rgba(90,60,20,.8)';c.beginPath();c.arc(0,-K*.52,K*.06,0,7);c.fill();
      for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.arc(Math.cos(a)*K*.22,-K*.52+Math.sin(a)*K*.22,K*.025,0,7);c.fill();}
      c.fillStyle='rgba(40,120,110,.35)';c.beginPath();c.arc(K*.18,-K*.7,K*.08,0,7);c.fill();break;}
    case '古画':{c.fillStyle='rgba(92,48,30,.9)';c.fillRect(-K*.3,-K,K*.6,K*.04);c.fillRect(-K*.3,-K*.06,K*.6,K*.05);c.fillStyle='rgba(215,195,150,1)';c.fillRect(-K*.24,-K*.96,K*.48,K*.9);
      c.fillStyle=`rgba(${PAPER},1)`;c.fillRect(-K*.19,-K*.86,K*.38,K*.66);c.fillStyle=ink(.55);c.beginPath();c.moveTo(-K*.19,-K*.3);c.lineTo(-K*.08,-K*.62);c.lineTo(0,-K*.45);c.lineTo(K*.08,-K*.72);c.lineTo(K*.19,-K*.36);c.lineTo(K*.19,-K*.2);c.lineTo(-K*.19,-K*.2);c.closePath();c.fill();
      c.fillStyle='rgba(179,38,30,.85)';c.fillRect(K*.1,-K*.3,K*.05,K*.05);break;}
    case '玉佩':{c.strokeStyle='rgba(179,38,30,.8)';c.lineWidth=K*.02;c.beginPath();c.moveTo(0,-K);c.lineTo(0,-K*.8);c.stroke();
      c.beginPath();c.arc(0,-K*.5,K*.3,0,7);c.arc(0,-K*.5,K*.1,0,7,true);c.fillStyle='rgba(110,170,120,.92)';c.fill('evenodd');c.strokeStyle=ink(.5);c.lineWidth=1;c.stroke();
      c.strokeStyle='rgba(179,38,30,.8)';c.lineWidth=K*.015;for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(0,-K*.2);c.lineTo(i*K*.03,-K*.02);c.stroke();}break;}
    case '端砚':{c.fillStyle=ink(.85);c.beginPath();c.ellipse(0,-K*.2,K*.45,K*.2,0,0,7);c.fill();c.fillStyle='rgba(70,80,100,.95)';c.beginPath();c.ellipse(-K*.06,-K*.24,K*.26,K*.1,0,0,7);c.fill();
      c.fillStyle='rgba(30,40,55,1)';c.beginPath();c.ellipse(K*.28,-K*.22,K*.08,K*.06,0,0,7);c.fill();break;}
    case '漆盒':{c.fillStyle='rgba(150,30,25,.95)';c.fillRect(-K*.4,-K*.45,K*.8,K*.45);c.fillStyle='rgba(120,20,20,1)';c.fillRect(-K*.43,-K*.55,K*.86,K*.12);
      c.strokeStyle=GOLD;c.lineWidth=K*.012;c.strokeRect(-K*.34,-K*.38,K*.68,K*.3);c.beginPath();c.arc(0,-K*.23,K*.08,0,7);c.stroke();break;}
    case '青铜爵':{c.beginPath();c.moveTo(-K*.35,-K*.8);c.lineTo(K*.4,-K*.78);c.quadraticCurveTo(K*.2,-K*.62,K*.18,-K*.4);c.lineTo(-K*.18,-K*.4);c.quadraticCurveTo(-K*.2,-K*.62,-K*.35,-K*.8);c.closePath();glaze('rgba(60,110,95,.92)');
      legs('rgba(50,90,75,1)',[[-.14,-.4,-.24,0],[.14,-.4,.24,0],[0,-.4,0,-.02]]);c.fillStyle='rgba(50,90,75,1)';c.fillRect(-K*.03,-K*.95,K*.03,K*.16);c.fillRect(K*.08,-K*.95,K*.03,K*.16);break;}
    case '香炉':{c.beginPath();c.moveTo(-K*.38,-K*.62);c.lineTo(K*.38,-K*.62);c.quadraticCurveTo(K*.38,-K*.22,0,-K*.2);c.quadraticCurveTo(-K*.38,-K*.22,-K*.38,-K*.62);c.closePath();glaze('rgba(120,90,50,.95)');
      legs('rgba(100,70,35,1)',[[-.22,-.25,-.28,0],[.22,-.25,.28,0],[0,-.2,0,-.02]]);c.lineWidth=K*.03;c.beginPath();c.moveTo(-K*.28,-K*.62);c.lineTo(-K*.28,-K*.78);c.lineTo(-K*.16,-K*.78);c.lineTo(-K*.16,-K*.62);c.moveTo(K*.28,-K*.62);c.lineTo(K*.28,-K*.78);c.lineTo(K*.16,-K*.78);c.lineTo(K*.16,-K*.62);c.stroke();
      c.strokeStyle='rgba(120,120,120,.35)';c.lineWidth=K*.02;c.beginPath();c.moveTo(0,-K*.66);c.bezierCurveTo(-K*.1,-K*.8,K*.1,-K*.88,0,-K);c.stroke();break;}
    case '汝窑盏':{c.beginPath();c.moveTo(-K*.42,-K*.45);c.quadraticCurveTo(-K*.36,-K*.08,-K*.1,-K*.06);c.lineTo(-K*.12,0);c.lineTo(K*.12,0);c.lineTo(K*.1,-K*.06);c.quadraticCurveTo(K*.36,-K*.08,K*.42,-K*.45);c.closePath();glaze('rgba(150,185,195,.95)');
      c.strokeStyle='rgba(90,120,130,.35)';c.lineWidth=.8;for(let i=0;i<6;i++){c.beginPath();c.moveTo(-K*.3+i*K*.11,-K*.4);c.lineTo(-K*.26+i*K*.1,-K*.14);c.stroke();}
      c.fillStyle='rgba(120,160,170,1)';c.beginPath();c.ellipse(0,-K*.45,K*.42,K*.06,0,0,7);c.fill();break;}
    case '金步摇':{c.strokeStyle=GOLD;c.lineWidth=K*.035;c.beginPath();c.moveTo(-K*.35,-K*.12);c.lineTo(K*.25,-K*.7);c.stroke();
      c.fillStyle=GOLD;for(let i=0;i<5;i++){const a=i*Math.PI*2/5;c.beginPath();c.ellipse(K*.28+Math.cos(a)*K*.08,-K*.73+Math.sin(a)*K*.08,K*.06,K*.035,a,0,7);c.fill();}
      c.fillStyle='rgba(179,38,30,.9)';c.beginPath();c.arc(K*.28,-K*.73,K*.04,0,7);c.fill();
      for(let i=0;i<3;i++){const x0=K*(.18+i*.08);c.strokeStyle=GOLD;c.lineWidth=1;c.beginPath();c.moveTo(x0,-K*.66);c.lineTo(x0,-K*.4);c.stroke();c.fillStyle='rgba(110,170,120,.9)';c.beginPath();c.arc(x0,-K*.38,K*.03,0,7);c.fill();}break;}
    case '犀角杯':{c.beginPath();c.moveTo(-K*.3,-K*.85);c.quadraticCurveTo(0,-K*.95,K*.32,-K*.8);c.quadraticCurveTo(K*.18,-K*.4,K*.02,-K*.12);c.quadraticCurveTo(-K*.02,-K*.06,-K*.06,-K*.12);c.quadraticCurveTo(-K*.2,-K*.45,-K*.3,-K*.85);c.closePath();glaze('rgba(150,95,45,.92)');
      c.fillStyle='rgba(92,48,30,.9)';c.fillRect(-K*.14,-K*.06,K*.28,K*.06);c.strokeStyle='rgba(90,50,20,.4)';c.lineWidth=1;for(let i=0;i<4;i++){c.beginPath();c.moveTo(-K*.22+i*K*.12,-K*.78);c.quadraticCurveTo(-K*.1+i*K*.08,-K*.5,-K*.02+i*K*.02,-K*.2);c.stroke();}break;}
    case '三彩马':{c.fillStyle='rgba(92,48,30,.9)';c.fillRect(-K*.4,-K*.06,K*.8,K*.06);const col='rgba(205,150,60,.95)';c.fillStyle=col;c.beginPath();c.ellipse(0,-K*.5,K*.3,K*.15,0,0,7);c.fill();
      c.beginPath();c.moveTo(K*.2,-K*.58);c.lineTo(K*.32,-K*.88);c.lineTo(K*.44,-K*.84);c.lineTo(K*.34,-K*.55);c.closePath();c.fill();c.beginPath();c.ellipse(K*.4,-K*.88,K*.1,K*.055,.5,0,7);c.fill();
      c.strokeStyle=col;c.lineWidth=K*.06;[-.2,-.1,.12,.22].forEach(dx=>{c.beginPath();c.moveTo(dx*K,-K*.42);c.lineTo(dx*K,-K*.07);c.stroke();});
      c.fillStyle='rgba(60,120,80,.85)';c.beginPath();c.ellipse(-K*.02,-K*.6,K*.14,K*.06,0,0,7);c.fill();c.fillStyle='rgba(245,235,210,.95)';c.beginPath();c.ellipse(-K*.02,-K*.64,K*.08,K*.035,0,0,7);c.fill();
      c.strokeStyle='rgba(245,235,210,.9)';c.lineWidth=K*.03;c.beginPath();c.moveTo(-K*.28,-K*.55);c.quadraticCurveTo(-K*.4,-K*.45,-K*.36,-K*.3);c.stroke();break;}
  }
  c.restore();
}

export const auctionLevel={
  id:'auction',title:'斗宝',concept:'拍卖 · 赢者诅咒',ambience:'market',poem:['五花马','千金裘','呼儿将出换美酒'],poemSrc:'李白《将进酒》',
  colophon:{head:'拍卖 · 赢者诅咒',seal:'虚实',
    lines:['宝物的真值谁也不知道，各人只凭眼力估个数；估得最高的，往往估错最多。','落价与暗标本是一回事：心里定下的那个价，就是该喊「要了」的时候。越看不准，压得越低。','只付第二高的价，出价只决定得不得标、不决定付多少：照心里的真价出，最不吃亏。'],
    note:'今之油田开采权、无线电频谱竞拍，都要提防赢者诅咒；网上的广告位竞价，多用「次高价」规则。'},
  start(ui,audio){
    const S={round:1,lots:R1,k:-1,lot:R1[0],phase:'ready',price:0,maxAI:0,bid:null,res:null,showV:false,raised:[0,0,0,0,0],tot:[0,0,0,0,0],wins:[0,0,0,0,0],truth:0,hist:[],timer:0,autoT:0,vT:0,t0:0};
    const root=el('div','au'),scene=el('div','au-scene'),bg=el('canvas'),fg=el('canvas'),lotEl=el('div','au-lot'),priceEl=el('div','au-price'),ledger=el('div','au-ledger'),rev=el('canvas','au-review');
    const rwrap=el('div','au-rwrap'),rhint=el('div','au-rhint'),rcv=el('canvas','au-ruler');rcv.tabIndex=0;rcv.setAttribute('aria-label','出价尺：左右键调整出价，回车封标');
    [bg,fg,lotEl,priceEl,ledger,rev].forEach(e=>scene.appendChild(e));rwrap.appendChild(rhint);rwrap.appendChild(rcv);root.appendChild(scene);root.appendChild(rwrap);ui.stage.appendChild(root);
    const names=[1,2,3,4].map(i=>{const d=el('div','au-name',NAMES[i]);scene.appendChild(d);return d;});rev.hidden=true;priceEl.hidden=true;
    let W=0,H=0,G=null;

    /* ---------- 大相国寺：远处殿宇、摊棚、宝案、牙人、四位买家 ---------- */
    function geom(){const narrow=W<640,fs=Math.max(40,Math.min(H*.36,narrow?W*.2:W*.1)),ty=H*.6,tw=narrow?W*.46:Math.max(220,Math.min(W*.32,420)),tx=narrow?W*.5:W*.46;
      const xs=narrow?[.09,.27,.73,.91]:[.12,.26,.66,.8];return{narrow,fs,ty,tw,tx,ware:Math.min(H*.32,tw*.55),yx:tx+tw*.36,bid:xs.map(f=>W*f),by:H*.99};}
    function drawScene(){W=scene.clientWidth;H=scene.clientHeight;G=geom();const c=fitCanvas(bg,W,H),r=RNG(31);paperBase(c,0,0,W,H);
      for(let i=0;i<Math.ceil(W/46)+1;i++)house(c,i*46+(i%2)*16,H*.3+(i%3)*3,32+r()*14,.18+r()*.08);
      c.globalAlpha=.45;roof(c,W*.5,H*.16,Math.min(W*.5,380),H*.1,.85);c.globalAlpha=1;
      const {tx,tw,ty}=G;c.strokeStyle=ink(.75);c.lineWidth=2;c.beginPath();c.moveTo(tx-tw*.62,ty+H*.02);c.lineTo(tx-tw*.62,H*.2);c.moveTo(tx+tw*.62,ty+H*.02);c.lineTo(tx+tw*.62,H*.2);c.stroke();
      c.fillStyle='rgba(179,38,30,.55)';c.beginPath();c.moveTo(tx-tw*.75,H*.2);c.lineTo(tx+tw*.75,H*.2);c.lineTo(tx+tw*.66,H*.27);c.lineTo(tx-tw*.66,H*.27);c.closePath();c.fill();
      c.fillStyle='rgba(247,241,227,.95)';c.font=`${Math.round(Math.min(H*.05,tw*.09))}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText('斗 宝',tx,H*.235);
      c.fillStyle='rgba(120,70,40,.85)';c.fillRect(tx-tw/2,ty,tw,H*.035);c.fillStyle='rgba(179,38,30,.75)';c.fillRect(tx-tw/2+6,ty+H*.035,tw-12,H*.12);c.fillStyle='rgba(120,70,40,.8)';c.fillRect(tx-tw/2+4,ty+H*.035,6,H*.2);c.fillRect(tx+tw/2-10,ty+H*.035,6,H*.2);
      figure(c,G.yx,ty+H*.02,G.fs*.95,'rgba(90,70,50,.3)',2);
      for(let i=0;i<50;i++){const x=r()*W,y=H*.84+r()*H*.16;c.strokeStyle=ink(.05);c.beginPath();c.moveTo(x,y);c.lineTo(x+10+r()*20,y);c.stroke();}
      paperGrain(c,0,0,W,H,false);
      names.forEach((d,i)=>{d.style.left=G.bid[i]+'px';d.style.top=(G.by-G.fs*1.08)+'px';});
      if(G.narrow){priceEl.style.left='auto';priceEl.style.right='10px';priceEl.style.transform='none';priceEl.style.top=(ledger.offsetTop+ledger.offsetHeight+8)+'px';}
      else{priceEl.style.right='auto';priceEl.style.transform='';priceEl.style.left=(G.yx+G.fs*.3)+'px';priceEl.style.top=(G.ty-G.fs*1.25)+'px';}}
    function drawFg(){const c=fitCanvas(fg,W,H);c.clearRect(0,0,W,H);if(!G)return;const L=S.lot;
      drawWare(c,L.nm,G.tx-G.tw*.08,G.ty,G.ware);
      [1,2,3,4].forEach(i=>{const x=G.bid[i-1],y=G.by,s=G.fs,[tint,hat]=LOOK[i],won=S.res&&S.res.win===i;
        figure(c,x,y,s,won?'rgba(179,38,30,.4)':tint,hat);
        const up=S.raised[i],px=x+s*.24,py=y-s*(up?1.12:.52);c.strokeStyle=ink(.8);c.lineWidth=Math.max(1.5,s*.03);c.beginPath();c.moveTo(x+s*.14,y-s*.5);c.lineTo(px,py+s*.18);c.stroke();
        c.fillStyle=up?RED:`rgba(${PAPER},.95)`;c.fillRect(px-s*.1,py-s*.02,s*.2,s*.2);c.strokeStyle=ink(.6);c.lineWidth=1;c.strokeRect(px-s*.1,py-s*.02,s*.2,s*.2);
        c.fillStyle=up?'#fff':ink(.8);c.font=`${Math.round(s*.13)}px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(SHORT[i],px,py+s*.08);});}

    /* ---------- 出价尺 ---------- */
    const range=()=>S.round===3?[0,160]:[40,230];
    let RG=null;
    function drawRuler(){const w=rwrap.clientWidth,h=rcv.clientHeight||120,c=fitCanvas(rcv,w,h);c.clearRect(0,0,w,h);const [lo,hi]=range(),pad=Math.max(18,w*.03),ax=Math.max(58,h*.52),X=v=>pad+(v-lo)/(hi-lo)*(w-2*pad);RG={pad,w,lo,hi,X};
      const L=S.lot,fs=Math.round(Math.max(11,Math.min(14,w/60)));c.font=`${fs}px sans-serif`;c.textBaseline='middle';
      /* 刻度 */
      c.strokeStyle=ink(.55);c.lineWidth=1.2;c.beginPath();c.moveTo(X(lo),ax);c.lineTo(X(hi),ax);c.stroke();const step=(w-2*pad)/((hi-lo)/10)>34?10:20;
      for(let v=lo;v<=hi;v+=10){const x=X(v),big=v%50===0;c.strokeStyle=ink(big?.5:.22);c.beginPath();c.moveTo(x,ax-(big?7:4));c.lineTo(x,ax+(big?7:4));c.stroke();
        if(big||step===10){c.fillStyle=ink(big?.7:.4);c.textAlign='center';c.fillText(v,x,ax+16);}}
      /* 你的估价（或对你值多少） */
      if(S.round<3){const e=L.est[0],a=X(e-L.sig),b=X(e+L.sig);c.fillStyle='rgba(30,91,115,.13)';c.fillRect(a,ax-22,b-a,26);c.strokeStyle='rgba(30,91,115,.5)';c.strokeRect(a,ax-22,b-a,26);
        c.strokeStyle=BLUE;c.lineWidth=2;c.beginPath();c.moveTo(X(e),ax-22);c.lineTo(X(e),ax+4);c.stroke();c.fillStyle=BLUE;c.textAlign='center';c.fillText(`你估 ${e}`,X(e),ax-31);}
      else{const x=X(L.v);c.strokeStyle=GOLD;c.lineWidth=3;c.beginPath();c.moveTo(x,ax-24);c.lineTo(x,ax+6);c.stroke();c.fillStyle='rgba(150,110,30,1)';c.textAlign='center';c.fillText(`对你值 ${L.v}`,x,ax-33);}
      /* 落价的价码 */
      if(S.round===1&&S.phase==='live'){const x=X(S.price);c.strokeStyle=RED;c.lineWidth=2;c.beginPath();c.moveTo(x,6);c.lineTo(x,h-6);c.stroke();c.fillStyle=RED;c.beginPath();c.moveTo(x-6,4);c.lineTo(x+6,4);c.lineTo(x,12);c.closePath();c.fill();}
      /* 你的出价 */
      const my=S.res?S.res.bids[0]:S.bid;
      if(my!=null&&my>=0){const x=X(my);c.fillStyle=BLUE;c.beginPath();c.moveTo(x,ax-2);c.lineTo(x-7,ax-14);c.lineTo(x+7,ax-14);c.closePath();c.fill();
        c.fillStyle=`rgba(${PAPER},.95)`;const t=S.round===1?`你喊 ${my}`:`你出 ${my}`,tw=c.measureText(t).width+10;c.fillRect(x-tw/2,ax+24,tw,18);c.fillStyle=BLUE;c.textAlign='center';c.fillText(t,x,ax+33);}
      /* 开标：各人的出价、估价、真值 */
      if(S.res){const R=S.res,bids=S.round===3?R.bids:R.bids;
        for(let i=1;i<5;i++){const b=bids[i];if(b==null)continue;const x=X(b),win=R.win===i,y=ax-30-(i%2)*13;c.strokeStyle=win?RED:ink(.45);c.lineWidth=win?2:1;c.beginPath();c.moveTo(x,ax);c.lineTo(x,y);c.stroke();
          c.fillStyle=win?RED:`rgba(${PAPER},.95)`;c.fillRect(x-9,y-9,18,16);c.strokeStyle=win?RED:ink(.4);c.lineWidth=1;c.strokeRect(x-9,y-9,18,16);c.fillStyle=win?'#fff':ink(.8);c.textAlign='center';c.fillText(SHORT[i],x,y-1);}
        if(S.round<3&&S.showV){for(let i=0;i<5;i++){const x=X(L.est[i]);c.fillStyle=i===0?BLUE:ink(.55);c.beginPath();c.arc(x,h-19,3.5,0,7);c.fill();c.font=`${fs-2}px sans-serif`;c.fillText(SHORT[i],x,h-8);c.font=`${fs}px sans-serif`;}
          const x=X(L.v);c.strokeStyle=RED;c.lineWidth=2.5;c.setLineDash([5,3]);c.beginPath();c.moveTo(x,8);c.lineTo(x,h-26);c.stroke();c.setLineDash([]);
          c.fillStyle=RED;c.font=`600 ${fs}px sans-serif`;c.textAlign=x>w-80?'right':'left';c.fillText(`真值 ${L.v}`,x+(x>w-80?-6:6),12);c.font=`${fs}px sans-serif`;c.fillStyle=ink(.5);c.textAlign='left';c.fillText('● 各人估价',pad,h-8);}
        if(S.round===3){const top=Math.max(...L.ai),gain=L.v-top,x0=X(top),yb=ax-4,hh=Math.min(28,Math.abs(gain)*2+8);c.fillStyle=gain>=0?'rgba(46,110,80,.18)':'rgba(179,38,30,.16)';c.fillRect(x0,yb-hh,X(hi)-x0,hh);
          c.strokeStyle=gain>=0?GREEN:RED;c.lineWidth=2;c.beginPath();c.moveTo(X(lo),yb);c.lineTo(x0,yb);c.lineTo(x0,yb-hh);c.lineTo(X(hi),yb-hh);c.stroke();
          if(w>=560){c.fillStyle=gain>=0?GREEN:RED;c.textAlign='left';c.fillText(`出到 ${top} 以上就得标，都付 ${top}：${gain>=0?'赚':'赔'} ${Math.abs(gain)}`,Math.min(x0+6,w-230),yb-hh-9);}}}
      rhint.innerHTML=hintText();}
    function hintText(){const L=S.lot;if(S.phase==='ready')return S.round===3?'金线是这件宝物对你值多少':'蓝框是你的眼力：真值多半在这一段';
      if(S.phase==='live')return S.round===1?`价码 <b>${S.price}</b> 贯，一路往下落 · 空格键也能喊`:S.bid==null?'在尺上点一下出价（左右键微调）':`你出 <b>${S.bid}</b> 贯 · 回车封标`;
      if(S.phase==='reveal'){const R=S.res;if(!R)return'';const who=R.win<0?'流拍':NAMES[R.win]+'得标';if(S.round===3){const top=Math.max(...L.ai),gain=L.v-top;return `${who}，付第二高的价 <b>${R.price}</b> · 出到 ${top} 以上都得标、都付 ${top}：${gain>=0?'赚':'赔'} ${Math.abs(gain)}`;}return `${who}，价 <b>${R.price}</b> 贯`+(S.showV?`，真值 <b>${L.v}</b>`:'……鉴定中');}
      return'';}
    function setBidFrom(ev){if(S.phase!=='live'||S.round===1||!RG)return;const r=rcv.getBoundingClientRect(),v=RG.lo+(ev.clientX-r.left-RG.pad)/(RG.w-2*RG.pad)*(RG.hi-RG.lo);S.bid=Math.max(RG.lo,Math.min(RG.hi,Math.round(v)));drawRuler();bidActs();}
    let dragging=false;
    rcv.addEventListener('pointerdown',ev=>{if(S.phase!=='live'||S.round===1)return;dragging=true;try{rcv.setPointerCapture(ev.pointerId);}catch(_){}setBidFrom(ev);audio.tap(2);});
    rcv.addEventListener('pointermove',ev=>{if(dragging)setBidFrom(ev);});
    const endDrag=()=>{dragging=false;};rcv.addEventListener('pointerup',endDrag);rcv.addEventListener('pointercancel',endDrag);
    const onKey=ev=>{if(!root.isConnected)return;if(S.phase!=='live')return;
      if(S.round===1&&(ev.key===' '||ev.key==='Enter')){ev.preventDefault();grab();return;}
      if(S.round>1){const [lo,hi]=range();if(ev.key==='ArrowLeft'||ev.key==='ArrowRight'){ev.preventDefault();const d=(ev.key==='ArrowLeft'?-1:1)*(ev.shiftKey?5:1);S.bid=Math.max(lo,Math.min(hi,(S.bid==null?(S.round===3?S.lot.v:S.lot.est[0]):S.bid)+d));drawRuler();bidActs();}
        else if(ev.key==='Enter'&&S.bid!=null){ev.preventDefault();seal(S.bid);}}};
    document.addEventListener('keydown',onKey);

    /* ---------- 账簿 ---------- */
    function drawLedger(){if(S.round===3){ledger.innerHTML=`<div class="lt">账簿</div><div class="lr duo me"><span>你</span><b class="${S.tot[0]<0?'neg':''}">${fmt(S.tot[0])}</b></div><div class="lr duo ghost"><span>照心里的价出</span><b>${fmt(S.truth)}</b></div>`;return;}
      ledger.innerHTML=`<div class="lt">账簿 <small>得标 · 盈亏</small></div>`+NAMES.map((n,i)=>`<div class="lr${i===0?' me':''}"><span>${n}</span><i>${S.wins[i]}</i><b class="${S.tot[i]<0?'neg':''}">${fmt(S.tot[i])}</b></div>`).join('');}
    const fmt=v=>(v>0?'+':'')+v;
    function lotInfo(){const L=S.lot,n=S.lots.length,k=Math.max(0,S.k);
      lotEl.innerHTML=`<small>第 ${k+1} / ${n} 件</small><b>${L.nm}</b>`+(S.round<3?`<span class="eye ${L.sig<=15?'sharp':L.sig>=45?'blur':''}">眼力 ±${L.sig}${L.sig<=15?' · 看得准':L.sig>=45?' · 看不准':''}</span>`:`<span class="eye">对你值 ${L.v} 贯</span>`)+
        (S.round>1?`<div class="rc-incense"><span>一炷香</span><div class="stick"><div class="burn"></div></div></div>`:'');}

    /* ---------- 一件件拍 ---------- */
    function clearTimers(){clearInterval(S.timer);clearTimeout(S.autoT);clearTimeout(S.vT);}
    function beginRound(n){clearTimers();S.round=n;S.lots=[R1,R2,LOTS3][n-1];S.k=-1;S.lot=S.lots[0];S.phase='ready';S.bid=null;S.res=null;S.showV=false;S.raised=[0,0,0,0,0];S.tot=[0,0,0,0,0];S.wins=[0,0,0,0,0];S.truth=0;S.hist=[];
      rev.hidden=true;priceEl.hidden=true;ui.hideResult();ui.meter('');ui.stageName(TITLE[n-1]);ui.say(INTRO[n-1]);ui.acts([['开始 →',nextLot,true]]);
      lotInfo();drawLedger();layoutAll();}
    function nextLot(){clearTimers();S.k++;if(S.k>=S.lots.length){endRound();return;}
      S.lot=S.lots[S.k];S.bid=null;S.res=null;S.showV=false;S.raised=[0,0,0,0,0];S.phase='live';lotInfo();drawFg();audio.paper();
      if(S.round===1){S.price=startOf(S.lot);S.maxAI=Math.max(...[1,2,3,4].map(i=>aiBid(S.lot,i)));priceEl.hidden=false;priceTxt();
        ui.acts([['要了！',grab,true]]);S.timer=setInterval(tickDutch,reduceMotion()?DUTCH_MS*1.6:DUTCH_MS);}
      else{S.t0=performance.now();bidActs();S.timer=setInterval(tickBid,100);}
      drawRuler();}
    function priceTxt(){priceEl.innerHTML=`<small>落价</small><b>${S.price}</b><small>贯</small>`;}
    function tickDutch(){if(!root.isConnected){clearTimers();return;}if(S.phase!=='live')return;S.price--;priceTxt();if(S.price%5===0)audio.tap(1);
      if(S.price<=S.maxAI){const i=[1,2,3,4].filter(j=>aiBid(S.lot,j)===S.maxAI).sort((a,b)=>S.lot.est[b]-S.lot.est[a])[0];S.price=S.maxAI;priceTxt();settle(sealed(S.lot,null),i);return;}
      drawRuler();}
    function grab(){if(S.phase!=='live'||S.round!==1)return;const p=S.price,base=sealed(S.lot,null);settle({bids:[p,...base.bids.slice(1)],win:0,price:p,profit:S.lot.v-p},0);}
    function tickBid(){if(!root.isConnected){clearTimers();return;}if(S.phase!=='live')return;const k=Math.max(0,1-(performance.now()-S.t0)/((reduceMotion()?1.6:1)*BID_SECS*1000)),inc=lotEl.querySelector('.rc-incense');
      if(inc){inc.querySelector('.burn').style.width=(k*100)+'%';inc.classList.toggle('low',k<.25);}if(k<=0)seal(S.bid);}
    function bidActs(){if(S.phase!=='live'||S.round===1)return;ui.acts([['不投这件',()=>seal(null)],[S.bid==null?'封标':`封标 · ${S.bid} 贯`,()=>seal(S.bid),true,S.bid==null]]);}
    function seal(b){if(S.phase!=='live')return;settle(S.round===3?vickrey(S.lot,b):sealed(S.lot,b),null);}
    function settle(R,grabber){clearTimers();S.res=R;S.phase='reveal';const L=S.lot;const inc=lotEl.querySelector('.rc-incense');if(inc)inc.remove();
      if(R.win>0)S.raised[R.win]=1;drawFg();ui.acts([]);
      if(grabber!=null&&grabber>0){ui.flash('要了！',G.bid[grabber-1],G.by-G.fs*1.2);audio.thud();}else if(grabber===0){audio.coin();ui.flash('要了！',G.tx,G.ty-G.ware*1.1);}else audio.paper();
      if(S.round===3){S.showV=true;const mine=R.win===0?R.profit:0;S.tot[0]+=mine;if(R.win>=0)S.wins[R.win]++;S.truth+=payoffAt(L,L.v);S.hist.push({lot:L,bid:R.bids[0],res:R,mine});
        drawRuler();drawLedger();reveal(mine,R.win===0);return;}
      drawRuler();
      S.vT=setTimeout(()=>{S.showV=true;if(R.win>=0){S.tot[R.win]+=R.profit;S.wins[R.win]++;}S.hist.push({lot:L,bid:R.bids[0],res:R,mine:R.win===0?R.profit:0});drawRuler();drawLedger();reveal(R.win===0?R.profit:0,R.win===0);},reduceMotion()?200:900);}
    function reveal(mine,won){const L=S.lot,R=S.res;
      if(won){ui.flash(mine>=0?`赚 ${mine} 贯`:`赔 ${-mine} 贯`,G.tx,G.ty-G.ware*.6);mine>=0?audio.arp():audio.low();}
      else if(R.win>0&&S.round<3&&R.profit<0){ui.flash(`${NAMES[R.win]}赔 ${-R.profit}`,G.bid[R.win-1],G.by-G.fs*1.3);audio.tap(2);}
      const last=S.k>=S.lots.length-1;let left=Math.round(AUTO_MS/1000);
      const acts=()=>ui.acts([[last?`收官 →`:`下一件 → (${left})`,nextLot,true]]);acts();
      clearInterval(S.timer);S.timer=setInterval(()=>{if(!root.isConnected){clearTimers();return;}left--;if(left<=0){nextLot();return;}acts();},1000);}
    function endRound(){clearTimers();S.phase='done';priceEl.hidden=true;const mine=S.tot[0];
      const bench=S.round===1?runSealed(R1,expert)[0]:S.round===2?runSealed(R2,expert)[0]:truthful(LOTS3),g=gradeProfit(mine,bench);
      g==='至妙'||g==='上品'?audio.arp():g==='下品'?audio.low():audio.bell();
      const nums=S.round<3?`你 <b>${fmt(mine)}</b> 贯 · 行家压法 <b>${fmt(bench)}</b> · 赵莽汉 ${fmt(S.tot[1])}`:`你 <b>${fmt(mine)}</b> 贯 · 照心里的价出 <b>${fmt(bench)}</b>`;
      const wonHigh=S.hist.filter(h=>h.res.win===0&&h.lot.est&&h.lot.est[0]>h.lot.v).length,won=S.hist.filter(h=>h.res.win===0).length;
      let line;
      if(S.round===1)line=mine<0?`你得标 ${won} 件，其中 ${wonHigh} 件是你估高了的：估得最高的人最容易得标，也最容易估高了。价码落到估价就喊，必亏；要再压低一截。`:g==='至妙'||g==='上品'?'价码落到估价以下一截才喊：估高了的那几件，让给莽汉去赔。':'不亏已是一步。落价与暗标一样：心里先定个比估价低一截的价，到了就喊。';
      else if(S.round===2)line=mine<0?'看不准的宝物，估价偏得远，得标时多半偏高：眼力 ±45 的要多压，±15 的少压就够。':g==='至妙'||g==='上品'?'看得准的少压，看不准的多压：压多少，跟着眼力走。':'一律压同样多，不如按眼力压：看不准的多压一些。';
      else line=mine>=bench?'照心里的价出：出价只决定得不得标，付多少由别人定。':'只付第二高的价时，出多了得标就可能赔，出少了会错过该赚的——照心里的价出最稳妥。';
      ui.result(g,nums,line,false);showReview();
      ui.acts([['再来一回',()=>beginRound(S.round)],S.round<3?['下一回 →',()=>beginRound(S.round+1),true]:['题跋 · 钤印',()=>ui.colophon(),true]]);}
    /* 复盘：每件宝物一行 */
    function showReview(){rev.hidden=false;const w=scene.clientWidth-16,h=scene.clientHeight-16,c=fitCanvas(rev,w,h);c.fillStyle='rgba(247,241,227,.96)';c.fillRect(0,0,w,h);c.strokeStyle=ink(.3);c.strokeRect(.5,.5,w-1,h-1);
      const n=S.hist.length,[lo,hi]=range(),fs=Math.round(Math.max(11,Math.min(14,w/55))),top=w<560?56:34,rowH=Math.min(64,(h-top-10)/Math.max(1,n)),lx=Math.min(96,w*.2),rx=w-Math.min(90,w*.2),X=v=>lx+(v-lo)/(hi-lo)*(rx-lx);
      c.fillStyle=ink(.85);c.font=`${fs+3}px ${BRUSH_FONT}`;c.textAlign='left';c.textBaseline='middle';
      const won=S.hist.filter(h=>h.res.win===0),high=won.filter(h=>h.lot.est&&h.lot.est[0]>h.lot.v).length;
      c.fillText(S.round<3?`复盘 · 你得标 ${won.length} 件，其中 ${high} 件你估高了`:'复盘 · 金线是对你值多少，黑点是对手最高价',12,top/2+2);
      c.font=`${fs}px sans-serif`;
      S.hist.forEach((hh,k)=>{const y=top+rowH*(k+.5),L=hh.lot,R=hh.res;c.fillStyle=ink(.8);c.textAlign='left';c.fillText(L.nm,10,y);c.strokeStyle=ink(.15);c.beginPath();c.moveTo(lx,y);c.lineTo(rx,y);c.stroke();
        if(S.round<3){const e=L.est[0];c.fillStyle='rgba(30,91,115,.14)';c.fillRect(X(e-L.sig),y-7,X(e+L.sig)-X(e-L.sig),14);c.fillStyle=BLUE;c.fillRect(X(e)-1,y-8,2,16);
          c.strokeStyle=RED;c.lineWidth=2;c.beginPath();c.moveTo(X(L.v),y-10);c.lineTo(X(L.v),y+10);c.stroke();c.lineWidth=1;
          if(R.win>=0){c.fillStyle=R.win===0?BLUE:ink(.7);c.beginPath();c.arc(X(R.price),y,4.5,0,7);c.fill();c.fillStyle=ink(.6);c.textAlign='center';c.font=`${fs-2}px sans-serif`;c.fillText(SHORT[R.win],X(R.price),y-12);c.font=`${fs}px sans-serif`;}}
        else{const top2=Math.max(...L.ai);c.strokeStyle=GOLD;c.lineWidth=3;c.beginPath();c.moveTo(X(L.v),y-10);c.lineTo(X(L.v),y+10);c.stroke();c.lineWidth=1;c.fillStyle=ink(.75);c.beginPath();c.arc(X(top2),y,4.5,0,7);c.fill();
          if(hh.bid!=null&&hh.bid>=0){c.fillStyle=BLUE;c.beginPath();c.moveTo(X(hh.bid),y+2);c.lineTo(X(hh.bid)-6,y+11);c.lineTo(X(hh.bid)+6,y+11);c.closePath();c.fill();}}
        const t=S.round===3?`${fmt(hh.mine)} / ${fmt(payoffAt(L,L.v))}`:R.win===0?fmt(hh.mine):'—';c.textAlign='right';c.fillStyle=hh.mine<0?RED:ink(.8);c.fillText(t,w-10,y);});
      c.font=`${fs-1}px sans-serif`;c.fillStyle=ink(.5);const lg=S.round<3?'蓝框：你的估价上下 · 红线：真值 · 圆点：成交价':'蓝三角：你出的价 · 右：你赚 / 照实出价赚';
      if(w<560){c.textAlign='left';c.fillText(lg,12,top+4);}else{c.textAlign='right';c.fillText(lg,w-10,top/2+2);}}

    function layoutAll(){drawScene();drawFg();drawRuler();if(S.phase==='done')showReview();}
    this._resize=()=>layoutAll();
    let lastWH='',rq=0;const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{cancelAnimationFrame(rq);rq=requestAnimationFrame(()=>{const k=root.clientWidth+'x'+root.clientHeight;if(k!==lastWH){lastWH=k;layoutAll();}});}):null;if(ro)ro.observe(root);
    this._stop=()=>{clearTimers();document.removeEventListener('keydown',onKey);if(ro)ro.disconnect();};
    /* 自动化测试用 */
    auctionLevel._dbg=S;auctionLevel._go=n=>beginRound(n);auctionLevel._play={next:nextLot,grab,seal,bid:b=>{S.bid=b;drawRuler();bidActs();}};
    beginRound(1);
  },
  resize(){this._resize&&this._resize();},
  stop(){this._stop&&this._stop();this._resize=null;}
};
