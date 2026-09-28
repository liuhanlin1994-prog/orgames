/* 五湖 · 凯利公式：一趟一押（与四位商人同湖竞渡）→ 货有百样 → 千舟竞渡（半个凯利）
   手感：每趟押几成家当，扬帆，风浪当场揭晓；家当曲线实时画出。 */
import {RNG} from '../core/rng.js';
import {INK,PAPER,BRUSH_FONT,paperBase,paperGrain,boat,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {growth,kellyF,outcomes,skill,fleetStats,fleetPaths,RIVALS,SILK,R1,R2,R3,passR3,gradeSkill,pTxt,bTxt,tTxt,fTxt} from './kelly-core.js';

const ink=a=>`rgba(${INK},${a})`;
const money=w=>w>=1e4?(w/1e4).toFixed(1)+'万':w>=100?Math.round(w)+'':w>=1?w.toFixed(1):w>0?w.toFixed(2):'0';

export const kellyLevel={
  id:'kelly',title:'五湖',concept:'凯利公式',ambience:'sea',poem:['乃乘扁舟','浮于江湖'],poemSrc:'《史记·货殖列传》',
  colophon:{head:'凯利公式',seal:'计然',
    lines:['押满了，一场风浪便一无所有；押少了，家当长得太慢。','每趟押 p − q/b：赚的机会，减去赔的机会除以赚的倍数；算出来不到零，就一文不押。','想稳一些，押它的一半：长得略慢，却少受大起大落。'],
    note:'今之投资配仓、资金管理、风控限额，皆算此账。'},
  start(ui,audio){
    const S={round:1,deals:[],wins:[],i:0,f:.2,me:[100],riv:[],fr:[],busy:false,anim:null,raf:0,repeat:0};
    const root=el('div','kl'),scene=el('div','kl-scene'),bg=el('canvas','kl-bg'),fx=el('canvas','kl-fx');scene.appendChild(bg);scene.appendChild(fx);
    const chartBox=el('div','kl-chart'),chart=el('canvas');chartBox.appendChild(chart);
    const ctl=el('div','kl-ctl'),board=el('div','kl-board');[scene,chartBox,ctl,board].forEach(e=>root.appendChild(e));ui.stage.appendChild(root);
    let SW=0,SH=0;

    /* ---------- 湖：远山、水纹、岸柳 ---------- */
    function drawLake(){SW=scene.clientWidth;SH=scene.clientHeight;const c=fitCanvas(bg,SW,SH),r=RNG(15);paperBase(c,0,0,SW,SH);
      [[.25,.18,.5],[.6,.24,.35],[.9,.2,.28]].forEach(([fx0,h,a],k)=>{c.fillStyle=ink(.14+k*.04);c.beginPath();c.moveTo(0,SH*.46);for(let x=0;x<=SW;x+=6){const u=x/SW;c.lineTo(x,SH*(.46-h*Math.exp(-Math.pow((u-fx0)/.18,2))-.02*Math.sin(u*20+k)));}c.lineTo(SW,SH*.46);c.fill();});
      const wg=c.createLinearGradient(0,SH*.46,0,SH);wg.addColorStop(0,'rgba(120,150,160,.12)');wg.addColorStop(1,'rgba(120,150,160,.26)');c.fillStyle=wg;c.fillRect(0,SH*.46,SW,SH*.54);
      c.strokeStyle=ink(.12);c.lineWidth=1;for(let i=0;i<50;i++){const x=r()*SW,y=SH*.5+r()*SH*.48,L=10+r()*30;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+L/2,y-2,x+L,y);c.stroke();}
      paperGrain(c,0,0,SW,SH,false);}
    function drawBoat(t,res){const c=fitCanvas(fx,SW,SH),s=Math.min(SH*.22,SW*.09),x=SW*(.12+.72*Math.min(1,t)),y=SH*.74+Math.sin(t*9)*2;
      if(res!=null&&t>=1){if(res){const g=c.createRadialGradient(SW*.8,SH*.15,4,SW*.8,SH*.15,SH*.6);g.addColorStop(0,'rgba(255,210,120,.55)');g.addColorStop(1,'rgba(255,210,120,0)');c.fillStyle=g;c.fillRect(0,0,SW,SH);}
        else{c.fillStyle='rgba(30,34,48,.35)';c.fillRect(0,0,SW,SH);c.strokeStyle='rgba(220,230,240,.5)';c.lineWidth=1;const r=RNG(Math.floor(performance.now()/60));for(let i=0;i<60;i++){const rx=r()*SW,ry=r()*SH;c.beginPath();c.moveTo(rx,ry);c.lineTo(rx-4,ry+12);c.stroke();}}}
      c.save();if(res===false&&t>=1){c.translate(x,y);c.rotate(Math.sin(performance.now()/120)*.12);c.translate(-x,-y);}boat(c,x,y,s,true);c.restore();}

    /* ---------- 家当曲线（对数坐标） ---------- */
    function drawChart(){const W=chartBox.clientWidth,H=chartBox.clientHeight,c=fitCanvas(chart,W,H);c.clearRect(0,0,W,H);const n=Math.max(1,S.deals.length),L=42,R=W-10,T=14,B=H-24;
      const lo=Math.log10(5),hi=Math.log10(Math.max(1e3,...S.me,...S.riv.flat().filter(isFinite))*1.3),Y=w=>w<=5?B:B-(B-T)*(Math.log10(w)-lo)/(hi-lo),X=i=>L+(R-L)*i/n;
      c.font='11px serif';c.textAlign='right';c.textBaseline='middle';for(let e=1;e<=Math.ceil(hi);e++){const w=Math.pow(10,e);if(Math.log10(w)>hi)break;c.strokeStyle=ink(e===2?.25:.08);c.beginPath();c.moveTo(L,Y(w));c.lineTo(R,Y(w));c.stroke();c.fillStyle=ink(.55);c.fillText(money(w),L-4,Y(w));}
      c.fillText('破产',L-4,B);c.textAlign='center';c.textBaseline='top';c.fillText(`第 ${S.i} / ${n} 趟`,(L+R)/2,B+6);
      const line=(pts,col,w)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();pts.forEach((v,i)=>{i?c.lineTo(X(i),Y(v)):c.moveTo(X(i),Y(v));});c.stroke();};
      RIVALS.forEach((rv,k)=>line(S.riv[k],`rgba(${rv.col},.8)`,1.4));line(S.me,'rgba(179,38,30,.95)',2.6);
      c.textAlign='left';c.textBaseline='middle';c.font=`13px ${BRUSH_FONT}`;
      const tags=[...RIVALS.map((rv,k)=>({nm:rv.nm,w:S.riv[k].at(-1),col:`rgba(${rv.col},.95)`})),{nm:'你',w:S.me.at(-1),col:'rgba(179,38,30,1)'}].sort((a,b)=>Y(a.w)-Y(b.w));let lastY=-99;
      tags.forEach(t=>{let y=Y(t.w);if(y-lastY<13)y=lastY+13;lastY=y;c.fillStyle=t.col;c.fillText(t.nm,Math.min(R-30,X(S.i)+4),Math.min(B,y));});}
    function drawBoard(showRule){board.innerHTML='';const rows=[{nm:'你',w:S.me.at(-1),rule:fTxt(S.f),me:true},...RIVALS.map((rv,k)=>({nm:rv.nm,w:S.riv[k].at(-1),rule:rv.kelly?(showRule?'每趟押 p − q/b（凯利）':'？'):fTxt(rv.f),col:rv.col}))].sort((a,b)=>b.w-a.w);
      rows.forEach((r,k)=>{const d=el('div','kb-row'+(r.me?' me':''));d.innerHTML=`<span class="rk">${k+1}</span><span class="nm"${r.col?` style="color:rgb(${r.col})"`:''}>${r.nm}</span><span class="rule">${r.rule}</span><b>${r.w<=0?'破产':money(r.w)+' 两'}</b>`;board.appendChild(d);});}

    /* ---------- 押注面板 ---------- */
    function buildCtl(){ctl.innerHTML='';const d=S.deals[Math.min(S.i,S.deals.length-1)];
      const card=el('div','kl-deal');card.innerHTML=`<div class="dn">${d.nm}</div><div class="dd">十趟里约有 <b>${tTxt(d.p)}</b> 赚所押的 <b>${bTxt(d.b)}</b>，其余赔光所押</div>`;ctl.appendChild(card);
      const row=el('div','kl-stake');const lab=el('div','kl-f');const sl=el('input');sl.type='range';sl.min=0;sl.max=100;sl.step=5;sl.value=Math.round(S.f*100);sl.setAttribute('aria-label','押几成家当');
      const upd=()=>{S.f=+sl.value/100;lab.innerHTML=`${fTxt(S.f)} <small>= ${money(S.me.at(-1)*S.f)} 两</small>`;chips.querySelectorAll('.btn').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.f===S.f));drawBoardSafe();};
      sl.oninput=upd;const chips=el('div','kl-chips');[[0,'不押'],[.1,'一成'],[.2,'二成'],[.3,'三成'],[.5,'一半'],[1,'全押']].forEach(([f,t])=>{const b=el('button','btn',t);b.dataset.f=f;b.onclick=()=>{sl.value=f*100;upd();audio.tap(2+f*6);};chips.appendChild(b);});
      row.appendChild(lab);row.appendChild(sl);ctl.appendChild(row);ctl.appendChild(chips);upd();}
    const drawBoardSafe=()=>{if(S.round<3)drawBoard(false);};

    /* ---------- 一趟 ---------- */
    function voyage(){
      if(S.busy||S.i>=S.deals.length)return;if(S.me.at(-1)<=0){ui.say('你已经赔光了，没本钱再押。');return;}
      S.busy=true;const i=S.i,d=S.deals[i],win=S.wins[i],f=S.f;S.fr.push(f);audio.whoosh();const t0=performance.now(),dur=reduceMotion()?60:(S.repeat>0||S.chain?520:680);
      const step=now=>{if(!root.isConnected)return;const t=(now-t0)/dur;drawBoat(Math.min(1.4,t),t>=1?win:null);
        if(t<1.3){S.raf=requestAnimationFrame(step);return;}
        const w=S.me.at(-1);S.me.push(win?w*(1+d.b*f):w*(1-f));RIVALS.forEach((rv,k)=>{const ff=rv.kelly?kellyF(d.p,d.b):rv.f,rw=S.riv[k].at(-1);S.riv[k].push(win?rw*(1+d.b*ff):rw*(1-ff));});
        S.i++;const delta=S.me.at(-1)-w;win?audio.coin():audio.low();const sr=scene.getBoundingClientRect(),st=ui.stage.getBoundingClientRect();
        ui.flash((win?'风平浪静 ':'遇上风浪 ')+(delta>=0?'+':'')+money(Math.abs(delta)).replace(/^/,delta<0?'-':''),sr.left-st.left+sr.width*.6,sr.top-st.top+sr.height*.35);
        drawChart();drawBoard(false);S.busy=false;
        if(S.i>=S.deals.length){setTimeout(()=>finish(),500);return;}
        buildCtl();if(S.repeat>0){S.repeat--;S.chain=true;setTimeout(voyage,reduceMotion()?30:120);}else{S.chain=false;acts();}};
      S.raf=requestAnimationFrame(step);
    }
    function acts(){ui.acts([['连押五趟',()=>{S.repeat=4;ui.acts([]);voyage();}],['扬帆',()=>{ui.acts([]);voyage();},true]]);}
    function setupRun(deals,seed){S.deals=deals;S.wins=outcomes(deals,seed);S.i=0;S.me=[100];S.riv=RIVALS.map(()=>[100]);S.fr=[];S.busy=false;S.repeat=0;
      root.classList.remove('fleet');requestAnimationFrame(()=>{drawLake();drawBoat(0,null);drawChart();});buildCtl();drawBoard(false);acts();ui.hideResult();}

    function round1(){S.round=1;S.f=.3;ui.stageName('第一回 · 一趟一押');ui.meter('');setupRun(Array(R1.voyages).fill(SILK),R1.seed);
      ui.say('范蠡弃官，泛舟五湖经商。本钱一百两。这桩丝绸买卖：<b>十趟里约六趟赚一倍，四趟赔光所押</b>。每趟押家当的几成？<br>湖上还有四位商人，与你遇着同样的风浪（计然押几成，先不告诉你）。');}
    function round2(){S.round=2;S.f=.2;ui.stageName('第二回 · 货有百样');ui.meter('');setupRun(R2.deals,R2.seed);
      ui.say('这回每趟的货都不一样：有的稳赚小利，有的十趟才中两趟却赚六倍，也有<b>怎么算都亏</b>的。看清成算再押。');}
    function finish(){
      const sk=skill(S.deals,S.fr),g=gradeSkill(sk),rank=[S.me.at(-1),...S.riv.map(r=>r.at(-1))].sort((a,b)=>b-a).indexOf(S.me.at(-1))+1;audio.arp();drawBoard(true);
      if(S.round===1){const avg=S.fr.reduce((a,b)=>a+b,0)/S.fr.length;
        ui.result(g,`家当 <b>${S.me.at(-1)<=0?'破产':money(S.me.at(-1))+' 两'}</b>（第 ${rank} 名） · 你平均押 ${Math.round(avg*100)}% · 押法的长久增速是计然的 <b>${Math.round(sk*100)}%</b>`,
          '计然每趟押二成：赚的机会六成，减去赔的机会四成除以赚的倍数一——0.6 − 0.4 ÷ 1 = 0.2。莽商一场风浪就赔光；守财奴几乎不长。',true);
        drawGrowth(avg);ui.say('右图是长久增速和押几成的关系：押二成最高；押过四成，家当长久看反而在缩。<b>评的是押法，不看运气。</b>');
        ui.acts([['再押二十趟',round1],['下一回 →',round2,true]]);}
      else{const bad=S.deals.map((d,i)=>({d,f:S.fr[i]})).filter(x=>kellyF(x.d.p,x.d.b)===0&&x.f>0).map(x=>x.d.nm);
        ui.result(g,`家当 <b>${S.me.at(-1)<=0?'破产':money(S.me.at(-1))+' 两'}</b>（第 ${rank} 名） · 押法的长久增速是计然的 <b>${Math.round(sk*100)}%</b>`,
          bad.length?`「${[...new Set(bad)].join('、')}」这几桩，怎么算都亏（p − q/b 小于零），计然一文不押，你却押了。`:'成算好、赔率高就多押，成算差就少押，亏本的买卖一文不押——和计然想的一样。',true);
        ui.say('计然的规矩：每趟押 <b>p − q/b</b>。盐十趟九赚、只赚两成，也该押四成；珍珠十趟三赚、赚四倍，只押一成多。');
        ui.acts([['再押一遍',round2],['下一回 →',round3,true]]);}
    }
    function drawGrowth(avg){const W=chartBox.clientWidth,H=chartBox.clientHeight,c=fitCanvas(chart,W,H);c.clearRect(0,0,W,H);const L=42,R=W-12,T=16,B=H-26,gmax=.03,gmin=-.08,X=f=>L+(R-L)*f/.6,Y=g=>B-(B-T)*(Math.max(gmin,g)-gmin)/(gmax-gmin);
      c.strokeStyle=ink(.3);c.beginPath();c.moveTo(L,Y(0));c.lineTo(R,Y(0));c.stroke();c.font='11px serif';c.fillStyle=ink(.55);c.textAlign='center';c.textBaseline='top';[0,.1,.2,.3,.4,.5,.6].forEach(f=>c.fillText(Math.round(f*100)+'%',X(f),B+6));
      c.textAlign='right';c.textBaseline='middle';c.fillText('长',L-4,T+6);c.fillText('0',L-4,Y(0));c.fillText('缩',L-4,B-4);
      c.strokeStyle='rgba(30,91,115,.9)';c.lineWidth=2.4;c.beginPath();for(let f=0;f<=.6;f+=.005){const x=X(f),y=Y(growth(.6,1,f));f?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
      const mark=(f,label,col)=>{c.fillStyle=col;c.beginPath();c.arc(X(f),Y(growth(.6,1,f)),5,0,7);c.fill();c.font=`13px ${BRUSH_FONT}`;c.textAlign='center';c.textBaseline='bottom';c.fillText(label,X(f),Y(growth(.6,1,f))-7);};
      mark(.2,'计然','rgba(30,91,115,1)');mark(.05,'守财奴','rgba(110,110,110,1)');mark(Math.min(.6,avg),'你','rgba(179,38,30,1)');
      c.fillStyle=ink(.6);c.font='12px serif';c.textAlign='right';c.textBaseline='bottom';c.fillText('横：每趟押几成　纵：家当长久增速',R,B-4);}

    /* ---------- 第三回：千舟竞渡 ---------- */
    function round3(){S.round=3;ui.hideResult();ui.stageName('第三回 · 千舟竞渡');ui.meter('');root.classList.add('fleet');S.f=.2;S.deals=Array(R3.voyages).fill(SILK);S.i=0;
      ui.say(`同一桩丝绸买卖，一千条船各自押同样的几成，走一百趟。目标：<b>九成的船不亏本</b>，而且<b>中位数翻四倍以上</b>。押几成？`);
      ctl.innerHTML='';const card=el('div','kl-deal');card.innerHTML=`<div class="dn">千舟竞渡</div><div class="dd">丝绸：六成赚一倍，四成赔光所押 · 一百趟</div>`;ctl.appendChild(card);
      const row=el('div','kl-stake'),lab=el('div','kl-f'),sl=el('input');sl.type='range';sl.min=0;sl.max=40;sl.step=1;sl.value=20;sl.setAttribute('aria-label','每趟押几成');row.appendChild(lab);row.appendChild(sl);ctl.appendChild(row);
      const goal=el('div','kl-goal');ctl.appendChild(goal);
      const upd=()=>{S.f=+sl.value/100;const st=fleetStats(SILK.p,SILK.b,S.f,R3.voyages);lab.innerHTML=`每趟押 <b>${Math.round(S.f*100)}%</b> <small>（凯利是 20%）</small>`;
        goal.innerHTML=`<div class="${st.safe>=R3.goal.safe?'ok':'no'}">不亏本的船 <b>${Math.round(st.safe*1000)/10}%</b> <span>要 ≥ 90%</span></div><div class="${st.median>=R3.goal.median?'ok':'no'}">中位数 <b>${st.median.toFixed(1)}</b> 倍 <span>要 ≥ 4 倍</span></div><div class="mute">家当不到一成的船 ${Math.round(st.ruin*1000)/10}%</div>`;S.st=st;};
      sl.oninput=upd;upd();board.innerHTML='<div class="kb-note">拖动滑杆，数字立刻变；点「千舟齐发」看一千条船怎么走。</div>';
      requestAnimationFrame(()=>{drawLake();drawBoat(0,null);fleetChart(null,0);});
      ui.acts([['千舟齐发',launch],['就定这个押法',settle3,true]]);
    }
    function fleetChart(paths,prog){const W=chartBox.clientWidth,H=chartBox.clientHeight,c=fitCanvas(chart,W,H);c.clearRect(0,0,W,H);const n=R3.voyages,L=42,R=W-10,T=12,B=H-24,lo=-2,hi=3,X=i=>L+(R-L)*i/n,Y=w=>B-(B-T)*(Math.max(lo,Math.min(hi,Math.log10(Math.max(w,1e-3))))-lo)/(hi-lo);
      c.font='11px serif';c.fillStyle=ink(.55);c.textAlign='right';c.textBaseline='middle';[[.01,'一分'],[.1,'一成'],[1,'本钱'],[10,'十倍'],[100,'百倍']].forEach(([w,t])=>{c.strokeStyle=ink(w===1?.35:.08);c.beginPath();c.moveTo(L,Y(w));c.lineTo(R,Y(w));c.stroke();c.fillText(t,L-4,Y(w));});
      c.textAlign='center';c.textBaseline='top';c.fillText('趟数 →',(L+R)/2,B+6);
      if(!paths)return;const upto=Math.floor(n*prog);
      c.lineWidth=.6;for(const p of paths.slice(0,160)){c.strokeStyle=p[n]>1?'rgba(30,91,115,.16)':'rgba(179,38,30,.16)';c.beginPath();for(let i=0;i<=upto;i++){i?c.lineTo(X(i),Y(p[i])):c.moveTo(X(i),Y(p[i]));}c.stroke();}
      const med=[];for(let i=0;i<=upto;i++){const v=paths.map(p=>p[i]).sort((a,b)=>a-b);med.push(v[v.length>>1]);}c.strokeStyle=ink(.9);c.lineWidth=2.2;c.beginPath();med.forEach((v,i)=>{i?c.lineTo(X(i),Y(v)):c.moveTo(X(i),Y(v));});c.stroke();
      c.fillStyle=ink(.85);c.font=`13px ${BRUSH_FONT}`;const nearR=X(upto)>R-60;c.textAlign=nearR?'right':'left';c.fillText('中位数',nearR?X(upto)-4:X(upto)+4,Y(med.at(-1))-14);}
    function launch(){if(S.busy)return;S.busy=true;const paths=fleetPaths(SILK.p,SILK.b,S.f,R3.voyages,1000,R3.seed+Math.round(S.f*100));audio.whoosh();const t0=performance.now(),dur=reduceMotion()?50:2400;
      const step=now=>{if(!root.isConnected)return;const k=Math.min(1,(now-t0)/dur);fleetChart(paths,k);drawBoat(k,null);if(k<1){S.raf=requestAnimationFrame(step);return;}
        S.busy=false;const safe=paths.filter(p=>p[R3.voyages]>1).length/10;board.innerHTML=`<div class="kb-note">这一千条船：<b>${safe}%</b> 不亏本；蓝线是赚了的船，红线是亏了的船。</div>`;audio.bell();};
      S.raf=requestAnimationFrame(step);}
    function settle3(){const st=S.st,ok=passR3(st);audio.arp();
      const line=ok?`押 ${Math.round(S.f*100)}%，约是凯利的 ${Math.round(S.f/.2*10)/10}。全凯利长得最快，却有近两成的船在一百趟后仍亏本；押一半，长得慢一点，却稳当得多——这叫「半凯利」。`
        :st.safe<R3.goal.safe?'太冒险了：押得越接近凯利、越超过凯利，亏本的船越多。退一步试试。':'太保守了：稳是稳，家当长得太慢。多押一点。';
      ui.result(ok?'至妙':(st.safe>=R3.goal.safe||st.median>=R3.goal.median)?'中品':'下品',`押 <b>${Math.round(S.f*100)}%</b> · 不亏本 ${Math.round(st.safe*1000)/10}% · 中位数 ${st.median.toFixed(1)} 倍`,line,true);
      ui.say(ok?'押多少，不止看长得多快，也看受不受得了起落。这一处参透了。':'换个押法再试。');
      ui.acts(ok?[['再试试',()=>{ui.hideResult();ui.acts([['千舟齐发',launch],['就定这个押法',settle3,true]]);}],['题跋 · 钤印',()=>ui.colophon(),true]]:[['再试试',()=>{ui.hideResult();ui.acts([['千舟齐发',launch],['就定这个押法',settle3,true]]);},true]]);}

    this._resize=()=>{drawLake();drawBoat(1,null);if(S.round===3)fleetChart(null,0);else drawChart();};
    this._stop=()=>{cancelAnimationFrame(S.raf);S.repeat=0;};
    kellyLevel._dbg=S;kellyLevel._go=n=>[round1,round2,round3][n-1]();   /* 自动化测试用 */
    round1();
  },
  resize(){this._resize&&this._resize();},
  stop(){this._stop&&this._stop();this._resize=null;}
};
