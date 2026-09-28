/* 赛马（田忌赛马 · 指派）的逻辑。不碰 DOM。
   每匹马一个脚力值；同场相遇，脚力高者胜，相等则齐王胜（田忌的马每一等都慢一截）。 */
export const CNUM=['〇','一','二','三','四','五','六','七','八','九','十','十一','十二'];
export const beats=(a,b)=>a>b;

/* 明牌时最多能赢几场：把两边从弱到强排好，每匹对手的马都找「刚好能赢它」的那匹（最大匹配） */
export function maxWins(mine,opp){
  const a=[...mine].sort((x,y)=>x-y),b=[...opp].sort((x,y)=>x-y);let i=0,j=0,w=0;
  while(i<a.length&&j<b.length){if(a[i]>b[j]){w++;j++;}i++;}
  return w;
}
/* 给出一种赢得最多的排法：lanes[k] = 我方派出的马在 mine 里的下标（对手第 k 场是 opp[k]） */
export function bestAssign(mine,opp){
  const n=opp.length,lanes=new Array(n).fill(-1),used=new Array(mine.length).fill(false);
  const oi=opp.map((v,k)=>k).sort((p,q)=>opp[p]-opp[q]),mi=mine.map((v,k)=>k).sort((p,q)=>mine[p]-mine[q]);
  let i=0;for(const k of oi){while(i<mi.length&&mine[mi[i]]<=opp[k])i++;if(i<mi.length){lanes[k]=mi[i];used[mi[i]]=true;i++;}}
  const rest=mi.filter(k=>!used[k]);for(let k=0;k<n;k++)if(lanes[k]<0)lanes[k]=rest.shift();
  return lanes;
}
export const countWins=(mine,opp,lanes)=>lanes.reduce((s,m,k)=>s+(m!=null&&m>=0&&beats(mine[m],opp[k])?1:0),0);
/* 「同等相对」：强对强、弱对弱 */
export function sameRankWins(mine,opp){const a=[...mine].sort((x,y)=>y-x),b=[...opp].sort((x,y)=>y-x);return a.reduce((s,v,i)=>s+(v>b[i]?1:0),0);}

/* 孙膑的规矩：能赢，就用刚好能赢的那匹；赢不了，就派最弱的那匹去输 */
export function sunbinPick(mine,avail,v){
  let win=-1,low=-1;
  for(const i of avail){if(mine[i]>v&&(win<0||mine[i]<mine[win]))win=i;if(low<0||mine[i]<mine[low])low=i;}
  return win>=0?win:low;
}

/* 暗盘：对手的马匹已知、出场次序不知，一场一场翻开。V(我方剩余, 对手剩余) = 往后最多还能期望赢几场 */
export function onlineSolver(mine,opp){
  const n=mine.length,memo=new Map();
  const V=(mm,om)=>{if(!om)return 0;const k=mm*4096+om;const hit=memo.get(k);if(hit!=null)return hit;let s=0,c=0;
    for(let j=0;j<n;j++)if(om>>j&1){c++;let b=-1;for(let i=0;i<n;i++)if(mm>>i&1){const v=(beats(mine[i],opp[j])?1:0)+V(mm&~(1<<i),om&~(1<<j));if(v>b)b=v;}s+=b;}
    const r=s/c;memo.set(k,r);return r;};
  /* 翻开对手第 j 匹时，派第 i 匹是否「妙手」（期望不吃亏） */
  const value=(mm,om,j,i)=>(beats(mine[i],opp[j])?1:0)+V(mm&~(1<<i),om&~(1<<j));
  const isBest=(mm,om,j,i)=>{let b=-1;for(let k=0;k<n;k++)if(mm>>k&1)b=Math.max(b,value(mm,om,j,k));return value(mm,om,j,i)>=b-1e-9;};
  return{V,value,isBest,full:(1<<n)-1};
}

/* ---------- 三回合 ---------- */
export const R1={king:[9,6,3],mine:[8,5,2],tier:['上驷','中驷','下驷']};
/* 擂台：一位诸侯，六匹马，脚力总和比你高 */
export const R2=[{nm:'秦王',opp:[8,2,11,5,10,7],mine:[6,10,3,9,4,8],secs:40}];
/* 暗盘：对手出场次序不知，只知道他有哪几匹马 */
export const R3=[{nm:'齐王',opp:[11,9,8,6,3],mine:[10,9,7,5,4]}];
export function gradeR2(won,best){const r=won/best;return r>=1?'至妙':r>=.75?'上品':r>=.5?'中品':'下品';}
export function gradeR3(good,total){const r=good/total;return r>=.93?'至妙':r>=.8?'上品':r>=.6?'中品':'下品';}
/* 跑完一场要多久（秒）：快马先到；平局时齐王先到 */
export const runTime=(v,king)=>.78+.075*(12-v)+(king?0:.02);
