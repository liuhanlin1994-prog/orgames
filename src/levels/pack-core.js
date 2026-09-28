/* 长亭（背包问题）的逻辑。不碰 DOM。
   书箱是一格格的：物件形状不一，要摆得下；书生背得动的斤两也有限。亲友一件件递来，带不带当场定；凑齐一套另有加分。 */

/* 能不能把这些长方块摆进 cols×rows 的格子（可旋转）；能就返回每件的位置 [x,y,w,h] */
export function canPack(items,cols,rows){
  const area=items.reduce((s,[w,h])=>s+w*h,0);if(area>cols*rows)return null;
  const idx=items.map((_,i)=>i).sort((a,b)=>items[b][0]*items[b][1]-items[a][0]*items[a][1]||Math.max(...items[b])-Math.max(...items[a]));
  const grid=new Uint8Array(cols*rows),pos=new Array(items.length);let nodes=0;
  const fits=(x,y,w,h)=>{if(x+w>cols||y+h>rows)return false;for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)if(grid[(y+dy)*cols+x+dx])return false;return true;};
  const set=(x,y,w,h,v)=>{for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)grid[(y+dy)*cols+x+dx]=v;};
  const sameShape=(a,b)=>(a[0]===b[0]&&a[1]===b[1])||(a[0]===b[1]&&a[1]===b[0]);
  function rec(k,minPos){if(k===idx.length)return true;if(++nodes>400000)return false;const i=idx[k],[w,h]=items[i],start=k>0&&sameShape(items[idx[k-1]],items[i])?minPos:0;
    for(let p=start;p<cols*rows;p++){const x=p%cols,y=(p/cols)|0;for(const [ww,hh] of (w===h?[[w,h]]:[[w,h],[h,w]])){if(!fits(x,y,ww,hh))continue;set(x,y,ww,hh,1);pos[i]=[x,y,ww,hh];if(rec(k+1,p+1))return true;set(x,y,ww,hh,0);}}
    return false;}
  return rec(0,0)?pos:null;
}
/* 凑齐一套另有加分：物件放在一起，比分开值钱 */
export const SETS=[{nm:'文房四宝',need:['笔','墨','纸','砚'],bonus:8},{nm:'琴棋书画',need:['琴','棋','书','画'],bonus:12}];
export const kindOf=nm=>nm==='论语'||nm==='四书'?'书':nm==='画轴'?'画':nm==='砚台'?'砚':nm;
export function setsOf(list){const have=new Set(list.map(x=>kindOf(x.nm)));return SETS.filter(s=>s.need.every(k=>have.has(k)));}
export function valueOf(list){return list.reduce((s,x)=>s+x.val,0)+setsOf(list).reduce((s,x)=>s+x.bonus,0);}
const pick=(items,m)=>items.filter((_,i)=>m>>i&1);
const sums=(items,m)=>{let kg=0,area=0;items.forEach((x,i)=>{if(m>>i&1){kg+=x.kg;area+=x.w*x.h;}});return{kg,area,val:valueOf(pick(items,m))};};
/* 事后诸葛：知道所有物件之后，最好的带法（一只或两只箱子） */
export function solve(items,boxes){
  const n=items.length,cap=boxes.reduce((s,b)=>s+b.cap,0),room=boxes.reduce((s,b)=>s+b.cols*b.rows,0),subs=[];
  for(let m=0;m<1<<n;m++){const s=sums(items,m);if(s.kg<=cap&&s.area<=room)subs.push([s.val,m]);}
  subs.sort((a,b)=>b[0]-a[0]);
  const cache=boxes.map(()=>new Map());
  const fit=(m,bi)=>{if(cache[bi].has(m))return cache[bi].get(m);const b=boxes[bi],s=sums(items,m);const r=s.kg<=b.cap&&s.area<=b.cols*b.rows?canPack(pick(items,m).map(x=>[x.w,x.h]),b.cols,b.rows):null;cache[bi].set(m,r);return r;};
  const layout=(parts)=>{const place=[];parts.forEach(([mm,pos,bi])=>items.map((_,i)=>i).filter(i=>mm>>i&1).forEach((id,k)=>place.push({id,box:bi,x:pos[k][0],y:pos[k][1],w:pos[k][2],h:pos[k][3]})));return place;};
  for(const [v,m] of subs){
    if(boxes.length===1){const p=fit(m,0);if(p)return{val:v,mask:m,place:layout([[m,p,0]])};continue;}
    for(let a=m;;a=(a-1)&m){const b=m&~a,pa=fit(a,0);if(pa){const pb=fit(b,1);if(pb)return{val:v,mask:m,place:layout([[a,pa,0],[b,pb,1]])};}if(a===0)break;}
  }
  return{val:0,mask:0,place:[]};
}
/* 来者不拒 / 只收「每斤用处」够高的：一件件看，放得下就收（用来检验题目） */
export function onlineGreedy(items,box,accept=()=>true){const chosen=[];let kg=0;
  for(const x of items){if(kg+x.kg>box.cap||!accept(x))continue;const t=chosen.concat([x]);if(canPack(t.map(y=>[y.w,y.h]),box.cols,box.rows)){chosen.push(x);kg+=x.kg;}}
  return valueOf(chosen);}
/* 玩家摆的是否合法：都在格子里、互不重叠、斤两不超 */
export function checkBox(box,placed){const g=new Uint8Array(box.cols*box.rows);let kg=0,val=0;
  for(const p of placed){if(p.x<0||p.y<0||p.x+p.w>box.cols||p.y+p.h>box.rows)return{ok:false,why:'出界'};for(let dy=0;dy<p.h;dy++)for(let dx=0;dx<p.w;dx++){const k=(p.y+dy)*box.cols+p.x+dx;if(g[k])return{ok:false,why:'重叠'};g[k]=1;}kg+=p.kg;val+=p.val;}
  return{ok:kg<=box.cap,kg,val,why:kg>box.cap?'超重':''};}

const I=list=>list.map(([nm,w,h,kg,val,from],id)=>({id,nm,w,h,kg,val,from}));
/* 三回合：亲友一件件递来（次序固定），每件只等几秒 */
export const ROUNDS=[
  {nm:'亲友送行',secs:7,boxes:[{cols:5,rows:4,cap:20,nm:'书箱'}],items:I([
    ['棉被',2,3,6,5,'母亲'],['干粮',2,2,5,7,'父亲'],['雨伞',1,3,3,4,'邻家阿婆'],['论语',1,2,2,6,'先生'],['茶饼',1,1,2,2,'族叔'],['棋',2,2,5,5,'同窗'],
    ['盘缠',1,1,2,7,'父亲'],['剑',1,3,4,5,'友人'],['药箱',1,2,2,6,'母亲'],['灯笼',1,1,1,2,'书童'],['棉袍',2,3,3,8,'母亲'],['四书',2,2,5,10,'先生']])},
  {nm:'文房四宝',secs:6,boxes:[{cols:6,rows:4,cap:24,nm:'书箱'}],items:I([
    ['笔',1,2,1,3,'先生'],['琴',1,4,7,7,'友人'],['干粮',2,2,5,7,'父亲'],['墨',1,1,1,2,'同窗'],['棉被',2,3,6,5,'母亲'],['画轴',1,3,1,4,'族叔'],['纸',1,2,1,2,'同窗'],
    ['剑',1,3,4,5,'友人'],['棋',2,2,5,5,'邻家'],['砚台',1,1,3,4,'先生'],['棉袍',2,3,3,8,'母亲'],['茶饼',1,1,2,2,'族叔'],['四书',2,2,5,10,'先生'],['盘缠',1,1,2,6,'父亲']])},
  {nm:'书童同行',secs:6,boxes:[{cols:6,rows:4,cap:24,nm:'书箱'},{cols:4,rows:3,cap:10,nm:'背篓'}],items:I([
    ['棉被',2,3,6,5,'母亲'],['琴',1,4,7,7,'友人'],['笔',1,2,1,3,'先生'],['干粮',2,2,5,7,'父亲'],['剑',1,3,4,5,'友人'],['墨',1,1,1,2,'同窗'],['棋',2,2,4,5,'邻家'],['雨伞',1,3,3,4,'邻家阿婆'],
    ['纸',1,2,1,2,'同窗'],['论语',1,2,2,6,'先生'],['砚台',1,1,3,4,'先生'],['棉袍',2,3,4,8,'母亲'],['画轴',1,3,1,4,'族叔'],['药箱',1,2,2,6,'母亲'],['四书',2,2,7,10,'先生'],['盘缠',1,1,2,6,'父亲']])}
];
export function gradeRatio(r){return r>=.95?'至妙':r>=.85?'上品':r>=.7?'中品':'下品';}
