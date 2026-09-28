/* 赛马 · 田忌赛马：孙膑献策（知彼之序）→ 齐王的习惯（出马簿）→ 会算的齐王（让他猜不到） */
import {RNG} from '../core/rng.js';
import {INK,BRUSH_FONT,paperBase,paperGrain,inkHorse,figure,roof,banner,fitCanvas} from '../core/ink.js';
import {el,reduceMotion} from '../core/ui.js';
import {ORDERS,orderKey,TIER_NAME,raceWins,matchWon,counterOf,LEDGER20,habitSample,habitWinProb,kingPredict,kingMirror,raceGrade2,raceGrade3,R2_MATCHES,R3_MATCHES} from './race-core.js';

const CN=['一','二','三'];
const KING='179,38,30',TIAN='30,91,115';
const COAT={3:.86,2:.52,1:.24};
const SPEED={K3:1,T3:.955,K2:.91,T2:.865,K1:.82,T1:.775};
const tierTxt=o=>o.map(t=>TIER_NAME[t][0]).join('');

export const raceLevel={
  id:'race',title:'赛马',concept:'博弈 · 策略',ambience:'race',poem:['今以君之下驷与彼上驷','取君上驷与彼中驷','取君中驷与彼下驷'],poemSrc:'《史记·孙子吴起列传》',
  colophon:{head:'田忌赛马',seal:'孙膑',
    lines:['知彼之序，则以下驷当上驷，一负而两胜。','彼有常习，则顺其习而取之。','彼亦会算，则无一定之序可恃，唯令其不可测。','双方皆不露规律，胜负便归于一个定数——此即纳什均衡、混合策略之理。'],
    note:'今之定价、竞标、攻防、排班轮值，皆是此局。'},
  start(ui,audio){
    const S={round:1,mine:[3,2,1],king:[3,2,1],showKing:true,sel:-1,matches:[],hist:[],racing:false,quick:false,tries:0,sprites:null,spriteSize:0};
    const root=el('div','race'),track=el('div','race-track'),board=el('div','race-board'),ledger=el('div','race-ledger');
    const bg=el('canvas','race-bg'),fg=el('canvas','race-fg');track.appendChild(bg);track.appendChild(fg);track.appendChild(ledger);
    root.appendChild(track);root.appendChild(board);ui.stage.appendChild(root);ledger.hidden=true;
    let W=0,H=0;
    const sizeOf=()=>Math.round(Math.min(W*.3,H*.36));

    /* ---------- 马的画像（预先画好四帧，跑起来只贴图） ---------- */
    function sprites(){
      const size=sizeOf();if(S.sprites&&S.spriteSize===size)return S.sprites;
      const dpr=Math.min(2,window.devicePixelRatio||1),out={};
      for(const side of ['K','T'])for(const t of [3,2,1]){const key=side+t;out[key]=[];
        for(let f=0;f<5;f++){const c=document.createElement('canvas');c.width=Math.ceil(size*1.25*dpr);c.height=Math.ceil(size*.95*dpr);const x=c.getContext('2d');x.scale(dpr,dpr);
          inkHorse(x,size*.62,size*.86,size,{coat:COAT[t],seed:(side==='K'?100:200)+t*7,gallop:f<4?f:null,rider:side==='K'?KING:TIAN,head:f===4?0:undefined});out[key].push(c);}}
      S.sprites=out;S.spriteSize=size;return out;
    }
    function drawBg(){
      W=track.clientWidth;H=track.clientHeight;const c=fitCanvas(bg,W,H);paperBase(c,0,0,W,H);
      /* 看台：两排观众、围栏；终点那头是齐王的王帐（右上角留给出马簿） */
      const r=RNG(4),crowdY=H*.2,cs=Math.max(9,Math.min(26,H*.075)),kx=W*.16,tints=[`rgba(${INK},.16)`,'rgba(170,128,72,.42)','rgba(30,91,115,.3)','rgba(120,110,90,.3)'];
      const row=(y,off,a)=>{c.globalAlpha=a;for(let x=off;x<W;x+=cs*.62){if(Math.abs(x-kx)<cs*1.9)continue;figure(c,x+(r()-.5)*cs*.2,y+(r()-.5)*cs*.08,cs*(.9+r()*.2),tints[Math.floor(r()*4)],Math.floor(r()*3));}c.globalAlpha=1;};
      row(crowdY-cs*.32,cs*.3,.5);row(crowdY,0,.9);
      c.strokeStyle=`rgba(${INK},.6)`;c.lineWidth=Math.max(1,cs*.08);c.beginPath();c.moveTo(0,crowdY-cs*.28);c.lineTo(W,crowdY-cs*.28);c.moveTo(0,crowdY+2);c.lineTo(W,crowdY+2);c.stroke();
      c.lineWidth=Math.max(1,cs*.1);for(let x=cs*.8;x<W;x+=cs*1.7){c.beginPath();c.moveTo(x,crowdY-cs*.4);c.lineTo(x,crowdY+3);c.stroke();}
      c.fillStyle='rgba(165,42,32,.75)';c.fillRect(kx-cs*1.5,crowdY-cs*1.4,cs*.14,cs*1.42);c.fillRect(kx+cs*1.36,crowdY-cs*1.4,cs*.14,cs*1.42);
      roof(c,kx,crowdY-cs*1.38,cs*3.6,cs*.55,.88);figure(c,kx,crowdY-cs*.02,cs*1.15,'rgba(165,42,32,.62)',2,'rgba(200,160,70,.95)');
      banner(c,kx+cs*2.1,crowdY-2,Math.max(12,H*.05),'齐');banner(c,W*.56,crowdY-2,Math.max(12,H*.05),'田');
      [.58,.92].forEach(f=>{c.strokeStyle=`rgba(${INK},.28)`;c.beginPath();c.moveTo(0,H*f);c.lineTo(W,H*f);c.stroke();});
      c.strokeStyle=`rgba(${INK},.12)`;c.setLineDash([4,6]);c.beginPath();c.moveTo(0,H*.75);c.lineTo(W,H*.75);c.stroke();c.setLineDash([]);
      const sx=W-sizeOf()*1.1-4;c.strokeStyle=`rgba(${INK},.3)`;c.setLineDash([2,5]);c.beginPath();c.moveTo(sx,H*.36);c.lineTo(sx,H*.96);c.stroke();c.setLineDash([]);
      c.font=`${Math.round(Math.min(16,H*.05))}px ${BRUSH_FONT}`;c.fillStyle=`rgba(${INK},.45)`;c.textAlign='center';c.fillText('起',sx,H*.345);
      c.font=`${Math.round(Math.min(22,H*.07))}px ${BRUSH_FONT}`;c.fillStyle=`rgba(${KING},.9)`;c.textAlign='right';c.fillText('齐',W-10,H*.55);c.fillStyle=`rgba(${TIAN},.95)`;c.fillText('田',W-10,H*.89);
      paperGrain(c,0,0,W,H,false);
      S.sprites=null;
    }
    /* ---------- 出场次序板 ---------- */
    function buildBoard(){
      board.innerHTML='';
      board.appendChild(el('div','rb-lab',''));CN.forEach(n=>board.appendChild(el('div','rb-head','第'+n+'场')));
      board.appendChild(el('div','rb-lab king','齐王'));
      S.king.forEach(t=>{const c=el('div','rcard king'+(S.showKing?'':' hidden'));c.innerHTML=S.showKing?cardHtml('K',t):'<span class="q">？</span>';board.appendChild(c);});
      board.appendChild(el('div','rb-lab tian','田忌'));
      S.mine.forEach((t,i)=>{const b=el('button','rcard tian'+(S.sel===i?' sel':''));b.innerHTML=cardHtml('T',t);b.setAttribute('aria-label','第'+CN[i]+'场：'+TIER_NAME[t]+'，点两匹互换');
        b.onclick=()=>pick(i);board.appendChild(b);});
      board.querySelectorAll('canvas[data-k]').forEach(cv=>{const sp=sprites()[cv.dataset.k][4];const x=cv.getContext('2d');cv.width=96;cv.height=72;x.drawImage(sp,0,0,96,72);});
      idle();
    }
    const cardHtml=(side,t)=>`<canvas data-k="${side}${t}"></canvas><b>${TIER_NAME[t]}</b>`;
    function pick(i){
      if(S.racing)return;
      if(S.sel<0){S.sel=i;audio.tap(i+3);buildBoard();return;}
      if(S.sel!==i){[S.mine[S.sel],S.mine[i]]=[S.mine[i],S.mine[S.sel]];audio.tap(i+5);}
      S.sel=-1;buildBoard();
    }
    function drawLedger(extra){
      if(S.round===1){ledger.hidden=true;return;}
      ledger.hidden=false;ledger.innerHTML='<div class="rl-t">齐王出马簿</div>';
      const box=el('div','rl-list');const all=(S.round===2?LEDGER20.map(k=>({k,old:1})):[]).concat(S.matches.map(m=>({k:orderKey(m.king),won:m.won,hit:m.hit})));
      all.forEach(e=>{const s=el('span','rl-e'+(e.old?'':' new')+(e.hit?' hit':''),tierTxt(e.k.split?e.k.split('').map(Number):e.k));box.appendChild(s);});
      ledger.appendChild(box);
    }
    /* ---------- 跑马：先立马待发，再同时起跑；先过朱旗者胜 ---------- */
    const LANES=()=>[H*.56,H*.9];
    const xStart=()=>W-S.spriteSize*.62,xEnd=()=>W*.1+S.spriteSize*.1;
    function measure(){if(track.clientWidth!==W||track.clientHeight!==H)drawBg();}
    function titles(cc,i,kt,tt){
      cc.textAlign='center';cc.textBaseline='alphabetic';
      cc.font=`${Math.round(Math.min(34,H*.1))}px ${BRUSH_FONT}`;const tw=cc.measureText('第一场').width+28,th=Math.min(34,H*.1)*1.25;
      cc.fillStyle='rgba(247,241,227,.9)';cc.fillRect(W/2-tw/2,H*.12-th*.8,tw,th);cc.strokeStyle=`rgba(${INK},.25)`;cc.lineWidth=1;cc.strokeRect(W/2-tw/2,H*.12-th*.8,tw,th);
      cc.fillStyle=`rgba(${INK},.8)`;cc.fillText('第'+CN[i]+'场',W/2,H*.12);
      cc.font=`${Math.round(Math.min(17,H*.055))}px ${BRUSH_FONT}`;cc.fillStyle=`rgba(${INK},.6)`;cc.fillText(`齐王${kt?TIER_NAME[kt]:'？'}　对　田忌${TIER_NAME[tt]}`,W/2,H*.27);
    }
    function post(cc){const fx=W*.1;cc.strokeStyle=`rgba(${INK},.85)`;cc.lineWidth=2;cc.beginPath();cc.moveTo(fx,H*.3);cc.lineTo(fx,H*.96);cc.stroke();
      cc.fillStyle='rgba(179,38,30,.85)';cc.beginPath();cc.moveTo(fx,H*.3);cc.quadraticCurveTo(fx+22,H*.32,fx+30,H*.36);cc.lineTo(fx,H*.41);cc.fill();}
    function horseAt(cc,spr,x,yg,f,a){const s=S.spriteSize;if(a!=null)cc.globalAlpha=a;cc.drawImage(spr[f],x-s*.62,yg-s*.86,s*1.25,s*.95);cc.globalAlpha=1;}
    function idle(){
      measure();if(S.racing)return;
      const cc=fitCanvas(fg,W,H),sp=sprites(),[yk,yt]=LANES(),x=xStart(),kt=S.king[0],tt=S.mine[0];cc.clearRect(0,0,W,H);titles(cc,0,kt,tt);
      if(kt)horseAt(cc,sp['K'+kt],x,yk,4);
      else{horseAt(cc,sp.K2,x,yk,4,.13);cc.font=`${Math.round(Math.min(44,H*.13))}px ${BRUSH_FONT}`;cc.fillStyle=`rgba(${KING},.7)`;cc.fillText('？',x-S.spriteSize*.12,yk-S.spriteSize*.42);}
      horseAt(cc,sp['T'+tt],x,yt,4);post(cc);
    }
    function run(done){
      measure();S.racing=true;const sp=sprites(),size=S.spriteSize,res=[],[yk,yt]=LANES();let i=0;
      const prog=(t,v)=>{const p=Math.min(1,t*v/.95);return p*p*(3-2*p)*.25+p*.75;};
      const one=()=>{
        if(!root.isConnected)return;
        if(i>=3){S.racing=false;done(res);return;}
        const kt=S.king[i],tt=S.mine[i],kSp=sp['K'+kt],tSp=sp['T'+tt],vk=SPEED['K'+kt],vt=SPEED['T'+tt];
        const quick=S.quick||reduceMotion(),wait=quick?280:700,dur=quick?800:1900,x0=xStart(),x1=xEnd(),cc=fitCanvas(fg,W,H),dust=[];
        let t0=null,off=false;
        const kick=(x,yg)=>{if(Math.random()<.6)dust.push({x:x+size*(.25+Math.random()*.15),y:yg-1-Math.random()*3,vx:.6+Math.random()*1.6,vy:-Math.random()*.5,r:1.5+Math.random()*2.5,life:1});};
        const f=now=>{
          if(!root.isConnected)return;if(t0==null)t0=now;     /* 以第一帧为零点，避免 rAF 时间戳早于 performance.now() */
          const el=now-t0-wait;cc.clearRect(0,0,W,H);titles(cc,i,kt,tt);
          if(el<0){horseAt(cc,kSp,x0,yk,4);horseAt(cc,tSp,x0,yt,4);post(cc);requestAnimationFrame(f);return;}
          if(!off){off=true;audio.gallop(dur/1000*1.15,quick?.28:.45);}
          const t=el/dur,pk=prog(t,vk),pt=prog(t,vt),fr=Math.floor(el/85)%4;
          const xk=x0+(x1-x0)*pk,xt=x0+(x1-x0)*pt;if(pk<1)kick(xk,yk);if(pt<1)kick(xt,yt);
          for(let j=dust.length-1;j>=0;j--){const d=dust[j];d.x+=d.vx;d.y+=d.vy;d.r*=1.04;d.life-=.04;if(d.life<=0){dust.splice(j,1);continue;}
            cc.fillStyle=`rgba(${INK},${.2*d.life})`;cc.beginPath();cc.arc(d.x,d.y,d.r,0,7);cc.fill();}
          horseAt(cc,kSp,xk,yk,pk>=1?4:fr);horseAt(cc,tSp,xt,yt,pt>=1?4:(fr+2)%4);post(cc);
          if(pk>=1&&pt>=1){const won=tt>kt;res.push(won);
            cc.font=`${Math.round(Math.min(40,H*.13))}px ${BRUSH_FONT}`;cc.fillStyle=won?`rgba(${TIAN},.95)`:`rgba(${KING},.95)`;cc.fillText(won?'田忌胜':'齐王胜',W*.36,won?H*.8:H*.46);
            won?audio.cheer(.1):audio.low();i++;setTimeout(one,quick?420:1000);return;}
          requestAnimationFrame(f);
        };requestAnimationFrame(f);
      };one();
    }
    /* ---------- 三回合 ---------- */
    function round1(){
      S.round=1;S.king=[3,2,1];S.mine=[3,2,1];S.showKing=true;S.sel=-1;S.matches=[];S.quick=false;ui.hideResult();ui.stageName('第一回 · 孙膑献策');ui.meter('');
      ui.say('齐威王邀田忌赛马，三场两胜，赌千金。齐王按<b>上、中、下</b>出马。你的上中下三匹，每一等都比齐王的慢一截。<br>点两匹马互换出场次序，排好了开赛。');
      ui.acts([['开赛',()=>go1(),true]]);drawLedger();buildBoard();
    }
    function go1(){if(S.racing)return;S.sel=-1;buildBoard();ui.acts([]);ui.hideResult();S.tries++;
      run(res=>{const w=res.filter(Boolean).length,won=w>=2;
        if(won){audio.arp();ui.result('千金',`三场 <b>${w}</b> 胜 <b>${3-w}</b> 负`,'以下驷对上驷，上驷对中驷，中驷对下驷：输一场，赢两场。马没换一匹，只换了次序。',true);
          ui.say('孙膑的妙处，一半在排列，一半在<b>先知道了齐王的次序</b>。下一回，齐王不再亮牌了。');ui.acts([['再赛一局',round1],['下一回 →',round2,true]]);}
        else{ui.result('输了',`三场 <b>${w}</b> 胜 <b>${3-w}</b> 负`,w===0?'同等相对，你每一场都慢一截，必输。':'赢了一场还不够。哪一场可以故意输掉？',true);
          ui.say('换个次序再试。');ui.acts([['再赛一局',()=>{ui.hideResult();ui.acts([['开赛',()=>go1(),true]]);}]]);}
      });}
    function round2(){
      S.round=2;S.showKing=false;S.king=[0,0,0];S.mine=[3,2,1];S.sel=-1;S.matches=[];S.quick=false;ui.hideResult();ui.stageName('第二回 · 出马簿');
      ui.say(`齐王不再先亮次序，和你同时出马。门客抄来了他近二十场的<b>出马簿</b>（右上）。<br>赛 <b>${R2_MATCHES}</b> 局，每局排好次序再开赛。`);
      meter2();drawLedger();buildBoard();ui.acts([['开赛',()=>go23(),true]]);
    }
    function meter2(){const w=S.matches.filter(m=>m.won).length;ui.meter(`<small>已赛</small><b>${S.matches.length}</b><small>局 · 胜 ${w}</small>`);}
    function round3(){
      S.round=3;S.showKing=false;S.king=[0,0,0];S.mine=[3,2,1];S.sel=-1;S.matches=[];S.hist=[];S.quick=false;ui.hideResult();ui.stageName('第三回 · 会算的齐王');
      ui.say(`齐王也琢磨起你来了：他会猜你这一局怎么排，再拿同等的马一一压住你。<br>赛 <b>${R3_MATCHES}</b> 局，看他能猜中几次。`);
      meter3();drawLedger();buildBoard();ui.acts([['开赛',()=>go23(),true]]);
    }
    function meter3(){const h=S.matches.filter(m=>m.hit).length;ui.meter(`<small>齐王猜中</small><b>${h}</b><small>/ ${S.matches.length} 局</small>`);}
    function go23(){
      if(S.racing)return;S.sel=-1;const mine=S.mine.slice();let king,hit=false;
      if(S.round===2)king=habitSample(Math.random);else{const pred=kingPredict(S.hist,Math.random);hit=orderKey(pred)===orderKey(mine);king=kingMirror(pred);}
      S.king=king;S.showKing=true;buildBoard();ui.acts([]);ui.hideResult();
      if(S.round===3)ui.say(hit?'齐王一亮马：<b>他猜中了你的次序</b>，每一场都拿同等的马压你。':'齐王一亮马：他没猜中。');
      run(res=>{const w=res.filter(Boolean).length,won=w>=2;
        S.matches.push({mine,king,won,hit,p:habitWinProb(mine)});if(S.round===3)S.hist.push(mine);
        drawLedger();S.quick=true;
        if(S.round===2){meter2();if(S.matches.length<R2_MATCHES){ui.say(`第 ${S.matches.length} 局${won?'你赢了':'齐王赢了'}（${w}:${3-w}）。齐王这局出的是「${tierTxt(king)}」，已记进簿里。`);next23();}
          else finish2();}
        else{meter3();if(S.matches.length<R3_MATCHES){ui.say((hit?'被猜中了。':'他没猜中。')+`这局 ${won?'你赢':'齐王赢'}（${w}:${3-w}）。齐王会记住你出过什么。`);next23();}
          else finish3();}
      });
    }
    function next23(){setTimeout(()=>{if(!root.isConnected)return;S.showKing=false;S.king=[0,0,0];buildBoard();ui.acts([['开赛',()=>go23(),true]]);},700);}
    function finish2(){
      const avg=S.matches.reduce((a,m)=>a+m.p,0)/S.matches.length,g=raceGrade2(avg),w=S.matches.filter(m=>m.won).length;audio.arp();
      ui.result(g,`按齐王的习惯算，你每局的赢面平均 <b>${Math.round(avg*100)}%</b>（最好是 45%）　·　实赢 <b>${w}</b> 局`,
        g==='至妙'?'你看出了他的习惯：近半数场次出「上中下」，于是一直出「下上中」。':'簿上「上中下」出现得最多——照着它出孙膑那一手「下上中」，每局赢面最大。',true);
      ui.say('评的是你的次序押得准不准，不是这几局的运气。可齐王吃了亏，也会学。');ui.acts([['下一回 →',round3,true]]);
    }
    function finish3(){
      const hits=S.matches.filter(m=>m.hit).length,w=S.matches.filter(m=>m.won).length,g=raceGrade3(hits);audio.arp();
      const kinds=new Set(S.matches.map(m=>orderKey(m.mine))).size;
      ui.result(g,`齐王猜中 <b>${hits}</b> 次（共 ${R3_MATCHES} 局）　·　你用了 <b>${kinds}</b> 种次序　·　赢 <b>${w}</b> 局`,
        hits>=5?'你的出法有规律，齐王一猜一个准。':'齐王摸不着你的规律。双方都不露规律时，你每局赢的机会只有六分之一——齐王的马本就更快。孙膑能必胜，靠的是先知道了齐王的次序。',true);
      ui.say('对手也会算的时候，最好的办法是让他<b>猜不到</b>。这一处参透了。');
      ui.acts([['再赛八局',round3],['题跋 · 钤印',()=>ui.colophon(),true]]);
    }
    this._resize=()=>{drawBg();buildBoard();};
    drawBg();round1();
  },
  resize(){this._resize&&this._resize();},
  stop(){this._resize=null;}
};
