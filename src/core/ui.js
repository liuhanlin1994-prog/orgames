/* 关卡通用界面：开场题签、读数、提示、按钮、评级卡、题跋（逐字书写） */
import {sealCanvas} from './ink.js';

export const $=id=>document.getElementById(id);
export function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
export const reduceMotion=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
/* 把一句话拆成逐字出现的 span；返回写完所需的毫秒 */
export function writeChars(node,text,t0,step){
  let t=t0;for(const ch of text){const s=el('span','wc',ch===' '?'&nbsp;':ch);s.style.animationDelay=(t/1000).toFixed(3)+'s';node.appendChild(s);t+=/[，。；、：！？]/.test(ch)?step*3:step;}
  return t;
}

export function createLevelUI(audio){
  let cur=null,onDone=null,introTimer=0,coloTimer=0;
  const ui={
    onClose:null,
    get stage(){return $('lvStage');},
    open(level,done){
      cur=level;onDone=done;$('lvName').textContent=level.title;$('lvStageName').textContent='';$('lvMeter').innerHTML='';
      $('lvStage').innerHTML='';ui.hideResult();ui.say('');ui.acts([]);$('level').hidden=false;
      audio.setMood('level');audio.ambience(level.ambience||'none');
      // 开场题签：地名、学问、一联诗
      const card=$('lvIntro');$('liName').textContent=level.title;$('liConcept').textContent=level.concept||'';
      const poem=$('liPoem');poem.innerHTML='';(level.poem||[]).forEach(l=>poem.appendChild(el('div','li-line',l)));$('liSrc').textContent=level.poemSrc?'—— '+level.poemSrc:'';
      card.hidden=false;card.classList.remove('out');void card.offsetWidth;card.classList.add('in');
      const go=()=>{clearTimeout(introTimer);if(card.hidden||card.classList.contains('out'))return;card.classList.add('out');setTimeout(()=>{card.hidden=true;card.classList.remove('in','out');},650);};
      card.onclick=go;introTimer=setTimeout(go,reduceMotion()?400:3000);
      requestAnimationFrame(()=>level.start(ui,audio));
    },
    close(){
      clearTimeout(introTimer);clearTimeout(coloTimer);$('lvIntro').hidden=true;
      if(cur&&cur.stop)cur.stop();cur=null;$('level').hidden=true;$('lvStage').innerHTML='';
      audio.setMood('scroll');audio.ambience('scroll');ui.onClose&&ui.onClose();
    },
    stageName(t){$('lvStageName').textContent=t;},
    meter(html){$('lvMeter').innerHTML=html;},
    say(html){$('say').innerHTML=html;},
    acts(list){const a=$('acts');a.innerHTML='';list.forEach(([t,fn,red,dis])=>{const b=el('button','btn'+(red?' red':''),t);if(dis)b.disabled=true;b.onclick=fn;a.appendChild(b);});},
    result(grade,nums,line,top){$('rGrade').textContent=grade;$('rNums').innerHTML=nums;$('rLine').innerHTML=line;$('result').classList.toggle('top',!!top);$('result').hidden=false;},
    hideResult(){$('result').hidden=true;},
    flash(text,x,y){const f=el('div','flash',text);f.style.left=x+'px';f.style.top=y+'px';ui.stage.appendChild(f);
      requestAnimationFrame(()=>{f.style.transform='translate(-50%,-170%)';f.style.opacity=0;});setTimeout(()=>f.remove(),1100);},
    /* 题跋：一字一字写出来，写完钤印 */
    colophon(){
      const c=cur.colophon,v=$('coloV'),box=$('colo');v.innerHTML='';box.classList.remove('stamped','written');
      const step=reduceMotion()?0:62;let t=200;
      const h=el('div','h');t=writeChars(h,c.head,t,step*1.4)+260;v.appendChild(h);
      c.lines.forEach(line=>{const p=el('p');t=writeChars(p,line,t,step)+160;v.appendChild(p);});
      if(c.note){const p=el('p','s');t=writeChars(p,c.note,t,step*.6);v.appendChild(p);}
      const cv=el('canvas','sealbig');cv.width=cv.height=144;v.appendChild(cv);sealCanvas(cv,c.seal);
      box.hidden=false;audio.paper();
      const stamp=()=>{clearTimeout(coloTimer);if(box.classList.contains('stamped'))return;box.classList.add('written','stamped');audio.thud();};
      coloTimer=setTimeout(stamp,t+300);
      $('coloSheet').onclick=e=>{if(e.target.id!=='coloBack')stamp();};
      $('coloBack').focus();
    },
    finish(){const id=cur.id;clearTimeout(coloTimer);$('colo').hidden=true;ui.close();onDone&&onDone(id);}
  };
  $('lvClose').onclick=()=>ui.close();
  $('coloBack').onclick=()=>ui.finish();
  addEventListener('resize',()=>{if(cur&&cur.resize&&!$('level').hidden)cur.resize();});
  return ui;
}
