/* 笔墨引擎：纸、笔、山、点景、印。所有画面都由这里落笔。 */
import {RNG, Noise1, fbm} from './rng.js';

export const INK='27,27,29', PAPER='242,233,214';
export const BRUSH_FONT="'QJ Brush','Ma Shan Zheng','STKaiti','KaiTi',serif";
if(typeof CanvasRenderingContext2D!=='undefined'&&!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h){this.rect(x,y,w,h);};
}

/* ---------- 纸：先铺纯色，最后整体叠纸纹（multiply），遮挡与云气才不会"抹平"纸纹 ---------- */
let GRAIN=null;
function grainPattern(ctx){
  if(!GRAIN){
    const t=document.createElement('canvas');t.width=t.height=384;const c=t.getContext('2d'),r=RNG(11);
    c.fillStyle='#fff';c.fillRect(0,0,384,384);
    const id=c.getImageData(0,0,384,384),d=id.data;
    for(let i=0;i<d.length;i+=4){const v=255-Math.pow(r(),2.2)*16;d[i]=v;d[i+1]=v;d[i+2]=v-1;}
    c.putImageData(id,0,0);
    for(let i=0;i<170;i++){c.strokeStyle=`rgba(120,95,60,${.05+r()*.06})`;c.lineWidth=.4+r()*.9;c.beginPath();let x=r()*384,y=r()*384;c.moveTo(x,y);for(let k=0;k<4;k++){x+=(r()-.5)*36;y+=(r()-.5)*36;c.lineTo(x,y);}c.stroke();}
    GRAIN=t;
  }
  return ctx.createPattern(GRAIN,'repeat');
}
export function paperBase(ctx,x,y,w,h){ctx.fillStyle='#f2e9d6';ctx.fillRect(x,y,w,h);}
export function paperGrain(ctx,x,y,w,h,edge){
  ctx.save();ctx.globalCompositeOperation='multiply';ctx.fillStyle=grainPattern(ctx);ctx.fillRect(x,y,w,h);
  if(edge!==false){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'rgba(200,175,130,.35)');g.addColorStop(.12,'rgba(255,255,255,0)');g.addColorStop(.88,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(200,175,130,.4)');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);}
  ctx.restore();
}

/* ---------- 笔：湿笔变宽多边形 + 干笔多毫断续 ---------- */
export function brush(ctx,pts,o){
  if(pts.length<2)return;
  const n=o.noise,w=o.w||2,B=o.bristles||3,dry=o.dry||0,col=o.col||INK,a=o.a==null?.8:o.a,off=o.off||0;
  if(o.wet!==false){
    const L=[],R=[];
    for(let i=0;i<pts.length;i++){
      const p=pts[i],q=pts[Math.min(i+1,pts.length-1)],pr=pts[Math.max(i-1,0)];
      let dx=q[0]-pr[0],dy=q[1]-pr[1];const m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;
      const t=i/(pts.length-1);
      const taper=o.flat?1:Math.pow(Math.sin(Math.PI*Math.min(1,t*1.12+.03)),o.taper||.55);
      const ww=w*taper*(.65+.7*n(i*.13+off));
      L.push([p[0]-dy*ww/2,p[1]+dx*ww/2]);R.push([p[0]+dy*ww/2,p[1]-dx*ww/2]);
    }
    ctx.beginPath();ctx.moveTo(L[0][0],L[0][1]);for(const p of L)ctx.lineTo(p[0],p[1]);for(let i=R.length-1;i>=0;i--)ctx.lineTo(R[i][0],R[i][1]);ctx.closePath();
    ctx.fillStyle=`rgba(${col},${a*(dry?.55:1)})`;ctx.fill();
  }
  if(dry){
    ctx.lineCap='round';
    for(let b=0;b<B;b++){
      const o2=(b/(B-1||1)-.5)*w*.9;ctx.lineWidth=Math.max(.4,w/B*1.1);ctx.strokeStyle=`rgba(${col},${a*.7})`;
      ctx.beginPath();let pen=false;
      for(let i=0;i<pts.length-1;i++){
        const p=pts[i],q=pts[i+1],dx=q[0]-p[0],dy=q[1]-p[1],m=Math.hypot(dx,dy)||1;
        const x=p[0]-dy/m*o2,y=p[1]+dx/m*o2;
        if(n(i*.21+b*17.3+off)>dry){if(!pen){ctx.moveTo(x,y);pen=true;}else ctx.lineTo(x,y);}else pen=false;
      }
      ctx.stroke();
    }
  }
}
/* 沿二次曲线取点 */
export function curvePts(p,c,q,step){
  const L=Math.hypot(q[0]-p[0],q[1]-p[1]),n=Math.max(6,Math.round(L/(step||5))),out=[];
  for(let i=0;i<=n;i++){const t=i/n;out.push([(1-t)*(1-t)*p[0]+2*(1-t)*t*c[0]+t*t*q[0],(1-t)*(1-t)*p[1]+2*(1-t)*t*c[1]+t*t*q[1]]);}
  return out;
}

/* ---------- 山：单峰成形，前峰压后峰，山脚化入云气 ---------- */
function peakPts(n,p,base){
  const pts=[],x0=p.x-p.wl*1.08,x1=p.x+p.wr*1.08,rock=p.rock==null?1:p.rock,rd=p.round||.003,sr=Math.sqrt(rd);
  const step=Math.max(1.2,Math.min(2.5,(p.wl+p.wr)/60));
  for(let x=x0;x<=x1;x+=step){
    const w=x<p.x?p.wl:p.wr,d=Math.abs(x-p.x)/w,dd=Math.sqrt(d*d+rd)-sr;
    let v=p.h*Math.pow(Math.max(0,1-dd),p.k||1.7);
    const env=Math.max(0,1-d);
    v+=p.h*.10*rock*(fbm(n,x*.018+p.x,4)-.5)*env*2;
    v+=p.h*.05*rock*(1-Math.abs(n(x*.06+p.x)*2-1)-.5)*env*2;
    v+=(n(x*.25+p.x)-.5)*1.4*env;
    pts.push([x,Math.min(base+1,base-v)]);
  }
  pts.step=step;
  return pts;
}
export function drawPeak(ctx,p,cfg,colored){
  const r=RNG(p.seed),n=Noise1(r);
  const base=cfg.base,a=cfg.a,ink=cfg.ink||INK;
  const pts=peakPts(n,p,base);let top=base;for(const q of pts)if(q[1]<top)top=q[1];
  const bottom=base+1;
  const path=new Path2D();path.moveTo(pts[0][0],bottom);for(const q of pts)path.lineTo(q[0],q[1]);path.lineTo(pts[pts.length-1][0],bottom);path.closePath();
  const oc=cfg.occ==null?.92:cfg.occ;
  let g=ctx.createLinearGradient(0,top,0,bottom);
  g.addColorStop(0,`rgba(${PAPER},${oc})`);g.addColorStop(.6,`rgba(${PAPER},${oc*.75})`);g.addColorStop(.9,`rgba(${PAPER},${oc*.25})`);g.addColorStop(1,`rgba(${PAPER},0)`);
  ctx.fillStyle=g;ctx.fill(path);
  g=ctx.createLinearGradient(0,top,0,bottom);
  g.addColorStop(0,`rgba(${ink},${a*.52})`);g.addColorStop(.4,`rgba(${ink},${a*.3})`);g.addColorStop(.8,`rgba(${ink},${a*.1})`);g.addColorStop(1,`rgba(${ink},0)`);
  ctx.fillStyle=g;ctx.fill(path);
  if(colored){
    ctx.save();ctx.globalCompositeOperation='multiply';
    g=ctx.createLinearGradient(0,top,0,bottom);const c=cfg.c==null?1:cfg.c;
    g.addColorStop(0,`rgba(20,84,112,${.95*c})`);g.addColorStop(.3,`rgba(34,126,126,${.9*c})`);g.addColorStop(.62,`rgba(128,170,108,${.66*c})`);g.addColorStop(.88,`rgba(206,168,108,${.3*c})`);g.addColorStop(1,'rgba(206,168,108,0)');
    ctx.fillStyle=g;ctx.fill(path);ctx.restore();
  }
  const sc=Math.min(1,(p.wl+p.wr)/180);   // 小山少皴
  ctx.save();ctx.clip(path);
  const ridge=new Path2D();pts.forEach((q,i)=>i?ridge.lineTo(q[0],q[1]+4*sc):ridge.moveTo(q[0],q[1]+4*sc));
  ctx.lineJoin='round';
  for(const [lw,al] of [[30,.045],[20,.055],[12,.065],[6,.08],[2.5,.1]]){ctx.lineWidth=lw*Math.max(.35,sc);ctx.strokeStyle=`rgba(${ink},${a*al*1.6})`;ctx.stroke(ridge);}
  const folds=Math.round((2+Math.floor(r()*3))*Math.max(.4,sc));
  for(let f=0;f<folds;f++){
    const side=r()<.5?-1:1,t0=.15+r()*.5,w=side<0?p.wl:p.wr;
    let x=p.x+side*w*t0*.6;const idx=Math.min(pts.length-1,Math.max(0,Math.round((x-pts[0][0])/pts.step)));
    let y=pts[idx][1]+3*sc;const seg=[[x,y]],L=(base-y)*(.5+r()*.4);
    for(let k=1;k<18;k++){x+=side*(1.2+r()*2.5)*(L/140);y+=L/18;seg.push([x+(r()-.5)*1.5*sc,y]);}
    brush(ctx,seg,{noise:n,w:1.3*Math.max(.6,sc),a:a*.45,dry:.4,bristles:3,off:r()*99,wet:false});
  }
  const cnt=Math.round((cfg.cun==null?1:cfg.cun)*(p.wl+p.wr)*p.h/170);
  ctx.lineCap='round';
  for(let i=0;i<cnt;i++){
    const k=1+Math.floor(r()*(pts.length-2)),q=pts[k];if(q[1]>base-3)continue;
    const span=base-q[1],depth=Math.pow(r(),1.6)*span*.85,x=q[0]+(r()-.5)*5*sc,y=q[1]+depth+2*sc;
    const slope=(pts[k+1][1]-pts[k-1][1])/(2*pts.step),ang=Math.atan2(1,slope*.9)+(r()-.5)*.45,L=(3+r()*14*(1-depth/span*.7))*Math.max(.5,sc);
    ctx.strokeStyle=`rgba(${ink},${(.05+r()*.15)*Math.min(1,a*1.5)})`;ctx.lineWidth=.45+r()*1.05;
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+Math.cos(ang)*L*.5+(r()-.5)*2.5,y+Math.sin(ang)*L*.5,x+Math.cos(ang)*L,y+Math.sin(ang)*L);ctx.stroke();
  }
  ctx.restore();
  let seg=[];const flush=()=>{if(seg.length>4)brush(ctx,seg,{noise:n,w:cfg.lw||2.2,a:Math.min(.95,a*1.2),dry:.28,bristles:3,off:r()*50});seg=[];};
  for(const q of pts){if(q[1]<base-4*sc)seg.push([q[0],q[1]+.4]);else flush();}flush();
  for(let i=0;i<pts.length;i+=2){const q=pts[i];if(q[1]>base-8*sc)continue;
    if(n(i*.05+p.x)>.64&&r()<.45){const c=1+Math.floor(r()*3);
      for(let j=0;j<c;j++){ctx.fillStyle=`rgba(${ink},${Math.min(1,a*1.3)*(.45+r()*.55)})`;ctx.beginPath();ctx.ellipse(q[0]+(r()-.5)*7*sc,q[1]+r()*3-1,(1+r()*1.7)*(cfg.dot||1),(.7+r()*1.1)*(cfg.dot||1),r()*3,0,7);ctx.fill();}}}
  if(cfg.trees){for(let i=0;i<pts.length;i++){const q=pts[i];if(q[1]>base-10)continue;if(n(i*.03+p.x*.1)>.62&&r()<.16)tree(ctx,r,q[0],q[1]+2+r()*5,(6+r()*9)*cfg.trees,a);}}
}
export function massifDraw(ctx,cfg,colored){cfg.peaks.slice().sort((a,b)=>b.h-a.h).forEach(p=>drawPeak(ctx,p,cfg,colored));}

/* ---------- 点景 ---------- */
export function tree(ctx,r,x,y,s,a){
  a=a==null?.9:a;ctx.strokeStyle=`rgba(${INK},${a})`;ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(r()-.5)*2,y-s);ctx.stroke();
  const type=r();
  for(let k=0;k<4;k++){const yy=y-s*(.35+k*.2),ww=s*(.55-k*.1);
    if(type<.5){ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-ww,yy+1);ctx.quadraticCurveTo(x,yy-2,x+ww,yy+1);ctx.stroke();}
    else for(let j=0;j<5;j++){ctx.fillStyle=`rgba(${INK},${a*(.4+r()*.6)})`;ctx.beginPath();ctx.ellipse(x+(r()-.5)*ww*2,yy+(r()-.5)*3,1.2+r(),.8+r()*.6,0,0,7);ctx.fill();}}
}
export function willow(ctx,r,x,y,s){
  ctx.strokeStyle=`rgba(${INK},.85)`;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+s*.1,y-s*.5,x-s*.05,y-s);ctx.stroke();
  for(let i=0;i<14;i++){const sx=x-s*.05+(r()-.5)*s*.9,sy=y-s*(.75+r()*.35),L=s*(.4+r()*.5);
    ctx.strokeStyle=`rgba(${INK},${.25+r()*.4})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(sx+(r()-.5)*s*.3,sy+L*.4,sx+(r()-.5)*s*.2,sy+L);ctx.stroke();}
}
export function roof(ctx,x,y,w,h,a){
  ctx.fillStyle=`rgba(${INK},${a})`;ctx.beginPath();
  ctx.moveTo(x-w*.62,y+1);ctx.quadraticCurveTo(x-w*.44,y-h*.15,x-w*.36,y-h);ctx.lineTo(x+w*.36,y-h);ctx.quadraticCurveTo(x+w*.44,y-h*.15,x+w*.62,y+1);ctx.quadraticCurveTo(x,y-h*.18,x-w*.62,y+1);ctx.fill();
}
export function house(ctx,x,y,w,a){
  a=a==null?.9:a;const h=w*.42;
  ctx.fillStyle=`rgba(${PAPER},.96)`;ctx.fillRect(x-w/2,y-h,w,h);
  ctx.strokeStyle=`rgba(${INK},${a*.6})`;ctx.lineWidth=.8;ctx.strokeRect(x-w/2,y-h,w,h);
  ctx.fillStyle=`rgba(${INK},${a*.55})`;ctx.fillRect(x-w*.08,y-h*.6,w*.16,h*.6);
  roof(ctx,x,y-h,w*1.05,w*.28,a*.9);
}
export function pavilion(ctx,x,y,s){
  ctx.strokeStyle=`rgba(${INK},.9)`;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(x-s*.55,y);ctx.lineTo(x-s*.55,y-s*.7);ctx.moveTo(x+s*.55,y);ctx.lineTo(x+s*.55,y-s*.7);ctx.stroke();
  ctx.fillStyle=`rgba(${INK},.88)`;ctx.beginPath();ctx.moveTo(x-s*1.05,y-s*.62);ctx.quadraticCurveTo(x-s*.5,y-s*.72,x,y-s*1.25);ctx.quadraticCurveTo(x+s*.5,y-s*.72,x+s*1.05,y-s*.62);ctx.quadraticCurveTo(x,y-s*.8,x-s*1.05,y-s*.62);ctx.fill();
  ctx.beginPath();ctx.moveTo(x-s*.8,y);ctx.lineTo(x+s*.8,y);ctx.stroke();
}
export function banner(ctx,x,y,s,ch){
  ctx.strokeStyle=`rgba(${INK},.9)`;ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-s*2.4);ctx.stroke();
  ctx.fillStyle=`rgba(${PAPER},.97)`;ctx.strokeStyle=`rgba(${INK},.7)`;ctx.lineWidth=.8;
  ctx.beginPath();ctx.rect(x,y-s*2.3,s*.8,s*1.3);ctx.fill();ctx.stroke();
  ctx.fillStyle=`rgba(${INK},.9)`;ctx.font=`${s*.62}px 'QJ Brush','Ma Shan Zheng',serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ch,x+s*.4,y-s*1.65);
}
export function wall(ctx,x0,x1,y,h){
  ctx.fillStyle=`rgba(${PAPER},.96)`;ctx.fillRect(x0,y-h,x1-x0,h);
  const g=ctx.createLinearGradient(0,y-h,0,y);g.addColorStop(0,`rgba(${INK},.22)`);g.addColorStop(1,`rgba(${INK},.04)`);ctx.fillStyle=g;ctx.fillRect(x0,y-h,x1-x0,h);
  ctx.strokeStyle=`rgba(${INK},.75)`;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x0,y-h);ctx.lineTo(x1,y-h);ctx.stroke();
  ctx.fillStyle=`rgba(${INK},.7)`;for(let x=x0+2;x<x1-4;x+=9)ctx.fillRect(x,y-h-4,5,4);
  ctx.strokeStyle=`rgba(${INK},.1)`;ctx.lineWidth=.6;for(let yy=y-h+7;yy<y;yy+=7){ctx.beginPath();ctx.moveTo(x0,yy);ctx.lineTo(x1,yy);ctx.stroke();}
}
export function gate(ctx,x,y,s){
  const w=s*1.6,h=s*.9;
  ctx.fillStyle=`rgba(${PAPER},.98)`;ctx.fillRect(x-w/2,y-h,w,h);
  ctx.strokeStyle=`rgba(${INK},.8)`;ctx.lineWidth=1.2;ctx.strokeRect(x-w/2,y-h,w,h);
  ctx.fillStyle=`rgba(${INK},.85)`;ctx.beginPath();ctx.moveTo(x-s*.2,y);ctx.lineTo(x-s*.2,y-h*.45);ctx.arc(x,y-h*.45,s*.2,Math.PI,0);ctx.lineTo(x+s*.2,y);ctx.fill();
  house(ctx,x,y-h,s*1.15,.95);roof(ctx,x,y-h-s*.5-s*.28,s*.95,s*.3,.9);
}
export function bridge(ctx,x,y,w){
  ctx.strokeStyle=`rgba(${INK},.85)`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.quadraticCurveTo(x,y-w*.32,x+w/2,y);ctx.stroke();
  ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-w/2,y-4);ctx.quadraticCurveTo(x,y-w*.32-5,x+w/2,y-4);ctx.stroke();
  for(let i=1;i<8;i++){const t=i/8,bx=x-w/2+w*t,by=y-4-(w*.32+1)*4*t*(1-t);ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx,by-6);ctx.stroke();}
}
export function pagoda(ctx,x,y,s,tiers){
  let yy=y,ww=s;
  for(let i=0;i<tiers;i++){const h=s*.5;ctx.fillStyle=`rgba(${PAPER},.97)`;ctx.fillRect(x-ww*.28,yy-h,ww*.56,h);ctx.strokeStyle=`rgba(${INK},.7)`;ctx.lineWidth=.8;ctx.strokeRect(x-ww*.28,yy-h,ww*.56,h);roof(ctx,x,yy-h,ww,s*.22,.9);yy-=h+s*.18;ww*=.86;}
  ctx.strokeStyle=`rgba(${INK},.9)`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,yy+s*.1);ctx.lineTo(x,yy-s*.4);ctx.stroke();
}
export function boat(ctx,x,y,s,sail){
  ctx.fillStyle=`rgba(${INK},.88)`;ctx.beginPath();ctx.moveTo(x-s,y);ctx.quadraticCurveTo(x,y+s*.35,x+s,y-s*.08);ctx.quadraticCurveTo(x,y+s*.12,x-s,y);ctx.fill();
  if(sail){ctx.strokeStyle=`rgba(${INK},.85)`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-s*1.1);ctx.stroke();
    ctx.fillStyle=`rgba(${INK},.55)`;ctx.beginPath();ctx.moveTo(x+1,y-s*1.05);ctx.quadraticCurveTo(x+s*.55,y-s*.7,x+s*.5,y-s*.18);ctx.lineTo(x+1,y-s*.2);ctx.fill();
    ctx.strokeStyle=`rgba(${PAPER},.6)`;ctx.lineWidth=.6;for(let k=1;k<4;k++){ctx.beginPath();ctx.moveTo(x+1,y-s*(.2+k*.22));ctx.lineTo(x+s*.52,y-s*(.2+k*.2));ctx.stroke();}}
  else{ctx.beginPath();ctx.ellipse(x+s*.1,y-s*.18,s*.14,s*.1,0,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(x+s*.02,y-s*.28);ctx.lineTo(x+s*.18,y-s*.28);ctx.lineTo(x+s*.1,y-s*.4);ctx.fill();}
  ctx.strokeStyle=`rgba(${INK},.35)`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x-s*1.1,y+s*.12);ctx.lineTo(x-s*1.8,y+s*.2);ctx.moveTo(x+s*.4,y+s*.16);ctx.lineTo(x+s*1.3,y+s*.24);ctx.stroke();
}
/* 长卷上的小马（几笔） */
export function horseGlyph(ctx,x,y,s,r){
  ctx.fillStyle=`rgba(${INK},.85)`;ctx.strokeStyle=`rgba(${INK},.85)`;ctx.lineCap='round';
  ctx.beginPath();ctx.ellipse(x,y-s*.55,s*.5,s*.2,-.05,0,7);ctx.fill();
  ctx.lineWidth=s*.12;ctx.beginPath();ctx.moveTo(x+s*.38,y-s*.62);ctx.lineTo(x+s*.62,y-s*.95);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x+s*.7,y-s*.95,s*.14,s*.08,.5,0,7);ctx.fill();
  ctx.lineWidth=s*.07;const ph=r()*6;
  [[-.35,.3],[-.22,-.2],[.28,.25],[.4,-.2]].forEach(([dx,sw],i)=>{ctx.beginPath();ctx.moveTo(x+s*dx,y-s*.45);ctx.lineTo(x+s*(dx+sw*.4*Math.sin(ph+i)),y);ctx.stroke();});
  ctx.lineWidth=s*.06;ctx.beginPath();ctx.moveTo(x-s*.48,y-s*.6);ctx.quadraticCurveTo(x-s*.7,y-s*.5,x-s*.72,y-s*.25);ctx.stroke();
}
export function person(ctx,x,y,s,pack){
  ctx.fillStyle=`rgba(${INK},.9)`;ctx.beginPath();ctx.arc(x,y-s*.9,s*.12,0,7);ctx.fill();
  ctx.beginPath();ctx.moveTo(x-s*.2,y-s*.82);ctx.lineTo(x+s*.2,y-s*.82);ctx.lineTo(x,y-s*1.02);ctx.fill();
  ctx.beginPath();ctx.moveTo(x-s*.15,y-s*.75);ctx.lineTo(x+s*.15,y-s*.75);ctx.lineTo(x+s*.22,y);ctx.lineTo(x-s*.22,y);ctx.fill();
  if(pack){ctx.fillStyle=`rgba(${PAPER},.95)`;ctx.strokeStyle=`rgba(${INK},.8)`;ctx.lineWidth=.8;ctx.fillRect(x-s*.5,y-s*.8,s*.3,s*.4);ctx.strokeRect(x-s*.5,y-s*.8,s*.3,s*.4);}
}
export function tent(ctx,x,y,s){
  ctx.fillStyle=`rgba(${PAPER},.97)`;ctx.strokeStyle=`rgba(${INK},.85)`;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(x-s,y);ctx.lineTo(x-s*.8,y-s*.6);ctx.quadraticCurveTo(x,y-s*1.25,x+s*.8,y-s*.6);ctx.lineTo(x+s,y);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=`rgba(${INK},.8)`;ctx.beginPath();ctx.moveTo(x-s*.14,y);ctx.lineTo(x,y-s*.5);ctx.lineTo(x+s*.14,y);ctx.fill();
  ctx.beginPath();ctx.moveTo(x,y-s*.95);ctx.lineTo(x,y-s*1.7);ctx.stroke();
  ctx.fillStyle='rgba(179,38,30,.85)';ctx.beginPath();ctx.moveTo(x,y-s*1.7);ctx.quadraticCurveTo(x+s*.4,y-s*1.62,x+s*.6,y-s*1.5);ctx.lineTo(x,y-s*1.38);ctx.fill();
}
export function fields(ctx,r,x,y,w,h){
  ctx.lineCap='round';
  for(let i=0;i<9;i++){const yy=y+i*h/9,ww=w*(.55+i*.05);ctx.strokeStyle=`rgba(${INK},${.25+r()*.2})`;ctx.lineWidth=.9;
    ctx.beginPath();ctx.moveTo(x-ww/2,yy+Math.sin(i)*2);ctx.bezierCurveTo(x-ww/5,yy-5,x+ww/5,yy+5,x+ww/2,yy+Math.cos(i)*2);ctx.stroke();}
}
export function waterfall(ctx,r,x,y0,y1,w){
  ctx.fillStyle=`rgba(${PAPER},.97)`;ctx.fillRect(x-w/2,y0,w,y1-y0);
  for(let i=0;i<14;i++){const xx=x-w/2+r()*w;ctx.strokeStyle=`rgba(${INK},${.08+r()*.14})`;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(xx,y0+r()*20);ctx.lineTo(xx+(r()-.5)*2,y1-r()*20);ctx.stroke();}
  const g=ctx.createRadialGradient(x,y1,2,x,y1,w*1.6);g.addColorStop(0,`rgba(${PAPER},1)`);g.addColorStop(1,`rgba(${PAPER},0)`);ctx.fillStyle=g;ctx.fillRect(x-w*2,y1-w*1.6,w*4,w*3.2);
}
export function waterWash(ctx,x0,x1,y0,y1){
  const r=RNG(Math.round(x0*7+y0));
  for(let x=x0+60;x<x1-60;x+=90){const cx=x+(r()-.5)*60,cy=y0+(y1-y0)*(.45+r()*.4),rx=120+r()*120,ry=(y1-y0)*(.35+r()*.25);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,rx);g.addColorStop(0,'rgba(58,128,138,.10)');g.addColorStop(1,'rgba(58,128,138,0)');
    ctx.save();ctx.translate(cx,cy);ctx.scale(1,ry/rx);ctx.translate(-cx,-cy);ctx.fillStyle=g;ctx.fillRect(cx-rx,cy-rx,rx*2,rx*2);ctx.restore();}
}
export function waves(ctx,r,x0,x1,y0,y1,n,colored){
  if(colored)waterWash(ctx,x0,x1,y0,y1);
  for(let i=0;i<n;i++){const y=y0+Math.pow(r(),.75)*(y1-y0),x=x0+r()*(x1-x0),L=18+r()*100*(y-y0)/(y1-y0+1)+16;
    ctx.strokeStyle=`rgba(${INK},${.05+r()*.12})`;ctx.lineWidth=.6+r()*.8;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+L*.3,y-1.5,x+L*.6,y+1.5,x+L,y);ctx.stroke();}
}
export function mistBand(ctx,x0,x1,y,h,a,seed){
  const r=RNG(seed);
  for(let x=x0;x<x1;x+=260){const cx=x+r()*200,rx=240+r()*260,g=ctx.createRadialGradient(cx,y,0,cx,y,rx);
    g.addColorStop(0,`rgba(${PAPER},${a})`);g.addColorStop(1,`rgba(${PAPER},0)`);
    ctx.save();ctx.translate(cx,y);ctx.scale(1,h/rx);ctx.translate(-cx,-y);ctx.fillStyle=g;ctx.fillRect(cx-rx,y-rx,rx*2,rx*2);ctx.restore();}
}

/* ---------- 茶具（茶寮） ---------- */
function inkLine(ctx,w,a){ctx.strokeStyle=`rgba(${INK},${a==null?.85:a})`;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';}
function wash(ctx,a){ctx.fillStyle=`rgba(${INK},${a})`;}
export function stove(ctx,x,y,s,lit){
  // 风炉：陶胎上窄下宽，拱形火门
  ctx.beginPath();ctx.moveTo(x-s*.36,y);ctx.lineTo(x-s*.28,y-s*.62);ctx.quadraticCurveTo(x,y-s*.7,x+s*.28,y-s*.62);ctx.lineTo(x+s*.36,y);ctx.closePath();
  const g=ctx.createLinearGradient(x-s*.4,0,x+s*.4,0);g.addColorStop(0,`rgba(${INK},.32)`);g.addColorStop(.5,`rgba(${INK},.12)`);g.addColorStop(1,`rgba(${INK},.36)`);
  ctx.fillStyle=`rgba(${PAPER},.95)`;ctx.fill();ctx.fillStyle=g;ctx.fill();inkLine(ctx,1.4*s/60);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y-s*.64,s*.29,s*.05,0,0,7);inkLine(ctx,1.2*s/60,.8);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-s*.12,y-s*.02);ctx.lineTo(x-s*.12,y-s*.2);ctx.arc(x,y-s*.2,s*.12,Math.PI,0);ctx.lineTo(x+s*.12,y-s*.02);ctx.closePath();
  wash(ctx,lit?.2:.75);ctx.fill();
  if(lit){const fg=ctx.createRadialGradient(x,y-s*.1,1,x,y-s*.1,s*.2);fg.addColorStop(0,'rgba(214,92,40,.95)');fg.addColorStop(.6,'rgba(179,38,30,.55)');fg.addColorStop(1,'rgba(179,38,30,0)');ctx.fillStyle=fg;ctx.fill();}
}
export function kettle(ctx,x,y,s){
  ctx.beginPath();ctx.ellipse(x,y-s*.22,s*.3,s*.22,0,0,7);ctx.fillStyle=`rgba(${PAPER},.97)`;ctx.fill();
  const g=ctx.createRadialGradient(x-s*.1,y-s*.3,s*.03,x,y-s*.2,s*.34);g.addColorStop(0,`rgba(${INK},.05)`);g.addColorStop(1,`rgba(${INK},.45)`);ctx.fillStyle=g;ctx.fill();
  inkLine(ctx,1.5*s/60);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+s*.26,y-s*.3);ctx.quadraticCurveTo(x+s*.44,y-s*.34,x+s*.5,y-s*.52);inkLine(ctx,3*s/60,.8);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-s*.2,y-s*.38);ctx.quadraticCurveTo(x,y-s*.78,x+s*.2,y-s*.38);inkLine(ctx,1.6*s/60,.85);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y-s*.44,s*.1,s*.03,0,0,7);inkLine(ctx,1.2*s/60,.8);ctx.stroke();
}
export function teapot(ctx,x,y,s){
  ctx.beginPath();ctx.ellipse(x,y-s*.16,s*.22,s*.16,0,0,7);ctx.fillStyle=`rgba(${PAPER},.97)`;ctx.fill();wash(ctx,.3);ctx.fill();inkLine(ctx,1.4*s/60);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-s*.2,y-s*.18);ctx.quadraticCurveTo(x-s*.36,y-s*.2,x-s*.4,y-s*.34);inkLine(ctx,2.6*s/60,.85);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x+s*.26,y-s*.18,s*.07,s*.09,0,0,7);inkLine(ctx,1.8*s/60,.85);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y-s*.31,s*.08,s*.025,0,0,7);ctx.stroke();ctx.beginPath();ctx.arc(x,y-s*.35,s*.025,0,7);wash(ctx,.8);ctx.fill();
}
export function cup(ctx,x,y,s){
  ctx.beginPath();ctx.moveTo(x-s*.1,y-s*.12);ctx.quadraticCurveTo(x-s*.09,y,x,y);ctx.quadraticCurveTo(x+s*.09,y,x+s*.1,y-s*.12);ctx.closePath();
  ctx.fillStyle=`rgba(${PAPER},.97)`;ctx.fill();wash(ctx,.18);ctx.fill();inkLine(ctx,1.2*s/60);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y-s*.12,s*.1,s*.022,0,0,7);ctx.stroke();
}
export function caddy(ctx,x,y,s){
  ctx.beginPath();ctx.rect(x-s*.11,y-s*.3,s*.22,s*.3);ctx.fillStyle=`rgba(${PAPER},.97)`;ctx.fill();
  const g=ctx.createLinearGradient(x-s*.11,0,x+s*.11,0);g.addColorStop(0,`rgba(${INK},.35)`);g.addColorStop(.5,`rgba(${INK},.1)`);g.addColorStop(1,`rgba(${INK},.4)`);ctx.fillStyle=g;ctx.fill();inkLine(ctx,1.3*s/60);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y-s*.3,s*.11,s*.03,0,0,7);ctx.fillStyle=`rgba(${INK},.55)`;ctx.fill();ctx.stroke();
  ctx.fillStyle=`rgba(${PAPER},.95)`;ctx.fillRect(x-s*.06,y-s*.22,s*.12,s*.12);ctx.fillStyle=`rgba(179,38,30,.8)`;ctx.font=`${s*.1}px 'QJ Brush','Ma Shan Zheng',serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('茶',x,y-s*.16);
}
export function steam(ctx,x,y,s,t){
  for(let k=0;k<3;k++){const ph=t*1.3+k*2.1,yy=y-s*(.2+((t*.35+k*.33)%1)*.7),al=Math.sin(((t*.35+k*.33)%1)*Math.PI)*.35;
    ctx.beginPath();ctx.moveTo(x+Math.sin(ph)*s*.05,yy+s*.12);ctx.bezierCurveTo(x+Math.sin(ph+1)*s*.12,yy+s*.06,x+Math.sin(ph+2)*s*.12,yy-s*.04,x+Math.sin(ph+3)*s*.06,yy-s*.12);
    ctx.strokeStyle=`rgba(${INK},${al})`;ctx.lineWidth=1.4*s/60;ctx.stroke();}
}

/* ---------- 马（马市，写意） ---------- */
/* 朝左站立，(x,y) 是四蹄落地处的中心，s 为身长。o: {coat 0–1 墨色深浅, spots, phase 0/1, seed, head 抬头程度} */
export function inkHorse(ctx,x,y,s,o){
  o=o||{};const r=RNG(o.seed||7),n=Noise1(r),coat=o.coat==null?.7:o.coat,k=s/100;
  const P=(u,v)=>[x+(u-50)*k,y+(v-80)*k];
  const hu=o.head||0;           // 抬头：头颈上移
  const Hd=(u,v)=>P(u,v-hu*4*(1-(u-10)/30));
  // 影
  ctx.fillStyle=`rgba(${INK},.08)`;ctx.beginPath();ctx.ellipse(x,y+1,s*.4,s*.035,0,0,7);ctx.fill();
  // 腿：[大腿根, 膝/飞节, 球节, 蹄]；先远侧（淡），后近侧。大腿并进身体剪影，小腿单独落笔
  const legs=o.phase?
    [[[34,40],[38,61],[37,76],[35,80]],[[75,40],[72,61],[76,76],[75,80]],[[29,41],[24,61],[23,76],[21,80]],[[70,40],[76,62],[73,76],[72,80]]]:
    [[[34,40],[32,61],[33,76],[31,80]],[[75,40],[79,61],[78,76],[77,80]],[[29,41],[31,61],[32,76],[31,80]],[[70,40],[70,61],[71,76],[69,80]]];
  const thigh=(L,far,front)=>{const a=P(...L[0]),b=P(...L[1]);const w0=(front?9:12)*k,w1=(front?4.2:4.6)*k;const dx=b[0]-a[0],dy=b[1]-a[1],m=Math.hypot(dx,dy)||1,nx=-dy/m,ny=dx/m;
    const path=new Path2D();path.moveTo(a[0]+nx*w0/2,a[1]+ny*w0/2);path.quadraticCurveTo((a[0]+b[0])/2+nx*w0*.42,(a[1]+b[1])/2+ny*w0*.42,b[0]+nx*w1/2,b[1]+ny*w1/2);path.lineTo(b[0]-nx*w1/2,b[1]-ny*w1/2);path.quadraticCurveTo((a[0]+b[0])/2-nx*w0*.3,(a[1]+b[1])/2-ny*w0*.3,a[0]-nx*w0/2,a[1]-ny*w0/2);path.closePath();
    ctx.fillStyle=`rgba(${PAPER},.95)`;ctx.fill(path);ctx.fillStyle=`rgba(${INK},${(far?.1:.14)+coat*(far?.32:.48)})`;ctx.fill(path);};
  const shin=(L,far,i)=>{const pts=[];for(let j=1;j<L.length-1;j++){const a=P(...L[j]),b=P(...L[j+1]);for(let t=0;t<1;t+=.2)pts.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}pts.push(P(...L[L.length-1]));
    brush(ctx,pts,{noise:n,w:(far?3:3.6)*k,a:far?.4+coat*.3:.6+coat*.35,dry:.15,bristles:3,off:i*20,taper:.12});
    const h=P(...L[L.length-1]);ctx.fillStyle=`rgba(${INK},${far?.55:.88})`;ctx.beginPath();ctx.ellipse(h[0]-1.4*k,h[1]-1*k,2.6*k,1.5*k,0,0,7);ctx.fill();
    const kn=P(...L[1]);ctx.beginPath();ctx.ellipse(kn[0],kn[1],2.3*k,2*k,0,0,7);ctx.fillStyle=`rgba(${INK},${far?.35:.55})`;ctx.fill();};
  legs.forEach((L,i)=>{const far=i<2;if(far){thigh(L,true,i===0);shin(L,true,i);}});
  legs.forEach((L,i)=>{if(i>=2)thigh(L,false,i===2);});
  // 身：多形并成一个剪影（非零填充，重叠不叠色）
  const body=new Path2D();
  const E=(u,v,rx,ry,rot)=>{const c=P(u,v);body.moveTo(c[0]+rx*k,c[1]);body.ellipse(c[0],c[1],rx*k,ry*k,rot||0,0,Math.PI*2);};
  E(52,40,25,12);E(30,40,11,12);E(73,38,12,12.5);E(37,32,9,6.5);
  let a=Hd(24,44),b=Hd(19,27),c=Hd(12,15),d=Hd(21,8),e=Hd(30,18),f=P(41,30);
  body.moveTo(a[0],a[1]);body.quadraticCurveTo(b[0],b[1],c[0],c[1]);body.lineTo(d[0],d[1]);body.quadraticCurveTo(e[0],e[1],f[0],f[1]);body.closePath();
  const hp=[[21,8],[15,6.5],[9,11],[3,19],[2.5,22],[6,24],[12,21],[16,17]].map(q=>Hd(...q));
  body.moveTo(hp[0][0],hp[0][1]);for(let i=1;i<hp.length;i++){const m=[(hp[i-1][0]+hp[i][0])/2,(hp[i-1][1]+hp[i][1])/2];body.quadraticCurveTo(hp[i-1][0],hp[i-1][1],m[0],m[1]);}body.closePath();
  const ear=[Hd(17,8),Hd(18.5,1.5),Hd(20.5,7)];body.moveTo(ear[0][0],ear[0][1]);body.lineTo(ear[1][0],ear[1][1]);body.lineTo(ear[2][0],ear[2][1]);body.closePath();
  ctx.fillStyle=`rgba(${PAPER},.96)`;ctx.fill(body);
  const top=P(0,20)[1],bot=P(0,54)[1];
  const g=ctx.createLinearGradient(0,top,0,bot);g.addColorStop(0,`rgba(${INK},${.18+coat*.72})`);g.addColorStop(.6,`rgba(${INK},${.1+coat*.55})`);g.addColorStop(1,`rgba(${INK},${.04+coat*.3})`);
  ctx.fillStyle=g;ctx.fill(body);
  legs.forEach((L,i)=>{if(i>=2)shin(L,false,i);});
  ctx.save();ctx.clip(body);
  // 腹下留白、肩臀高光（写意的"留白"）
  const hl=(u,v,rr,al)=>{const cc=P(u,v),gg=ctx.createRadialGradient(cc[0],cc[1],0,cc[0],cc[1],rr*k);gg.addColorStop(0,`rgba(${PAPER},${al})`);gg.addColorStop(1,`rgba(${PAPER},0)`);ctx.fillStyle=gg;ctx.fillRect(cc[0]-rr*k,cc[1]-rr*k,rr*2*k,rr*2*k);};
  hl(52,51,15,.32*coat+.12);hl(31,36,7,.16*coat);hl(72,33,7,.16*coat);
  if(o.spots){for(let i=0;i<9;i++){const cc=P(40+r()*40,32+r()*14);ctx.fillStyle=`rgba(${PAPER},${.5+r()*.3})`;ctx.beginPath();ctx.ellipse(cc[0],cc[1],(2+r()*4)*k,(1.5+r()*3)*k,r()*3,0,7);ctx.fill();}}
  ctx.restore();
  // 勾：颈背一笔、腹线一笔
  const crest=[[20,8],[26,13],[32,21],[38,28],[48,28.5],[60,28],[72,26],[81,29],[85,34]].map(q=>q[0]<40?Hd(...q):P(...q));
  const sm=[];for(let i=0;i<crest.length-1;i++)for(let t=0;t<1;t+=.25)sm.push([crest[i][0]+(crest[i+1][0]-crest[i][0])*t,crest[i][1]+(crest[i+1][1]-crest[i][1])*t]);sm.push(crest[crest.length-1]);
  brush(ctx,sm,{noise:n,w:2.4*k,a:.75+coat*.2,dry:.25,bristles:3,off:3});
  const belly=[[26,50],[40,52],[55,52.5],[68,49]].map(q=>P(...q));const bm=[];for(let i=0;i<belly.length-1;i++)for(let t=0;t<1;t+=.25)bm.push([belly[i][0]+(belly[i+1][0]-belly[i][0])*t,belly[i][1]+(belly[i+1][1]-belly[i][1])*t]);
  brush(ctx,bm,{noise:n,w:1.5*k,a:.45+coat*.3,dry:.45,bristles:2,off:9,wet:false});
  // 头：眼、鼻
  const ey=Hd(12.5,13),ns=Hd(4.5,20);ctx.fillStyle=`rgba(${INK},.9)`;ctx.beginPath();ctx.ellipse(ey[0],ey[1],1.2*k,.8*k,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(ns[0],ns[1],.8*k,.6*k,0,0,7);ctx.fill();
  // 鬃：颈上短而飞的干笔
  for(let i=0;i<9;i++){const t=i/8,u=20+t*17,v=8+t*19,st=Hd(u,v);
    const len=(5+r()*5)*k,ang=-.4+t*.3+(r()-.5)*.3,pts=[st];for(let j=1;j<6;j++)pts.push([st[0]+Math.cos(ang)*len*j/5+len*.25*(j/5)*(j/5),st[1]-Math.sin(ang)*len*j/5*.6+len*.12*j/5]);
    brush(ctx,pts,{noise:n,w:1.8*k,a:.7+coat*.25,dry:.3,bristles:3,off:40+i*7,taper:.4});}
  // 尾：自臀后甩出，弧形散开的干笔
  const tb=P(84,31),sw=o.phase?1:-1;
  for(let i=0;i<7;i++){const sp=(i-3)*1.3,len=.8+r()*.35,pts=[];
    for(let j=0;j<=12;j++){const t=j/12*len;pts.push([tb[0]+(6*Math.sin(t*2.2)+t*4+sp*t*1.2+sw*t*t*3)*k,tb[1]+(t*31+sp*t*.3)*k]);}
    brush(ctx,pts,{noise:n,w:(2.8-Math.abs(i-3)*.35)*k,a:.62+coat*.28,dry:.3+Math.abs(i-3)*.05,bristles:3,off:80+i*11,taper:.3});}
}

/* ---------- 印 ---------- */
export function sealCanvas(cv,txt){
  const ctx=cv.getContext('2d');const S=cv.width;ctx.clearRect(0,0,S,S);
  ctx.fillStyle='#b3261e';ctx.beginPath();ctx.roundRect(S*.04,S*.04,S*.92,S*.92,S*.07);ctx.fill();
  ctx.fillStyle='#f4ead6';ctx.textAlign='center';ctx.textBaseline='middle';
  const F=`'QJ Brush','Ma Shan Zheng','STKaiti','KaiTi',serif`;
  if(txt.length===4){ctx.font=`${S*.38}px ${F}`;ctx.fillText(txt[0],S*.7,S*.3);ctx.fillText(txt[1],S*.7,S*.71);ctx.fillText(txt[2],S*.3,S*.3);ctx.fillText(txt[3],S*.3,S*.71);}
  else if(txt.length===2){ctx.font=`${S*.46}px ${F}`;ctx.fillText(txt[0],S*.5,S*.3);ctx.fillText(txt[1],S*.5,S*.72);}
  else{ctx.font=`${S*.6}px ${F}`;ctx.fillText(txt,S*.5,S*.53);}
  ctx.globalCompositeOperation='destination-out';const r=RNG(txt.charCodeAt(0));
  for(let i=0;i<S*2.2;i++){ctx.fillStyle=`rgba(0,0,0,${r()*.7})`;ctx.beginPath();ctx.arc(r()*S,r()*S,r()*S*.012,0,7);ctx.fill();}
  ctx.globalCompositeOperation='source-over';
}
/* 画布尺寸跟随容器，返回已按 dpr 缩放的 ctx */
export function fitCanvas(cv,w,h,maxDpr){
  const dpr=Math.min(maxDpr||2,window.devicePixelRatio||1);
  cv.width=Math.max(1,Math.round(w*dpr));cv.height=Math.max(1,Math.round(h*dpr));
  const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);return c;
}
