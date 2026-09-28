/* 长亭（背包问题）的逻辑。不碰 DOM。
   书箱是一格格的：物件形状不一，要摆得下；书生背得动的斤两也有限。两样都满足，看「用处」加起来最多是多少。 */

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
const shapes=(items,m)=>items.filter((_,i)=>m>>i&1).map(x=>[x.w,x.h]);
const sums=(items,m)=>{let kg=0,val=0,area=0;items.forEach((x,i)=>{if(m>>i&1){kg+=x.kg;val+=x.val;area+=x.w*x.h;}});return{kg,val,area};};
/* 一只箱子：斤两与格子都满足时，用处最多的装法 */
export function solveOne(items,box){
  const subs=[];for(let m=0;m<1<<items.length;m++){const s=sums(items,m);if(s.kg<=box.cap&&s.area<=box.cols*box.rows)subs.push([s.val,m]);}
  subs.sort((a,b)=>b[0]-a[0]);
  for(const [v,m] of subs){const pos=canPack(shapes(items,m),box.cols,box.rows);if(pos){const ids=items.map((_,i)=>i).filter(i=>m>>i&1);return{val:v,mask:m,place:ids.map((id,k)=>({id,box:0,x:pos[k][0],y:pos[k][1],w:pos[k][2],h:pos[k][3]}))};}}
  return{val:0,mask:0,place:[]};
}
/* 两只箱子（书箱与书童的背篓） */
export function solveTwo(items,A,B){
  const n=items.length,cache=[new Map(),new Map()];
  const fit=(m,bi)=>{const bx=bi?B:A;if(cache[bi].has(m))return cache[bi].get(m);const s=sums(items,m);const r=s.kg<=bx.cap&&s.area<=bx.cols*bx.rows?canPack(shapes(items,m),bx.cols,bx.rows):null;cache[bi].set(m,r);return r;};
  const subs=[];for(let m=0;m<1<<n;m++){const s=sums(items,m);if(s.kg<=A.cap+B.cap&&s.area<=A.cols*A.rows+B.cols*B.rows)subs.push([s.val,m]);}
  subs.sort((a,b)=>b[0]-a[0]);
  for(const [v,m] of subs)for(let a=m;;a=(a-1)&m){const b=m&~a,pa=fit(a,0);if(pa){const pb=fit(b,1);if(pb){
      const place=[];[[a,pa,0],[b,pb,1]].forEach(([mm,pos,bi])=>items.map((_,i)=>i).filter(i=>mm>>i&1).forEach((id,k)=>place.push({id,box:bi,x:pos[k][0],y:pos[k][1],w:pos[k][2],h:pos[k][3]})));
      return{val:v,place};}}if(a===0)break;}
  return{val:0,place:[]};
}
/* 只看斤两（不管摆不摆得下）时最多的用处：书箱格子不够时，它比真正的最优高 */
export function weightOnly(items,cap){let best=0;for(let m=0;m<1<<items.length;m++){const s=sums(items,m);if(s.kg<=cap)best=Math.max(best,s.val);}return best;}
/* 贪心：按某个次序一件件放，放得下（斤两、格子）就放 */
export function greedy(items,box,key){const order=items.map((_,i)=>i).sort((a,b)=>key(items[b])-key(items[a]));let chosen=[],kg=0;
  for(const i of order){const x=items[i];if(kg+x.kg>box.cap)continue;const t=chosen.concat([i]);if(canPack(t.map(j=>[items[j].w,items[j].h]),box.cols,box.rows)){chosen=t;kg+=x.kg;}}
  return chosen.reduce((s,i)=>s+items[i].val,0);}
/* 玩家摆的是否合法：都在格子里、互不重叠、斤两不超 */
export function checkBox(box,placed){const g=new Uint8Array(box.cols*box.rows);let kg=0,val=0;
  for(const p of placed){if(p.x<0||p.y<0||p.x+p.w>box.cols||p.y+p.h>box.rows)return{ok:false,why:'出界'};for(let dy=0;dy<p.h;dy++)for(let dx=0;dx<p.w;dx++){const k=(p.y+dy)*box.cols+p.x+dx;if(g[k])return{ok:false,why:'重叠'};g[k]=1;}kg+=p.kg;val+=p.val;}
  return{ok:kg<=box.cap,kg,val,why:kg>box.cap?'超重':''};}

const I=(list)=>list.map(([nm,w,h,kg,val],id)=>({id,nm,w,h,kg,val}));
export const R1={nm:'收拾行囊',box:{cols:5,rows:4,cap:20,nm:'书箱'},items:I([['干粮',2,2,6,7],['画轴',1,3,1,5],['琴',1,4,6,9],['茶饼',1,1,2,2],['雨伞',1,3,3,5],['药箱',1,2,2,6],['四书',2,2,5,8],['棉袍',2,3,3,8]])};
export const R2=[
  {nm:'瓜洲渡',secs:45,box:{cols:5,rows:4,cap:18,nm:'书箱'},items:I([['棋',2,2,5,6],['雨伞',1,3,3,4],['剑',1,3,3,6],['画轴',1,3,1,4],['棉袍',2,3,4,5],['干粮',2,2,6,8],['笔墨',1,2,1,4]])},
  {nm:'扬州驿',secs:55,box:{cols:6,rows:4,cap:24,nm:'书箱'},items:I([['干粮',2,2,4,8],['棋',2,2,5,6],['论语',1,2,2,5],['画轴',1,3,1,5],['琴',1,4,8,7],['四书',2,2,5,11],['棉袍',2,3,5,7],['笔墨',1,2,1,4]])},
  {nm:'宿州驿',secs:65,box:{cols:6,rows:4,cap:26,nm:'书箱'},items:I([['论语',1,2,2,5],['棉袍',2,3,4,6],['剑',1,3,4,6],['棋',2,2,5,6],['画轴',1,3,1,4],['四书',2,2,5,8],['琴',1,4,8,8],['笔墨',1,2,1,5],['砚台',1,1,3,5]])}
];
export const R3={nm:'书童同行',boxes:[{cols:6,rows:4,cap:24,nm:'书箱'},{cols:4,rows:3,cap:10,nm:'背篓'}],
  items:I([['干粮',2,2,6,6],['琴',1,4,7,7],['四书',2,2,7,10],['棉袍',2,3,4,8],['论语',1,2,2,4],['盘缠',1,1,2,6],['砚台',1,1,3,5],['茶饼',1,1,2,2],['剑',1,3,3,4],['棋',2,2,4,5],['画轴',1,3,1,4],['笔墨',1,2,1,4]])};
export function gradeRatio(r){return r>=1?'至妙':r>=.9?'上品':r>=.75?'中品':'下品';}
