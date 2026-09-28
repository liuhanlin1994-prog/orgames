/* 推演图：坐标、刻度、玩家试出的朱点、理论墨线、阈值虚线。城门、客栈共用。 */
import {RNG,Noise1} from './rng.js';
import {INK,BRUSH_FONT,brush,fitCanvas} from './ink.js';

export function labChart(cv,W,H,o){
  const c=fitCanvas(cv,W,H);c.clearRect(0,0,W,H);
  const L=46,R=W-14,T=18,B=H-36,X=v=>L+(R-L)*(v-o.xmin)/(o.xmax-o.xmin),Y=v=>B-(B-T)*(Math.min(v,o.ymax)-o.ymin)/(o.ymax-o.ymin);
  c.font='12px "Noto Serif SC",serif';c.fillStyle=`rgba(${INK},.6)`;c.textAlign='right';c.textBaseline='middle';
  (o.yticks||[]).forEach(t=>{c.strokeStyle=`rgba(${INK},${t.v===o.ymin?.4:.08})`;c.lineWidth=1;c.beginPath();c.moveTo(L,Y(t.v));c.lineTo(R,Y(t.v));c.stroke();c.fillText(t.l,L-6,Y(t.v));});
  c.textAlign='center';c.textBaseline='top';(o.xticks||[]).forEach(t=>c.fillText(t.l,X(t.v),B+6));
  if(o.xlabel)c.fillText(o.xlabel,(L+R)/2,B+21);
  if(o.ylabel){c.save();c.translate(12,(T+B)/2);c.rotate(-Math.PI/2);c.fillText(o.ylabel,0,-6);c.restore();}
  if(o.threshold){c.save();c.setLineDash([5,5]);c.strokeStyle='rgba(179,38,30,.55)';c.beginPath();c.moveTo(L,Y(o.threshold.y));c.lineTo(R,Y(o.threshold.y));c.stroke();c.restore();
    c.fillStyle='rgba(179,38,30,.8)';c.font=`14px ${BRUSH_FONT}`;c.textAlign='left';c.textBaseline='bottom';c.fillText(o.threshold.l,L+6,Y(o.threshold.y)-3);c.font='12px "Noto Serif SC",serif';c.textAlign='center';}
  if(o.bars)o.bars.forEach(b=>{const w=(R-L)/(o.xmax-o.xmin+1)*.5;c.strokeStyle=`rgba(${INK},.55)`;c.lineWidth=1.2;c.setLineDash([3,3]);c.strokeRect(X(b.x)-w/2,Y(b.y),w,B-Y(b.y));c.setLineDash([]);});
  if(o.curve&&o.curve.length>1){const n=Noise1(RNG(2)),pts=o.curve.filter(p=>p[1]<=o.ymax*1.02).map(p=>[X(p[0]),Y(p[1])]);if(pts.length>1)brush(c,pts,{noise:n,w:2.6,a:.8,dry:.15,off:3,taper:.15});}
  if(o.peak){c.fillStyle=`rgba(${INK},.85)`;c.beginPath();c.arc(X(o.peak.x),Y(o.peak.y),4,0,7);c.fill();c.font=`15px ${BRUSH_FONT}`;c.textBaseline='bottom';c.fillText(o.peak.l,X(o.peak.x),Y(o.peak.y)-8);c.font='12px "Noto Serif SC",serif';}
  if(o.cursor!=null){c.strokeStyle='rgba(179,38,30,.35)';c.setLineDash([3,4]);c.beginPath();c.moveTo(X(o.cursor),T);c.lineTo(X(o.cursor),B);c.stroke();c.setLineDash([]);}
  (o.points||[]).forEach(p=>{const over=p.y>o.ymax;c.fillStyle='rgba(179,38,30,.92)';c.beginPath();c.arc(X(p.x),Y(p.y),5,0,7);c.fill();
    if(over){c.beginPath();c.moveTo(X(p.x)-5,T+6);c.lineTo(X(p.x)+5,T+6);c.lineTo(X(p.x),T-2);c.fill();}
    if(p.l){c.fillStyle=`rgba(${INK},.8)`;c.textBaseline='bottom';c.fillText(p.l,X(p.x),Y(p.y)-7);}});
  return{X,Y};
}
