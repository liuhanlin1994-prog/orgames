/* 配乐与音效：全部由 Web Audio 合成，没有音频文件。
   配器：笙（和声垫底）、古筝（Karplus–Strong 拨弦，分解和弦与刮奏）、箫（旋律）、低音琴弦、碰铃。
   调式：D 宫五声（D E F# A B）。曲式：引子 → A → B → A′ → 间奏，循环时换和弦走向与乐句。 */

const PENTA=[0,2,4,7,9];
const KEY_HZ=146.83;                                   // D3
export function degHz(deg){const o=Math.floor(deg/5),d=((deg%5)+5)%5;return KEY_HZ*Math.pow(2,(PENTA[d]+12*o)/12);}
const cls=d=>((d%5)+5)%5;

const TEMPO=64, BEAT=60/TEMPO, BAR=BEAT*4;
/* 和弦根音（五声音级，0 = D3） */
const PROGS=[[0,-1,1,3],[0,3,-1,2],[-1,1,3,0],[0,2,3,0],[-2,0,1,3],[3,1,-1,0]];
/* 箫的乐句：[音级, 拍数]，每句两小节（8 拍）。音级 5 = D4 */
const MOTIFS=[
  [[8,1.5],[9,.5],[10,1],[9,.5],[8,.5],[7,2],[8,2]],
  [[10,1],[11,1],[12,1.5],[11,.5],[10,2],[9,2]],
  [[9,.5],[10,.5],[9,1],[8,1],[7,1],[6,2],[5,2]],
  [[5,1],[7,1],[8,2],[9,1],[8,.5],[7,.5],[8,2]],
  [[12,2],[11,1],[10,1],[9,1.5],[10,.5],[8,2]],
  [[8,1],[7,.5],[6,.5],[7,1],[6,1],[5,4]],
  [[7,1],[8,1],[10,1.5],[9,.5],[8,1],[7,1],[6,2]],
  [[10,1.5],[12,.5],[11,1],[10,1],[9,2],[10,2]],
  [[6,1],[5,.5],[6,.5],[7,1],[8,1],[9,1],[8,1],[7,2]]
];
/* 古筝分解和弦：相对根音的五声音级，null 为休止；每小节 8 个八分音 */
const ARPS={
  flow:[[0,3,5,7,8,7,5,3],[0,3,5,3,0,3,5,8]],
  wave:[[0,5,3,5,7,5,8,5],[0,5,3,5,7,8,7,5]],
  sparse:[[0,null,5,null,3,null,7,null],[0,null,3,null,5,null,null,null]],
  still:[[0,null,null,null,5,null,null,null],[3,null,null,null,null,null,null,null]]
};
/* 段落编排 */
const SECTION_TYPES={
  intro:    {pad:1,bass:1,arp:'still',melody:0,harm:1,bell:1},
  A:        {pad:1,bass:1,arp:'flow',melody:1,bell:1},
  B:        {pad:1,bass:1,arp:'wave',melody:1,high:1,gliss:1,bell:1},
  A2:       {pad:1,bass:1,arp:'flow',melody:1},
  interlude:{pad:1,bass:1,arp:'sparse',melody:0,zheng:1,harm:1},
  calm:     {pad:.7,bass:.8,arp:'sparse',melody:0,harm:1,quiet:1},      // 关卡里：安静、不抢注意力
  calm2:    {pad:.7,bass:.8,arp:'still',melody:0,zheng:1,quiet:1},
  prelude:  {pad:.55,bass:.5,arp:'still',melody:0,harm:1,quiet:1},             // 序章：空灵
  grandA:   {pad:1.15,bass:1,arp:'flow',melody:1,bell:1,bells:1,gliss:1},      // 卷终：盛大
  grandB:   {pad:1.15,bass:1,arp:'wave',melody:1,high:1,bell:1,bells:1,gliss:1}
};
const FORM={scroll:['intro','A','B','A2','interlude','A','B','interlude'],level:['calm','calm2'],prelude:['prelude'],finale:['grandA','grandB','grandA','grandB']};

export function createAudio(){
  let ac=null,out=null,musicBus=null,sfxBus=null,verbIn=null,noiseBuf=null,xiaoWave=null;
  let on=false,mood='scroll',timer=0,nextBar=0,barIdx=0,secIdx=0,prog=PROGS[0],lastMotif=-1,live=[];
  const cache=new Map();
  let rnd=Math.random;

  function build(ctx){
    ac=ctx;
    const comp=ac.createDynamicsCompressor();comp.threshold.value=-18;comp.knee.value=10;comp.ratio.value=3;comp.attack.value=.008;comp.release.value=.25;
    out=ac.createGain();out.gain.value=.95;comp.connect(out);out.connect(ac.destination);
    const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=6000;
    const dry=ac.createGain();dry.gain.value=1;lp.connect(dry);dry.connect(comp);
    const verb=ac.createConvolver();verb.buffer=makeIR(3.6);const wet=ac.createGain();wet.gain.value=.36;verb.connect(wet);wet.connect(comp);
    verbIn=ac.createGain();verbIn.gain.value=1;lp.connect(verbIn);verbIn.connect(verb);
    musicBus=ac.createGain();musicBus.gain.value=0;musicBus.connect(lp);
    sfxBus=ac.createGain();sfxBus.gain.value=.9;sfxBus.connect(lp);
    noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
    const H=[0,1,.34,.12,.07,.035,.02];xiaoWave=ac.createPeriodicWave(new Float32Array(H.length),new Float32Array(H),{disableNormalization:false});
  }
  function makeIR(sec){
    const sr=ac.sampleRate,len=Math.floor(sr*sec),b=ac.createBuffer(2,len,sr);
    for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let l=0;
      for(let i=0;i<len;i++){const t=i/len,k=.55-.5*t;l+=((Math.random()*2-1)-l)*k;d[i]=l*Math.pow(1-t,2.4)*(i<sr*.015?i/(sr*.015):1)*1.6;}}
    return b;
  }
  function track(node,end){live.push({node,end});if(live.length>400)live=live.filter(x=>x.end>ac.currentTime);}

  /* ---------- 乐器 ---------- */
  function ksBuf(f,dur,bright){
    const key=Math.round(f)+'|'+dur+'|'+bright;if(cache.has(key))return cache.get(key);
    const sr=ac.sampleRate,N=Math.max(2,Math.round(sr/f)),len=Math.round(sr*dur),buf=ac.createBuffer(1,len,sr),d=buf.getChannelData(0);
    const ring=new Float32Array(N);let prev=0;for(let i=0;i<N;i++){prev+=((Math.random()*2-1)-prev)*bright;ring[i]=prev;}
    let mean=0;for(let i=0;i<N;i++)mean+=ring[i];mean/=N;for(let i=0;i<N;i++)ring[i]-=mean;
    const decay=Math.pow(.001,1/(dur*f));let idx=0,peak=1e-6;
    for(let i=0;i<len;i++){const a=ring[idx],b=ring[(idx+1)%N];d[i]=a;ring[idx]=(a+b)*.5*decay;idx=(idx+1)%N;const v=Math.abs(a);if(v>peak)peak=v;}
    const fade=Math.round(len*.06);for(let i=0;i<len;i++){d[i]/=peak;if(i>len-fade)d[i]*=(len-i)/fade;}
    const res={buf,fa:sr/(N+.5)};cache.set(key,res);return res;
  }
  function pluck(when,f,vel,o){
    o=o||{};const dur=o.dur||(f<200?4.2:f<500?3.2:2.2),k=ksBuf(f,dur,o.bright||.62);
    const s=ac.createBufferSource();s.buffer=k.buf;const rate=f/k.fa;s.playbackRate.setValueAtTime(rate,when);
    if(o.bend){s.playbackRate.setValueAtTime(rate,when+(o.bendAt||.18));s.playbackRate.linearRampToValueAtTime(rate*o.bend,when+(o.bendAt||.18)+.22);}
    const g=ac.createGain();g.gain.value=vel;
    let node=g;if(ac.createStereoPanner&&o.pan){const p=ac.createStereoPanner();p.pan.value=o.pan;g.connect(p);node=p;}
    s.connect(g);node.connect(o.bus||musicBus);s.start(when);s.stop(when+dur);track(s,when+dur);
  }
  function harmonic(when,f,vel,bus){ // 泛音：近乎纯音，短促
    const o=ac.createOscillator();o.type='sine';o.frequency.value=f;const g=ac.createGain();
    g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(vel,when+.006);g.gain.exponentialRampToValueAtTime(.0001,when+1.6);
    const o2=ac.createOscillator();o2.type='sine';o2.frequency.value=f*2;const g2=ac.createGain();g2.gain.setValueAtTime(0,when);g2.gain.linearRampToValueAtTime(vel*.25,when+.004);g2.gain.exponentialRampToValueAtTime(.0001,when+.6);
    o.connect(g);o2.connect(g2);g.connect(bus||musicBus);g2.connect(bus||musicBus);o.start(when);o2.start(when);o.stop(when+1.7);o2.stop(when+.7);track(o,when+1.7);track(o2,when+.7);
  }
  function bell(when,f,vel,bus){ // 碰铃：非谐泛音
    [[1,1,2.6],[2.76,.45,1.3],[5.4,.22,.6],[8.93,.1,.3]].forEach(([m,a,dk])=>{const o=ac.createOscillator();o.type='sine';o.frequency.value=f*m;const g=ac.createGain();
      g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(vel*a,when+.004);g.gain.exponentialRampToValueAtTime(.0001,when+dk);o.connect(g);g.connect(bus||musicBus);o.start(when);o.stop(when+dk+.05);track(o,when+dk);});
  }
  function pad(when,freqs,dur,vel){ // 笙：锯齿 + 三角，低通，缓起缓收
    const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=820;f.Q.value=.4;
    const g=ac.createGain();g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(vel,when+1.6);g.gain.setValueAtTime(vel,when+dur-2.2);g.gain.linearRampToValueAtTime(0,when+dur);
    const lfo=ac.createOscillator();lfo.frequency.value=.13;const lg=ac.createGain();lg.gain.value=180;lfo.connect(lg);lg.connect(f.frequency);lfo.start(when);lfo.stop(when+dur);
    freqs.forEach((fr,i)=>{[-5,5].forEach((ct,j)=>{const o=ac.createOscillator();o.type=j?'triangle':'sawtooth';o.frequency.value=fr*Math.pow(2,ct/1200);const og=ac.createGain();og.gain.value=j?1:.45;o.connect(og);og.connect(f);o.start(when);o.stop(when+dur+.1);track(o,when+dur);});});
    f.connect(g);g.connect(musicBus);
  }
  function xiao(when,notes,vel){ // 箫：一句一口气，连音滑过去，长音加揉
    const o=ac.createOscillator();o.setPeriodicWave(xiaoWave);
    const env=ac.createGain();env.gain.value=0;
    const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;lp.Q.value=.3;
    const lfo=ac.createOscillator();lfo.frequency.value=5.2;const lg=ac.createGain();lg.gain.value=0;lfo.connect(lg);lg.connect(o.frequency);
    const nz=ac.createBufferSource();nz.buffer=noiseBuf;nz.loop=true;const bp=ac.createBiquadFilter();bp.type='bandpass';bp.Q.value=1.4;const ng=ac.createGain();ng.gain.value=0;
    o.connect(env);nz.connect(bp);bp.connect(ng);ng.connect(env);env.connect(lp);lp.connect(musicBus);
    let tEnd=when;
    notes.forEach((n,i)=>{const t=when+n.t,f=n.f;
      if(i===0){o.frequency.setValueAtTime(f*.985,t);o.frequency.setTargetAtTime(f,t,.05);env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(vel,t+.14);}
      else{o.frequency.setTargetAtTime(f,t-.015,.022);if(!n.grace){env.gain.setTargetAtTime(vel*.62,t-.03,.012);env.gain.setTargetAtTime(vel*(n.acc||1),t+.012,.045);}}
      bp.frequency.setValueAtTime(f*2.1,t);
      if(!n.grace){ng.gain.setValueAtTime(vel*.42,t);ng.gain.setTargetAtTime(vel*.07,t+.03,.08);}
      if(n.d>=.8&&!n.grace){lg.gain.setValueAtTime(0,t+.05);lg.gain.linearRampToValueAtTime(f*.0065,t+Math.min(.55,n.d*.5));lg.gain.setTargetAtTime(0,t+n.d-.05,.03);
        env.gain.linearRampToValueAtTime(vel*(n.acc||1)*1.07,t+n.d*.55);env.gain.linearRampToValueAtTime(vel*(n.acc||1)*.92,t+n.d-.02);}
      tEnd=Math.max(tEnd,t+n.d);});
    env.gain.setTargetAtTime(0,tEnd-.06,.11);
    o.start(when);lfo.start(when);nz.start(when);o.stop(tEnd+1);lfo.stop(tEnd+1);nz.stop(tEnd+1);track(o,tEnd+1);track(nz,tEnd+1);
  }
  function woodblock(when,vel,bus){const o=ac.createOscillator();o.type='sine';o.frequency.setValueAtTime(900,when);o.frequency.exponentialRampToValueAtTime(520,when+.06);
    const g=ac.createGain();g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(vel,when+.003);g.gain.exponentialRampToValueAtTime(.0001,when+.12);o.connect(g);g.connect(bus||musicBus);o.start(when);o.stop(when+.15);track(o,when+.15);}

  /* ---------- 作曲 ---------- */
  function section(){const f=FORM[mood];return f[secIdx%f.length];}
  function pickMotif(root,cadence){
    const want=cadence?[cls(root)]:[cls(root),cls(root+2),cls(root+3)];
    const cand=[];MOTIFS.forEach((m,i)=>{if(i!==lastMotif&&want.includes(cls(m[m.length-1][0])))cand.push(i);});
    const i=cand.length?cand[Math.floor(rnd()*cand.length)]:Math.floor(rnd()*MOTIFS.length);lastMotif=i;return MOTIFS[i];
  }
  function scheduleBar(t0){
    const S=SECTION_TYPES[section()],chordPos=Math.floor(barIdx/2)%4,barInChord=barIdx%2,root=prog[chordPos];
    const q=S.quiet?.62:1;
    if(barInChord===0){
      const chordDur=BAR*2;
      if(S.pad)pad(t0,[degHz(root),degHz(root+3),degHz(root+5)],chordDur+1.8,.032*S.pad);
      if(S.bass){pluck(t0,degHz(root),.34*S.bass*q,{bright:.32,dur:4.6});pluck(t0,degHz(root-5),.2*S.bass*q,{bright:.25,dur:4.6});}
      if(S.bell&&((chordPos===0&&barIdx%8===0)||S.bells))bell(t0+.02,degHz(root+15),S.bells?.045:.035);
      if(S.melody&&!(chordPos===2&&rnd()<.35)){
        const m=pickMotif(root,chordPos===3);const lift=S.high&&Math.max(...m.map(n=>n[0]))<=10?5:0;
        const notes=[];let t=0;
        m.forEach(([dg,b],i)=>{const d=b*BEAT;
          if(b>=1&&i>0&&rnd()<.28){notes.push({f:degHz(dg+lift+1),t:t,d:.075,grace:1});notes.push({f:degHz(dg+lift),t:t+.075,d:d-.075,acc:i%2?.92:1});}
          else notes.push({f:degHz(dg+lift),t:t,d:d,acc:(i===0||b>=2)?1:.9});t+=d;});
        xiao(t0+.04,notes,.13*q);
      }
      if(S.zheng&&rnd()<.8){ // 间奏：古筝独奏一句，带按音
        const m=pickMotif(root,false);let t=0;m.forEach(([dg,b],i)=>{const d=b*BEAT;pluck(t0+t,degHz(dg),.2*q,{bright:.7,bend:(b>=2&&rnd()<.5)?1.0595:0,bendAt:.35,pan:-.1});t+=d;});
      }
    } else if(S.bass){pluck(t0,degHz(root),.2*S.bass*q,{bright:.3,dur:3.8});}
    // 分解和弦
    const pat=ARPS[S.arp][barInChord];
    if(S.gliss&&barIdx%8===0&&barInChord===0){for(let i=0;i<9;i++)pluck(t0-.36+i*.04,degHz(root+i+2),.07+i*.012,{bright:.75,dur:1.8,pan:.15});}
    pat.forEach((dg,i)=>{if(dg==null)return;const acc=[1,.6,.78,.6,.9,.6,.78,.6][i];const jitter=(rnd()-.5)*.016;
      pluck(t0+i*BEAT/2+jitter,degHz(root+5+dg),(.19*acc+.02*rnd())*q*(S.melody?.85:1),{bright:.66,pan:(i%2?.18:-.18)});});
    if(S.harm&&rnd()<.5)harmonic(t0+BEAT*(2+Math.floor(rnd()*2))+BEAT/2,degHz(root+10+(rnd()<.5?3:5)),.06*q);
    if(section()==='interlude'&&barInChord===1&&rnd()<.4)woodblock(t0+BEAT*3.5,.05);
    // 前进
    barIdx++;
    if(barIdx%8===0){secIdx++;if(section()==='A'||section()==='calm'||rnd()<.35)prog=PROGS[Math.floor(rnd()*PROGS.length)];}
  }
  function tick(){if(!on||!ac)return;while(nextBar<ac.currentTime+1.4){scheduleBar(nextBar);nextBar+=BAR;}}

  function start(){
    if(!ac)return;on=true;clearInterval(timer);live=live.filter(x=>x.end>ac.currentTime);
    if(nextBar<ac.currentTime+.05){nextBar=ac.currentTime+.15;barIdx=4;secIdx=0;prog=PROGS[mood==='scroll'?0:4];}  // 引子只留四小节
    musicBus.gain.cancelScheduledValues(ac.currentTime);musicBus.gain.setValueAtTime(musicBus.gain.value,ac.currentTime);musicBus.gain.linearRampToValueAtTime(.8,ac.currentTime+1.8);
    tick();timer=setInterval(tick,180);
  }
  function stop(){
    if(!ac)return;on=false;clearInterval(timer);const t=ac.currentTime;
    musicBus.gain.cancelScheduledValues(t);musicBus.gain.setValueAtTime(musicBus.gain.value,t);musicBus.gain.linearRampToValueAtTime(0,t+.7);
    live.forEach(x=>{try{x.node.stop(t+.75);}catch(e){}});live=[];nextBar=0;
  }

  /* ---------- 环境声：风、溪、人声、海潮、室内 ---------- */
  let ambBus=null,beds=null,ambKind='none',ambTimer=0,ambEvtTimer=0;
  const AMB={scroll:{wind:.7,water:.45},sea:{sea:1,wind:.35},city:{crowd:1,wind:.3},inn:{indoor:1,crowd:.45},race:{crowd:.85,wind:.5},tea:{wind:.3,water:.35},market:{wind:.6,crowd:.3},prelude:{wind:.25},none:{}};
  function noiseSrc(){const s=ac.createBufferSource();s.buffer=noiseBuf;s.loop=true;s.start(ac.currentTime,Math.random()*1.5);return s;}
  function mkBed(chain,base){const g=ac.createGain();g.gain.value=0;chain(noiseSrc()).connect(g);g.connect(ambBus);return{g,base,level:0};}
  function buildBeds(){
    ambBus=ac.createGain();ambBus.gain.value=0;const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5000;ambBus.connect(lp);lp.connect(out);lp.connect(verbIn);
    const bp=(f,q)=>{const b=ac.createBiquadFilter();b.type='bandpass';b.frequency.value=f;b.Q.value=q;return b;};
    const lfo=(param,rate,depth)=>{const o=ac.createOscillator();o.frequency.value=rate;const g=ac.createGain();g.gain.value=depth;o.connect(g);g.connect(param);o.start();};
    beds={
      wind:mkBed(n=>{const b=bp(480,.7);lfo(b.frequency,.061,260);n.connect(b);return b;},.02),
      water:mkBed(n=>{const b=bp(1900,1.3);n.connect(b);return b;},.007),
      crowd:mkBed(n=>{const a=bp(560,.9),b=bp(1150,1.4),m=ac.createGain();n.connect(a);n.connect(b);a.connect(m);b.connect(m);return m;},.022),
      sea:mkBed(n=>{const l=ac.createBiquadFilter();l.type='lowpass';l.frequency.value=520;n.connect(l);return l;},.028),
      indoor:mkBed(n=>{const l=ac.createBiquadFilter();l.type='lowpass';l.frequency.value=850;n.connect(l);return l;},.012)
    };
  }
  function ambTick(){ // 让声底有起伏：溪水碎、人声忽高忽低、海潮一涌一退
    if(!beds)return;const t=ac.currentTime;
    for(const k in beds){const b=beds[k];if(!b.level)continue;let v=b.base*b.level;
      if(k==='water')v*=.55+Math.random()*.9;else if(k==='crowd')v*=.55+Math.random()*.7;else if(k==='sea')v*=.25+.75*(.5+.5*Math.sin(t*.63));else if(k==='wind')v*=.7+.3*Math.sin(t*.21);
      b.g.gain.setTargetAtTime(v,t,k==='sea'?.4:.12);}
  }
  function ambEvents(){ // 偶发的点缀：鸟鸣、驼铃、杯盏
    if(!on||!beds)return;const k=ambKind;
    if(k==='scroll'&&Math.random()<.5)api.chirp();
    if(k==='city')api.camelBell();
    if(k==='inn'&&Math.random()<.6)api.clink();
    if(k==='market'&&Math.random()<.35)api.chirp();
    ambEvtTimer=setTimeout(ambEvents,5000+Math.random()*9000);
  }
  function setAmb(kind){
    ambKind=kind;if(!ac)return;if(!beds)buildBeds();const mix=AMB[kind]||{};const t=ac.currentTime;
    for(const k in beds){beds[k].level=mix[k]||0;if(!beds[k].level)beds[k].g.gain.setTargetAtTime(0,t,.6);}
  }
  function ambOn(v){if(!ac||!beds)return;const t=ac.currentTime;ambBus.gain.cancelScheduledValues(t);ambBus.gain.setTargetAtTime(v?1:0,t,v?.8:.25);
    clearInterval(ambTimer);clearTimeout(ambEvtTimer);if(v){ambTimer=setInterval(ambTick,160);ambEvtTimer=setTimeout(ambEvents,3000);}}

  const api={
    unlock(){if(!ac){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;build(new AC());}if(ac.state==='suspended')ac.resume();},
    music(v){this.unlock();if(!ac)return false;const want=v==null?!on:v;if(want&&!on)start();else if(!want&&on)stop();if(!beds)setAmb(ambKind==='none'?'scroll':ambKind);ambOn(on);return on;},
    ambience(kind){setAmb(kind);if(on)ambOn(true);},
    isOn:()=>on,
    setMood(m){if(m===mood||!FORM[m])return;mood=m;secIdx=0;barIdx=barIdx-(barIdx%2);  // 下一小节起换编排
      if(ac&&on){const t=ac.currentTime;musicBus.gain.cancelScheduledValues(t);musicBus.gain.setValueAtTime(musicBus.gain.value,t);musicBus.gain.linearRampToValueAtTime(.35,t+.6);musicBus.gain.linearRampToValueAtTime(.8,t+3.5);}},
    /* 音效：都在同一调式里，和配乐不打架 */
    tap(i,v){if(!ac)return;pluck(ac.currentTime,degHz(5+((i%10)+10)%10),v||.26,{bright:.72,bus:sfxBus});},
    low(){if(!ac)return;pluck(ac.currentTime,degHz(-2),.3,{bright:.3,dur:1.6,bus:sfxBus});},
    rise(){if(!ac)return;const t=ac.currentTime;pluck(t,degHz(8),.24,{bright:.7,bus:sfxBus});pluck(t+.11,degHz(10),.24,{bright:.7,bus:sfxBus});},
    arp(){if(!ac)return;const t=ac.currentTime;[5,7,8,10,12,13].forEach((k,i)=>pluck(t+i*.09,degHz(k),.22,{bright:.72,bus:sfxBus}));bell(t+.55,degHz(15),.06,sfxBus);},
    gliss(){if(!ac)return;const t=ac.currentTime;for(let i=0;i<10;i++)pluck(t+i*.035,degHz(5+i),.08+i*.012,{bright:.78,dur:1.6,bus:sfxBus});},
    bell(){if(!ac)return;bell(ac.currentTime,degHz(15),.07,sfxBus);},
    thud(){if(!ac)return;const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(48,t+.25);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.7,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.35);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+.4);woodblock(t,.08,sfxBus);api.vibrate(18);},
    /* 马蹄：三拍一组的跑马节奏 */
    gallop(dur,v){if(!ac)return;const t0=ac.currentTime;v=v||.5;const stride=.36;
      for(let t=0;t<dur;t+=stride)[0,.08,.2].forEach((d,i)=>{const tt=t0+t+d+(Math.random()-.5)*.02;if(tt>t0+dur)return;
        const s=ac.createBufferSource();s.buffer=noiseBuf;const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=260+i*40;const g=ac.createGain();const a=v*(i===2?1:.62)*(.8+Math.random()*.4);
        g.gain.setValueAtTime(0,tt);g.gain.linearRampToValueAtTime(a,tt+.006);g.gain.exponentialRampToValueAtTime(.0001,tt+.09);s.connect(f);f.connect(g);g.connect(sfxBus);s.start(tt,Math.random());s.stop(tt+.12);
        const o=ac.createOscillator();o.frequency.setValueAtTime(95,tt);o.frequency.exponentialRampToValueAtTime(55,tt+.07);const og=ac.createGain();og.gain.setValueAtTime(0,tt);og.gain.linearRampToValueAtTime(a*.5,tt+.005);og.gain.exponentialRampToValueAtTime(.0001,tt+.08);o.connect(og);og.connect(sfxBus);o.start(tt);o.stop(tt+.1);});},
    cheer(v){if(!ac)return;const t=ac.currentTime,s=ac.createBufferSource();s.buffer=noiseBuf;s.loop=true;const a=ac.createBiquadFilter();a.type='bandpass';a.frequency.value=900;a.Q.value=.6;const g=ac.createGain();
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime((v||.12),t+.35);g.gain.setTargetAtTime(0,t+.8,.35);s.connect(a);a.connect(g);g.connect(sfxBus);s.start(t,Math.random());s.stop(t+2.6);},
    coin(){if(!ac)return;const t=ac.currentTime;[[2637,.06,.35],[3951,.035,.22],[5274,.02,.12]].forEach(([f,a,d],i)=>{[0,.075].forEach((dt,j)=>{const o=ac.createOscillator();o.type='sine';o.frequency.value=f*(j?1.012:1);const g=ac.createGain();
      g.gain.setValueAtTime(0,t+dt);g.gain.linearRampToValueAtTime(a*(j?.7:1),t+dt+.002);g.gain.exponentialRampToValueAtTime(.0001,t+dt+d);o.connect(g);g.connect(sfxBus);o.start(t+dt);o.stop(t+dt+d+.02);});});},
    clink(){if(!ac)return;const t=ac.currentTime;[[3100,.025,.25],[4650,.012,.15]].forEach(([f,a,d])=>{const o=ac.createOscillator();o.frequency.value=f;const g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(ambBus||sfxBus);o.start(t);o.stop(t+d+.02);});},
    chirp(){if(!ac)return;const t0=ac.currentTime,n=2+Math.floor(Math.random()*3),base=2800+Math.random()*900;
      for(let i=0;i<n;i++){const t=t0+i*(.09+Math.random()*.05),o=ac.createOscillator();o.type='sine';o.frequency.setValueAtTime(base,t);o.frequency.exponentialRampToValueAtTime(base*1.35,t+.05);o.frequency.exponentialRampToValueAtTime(base*.9,t+.08);
        const g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.018,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.09);o.connect(g);g.connect(ambBus||sfxBus);o.start(t);o.stop(t+.1);}},
    camelBell(){if(!ac)return;const t=ac.currentTime,f=degHz(9)*(Math.random()<.5?1:1.1225);for(let i=0;i<2+Math.floor(Math.random()*2);i++)bell(t+i*.42+Math.random()*.05,f,.022,ambBus||sfxBus);},
    rods(){if(!ac)return;const t=ac.currentTime;[0,.045].forEach((d,i)=>{const o=ac.createOscillator();o.type='triangle';o.frequency.setValueAtTime(1500-i*300,t+d);o.frequency.exponentialRampToValueAtTime(700,t+d+.04);
      const g=ac.createGain();g.gain.setValueAtTime(0,t+d);g.gain.linearRampToValueAtTime(.09,t+d+.002);g.gain.exponentialRampToValueAtTime(.0001,t+d+.07);o.connect(g);g.connect(sfxBus);o.start(t+d);o.stop(t+d+.08);});},
    whoosh(){if(!ac)return;const t=ac.currentTime,s=ac.createBufferSource();s.buffer=noiseBuf;const f=ac.createBiquadFilter();f.type='bandpass';f.Q.value=.8;f.frequency.setValueAtTime(280,t);f.frequency.exponentialRampToValueAtTime(2400,t+.55);
      const g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.07,t+.2);g.gain.exponentialRampToValueAtTime(.0001,t+.7);s.connect(f);f.connect(g);g.connect(sfxBus);s.start(t,Math.random());s.stop(t+.75);},
    vibrate(ms){try{navigator.vibrate&&navigator.vibrate(ms||20);}catch(e){}},
    paper(){if(!ac)return;const t=ac.currentTime,s=ac.createBufferSource();s.buffer=noiseBuf;const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=2200;f.Q.value=.6;const g=ac.createGain();
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.05);g.gain.exponentialRampToValueAtTime(.0001,t+.35);s.connect(f);f.connect(g);g.connect(sfxBus);s.start(t,Math.random());s.stop(t+.4);},
    /* 离线渲染自检：把一段配乐渲染成 PCM，给测试脚本看电平 */
    async renderOffline(seconds,m){
      const oc=new OfflineAudioContext(2,Math.round(44100*seconds),44100);const keep={ac,out,musicBus,sfxBus,verbIn,noiseBuf,xiaoWave,on,mood,nextBar,barIdx,secIdx,prog};
      build(oc);mood=m||'scroll';on=true;nextBar=.1;barIdx=0;secIdx=0;prog=PROGS[0];musicBus.gain.value=.8;
      while(nextBar<seconds)  {scheduleBar(nextBar);nextBar+=BAR;}
      const buf=await oc.startRendering();
      ({ac,out,musicBus,sfxBus,verbIn,noiseBuf,xiaoWave,on,mood,nextBar,barIdx,secIdx,prog}=keep);cache.clear();
      return buf;
    }
  };
  return api;
}
