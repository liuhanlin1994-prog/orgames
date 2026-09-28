/* 斗宝（拍卖）的逻辑。不碰 DOM。
   宝物的真值谁也不知道，各人只凭眼力估个数（真值 ± 眼力）。估得最高的人最容易得标，也最容易估高了——「赢者诅咒」。 */
import {RNG} from '../core/rng.js';

export const NAMES=['你','赵莽汉','钱掌柜','孙员外','李老行家'];
export const WARES=['青瓷坛','铜镜','古画','玉佩','端砚','漆盒'],WARES2=['青铜爵','香炉','汝窑盏','金步摇','犀角杯','三彩马'];
export const SIG=30;                                   // 眼力：各人的估价落在真值 ±30 贯之内
const r0=x=>Math.round(x);

/* 一批宝物：真值、眼力（估价落在真值 ± 眼力之内）、五人各自的估价（第 0 个是你） */
export function makeLots(seed,n,{lo=90,hi=170,sig=SIG,names=WARES}={}){const r=RNG(seed),lots=[];
  for(let i=0;i<n;i++){const v=r0(lo+r()*(hi-lo)),s=Array.isArray(sig)?sig[i%sig.length]:sig;lots.push({nm:names[i%names.length],v,sig:s,est:NAMES.map(()=>r0(v+(r()*2-1)*s))});}
  return lots;}

/* ---------- 价高者得、照自己的出价付钱（第一回落价、第二回暗标，其实是一回事） ---------- */
export const SHADE=[null,.4,.6,.8,1];                  // 四位对手：出价 = 估价 − 压价 × 眼力（莽汉压得最少）
export const aiBid=(lot,i)=>r0(lot.est[i]-SHADE[i]*lot.sig);
/* 开标：myBid 为你的出价（null 表示不投）。同价时估价高者得 */
export function sealed(lot,myBid){const bids=NAMES.map((_,i)=>i===0?myBid:aiBid(lot,i));let win=-1;
  bids.forEach((b,i)=>{if(b==null||b<=0)return;if(win<0||b>bids[win]||(b===bids[win]&&lot.est[i]>lot.est[win]))win=i;});
  return{bids,win,price:win<0?0:bids[win],profit:win<0?0:lot.v-bids[win]};}
/* 落价：价码从高处一路往下落，谁先喊「要了」归谁。你在 myPrice 喊（null 表示一直不喊）——和暗标出 myPrice 一模一样 */
export function dutch(lot,myPrice){const s=sealed(lot,myPrice);return{...s,first:Math.max(...s.bids.filter(b=>b!=null))};}
export const startOf=lot=>lot.est[0]+40;
/* 用一条规矩（估价, 眼力 → 出价）投完一批，返回五人各自的盈亏 */
export function runSealed(lots,rule){const tot=NAMES.map(()=>0);lots.forEach(l=>{const s=sealed(l,rule(l.est[0],l.sig));if(s.win>=0)tot[s.win]+=s.profit;});return tot;}
/* 高手：估价是「真值 ± 眼力」一段，得标时多半是估高了的那一次——看不准就多压，看得准就少压 */
export const expert=(e,sig)=>r0(e-.6*sig);

/* ---------- 第三回：出价最高者得，只付第二高的价（各人心里的价不同） ---------- */
export const LOTS3=[
  {nm:'端砚',v:80,ai:[62,48,55,30]},{nm:'古画',v:100,ai:[108,72,90,64]},{nm:'香炉',v:70,ai:[45,38,52,20]},
  {nm:'玉佩',v:120,ai:[117,96,88,101]},{nm:'铜镜',v:60,ai:[75,40,58,66]},{nm:'青铜爵',v:95,ai:[70,86,62,91]}];
export function vickrey(lot,myBid){const all=[myBid==null?-1:myBid,...lot.ai];let win=0;all.forEach((b,i)=>{if(b>all[win])win=i;});
  if(all[win]<0)return{win:-1,price:0,profit:0,bids:all};
  const price=Math.max(...all.filter((_,i)=>i!==win).map(b=>Math.max(0,b)));
  return{win,price,profit:win===0?lot.v-price:0,bids:all};}
/* 你出价 b 时这一件赚多少：低于对手最高价 0，高于它就赚 v − 对手最高价（和你出多少无关） */
export const payoffAt=(lot,b)=>b>=Math.max(...lot.ai)?lot.v-Math.max(...lot.ai):0;
export const truthful=lots=>lots.reduce((s,l)=>s+payoffAt(l,l.v),0);

/* 三回合的题目（种子固定：人人面对同一批宝物） */
export const R1=makeLots(256,6),R2=makeLots(1624,6,{sig:[15,45,30,15,45,30],names:WARES2});
/* 评级：和高手比。自己亏了本，无论如何都是下品 */
export function gradeProfit(mine,best){if(mine<0)return'下品';const r=best>0?mine/best:1;return r>=.9?'至妙':r>=.6?'上品':r>=.25?'中品':'下品';}
