/* 窑火（优选法 · 0.618 法）的逻辑。不碰 DOM。
   火候偏生、偏过都不好，最好的在中间某处（单峰）。烧一窑看一窑：最好的那窑左右两个邻居之间，必定夹着最好的火候。
   窑神刁难：你每烧一窑，他都挑让剩下那段更长的结果——只有好方法才能保证把火候夹紧。 */

export const T0=1200,T1=1400;                               // 窑温范围（℃）
export const toT=x=>Math.round(T0+x*(T1-T0));

/* 夹逼：记下烧过的点，最好的一窑 m，它两边最近的邻居 a、b（没有邻居就用端点）。最好的火候必在 (a,b) 之间 */
export function band(tests,lo=0,hi=1){
  if(!tests.length)return{a:lo,b:hi,m:null};
  const best=tests.reduce((p,t)=>t.q>p.q?t:p),xs=tests.map(t=>t.x);
  const a=Math.max(lo,...xs.filter(x=>x<best.x)),b=Math.min(hi,...xs.filter(x=>x>best.x));
  return{a,b,m:best.x};
}

/* 第一回：一条固定的火候曲线（不对称的单峰），成色 0–100 */
export function curve(peak,wl=.34,wr=.22){return x=>{const d=x-peak,w=d<0?wl:wr;return Math.max(3,100-100*(d/w)**2*.55-(d>0?d*4:0));};}   // 不取整：比较时不会打平
export const R1={peak:.585,kilns:8,f:curve(.585)};

/* 窑神：每烧一窑，只告诉你「比最好的那窑好还是差」，而且挑让剩下那段更长的回答 */
export function makeGod(lo=0,hi=1){
  let a=lo,b=hi,m=null,rank=0;const tests=[];
  return{
    get state(){return{a,b,m,tests:tests.slice()};},
    fire(x){
      if(m===null){m=x;tests.push({x,better:true,q:++rank});return{better:true,wasted:false};}
      if(x<=a||x>=b||x===m){tests.push({x,better:false,q:-1});return{better:false,wasted:true};}
      /* 两种回答各剩多长 */
      const betterBand=x<m?[a,m]:[m,b],worseBand=x<m?[x,b]:[a,x];
      const better=(betterBand[1]-betterBand[0])>(worseBand[1]-worseBand[0]);
      if(better){[a,b]=betterBand;m=x;tests.push({x,better:true,q:++rank});}
      else{[a,b]=worseBand;tests.push({x,better:false,q:-1});}
      return{better,wasted:false};
    }};
}
/* 黄金分割法（0.618 法）：先烧 0.618 处，再在最好那窑的对称点烧 */
export function golden(god,n,lo=0,hi=1){for(let k=0;k<n;k++){const s=god.state;let x;
    if(s.m===null)x=lo+(hi-lo)*.618;else{x=s.a+s.b-s.m;if(Math.abs(x-s.m)<1e-9)x=s.m+(s.b-s.m)/2;}
    god.fire(x);}return god.state;}
/* 对分法：每回在最好那窑的旁边紧挨着烧一窑，看往哪边走 */
export function pairs(god,n,eps=.004){for(let k=0;k<n;k++){const s=god.state;const mid=(s.a+s.b)/2;god.fire(k%2===0?mid-eps:mid+eps);}return god.state;}

export const R2={kilns:6};
/* 第三回：火候只有二十档（1…20），两头 0 与 21 是烧不得的界。分数法：先烧第 8、13 档 */
export const R3={levels:20,kilns:6};
export function fibonacci(god,n,N=20){for(let k=0;k<n;k++){const s=god.state;let x;
    if(s.m===null)x=8;else{x=s.a+s.b-s.m;if(x===s.m||x<=s.a||x>=s.b)x=s.m+1<s.b?s.m+1:s.m-1;}
    god.fire(x);}return god.state;}
/* 离散时还剩几档可能是最好的（开区间 (a,b) 里的整数） */
export const left=s=>Math.max(1,s.b-s.a-1);

export function gradeWidth(deg){return deg<=19?'至妙':deg<=26?'上品':deg<=40?'中品':'下品';}
export function gradeLeft(n){return n<=1?'至妙':n<=2?'上品':n<=4?'中品':'下品';}
export function gradeR1(deg){return deg<=12?'至妙':deg<=20?'上品':deg<=35?'中品':'下品';}
