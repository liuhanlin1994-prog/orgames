/* 斗宝（拍卖）的逻辑。不碰 DOM。
   宝物的真值谁也不知道，各人只凭眼力估个数（真值 ± 眼力）。估得最高的人最容易得标，也最容易估高了——「赢者诅咒」。 */
import {RNG} from '../core/rng.js';

export const NAMES=['你','赵莽汉','钱掌柜','孙员外','李老行家'];
export const WARES=['青瓷坛','香炉','犀角杯','漆盒','青铜爵','汝窑盏'];
export const SIG=30;                                   // 眼力：各人的估价落在真值 ±30 贯之内
const r0=x=>Math.round(x);

/* 一批宝物：真值、眼力（估价落在真值 ± 眼力之内）、五人各自的估价（第 0 个是你） */
export function makeLots(seed,n,{lo=90,hi=170,sig=SIG,names=WARES}={}){const r=RNG(seed),lots=[];
  for(let i=0;i<n;i++){const v=r0(lo+r()*(hi-lo)),s=Array.isArray(sig)?sig[i%sig.length]:sig;lots.push({nm:names[i%names.length],v,sig:s,est:NAMES.map(()=>r0(v+(r()*2-1)*s))});}
  return lots;}

/* ---------- 第一回：暗标，价高者得、照自己写的价付钱 ---------- */
export const SHADE=[null,.4,.6,.8,1];                  // 四位对手：出价 = 估价 − 压价 × 眼力（莽汉压得最少）
export const aiBid=(lot,i)=>r0(lot.est[i]-SHADE[i]*lot.sig);
/* 开标：myBid 为你的出价（null 表示不投）。同价时估价高者得 */
export function sealed(lot,myBid){const bids=NAMES.map((_,i)=>i===0?myBid:aiBid(lot,i));let win=-1;
  bids.forEach((b,i)=>{if(b==null||b<=0)return;if(win<0||b>bids[win]||(b===bids[win]&&lot.est[i]>lot.est[win]))win=i;});
  return{bids,win,price:win<0?0:bids[win],profit:win<0?0:lot.v-bids[win]};}
/* 用一条规矩（估价, 眼力 → 出价）投完一批，返回五人各自的盈亏 */
export function runSealed(lots,rule){const tot=NAMES.map(()=>0);lots.forEach(l=>{const s=sealed(l,rule(l.est[0],l.sig));if(s.win>=0)tot[s.win]+=s.profit;});return tot;}
/* 高手：估价是「真值 ± 眼力」一段，得标时多半是估高了的那一次——看不准就多压，看得准就少压 */
export const expert=(e,sig)=>r0(e-.6*sig);

/* ---------- 第二回：出价最高者得，只付第二高的价（各人心里的价不同） ---------- */
export const R2=[
  {nm:'端砚',v:80,ai:[62,48,55,30]},{nm:'古画',v:100,ai:[108,72,90,64]},{nm:'玉佩',v:120,ai:[117,96,88,101]},{nm:'铜镜',v:60,ai:[75,40,58,66]}];
export function vickrey(lot,myBid){const all=[myBid==null?-1:myBid,...lot.ai];let win=0;all.forEach((b,i)=>{if(b>all[win])win=i;});
  if(all[win]<0)return{win:-1,price:0,profit:0,bids:all};
  const price=Math.max(...all.filter((_,i)=>i!==win).map(b=>Math.max(0,b)));
  return{win,price,profit:win===0?lot.v-price:0,bids:all};}
/* 你出价 b 时这一件赚多少：低于对手最高价 0，高于它就赚 v − 对手最高价（和你出多少无关） */
export const payoffAt=(lot,b)=>b>=Math.max(...lot.ai)?lot.v-Math.max(...lot.ai):0;
export const truthful=lots=>lots.reduce((s,l)=>s+payoffAt(l,l.v),0);

/* 三回合的题目（种子固定：人人面对同一批宝物） */
export const R1=makeLots(121,4,{sig:[30,15,45,30]});
/* 评级：和高手比。自己亏了本，无论如何都是下品 */
export function gradeProfit(mine,best){if(mine<0)return'下品';const r=best>0?mine/best:1;return r>=.9?'至妙':r>=.6?'上品':r>=.25?'中品':'下品';}
