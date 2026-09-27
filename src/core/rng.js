/* 随机数与噪声：同一种子永远画出同一幅画 */
export function RNG(seed){
  return function(){
    seed|=0;seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return((t^t>>>14)>>>0)/4294967296;
  };
}
export function Noise1(r){
  const g=new Float32Array(1024);for(let i=0;i<1024;i++)g[i]=r();
  return x=>{const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return g[i&1023]*(1-u)+g[(i+1)&1023]*u;};
}
export function fbm(n,x,o){let a=0,amp=1,fr=1,s=0;for(let k=0;k<o;k++){a+=amp*n(x*fr+k*31.7);s+=amp;amp*=.5;fr*=2.03;}return a/s;}
export function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
