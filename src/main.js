/* 入口：开卷、长卷、配乐、关卡 */
import {createAudio} from './core/audio.js';
import {createLevelUI,$,reduceMotion} from './core/ui.js';
import {createScroll} from './scroll.js';
import {LEVELS} from './levels/registry.js';
import {tspLevel} from './levels/tsp.js';
import {teaLevel} from './levels/tea.js';
import {horseLevel} from './levels/horse.js';

const MODULES={tsp:tspLevel,tea:teaLevel,horse:horseLevel};
const audio=createAudio();
const ui=createLevelUI(audio);
const scroll=createScroll({levels:LEVELS,audio,onEnter:id=>ui.open(MODULES[id],done=>scroll.complete(done))});

function setSnd(v){const on=audio.music(v);$('sndBtn').setAttribute('aria-pressed',on);$('sndBtn').textContent=on?'琴声 · 开':'琴声 · 关';}
$('sndBtn').onclick=()=>setSnd();
$('previewBtn').onclick=()=>$('previewBtn').setAttribute('aria-pressed',scroll.togglePreview());
$('nextBtn').onclick=()=>{if(!scroll.next())$('hint').textContent='三处已开放的关卡都参透了，其余八处正在绘制';};

function openScroll(){
  audio.unlock();setSnd(true);
  $('cover').classList.add('opening');
  const cur=$('curtain'),veil=cur.querySelector('.veil'),rod=cur.querySelector('.roller');cur.style.display='block';
  const dur=reduceMotion()?10:2200,t0=performance.now(),W=innerWidth;
  const f=now=>{const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3),x=W*(1-e);veil.style.right=(W-x)+'px';rod.style.left=x+'px';
    if(k<1)requestAnimationFrame(f);else{cur.style.display='none';$('cover').remove();}};
  requestAnimationFrame(f);
}
$('openBtn').onclick=openScroll;

const fontsReady=document.fonts&&document.fonts.ready?Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2500))]):Promise.resolve();
fontsReady.then(()=>scroll.layout());
window.__qj={audio,scroll,ui,MODULES};   // 调试与自动化测试用
