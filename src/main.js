/* 入口：开卷（序章）、长卷、配乐、入画与出画、卷终 */
import {createAudio} from './core/audio.js';
import {createLevelUI,$,reduceMotion} from './core/ui.js';
import {playPrologue} from './core/prologue.js';
import {createScroll} from './scroll.js';
import {LEVELS} from './levels/registry.js';
import {tspLevel} from './levels/tsp.js';
import {teaLevel} from './levels/tea.js';
import {horseLevel} from './levels/horse.js';
import {raceLevel} from './levels/race.js';
import {gateLevel} from './levels/gate.js';
import {innLevel} from './levels/inn.js';
import {packLevel} from './levels/pack.js';
import {auctionLevel} from './levels/auction.js';

const MODULES={tsp:tspLevel,tea:teaLevel,horse:horseLevel,race:raceLevel,gate:gateLevel,inn:innLevel,pack:packLevel,auction:auctionLevel};
const audio=createAudio();
const ui=createLevelUI(audio);
const store={get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}}};
let busy=false;
const scroll=createScroll({levels:LEVELS,audio,onEnter:id=>{
  if(busy)return;busy=true;
  scroll.zoomIn(id).then(()=>{busy=false;ui.open(MODULES[id],done=>afterLevel(done));});
}});
ui.onClose=()=>scroll.zoomOut();

function afterLevel(id){
  scroll.complete(id);
  if(scroll.allPlayableDone()){
    $('finaleBtn').hidden=false;
    if(!store.get('qianli_finale_seen'))setTimeout(()=>playFinale(),4200);
  }
}
function playFinale(){store.set('qianli_finale_seen','1');scroll.finale(()=>{});}

function setSnd(v){const on=audio.music(v);$('sndBtn').setAttribute('aria-pressed',on);$('sndBtn').textContent=on?'琴声 · 开':'琴声 · 关';}
$('sndBtn').onclick=()=>setSnd();
$('previewBtn').onclick=()=>$('previewBtn').setAttribute('aria-pressed',scroll.togglePreview());
$('nextBtn').onclick=()=>{if(!scroll.next())$('hint').textContent=`已开放的关卡都参透了，其余${'〇一二三四五六七八九'[LEVELS.filter(l=>!l.play).length]||''}处正在绘制`;};
let intro=null;
$('prologueBtn').onclick=()=>{audio.unlock();intro=playPrologue({audio,onDone:()=>{}});};
$('finaleBtn').onclick=()=>playFinale();

function unroll(done){
  const cur=$('curtain'),veil=cur.querySelector('.veil'),rod=cur.querySelector('.roller');cur.style.display='block';
  const dur=reduceMotion()?10:2200,t0=performance.now(),W=innerWidth;
  const f=now=>{const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3),x=W*(1-e);veil.style.right=(W-x)+'px';rod.style.left=x+'px';
    if(k<1)requestAnimationFrame(f);else{cur.style.display='none';done&&done();}};
  requestAnimationFrame(f);
}
function openScroll(){
  audio.unlock();setSnd(true);
  const hash=location.hash.replace('#','');
  $('cover').classList.add('opening');setTimeout(()=>$('cover').remove(),500);
  if(hash==='finale'){unroll(()=>playFinale());return;}
  if(hash==='intro'||!store.get('qianli_prologue_seen')){store.set('qianli_prologue_seen','1');intro=playPrologue({audio,onDone:()=>{}});return;}
  unroll();
}
$('openBtn').onclick=openScroll;

const fontsReady=document.fonts&&document.fonts.ready?Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2500))]):Promise.resolve();
fontsReady.then(()=>{scroll.layout();if(scroll.allPlayableDone())$('finaleBtn').hidden=false;});
window.__qj={audio,scroll,ui,MODULES,playFinale,get intro(){return intro;}};   // 调试与自动化测试用
