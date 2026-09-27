/* 茶寮（统筹方法 / 关键路径）的逻辑：一双手 + 一只炉子。不碰 DOM。
   规则：手上的活一件接一件；烧水交给炉子，放上去就不占手（华罗庚《统筹方法》的泡茶例子）。
   茶在所有工序都完成的那一刻泡成。 */

export const TEA_R1=[
  {id:'kettle',nm:'洗水壶',sh:'水壶',d:1,hands:true},
  {id:'boil',nm:'烧开水',sh:'烧水',d:15,hands:false,after:['kettle']},
  {id:'pot',nm:'洗茶壶',sh:'茶壶',d:1,hands:true},
  {id:'cups',nm:'洗茶杯',sh:'茶杯',d:1,hands:true},
  {id:'leaf',nm:'拿茶叶',sh:'茶叶',d:2,hands:true}
];
/* 第二回：来了六位客人，杯子多，洗杯要 4 分钟 */
export const TEA_R2=TEA_R1.map(t=>t.id==='cups'?Object.assign({},t,{d:4}):Object.assign({},t));
export const TEA_TOKENS=3;          // 三枚「巧」字签：用在一道工序上，它就快一倍
export const TEA_R2_TARGET=6;

export function teaDur(tasks,tokens){const d={};tasks.forEach(t=>{let v=t.d;for(let i=0;i<((tokens&&tokens[t.id])||0);i++)v=Math.max(1,Math.ceil(v/2));d[t.id]=v;});return d;}
/* 按玩家的先后顺序排出时间表；返回 null 表示顺序违背先后关系 */
export function teaSchedule(order,tasks,dur){
  const by={};tasks.forEach(t=>by[t.id]=t);dur=dur||teaDur(tasks);
  let hands=0,stove=0;const end={},items=[];
  for(const id of order){const t=by[id];
    const ready=Math.max(0,...(t.after||[]).map(a=>{if(end[a]==null)return Infinity;return end[a];}));
    if(!isFinite(ready))return null;
    let s;if(t.hands){s=Math.max(hands,ready);hands=s+dur[id];}else{s=Math.max(hands,ready,stove);stove=s+dur[id];}
    end[id]=s+dur[id];items.push({id,start:s,end:s+dur[id],lane:t.hands?'hands':'stove'});
  }
  const total=items.length?Math.max(...items.map(i=>i.end)):0;
  return{items,total,end};
}
export function teaCanPlace(order,tasks,id){const t=tasks.find(x=>x.id===id);return(t.after||[]).every(a=>order.includes(a));}
function perms(a){if(a.length<=1)return[a];const out=[];a.forEach((x,i)=>perms(a.slice(0,i).concat(a.slice(i+1))).forEach(p=>out.push([x].concat(p))));return out;}
export function teaAllTotals(tasks,dur){return perms(tasks.map(t=>t.id)).map(o=>teaSchedule(o,tasks,dur)).filter(Boolean).map(s=>s.total);}
export function teaBest(tasks,dur){return Math.min(...teaAllTotals(tasks,dur));}
/* 最优顺序：先洗水壶、立刻上炉，其余手上活随后（这个结构下必然最优） */
export function teaBestOrder(tasks){const hands=tasks.filter(t=>t.hands&&t.id!=='kettle').map(t=>t.id);return['kettle','boil'].concat(hands);}
/* 关键工序：它再慢一分钟，茶就晚一分钟 */
export function teaCritical(tasks,dur,order){
  const base=teaSchedule(order,tasks,dur).total,out=new Set();
  tasks.forEach(t=>{const d2=Object.assign({},dur);d2[t.id]+=1;if(teaSchedule(order,tasks,d2).total>base)out.add(t.id);});
  return out;
}
export function teaGrade1(total,best){return total<=best?'至妙':total<=best+1?'上品':total<=best+3?'中品':'下品';}
export function teaGrade2(total){return total<=TEA_R2_TARGET?'至妙':total<=TEA_R2_TARGET+1?'上品':total<=TEA_R2_TARGET+3?'中品':'下品';}
