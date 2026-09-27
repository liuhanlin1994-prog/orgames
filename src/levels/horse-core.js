/* 马市（最优停止）的逻辑。不碰 DOM。
   规则：n 匹马依次过，每匹只能当场买或放走；先只看不买 k 匹，之后遇到比前面都好的就买；
   都没遇到就只好买最后一匹。胜 = 买到全场最好的那匹。 */

export function stopWinExact(n,k){if(k<=0)return 1/n;let s=0;for(let i=k+1;i<=n;i++)s+=1/(i-1);return k/n*s;}
export function stopBestK(n){let bk=0,bp=0;for(let k=0;k<n;k++){const p=stopWinExact(n,k);if(p>bp){bp=p;bk=k;}}return{k:bk,p:bp};}
/* 推演 trials 次，返回每次是否得到最好的那匹（Uint8Array） */
export function stopSimulate(n,k,trials,rnd){
  const out=new Uint8Array(trials),v=new Float64Array(n);
  for(let t=0;t<trials;t++){
    let best=-1,bi=0;for(let i=0;i<n;i++){v[i]=rnd();if(v[i]>best){best=v[i];bi=i;}}
    let th=-1;for(let i=0;i<k;i++)if(v[i]>th)th=v[i];
    let pick=n-1;for(let i=k;i<n;i++)if(v[i]>th){pick=i;break;}
    out[t]=pick===bi?1:0;
  }
  return out;
}
export function stopGrade(n,k){const r=stopWinExact(n,k)/stopBestK(n).p;return r>=.99?'至妙':r>=.9?'上品':r>=.7?'中品':'下品';}
/* 在已看过的里排第几（1 = 最好） */
export function relRank(vals,i){let r=1;for(let j=0;j<i;j++)if(vals[j]>vals[i])r++;return r;}
