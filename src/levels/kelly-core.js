/* 五湖（凯利公式）的逻辑。不碰 DOM。
   每趟货：p 的机会赚所押的 b 倍，其余赔光所押。押家当的几成（f）？ */
import {RNG} from '../core/rng.js';
/* 每趟家当平均按多少的「对数」在长——长久看，家当的中位数就按它滚 */
export const growth=(p,b,f)=>f>=1?(p>=1?Math.log(1+b):-Infinity):p*Math.log(1+b*f)+(1-p)*Math.log(1-f);
/* 凯利：f* = p − q/b；小于零就一文不押 */
export const kellyF=(p,b)=>Math.max(0,p-(1-p)/b);
export function outcomes(deals,seed){const r=RNG(seed);return deals.map(d=>r()<d.p);}
export function play(deals,wins,fracs,start=100){let w=start;const path=[w];deals.forEach((d,i)=>{const f=Math.min(1,Math.max(0,fracs[i]));w=wins[i]?w*(1+d.b*f):w*(1-f);path.push(w);});return path;}
/* 评的是押法，不是运气：每趟押法的期望对数增长，与凯利之比 */
export function skill(deals,fracs){let me=0,best=0;deals.forEach((d,i)=>{me+=growth(d.p,d.b,Math.min(.999,fracs[i]));best+=growth(d.p,d.b,kellyF(d.p,d.b));});return best>0?me/best:0;}

/* 千舟：同样的押法、一百趟，千条船的结局（二项分布精确算） */
const lnC=(n,k)=>{let s=0;for(let i=1;i<=k;i++)s+=Math.log(n-k+i)-Math.log(i);return s;};
const tail=(n,p,k)=>{let s=0;for(let i=Math.max(0,k);i<=n;i++)s+=Math.exp(lnC(n,i)+i*Math.log(p)+(n-i)*Math.log(1-p));return Math.min(1,s);};
export function fleetStats(p,b,f,n){
  if(f<=0)return{safe:1,median:1,ruin:0};if(f>=1)return{safe:Math.pow(p,n),median:0,ruin:1-Math.pow(p,n)};
  const u=Math.log(1+b*f),d=-Math.log(1-f),kmed=Math.round(n*p);
  const need=x=>Math.floor((Math.log(x)+n*d)/(u+d)+1e-9)+1;      // 家当 > x 倍本钱至少要赢几趟
  return{safe:tail(n,p,need(1)),median:Math.exp(kmed*u-(n-kmed)*d),ruin:1-tail(n,p,need(.1))};
}
export function fleetPaths(p,b,f,n,count,seed){const r=RNG(seed),out=[];for(let k=0;k<count;k++){let w=1;const path=new Float32Array(n+1);path[0]=1;for(let i=1;i<=n;i++){w=r()<p?w*(1+b*f):w*(1-f);path[i]=w;}out.push(path);}return out;}

/* ---------- 三回合 ---------- */
export const RIVALS=[{nm:'计然',kelly:true,col:'30,91,115'},{nm:'莽商',f:1,col:'120,70,40'},{nm:'赌客',f:.5,col:'150,110,160'},{nm:'守财奴',f:.05,col:'110,110,110'}];
export const SILK={nm:'丝绸',p:.6,b:1};
export const R1={voyages:20,deal:SILK,seed:1};
export const R2={seed:20,deals:[
  {nm:'丝绸',p:.6,b:1},{nm:'盐',p:.9,b:.2},{nm:'海外奇珍',p:.4,b:1},{nm:'瓷器',p:.5,b:2},{nm:'茶叶',p:.7,b:.5},
  {nm:'珍珠',p:.3,b:4},{nm:'漆器',p:.45,b:1},{nm:'铁器',p:.8,b:.5},{nm:'香料',p:.35,b:3},{nm:'赌坊的买卖',p:.5,b:.9},
  {nm:'粮米',p:.65,b:.8},{nm:'书画',p:.2,b:6},{nm:'药材',p:.55,b:1},{nm:'马匹',p:.5,b:1.5},{nm:'丝绸',p:.6,b:1}]};
export const R3={deal:SILK,voyages:100,goal:{safe:.9,median:4},seed:5};
export const passR3=s=>s.safe>=R3.goal.safe&&s.median>=R3.goal.median;
export function gradeSkill(r){return r>=.95?'至妙':r>=.8?'上品':r>=.5?'中品':'下品';}
/* 读法：p=.6 → 「六成」；b=1 → 「一倍」，b=.5 → 「五成」 */
const CN='〇一二三四五六七八九十';
export const pTxt=p=>{const t=Math.round(p*20)/2;return t%1?CN[Math.floor(t)]+'成半':CN[t]+'成';};
export const bTxt=b=>b<1?CN[Math.round(b*10)]+'成':b%1===.5?CN[Math.floor(b)]+'倍半':(CN[b]||b)+'倍';
export const tTxt=p=>{const t=Math.round(p*20)/2;return t%1?CN[Math.floor(t)]+'趟半':CN[t]+'趟';};
export const fTxt=f=>f<=0?'不押':f>=1?'全押':f===.5?'押一半':Math.round(f*100)%10===0?'押'+CN[Math.round(f*10)]+'成':'押'+Math.round(f*100)+'%';
