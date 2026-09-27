/* 关卡通用界面：标题、航程/时间读数、提示、按钮、评级卡、题跋 */
import {sealCanvas} from './ink.js';

export const $=id=>document.getElementById(id);
export function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
export const reduceMotion=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createLevelUI(audio){
  let cur=null,onDone=null;
  const ui={
    get stage(){return $('lvStage');},
    open(level,done){
      cur=level;onDone=done;$('lvName').textContent=level.title;$('lvStageName').textContent='';$('lvMeter').innerHTML='';
      $('lvStage').innerHTML='';ui.hideResult();ui.say('');ui.acts([]);$('level').hidden=false;
      audio.setMood('level');audio.paper();
      requestAnimationFrame(()=>level.start(ui,audio));
    },
    close(){if(cur&&cur.stop)cur.stop();cur=null;$('level').hidden=true;$('lvStage').innerHTML='';audio.setMood('scroll');},
    stageName(t){$('lvStageName').textContent=t;},
    meter(html){$('lvMeter').innerHTML=html;},
    say(html){$('say').innerHTML=html;},
    acts(list){const a=$('acts');a.innerHTML='';list.forEach(([t,fn,red,dis])=>{const b=el('button','btn'+(red?' red':''),t);if(dis)b.disabled=true;b.onclick=fn;a.appendChild(b);});},
    result(grade,nums,line,top){$('rGrade').textContent=grade;$('rNums').innerHTML=nums;$('rLine').innerHTML=line;$('result').classList.toggle('top',!!top);$('result').hidden=false;},
    hideResult(){$('result').hidden=true;},
    flash(text,x,y){const f=el('div','flash',text);f.style.left=x+'px';f.style.top=y+'px';ui.stage.appendChild(f);
      requestAnimationFrame(()=>{f.style.transform='translate(-50%,-170%)';f.style.opacity=0;});setTimeout(()=>f.remove(),1100);},
    colophon(){
      const c=cur.colophon,v=$('coloV');v.innerHTML='';
      v.appendChild(el('div','h',c.head));c.lines.forEach(t=>v.appendChild(el('p','',t)));if(c.note)v.appendChild(el('p','s',c.note));
      const cv=el('canvas','sealbig');cv.width=cv.height=144;v.appendChild(cv);sealCanvas(cv,c.seal);
      const box=$('colo');box.hidden=false;box.classList.remove('stamped');
      setTimeout(()=>{box.classList.add('stamped');audio.thud();},500);$('coloBack').focus();
    },
    finish(){const id=cur.id;$('colo').hidden=true;ui.close();onDone&&onDone(id);}
  };
  $('lvClose').onclick=()=>ui.close();
  $('coloBack').onclick=()=>ui.finish();
  addEventListener('resize',()=>{if(cur&&cur.resize&&!$('level').hidden)cur.resize();});
  return ui;
}
