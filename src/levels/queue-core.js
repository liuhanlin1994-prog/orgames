/* 城门（排队论）的逻辑：来客按时辰忽多忽少地到，门官随时开关城门。不碰 DOM。时间单位：小时。 */
export function erlangC(c,a){if(a>=c)return 1;let B=1;for(let k=1;k<=c;k++)B=a*B/(k+a*B);const rho=a/c;return B/(1-rho*(1-B));}
/* M/M/c 稳态：平均排队人数、平均排队等候（小时） */
export function lqMMc(lambda,mu,c){if(lambda>=c*mu)return Infinity;const a=lambda/mu;return erlangC(c,a)*a/(c-a);}
export function wqMMc(lambda,mu,c){return lambda>0?lqMMc(lambda,mu,c)/lambda:0;}

export const CLASSES=[{p:.75,mean:4,nm:'担夫行人'},{p:.25,mean:10,nm:'驼队车马'}];
export const MU=60/CLASSES.reduce((s,c)=>s+c.p*c.mean,0);      // 每道门每小时约验 10.9 位
export const GATES=6,DELAY=1/60;                                   // 开门要一分钟
export const ANGRY=20/60,PENALTY=20;                                // 等过二十分钟的人会去告状，一状折钱二十文
const expS=(rnd,mean)=>-Math.log(1-rnd())*mean;

/* 三回合。script：每半个时辰（小时）来客的速率；W：每道门每小时工钱；CW：每人每小时等候折钱 */
export const ROUNDS=[
  {nm:'开门迎客',clock:['卯初','卯正','辰初','辰正','巳初','巳正','午初'],slot:.5,script:[10,16,26,40,56,64,64,56,40,26,16,10],W:40,CW:15,open0:2,pooled:true,seed:79},
  {nm:'驼队进城',clock:['卯初','卯正','辰初','辰正','巳初','巳正','午初'],slot:.5,script:[12,18,28,40,50,56,56,48,38,28,18,12],W:40,CW:15,open0:3,pooled:false,canPool:true,
   caravans:[[1.3,5],[2.2,4],[3.0,5],[3.9,4],[4.6,5]],seed:70},
  {nm:'上元灯会',clock:['申初','申正','酉初','酉正','戌初','戌正','亥初'],slot:.5,script:[12,16,20,26,36,50,62,62,50,34,20,12],W:0,CW:15,open0:2,pooled:true,budget:18,night:true,grades:[1.15,1.4,2],seed:113}
];
export const dayLen=sc=>sc.script.length*sc.slot;
export const lambdaAt=(sc,t)=>sc.script[Math.min(sc.script.length-1,Math.max(0,Math.floor(t/sc.slot)))];

/* 一天的来客（按时辰变化的泊松流，外加成群的驼队）；按到达时间排好 */
export function genDay(sc,rnd){
  const out=[],T=dayLen(sc),lmax=Math.max(...sc.script);let t=0;
  while(true){t+=expS(rnd,1/lmax);if(t>=T)break;if(rnd()>lambdaAt(sc,t)/lmax)continue;
    let x=rnd(),cls=0;for(;cls<CLASSES.length-1;cls++){x-=CLASSES[cls].p;if(x<0)break;}out.push({t,cls,s:expS(rnd,CLASSES[cls].mean/60)});}
  (sc.caravans||[]).forEach(([t0,n],g)=>{for(let k=0;k<n;k++)out.push({t:t0+k/120,cls:1,s:expS(rnd,CLASSES[1].mean/60),grp:g+1});});
  out.sort((a,b)=>a.t-b.t);out.forEach((x,i)=>x.id=i);return out;
}

/* 城门口：事件驱动，前进到任意时刻都精确（与帧率无关） */
export function createGateSim(sc,arr){
  const G=Array.from({length:GATES},(_,i)=>({i,open:false,ready:0,cur:null,busy:0,line:[]}));
  const pool=[],served=[];let t=0,ai=0,pooled=!!sc.pooled,wage=0,wait=0,used=0,forced=false,angry=0;
  const waiting=()=>pool.length+G.reduce((s,g)=>s+g.line.length,0);
  const openCount=()=>G.filter(g=>g.open).length;
  function assign(x){
    if(pooled){pool.push(x);return;}
    const cand=G.filter(g=>g.open);if(!cand.length){pool.push(x);return;}
    if(x.grp){const mate=cand.find(g=>g.line.some(y=>y.grp===x.grp)||(g.cur&&g.cur.grp===x.grp));if(mate){mate.line.push(x);return;}}   // 驼队结伴排在一起
    let best=cand[0],bl=1e9;for(const g of cand){const l=g.line.length+(g.cur?1:0);if(l<bl){bl=l;best=g;}}best.line.push(x);
  }
  function tryStart(){for(const g of G){if(g.cur||!g.open||g.ready>t)continue;let x=null;
      if(pooled||!g.line.length)x=pool.shift()||null;if(!x&&!pooled&&g.line.length)x=g.line.shift();if(!x&&!pooled)x=null;
      if(x){x.start=t;x.gate=g.i;g.cur=x;g.busy=t+x.s;if(t-x.t>ANGRY){angry++;x.angry=true;}}}}
  function advance(tNew){
    for(let guard=0;guard<100000;guard++){
      let te=tNew,kind=null,gi=-1;
      if(ai<arr.length&&arr[ai].t<te){te=arr[ai].t;kind='arr';}
      for(const g of G){if(g.cur&&g.busy<te){te=g.busy;kind='done';gi=g.i;}if(g.open&&!g.cur&&g.ready>t&&g.ready<te){te=g.ready;kind='ready';gi=g.i;}}
      if(sc.budget&&!forced){const extra=openCount()-1;if(extra>0){const tb=t+(sc.budget-used)/extra;if(tb<te){te=tb;kind='budget';}}}
      const dt=te-t;if(dt>0){wait+=waiting()*dt;wage+=G.filter(g=>g.open||g.cur).length*dt;used+=Math.max(0,openCount()-1)*dt;t=te;}
      if(!kind)break;
      if(kind==='arr')assign(arr[ai++]);
      else if(kind==='done'){const g=G[gi];g.cur.end=t;served.push(g.cur);g.cur=null;}
      else if(kind==='budget'){forced=true;used=sc.budget;let kept=false;for(const g of G){if(g.open&&!kept){kept=true;continue;}if(g.open)close(g);}}
      tryStart();
    }
  }
  function close(g){g.open=false;if(!pooled){const l=g.line.splice(0);l.forEach(assign);}}
  function setOpen(i,v){const g=G[i];if(v===g.open)return false;
    if(v){if(forced&&openCount()>=1)return false;g.open=true;g.ready=t+DELAY;if(!pooled){const hold=pool.splice(0);hold.forEach(assign);}}
    else close(g);
    tryStart();return true;}
  function setCount(n){n=Math.max(1,Math.min(GATES,n));let o=openCount();for(const g of G)if(o<n&&!g.open){setOpen(g.i,true);o++;}for(let k=GATES-1;k>=0&&o>n;k--)if(G[k].open){setOpen(k,false);o--;}}
  function setPooled(v){if(v===pooled)return;pooled=v;
    if(v){const all=pool.concat(...G.map(g=>g.line.splice(0))).sort((a,b)=>a.t-b.t);pool.length=0;pool.push(...all);}
    else{const all=pool.splice(0);all.forEach(assign);}tryStart();}
  /* 关城：不再有新客，剩下的人由开着的门验完 */
  function finish(){if(!openCount())setOpen(0,true);for(let k=0;k<2000&&(waiting()>0||G.some(g=>g.cur));k++)advance(t+1/120);G.forEach(g=>{g.open=false;});}
  function costs(){const w=wage*sc.W,q=wait*sc.CW,a=angry*PENALTY;return{wage:w,wait:q,angry,angryCost:a,total:w+q+a,used,forced};}
  function maxWaitNow(){let m=0;for(const x of pool)m=Math.max(m,t-x.t);for(const g of G)for(const x of g.line)m=Math.max(m,t-x.t);return m*60;}
  return{advance,setOpen,setCount,setPooled,finish,costs,waiting,openCount,maxWaitNow,G,pool,served,get t(){return t;},get pooled(){return pooled;},get forced(){return forced;}};
}

/* 老门官：看来客预报按排队论定门数，队伍长了再加门 */
export function bestC(lambda,W,CW){let b=GATES,bc=Infinity;for(let c=1;c<=GATES;c++){const cost=W*c+CW*lqMMc(lambda,MU,c);if(cost<bc){bc=cost;b=c;}}return b;}
export const policyExpert=(sc,W)=>(t,q)=>Math.max(bestC(lambdaAt(sc,t+10/60),W,sc.CW),Math.min(GATES,Math.ceil(q/3)+1));
export const policyReactive=()=>(t,q)=>Math.min(GATES,Math.ceil(q/3)+1);
export function runPolicy(sc,arr,policy,{pooled=true}={}){
  const sim=createGateSim(Object.assign({},sc,{pooled}),arr.map(a=>Object.assign({},a))),T=dayLen(sc),step=1/60,series=[];
  sim.setCount(sc.open0);
  for(let t=0;t<T-1e-9;t+=step){sim.setCount(policy(t,sim.waiting()));sim.advance(Math.min(T,t+step));series.push([sim.t,sim.waiting(),sim.openCount()]);}
  sim.finish();return{cost:sim.costs(),series};
}
export function bench(sc,arr){
  if(!sc.budget)return runPolicy(sc,arr,policyExpert(sc,sc.W));
  let best=null;for(const W of [0,10,20,40,80,120,160,240,320,480]){const r=runPolicy(sc,arr,policyExpert(sc,W));if(!best||r.cost.total<best.cost.total)best=r;}
  const r=runPolicy(sc,arr,policyReactive());return r.cost.total<best.cost.total?r:best;
}
export function gradeRatio(r,g=[1.06,1.18,1.4]){return r<=g[0]?'至妙':r<=g[1]?'上品':r<=g[2]?'中品':'下品';}
