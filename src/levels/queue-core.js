/* 城门（排队论）的逻辑：来客泊松到达，查验时长指数分布，多道门。不碰 DOM。时间单位：时辰内用小时。 */
export function erlangC(c,a){if(a>=c)return 1;let B=1;for(let k=1;k<=c;k++)B=a*B/(k+a*B);const rho=a/c;return B/(1-rho*(1-B));}
/* M/M/c 稳态平均排队等候（小时） */
export function wqMMc(lambda,mu,c){if(lambda>=c*mu)return Infinity;return erlangC(c,lambda/mu)/(c*mu-lambda);}
const expS=(rnd,mean)=>-Math.log(1-rnd())*mean;
/* 一天的来客：[{t 到达(时), cls 类别, s 查验时长(时)}]；classes: [{p, mean 分钟}] */
export function genArrivals(lambda,T,classes,rnd){
  const out=[];let t=0;
  while(true){t+=expS(rnd,1/lambda);if(t>=T)break;
    let x=rnd(),cls=0;for(;cls<classes.length-1;cls++){x-=classes[cls].p;if(x<0)break;}
    out.push({t,cls,s:expS(rnd,classes[cls].mean/60)});}
  return out;
}
/* 模拟：discipline = 'pooled'（一条长队，先来先过）| 'separate'（各门各排，来时挑人少的门）| 'spt'（一条长队，快的先过）
   返回每位来客的 start/end/gate */
export function simulate(arr,c,discipline){
  const cust=arr.map(a=>Object.assign({},a));
  if(discipline==='pooled'){const free=new Array(c).fill(0);
    for(const x of cust){let g=0;for(let j=1;j<c;j++)if(free[j]<free[g])g=j;x.start=Math.max(x.t,free[g]);x.end=x.start+x.s;x.gate=g;free[g]=x.end;}
    return cust;}
  if(discipline==='separate'){const lanes=Array.from({length:c},()=>[]),last=new Array(c).fill(0);
    for(const x of cust){let g=0,best=1e9;for(let j=0;j<c;j++){const L=lanes[j];while(L.length&&L[0]<=x.t)L.shift();if(L.length<best){best=L.length;g=j;}}
      x.start=Math.max(x.t,last[g]);x.end=x.start+x.s;x.gate=g;last[g]=x.end;lanes[g].push(x.end);}
    return cust;}
  // spt：非抢占优先，类别 0（快）先过
  const free=new Array(c).fill(0),qs=[[],[]],hd=[0,0];let i=0,t=0,n=cust.length;
  const waiting=()=>qs[0].length-hd[0]+qs[1].length-hd[1];
  while(i<n||waiting()>0){
    for(let g=0;g<c;g++){if(free[g]<=t&&waiting()>0){const q=qs[0].length>hd[0]?0:1,x=qs[q][hd[q]++];x.start=t;x.end=t+x.s;x.gate=g;free[g]=x.end;}}
    const nextArr=i<n?cust[i].t:Infinity;let nextFree=Infinity;
    if(waiting()>0)for(let g=0;g<c;g++)if(free[g]>t&&free[g]<nextFree)nextFree=free[g];
    const nt=Math.min(nextArr,nextFree);if(!isFinite(nt))break;t=nt;
    while(i<n&&cust[i].t<=t){qs[Math.min(1,cust[i].cls)].push(cust[i]);i++;}
  }
  return cust;
}
/* 统计：只算 [from, to) 时段到达的来客；等候单位：分钟 */
export function waitStats(cust,from,to,ncls){
  let n=0,sum=0,max=0;const cs=new Array(ncls||1).fill(0),cn=new Array(ncls||1).fill(0);
  for(const x of cust){if(x.t<from||x.t>=to)continue;const w=(x.start-x.t)*60;n++;sum+=w;if(w>max)max=w;cs[x.cls]+=w;cn[x.cls]++;}
  return{n,avg:n?sum/n:0,max,byClass:cs.map((s,i)=>cn[i]?s/cn[i]:0)};
}
/* 某时刻排队的人数 */
export function queueAt(cust,t){let q=0;for(const x of cust)if(x.t<=t&&x.start>t)q++;return q;}

/* ---------- 三回合的参数 ---------- */
export const MU=12;                                  // 每道门每时辰验 12 位（每位约 5 分钟）
/* 第一回：卯初开城到午初，六个小时。每次开城都用同一个上午的来客（seed 固定，同一串随机数），只改门数，比较才公平；
   这个上午是四千个随机上午里「很典型」的一个：四门约 33 分、五门约 5 分（见测试） */
export const R1={lambda:56,T:6,classes:[{p:1,mean:5}],target:15,seed:2708};
export const R2={c:5,lamMin:30,lamMax:58,H:2400,warm:50,target:15};              // 推演百日：城门日夜不闭
export const R3={c:4,lambda:42,T:6,warm:1,classes:[{p:.7,mean:3,nm:'担夫行人'},{p:.3,mean:29/3,nm:'驼队车马'}]};
export function r1Grade(c){return c===5?'至妙':c===6?'上品':c>=7?'中品':'下品';}
/* 第二回的答案：五道门、平均候不过一刻，最多接得住多少来客 */
export function r2MaxLambda(){let best=0;for(let l=R2.lamMin;l<=R2.lamMax;l++)if(wqMMc(l,MU,R2.c)*60<=R2.target)best=l;return best;}
export function r2Grade(l){const m=r2MaxLambda();return l===m?'至妙':(l>=m-2&&l<m)?'上品':l<m?'中品':'下品';}
export function labRun(lambda,rnd){const cu=simulate(genArrivals(lambda,R2.H,[{p:1,mean:60/MU}],rnd),R2.c,'pooled');return waitStats(cu,R2.warm,R2.H).avg;}
/* 被后来者抢先：有人比我晚到，却比我先开始查验 */
export function overtakenShare(cust,from){const a=cust.filter(x=>x.t>=from).sort((p,q)=>p.t-q.t);let ov=0;
  for(let i=0;i<a.length;i++)for(let j=i+1;j<Math.min(a.length,i+80);j++)if(a[j].start<a[i].start-1e-9){ov++;break;}
  return a.length?ov/a.length:0;}
export function r3Stats(arr,d){const cu=simulate(arr,R3.c,d),s=waitStats(cu,R3.warm,R3.T,2);return{avg:s.avg,max:s.max,fast:s.byClass[0],slow:s.byClass[1],over:overtakenShare(cu,R3.warm)};}
export function r3Grade(d){return d==='separate'?'下品':'至妙';}
