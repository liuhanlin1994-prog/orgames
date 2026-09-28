/* 赛马（田忌赛马）的逻辑。不碰 DOM。
   马分三等：3 上驷、2 中驷、1 下驷。齐王同等的马都比田忌快一档；
   但田忌的上驷快过齐王的中驷，田忌的中驷快过齐王的下驷。三场两胜。 */
export const ORDERS=[[3,2,1],[3,1,2],[2,3,1],[2,1,3],[1,3,2],[1,2,3]];
export const orderKey=o=>o.join('');
export const TIER_NAME={3:'上驷',2:'中驷',1:'下驷'};
export function raceWins(t,k){let w=0;for(let i=0;i<3;i++)if(t[i]>k[i])w++;return w;}
export const matchWon=(t,k)=>raceWins(t,k)>=2;
/* 孙膑之策：以下驷对上驷，上驷对中驷，中驷对下驷 */
export function counterOf(k){const m={3:1,2:3,1:2};return k.map(x=>m[x]);}
/* 第二回：齐王出马的习惯（每百场的次数） */
export const HABIT={'321':45,'312':15,'231':15,'213':9,'132':8,'123':8};
/* 出马簿上的旧账：近二十场，按习惯的比例 */
export const LEDGER20=['321','312','321','231','321','213','321','132','312','321','231','321','123','321','312','213','321','231','132','321'];
export function habitSample(rnd){let x=rnd()*100;for(const k in HABIT){x-=HABIT[k];if(x<0)return k.split('').map(Number);}return[3,2,1];}
export function habitWinProb(t){let p=0;for(const k in HABIT)if(matchWon(t,k.split('').map(Number)))p+=HABIT[k]/100;return p;}
/* 第三回：会算的齐王。猜你这一局的次序——四成猜你上一局的，六成猜你出得最多的（一样多就取最近的）——
   然后拿同等的马一一压住你（镜像），你一场也赢不了。 */
export function kingPredict(history,rnd){
  if(!history.length)return ORDERS[Math.floor(rnd()*6)].slice();
  if(rnd()<.4)return history[history.length-1].slice();
  const cnt={};history.forEach(o=>{const k=orderKey(o);cnt[k]=(cnt[k]||0)+1;});
  let best=null,bc=-1;for(let i=history.length-1;i>=0;i--){const k=orderKey(history[i]);if(cnt[k]>bc){bc=cnt[k];best=history[i];}}
  return best.slice();
}
export const kingMirror=pred=>pred.slice();
export function raceGrade2(avgP){return avgP>=.44?'至妙':avgP>=.3?'上品':avgP>=.17?'中品':'下品';}
export function raceGrade3(hits){return hits<=2?'至妙':hits===3?'上品':hits<=5?'中品':'下品';}
export const R3_MATCHES=8, R2_MATCHES=5;
