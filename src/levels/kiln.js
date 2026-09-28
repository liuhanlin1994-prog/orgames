/* 窑火 · 优选法（0.618 法）：试火 → 窑神刁难 → 二十档
   手感：在火候尺上按住、拖到想烧的温度，松手就烧一窑；出窑的瓷器摆在尺上：生烧的发白，过烧的发黑塌口。
   红框是「最好的火候必在此段」——每一窑都要让它缩得最多。 */
import {RNG} from '../core/rng.js';
import {INK,PAPER,BRUSH_FONT,paperBase,paperGrain,figure,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {T0,T1,toT,band,R1,R2,R3,makeGod,golden,fibonacci,left,gradeWidth,gradeLeft,gradeR1} from './kiln-core.js';

const ink=a=>`rgba(${INK},${a})`,RED='rgba(179,38,30,.92)';
const TITLE=['第一回 · 试火','第二回 · 窑神刁难','第三回 · 二十档'];
const INTRO=[`景德镇新配了一种釉，火候不知多少合适：烧生了发白，烧过了发黑塌口，最好的在 ${T0}–${T1}℃ 之间某处。<b>在火候尺上按住、拖到想烧的温度，松手就烧一窑</b>。共 8 窑，把红框「最好的火候必在此段」夹得越窄越好。`,
  '窑神来刁难：每烧一窑，他只说「比最好的那窑好」还是「不如」，而且<b>专挑对你不利的回答</b>。只有 6 窑，红框夹到 19℃ 以内算至妙。',
  '这座老窑的火候只分 <b>二十档</b>。窑神照样刁难，6 窑之内，能不能<b>一档不差</b>地找出最好的那档？'];

/* ---------- 瓷器：梅瓶。kind: good 最好 / raw 生烧 / over 过烧；q 为成色（第一回） ---------- */
function drawPot(c,x,y,s,kind,q,ghost){
  c.save();c.translate(x,y);if(ghost)c.globalAlpha=.45;if(kind==='over')c.rotate(.08);
  const w=s*.36,sl=kind==='over'?.1:0;c.beginPath();c.moveTo(-w*.28,-s);c.lineTo(w*.28,-s);c.quadraticCurveTo(w*.34,-s*.9,w*.95,-s*.72);c.quadraticCurveTo(w*1.15,-s*.5,w*(.6+sl),-s*.12);c.lineTo(w*.5,0);c.lineTo(-w*.5,0);c.lineTo(-w*(.6-sl),-s*.12);c.quadraticCurveTo(-w*1.15,-s*.5,-w*.95,-s*.72);c.quadraticCurveTo(-w*.34,-s*.9,-w*.28,-s);c.closePath();
  let fill;if(kind==='good')fill='rgba(120,165,150,.95)';else if(kind==='raw')fill='rgba(222,208,178,.95)';else fill='rgba(70,62,55,.92)';
  if(q!=null&&kind!=='good'){const k=Math.max(0,Math.min(1,q/100));fill=kind==='raw'?`rgba(${Math.round(222-102*k)},${Math.round(208-43*k)},${Math.round(178-28*k)},.95)`:`rgba(${Math.round(70+50*k)},${Math.round(62+103*k)},${Math.round(55+95*k)},.95)`;}
  c.fillStyle=fill;c.fill();c.strokeStyle=ink(.6);c.lineWidth=Math.max(1,s*.03);c.stroke();
  if(kind==='good'){c.strokeStyle='rgba(250,250,240,.6)';c.lineWidth=s*.05;c.beginPath();c.moveTo(-w*.7,-s*.66);c.quadraticCurveTo(-w*.85,-s*.45,-w*.55,-s*.2);c.stroke();
    c.strokeStyle='rgba(30,70,110,.7)';c.lineWidth=Math.max(1,s*.025);c.beginPath();c.moveTo(-w*.6,-s*.45);c.bezierCurveTo(-w*.2,-s*.6,w*.2,-s*.3,w*.6,-s*.45);c.stroke();}
  else if(kind==='raw'){c.fillStyle='rgba(255,255,255,.35)';for(let i=0;i<5;i++){c.beginPath();c.arc(-w*.5+i*w*.25,-s*(.3+(i%2)*.2),s*.03,0,7);c.fill();}}
  else{c.fillStyle='rgba(20,15,10,.6)';for(let i=0;i<6;i++){c.beginPath();c.arc(-w*.6+i*w*.24,-s*(.25+(i%3)*.15),s*.035,0,7);c.fill();}}
  c.restore();
}

export const kilnLevel={
  id:'kiln',title:'窑火',concept:'优选法（0.618 法）',ambience:'scroll',poem:['九秋风露越窑开','夺得千峰翠色来'],poemSrc:'陆龟蒙《秘色越器》',
  colophon:{head:'优选法',seal:'优选',
    lines:['火候偏生偏过都不好，最好的在中间某处：烧一窑看一窑，把它一步步夹住。','每一窑都要让剩下那段缩得最多，不论窑神怎么答。下在 0.618 处，上一窑的那一点下回还能再用。','火候只有几档时用分数法：二十档，先烧第八、十三档，六窑必定找到最好的一档。'],
    note:'华罗庚当年带着「优选法」与「统筹法」走遍各地工厂；今天调配方、定工艺、找参数，仍用这门学问。'},
  start(ui,audio){
    const S={round:1,tests:[],god:null,kilns:8,busy:false,hover:null,done:false,view:'mine',bench:null,glow:0,raf:0,t:0,smoke:[]};
    const root=el('div','kn'),scene=el('div','kn-scene'),bg=el('canvas'),fx=el('canvas'),info=el('div','kn-info'),rw=el('div','kn-rwrap'),rcv=el('canvas','kn-ruler');
    [bg,fx,info].forEach(e=>scene.appendChild(e));rw.appendChild(rcv);root.appendChild(scene);root.appendChild(rw);ui.stage.appendChild(root);
    rcv.tabIndex=0;rcv.setAttribute('aria-label','火候尺：左右键选温度，回车烧一窑');
    let W=0,H=0,K=null;

    /* ---------- 山坡上的龙窑 ---------- */
    function drawScene(){W=scene.clientWidth;H=scene.clientHeight;const c=fitCanvas(bg,W,H),r=RNG(12);paperBase(c,0,0,W,H);
      c.fillStyle='rgba(90,100,95,.16)';c.beginPath();c.moveTo(0,H*.55);for(let x=0;x<=W;x+=W/12)c.lineTo(x,H*(.42+.1*Math.sin(x/W*5+1)));c.lineTo(W,H);c.lineTo(0,H);c.fill();
      const x0=W*.18,y0=H*.9,x1=W*.8,y1=Math.max(H*.42,y0-(x1-x0)*.5);K={x0,y0,x1,y1,mouth:{x:x0+W*.02,y:y0-H*.05}};
      c.fillStyle='rgba(120,110,90,.28)';c.beginPath();c.moveTo(x0-W*.1,H);c.lineTo(x0,y0);c.lineTo(x1,y1);c.lineTo(x1+W*.14,y1+H*.1);c.lineTo(W,H);c.fill();
      /* 窑身：一条顺坡的长拱 */
      const n=9;for(let i=0;i<n;i++){const t=i/n,t2=(i+1)/n,xa=x0+(x1-x0)*t,ya=y0+(y1-y0)*t,xb=x0+(x1-x0)*t2,yb=y0+(y1-y0)*t2,hh=H*.09;
        c.fillStyle=i%2?'rgba(150,95,60,.9)':'rgba(140,88,56,.9)';c.beginPath();c.moveTo(xa,ya);c.quadraticCurveTo((xa+xb)/2,(ya+yb)/2-hh*1.4,xb,yb);c.lineTo(xb,yb+2);c.lineTo(xa,ya+2);c.fill();c.strokeStyle=ink(.55);c.lineWidth=1.2;c.stroke();
        c.fillStyle='rgba(40,25,15,.8)';c.beginPath();c.arc((xa+xb)/2,(ya+yb)/2-hh*.25,Math.max(2,H*.012),0,7);c.fill();}
      c.fillStyle='rgba(120,70,45,.95)';c.fillRect(x1-W*.012,y1-H*.2,W*.024,H*.2);c.strokeStyle=ink(.6);c.strokeRect(x1-W*.012,y1-H*.2,W*.024,H*.2);
      c.fillStyle=ink(.85);c.beginPath();c.arc(K.mouth.x,K.mouth.y,H*.045,Math.PI,0);c.lineTo(K.mouth.x+H*.045,K.mouth.y+H*.03);c.lineTo(K.mouth.x-H*.045,K.mouth.y+H*.03);c.fill();
      /* 柴堆、窑工 */
      for(let i=0;i<14;i++){c.strokeStyle='rgba(110,70,40,.8)';c.lineWidth=3;const bx=W*.04+(i%7)*W*.012,by=H*.95-Math.floor(i/7)*5;c.beginPath();c.moveTo(bx,by);c.lineTo(bx+W*.03,by-2);c.stroke();}
      figure(c,K.mouth.x+W*.07,H*.97,Math.min(H*.3,70),'rgba(120,80,50,.3)',1);
      /* 晾坯的架子 */
      for(let i=0;i<5;i++)drawPot(c,W*(.86+i*.022),H*.93,Math.min(H*.09,24),'raw',null,true);
      paperGrain(c,0,0,W,H,false);}
    function drawFx(){const c=fitCanvas(fx,W,H);c.clearRect(0,0,W,H);if(!K)return;const g=S.glow;
      if(g>0){const m=K.mouth,rg=c.createRadialGradient(m.x,m.y,2,m.x,m.y,H*.25*(.5+g));rg.addColorStop(0,`rgba(255,200,90,${.85*g})`);rg.addColorStop(.4,`rgba(230,110,40,${.45*g})`);rg.addColorStop(1,'rgba(230,110,40,0)');c.fillStyle=rg;c.fillRect(0,0,W,H);
        const n=9;for(let i=0;i<n;i++){const t=(i+.5)/n,x=K.x0+(K.x1-K.x0)*t,y=K.y0+(K.y1-K.y0)*t-H*.03;c.fillStyle=`rgba(255,${150+Math.round(60*Math.random())},60,${.6*g*Math.random()})`;c.beginPath();c.arc(x,y,H*.014,0,7);c.fill();}}
      S.smoke.forEach(p=>{c.fillStyle=`rgba(90,90,90,${.18*(1-p.t)})`;c.beginPath();c.arc(p.x,p.y,6+p.t*26,0,7);c.fill();});}
    function loop(ts){S.raf=requestAnimationFrame(loop);if(!root.isConnected){cancelAnimationFrame(S.raf);return;}const dt=Math.min(.05,(ts-(S.t||ts))/1000);S.t=ts;
      if(K&&Math.random()<dt*(2+S.glow*8))S.smoke.push({x:K.x1+(Math.random()-.5)*6,y:K.y1-H*.2,t:0,vx:8+Math.random()*10});
      S.smoke.forEach(p=>{p.t+=dt/3.5;p.y-=dt*H*.12;p.x+=dt*p.vx;});S.smoke=S.smoke.filter(p=>p.t<1);S.glow=Math.max(0,S.glow-dt*.9);drawFx();}

    /* ---------- 火候尺 ---------- */
    const discrete=()=>S.round===3;
    const dom=()=>discrete()?[0,R3.levels+1]:[0,1];
    let G=null;
    function geo(){const w=rw.clientWidth,h=rw.clientHeight,pad=Math.max(22,w*.04),ax=h-34;const [lo,hi]=dom();return{w,h,pad,ax,X:v=>pad+(v-lo)/(hi-lo)*(w-2*pad),V:px=>lo+(px-pad)/(w-2*pad)*(hi-lo),s:Math.max(22,Math.min(66,h*.27,w/13))};}
    const label=v=>discrete()?`第 ${v} 档`:`${toT(v)}℃`;
    function cur(){if(S.view==='bench')return S.bench;if(S.round===1)return{tests:S.tests,b:band(S.tests)};const st=S.god.state;return{tests:st.tests,b:{a:st.a,b:st.b,m:st.m}};}
    function kindOf(t,b){if(b.m!==null&&t.x===b.m)return'good';return b.m!==null&&t.x<b.m?'raw':'over';}
    function drawRuler(){G=geo();const {w,h,pad,ax,X,s}=G,c=fitCanvas(rcv,w,h);c.clearRect(0,0,w,h);const [lo,hi]=dom();
      c.font=`${Math.round(Math.max(11,Math.min(13,w/70)))}px sans-serif`;c.textBaseline='middle';
      c.strokeStyle=ink(.55);c.lineWidth=1.3;c.beginPath();c.moveTo(X(lo),ax);c.lineTo(X(hi),ax);c.stroke();
      if(discrete()){for(let v=1;v<=R3.levels;v++){const x=X(v);c.strokeStyle=ink(.35);c.beginPath();c.moveTo(x,ax-5);c.lineTo(x,ax+5);c.stroke();c.fillStyle=ink(.6);c.textAlign='center';c.fillText(v,x,ax+15);}
        c.fillStyle=ink(.6);[lo,hi].forEach(v=>{c.fillRect(X(v)-2,ax-18,4,24);});}
      else for(let T=T0;T<=T1;T+=10){const x=X((T-T0)/(T1-T0)),big=T%50===0;c.strokeStyle=ink(big?.5:.22);c.beginPath();c.moveTo(x,ax-(big?7:4));c.lineTo(x,ax+(big?7:4));c.stroke();if(big||w>900&&T%20===0){c.fillStyle=ink(big?.7:.4);c.textAlign='center';c.fillText(T+'℃',x,ax+16);}}
      const V=cur(),b=V.b;
      /* 红框：最好的火候必在此段 */
      if(V.tests.length){const xa=X(b.a),xb=X(b.b);c.fillStyle='rgba(179,38,30,.08)';c.fillRect(xa,10,xb-xa,ax-10);c.strokeStyle=RED;c.lineWidth=1.6;c.setLineDash([6,4]);c.strokeRect(xa,10,xb-xa,ax-10);c.setLineDash([]);
        const t=discrete()?`最好的一档必在此段 · 还剩 ${left(b)} 档`:`最好的火候必在此段 · 宽 ${Math.round((b.b-b.a)*(T1-T0))}℃`;c.fillStyle=RED;c.textAlign=xa+(xb-xa)/2<120?'left':xa+(xb-xa)/2>w-120?'right':'center';
        c.fillText(t,c.textAlign==='left'?Math.max(4,xa):c.textAlign==='right'?Math.min(w-4,xb):(xa+xb)/2,20);}
      /* 出窑的瓷器 */
      V.tests.forEach((t,i)=>{const x=X(t.x),k=kindOf(t,b),q=S.round===1?R1.f(t.x):null;drawPot(c,x,ax-3,s,k,q,S.view==='bench');
        c.fillStyle=k==='good'?RED:ink(.6);c.textAlign='center';if(q!=null)c.fillText(q>=99.5?'100':q.toFixed(q>=90?1:0),x,ax-s-10);else if(k==='good')c.fillText('最好',x,ax-s-10);
        if(S.view==='bench'){c.fillStyle='rgba(30,91,115,.9)';c.fillText(i+1,x,ax-s-24);}});
      /* 预览 */
      if(S.hover!=null&&!S.busy&&!S.done){const x=X(S.hover);c.strokeStyle='rgba(30,91,115,.8)';c.lineWidth=1.5;c.beginPath();c.moveTo(x,14);c.lineTo(x,ax);c.stroke();c.fillStyle='rgba(30,91,115,.95)';c.textAlign=x>w-80?'right':x<80?'left':'center';c.fillText(`烧 ${label(S.hover)}？`,x,ax-s-38<30?34:ax-s-38);}
      info.innerHTML=infoHtml();}
    function infoHtml(){const V=cur(),b=V.b,used=V.tests.length,n=S.kilns;
      const kl=Array.from({length:n},(_,i)=>`<i class="${i<used?'used':''}"></i>`).join('');
      const w=discrete()?`还剩 <b>${left(b)}</b> 档`:`夹住 <b>${V.tests.length?Math.round((b.b-b.a)*(T1-T0)):T1-T0}</b>℃`;
      const goal=S.round===1?'至妙：≤ 12℃':S.round===2?'至妙：≤ 19℃':'至妙：只剩 1 档';
      return`<div class="kn-kilns"><span>${S.view==='bench'?(S.round===3?'分数法':'0.618 法'):'还能烧'}</span>${kl}</div><div class="kn-w">${w}<small>${goal}</small></div>`;}
    function valAt(ev){const r=rcv.getBoundingClientRect();let v=G.V(ev.clientX-r.left);const [lo,hi]=dom();if(discrete())v=Math.round(v);v=Math.max(discrete()?1:0,Math.min(discrete()?R3.levels:1,v));if(!discrete())v=Math.round(v*(T1-T0))/(T1-T0);return v;}
    let pressing=false;
    rcv.addEventListener('pointerdown',ev=>{if(S.busy||S.done||S.view==='bench'||ev.button>0)return;pressing=true;try{rcv.setPointerCapture(ev.pointerId);}catch(_){}S.hover=valAt(ev);drawRuler();});
    rcv.addEventListener('pointermove',ev=>{if(S.busy||S.done||S.view==='bench'||!G)return;if(ev.pointerType==='mouse'||pressing){S.hover=valAt(ev);drawRuler();}});
    rcv.addEventListener('pointerleave',()=>{if(!pressing){S.hover=null;drawRuler();}});
    const release=ev=>{if(!pressing)return;pressing=false;if(ev.type==='pointercancel'){S.hover=null;drawRuler();return;}const v=valAt(ev);S.hover=ev.pointerType==='mouse'?v:null;fire(v);};
    rcv.addEventListener('pointerup',release);rcv.addEventListener('pointercancel',release);
    rcv.addEventListener('keydown',ev=>{if(S.busy||S.done)return;const step=discrete()?1:(ev.shiftKey?10:1)/(T1-T0);if(S.hover==null)S.hover=discrete()?10:.5;
      if(ev.key==='ArrowLeft'||ev.key==='ArrowRight'){ev.preventDefault();S.hover=Math.max(discrete()?1:0,Math.min(discrete()?R3.levels:1,S.hover+(ev.key==='ArrowLeft'?-step:step)));drawRuler();}
      else if(ev.key==='Enter'){ev.preventDefault();fire(S.hover);}});

    /* ---------- 烧一窑 ---------- */
    function fire(v){if(S.busy||S.done)return;const V=cur();if(V.tests.length>=S.kilns)return;
      if(V.tests.some(t=>t.x===v)){ui.flash('这个火候烧过了',G.X(v),rw.offsetTop+20);return;}
      S.busy=true;S.glow=1;audio.whoosh();const outside=V.tests.length&&(v<=V.b.a||v>=V.b.b);
      setTimeout(()=>{if(!root.isConnected)return;S.busy=false;
        if(S.round===1)S.tests.push({x:v,q:R1.f(v)});else S.god.fire(v);
        const b=cur().b,best=b.m===v;best?audio.bell():audio.tap(2);
        const px=G.X(v),py=rw.offsetTop+G.ax-G.s-30;
        if(outside)ui.flash('白烧了：在红框外',px,py);else if(S.round>1)ui.flash(best?'更好！':'不如',px,py);
        drawRuler();if(cur().tests.length>=S.kilns)setTimeout(endRound,500);},reduceMotion()?120:650);}

    /* ---------- 回合 ---------- */
    function begin(n){S.round=n;S.kilns=n===1?R1.kilns:n===2?R2.kilns:R3.kilns;S.tests=[];S.god=n===1?null:n===2?makeGod(0,1):makeGod(0,R3.levels+1);S.done=false;S.view='mine';S.bench=null;S.hover=null;
      ui.hideResult();ui.meter('');ui.stageName(TITLE[n-1]);ui.say(INTRO[n-1]);ui.acts([]);layout();}
    function width(){const b=cur().b;return Math.round((b.b-b.a)*(T1-T0));}
    function endRound(){S.done=true;S.hover=null;const b=cur().b;let g,nums,line;
      if(S.round===1){const d=width(),bench=benchRun(1),bd=Math.round((bench.b.b-bench.b.a)*(T1-T0));g=gradeR1(d);
        nums=`夹住 <b>${d}</b>℃（${toT(b.a)}–${toT(b.b)}℃）· 0.618 法 <b>${bd}</b>℃`;
        line=g==='至妙'||g==='上品'?'夹得紧。每一窑都落在红框里、落在最好那窑的另一侧，框就缩得快。':'落在红框外的那几窑白烧了；挨着最好那窑的对称处烧，框缩得最快。';}
      else if(S.round===2){const d=width();g=gradeWidth(d);nums=`窑神刁难下夹住 <b>${d}</b>℃ · 0.618 法 <b>18</b>℃ · 对分着烧 26℃`;
        line=g==='至妙'?'不论窑神怎么答，剩下那段都一样长——这正是 0.618 法：每一窑都在最好那窑的对称处。':'窑神专挑对你不利的回答。把下一窑放在最好那窑的「对称处」，不论他怎么答，剩下的都一样长。';}
      else{const k=left(b);g=gradeLeft(k);nums=k<=1?`一档不差：最好的是 <b>第 ${b.m} 档</b>`:`还剩 <b>${k}</b> 档说不准（第 ${b.a+1}–${b.b-1} 档）`;
        line=k<=1?'二十档六窑，一档不差。先烧第 8、13 档，此后每窑都在最好那窑的对称处：分数法（8/13、5/8、3/5……）。':'二十档要六窑找准，一窑也浪费不得：先烧第 8、13 档，此后每窑都在最好那窑的对称处（分数法）。';}
      g==='至妙'?audio.arp():g==='下品'?audio.low():audio.bell();
      ui.result(g,nums,line,true);acts();drawRuler();}
    function acts(){const L=[[S.view==='bench'?'看我的':(S.round===3?'看分数法怎么烧':'看 0.618 法怎么烧'),toggleBench],['再烧一回',()=>begin(S.round)]];
      L.push(S.round<3?['下一回 →',()=>begin(S.round+1),true]:['题跋 · 钤印',()=>ui.colophon(),true]);ui.acts(L);}
    /* 高手的烧法：第一回用 0.618 法对着同一条火候曲线；之后对着窑神 */
    function benchRun(n){if(n===1){const tests=[];for(let k=0;k<R1.kilns;k++){const b=band(tests);let x=tests.length?b.a+b.b-b.m:.618;if(tests.length===1)x=.382;x=Math.round(x*(T1-T0))/(T1-T0);if(tests.some(t=>t.x===x))x=Math.min(1,x+1/(T1-T0));tests.push({x,q:R1.f(x)});}return{tests,b:band(tests)};}
      const god=n===2?makeGod(0,1):makeGod(0,R3.levels+1);if(n===2)golden(god,R2.kilns);else fibonacci(god,R3.kilns,R3.levels);const st=god.state;return{tests:st.tests,b:{a:st.a,b:st.b,m:st.m}};}
    function toggleBench(){if(S.view==='bench'){S.view='mine';drawRuler();acts();return;}
      ui.hideResult();S.view='bench';S.bench={tests:[],b:{a:dom()[0],b:dom()[1],m:null}};const full=benchRun(S.round);acts();let k=0;
      const step=()=>{if(S.view!=='bench'||!root.isConnected)return;k++;const part=full.tests.slice(0,k);
        S.bench={tests:part,b:S.round===1?band(part):replay(part)};S.glow=.7;audio.tap(3+k%3);drawRuler();if(k<full.tests.length)setTimeout(step,reduceMotion()?60:520);};
      step();
      ui.say(S.round===1?'0.618 法：头两窑烧在 0.382、0.618 处；此后每一窑都烧在「最好那窑」关于红框中点的对称处，上一窑的那一点下回还能再用。':S.round===2?'0.618 法对着窑神：每一窑都烧在最好那窑的对称处，不论他怎么答，剩下的都缩成原来的 0.618。':'分数法：先烧第 8、13 档（8/13 ≈ 0.618），此后每窑都在最好那窑的对称处；二十档，六窑一档不差。');}
    /* 按窑神的回答重放一段烧法 */
    function replay(part){const god=S.round===2?makeGod(0,1):makeGod(0,R3.levels+1);part.forEach(t=>god.fire(t.x));const st=god.state;return{a:st.a,b:st.b,m:st.m};}

    function layout(){drawScene();drawRuler();}
    this._resize=()=>layout();
    let lastWH='',rq=0;const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{cancelAnimationFrame(rq);rq=requestAnimationFrame(()=>{const k=root.clientWidth+'x'+root.clientHeight;if(k!==lastWH){lastWH=k;layout();}});}):null;if(ro)ro.observe(root);
    this._stop=()=>{cancelAnimationFrame(S.raf);if(ro)ro.disconnect();};
    /* 自动化测试用 */
    kilnLevel._dbg=S;kilnLevel._go=n=>begin(n);kilnLevel._play={fire,bench:toggleBench,view:()=>cur()};
    begin(1);S.raf=requestAnimationFrame(loop);
  },
  resize(){this._resize&&this._resize();},
  stop(){this._stop&&this._stop();this._resize=null;}
};
