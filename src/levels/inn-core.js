/* 客栈（准入控制 / 收益管理）的逻辑。不碰 DOM。
   四张雅座一夜只坐一轮。散客晌午就来、来得多，每位 10 文；贵客入夜才到，人数说不准。
   规矩：为贵客留 y 座——散客收到只剩 y 座就不再收。 */
import {RNG} from '../core/rng.js';
export const SEATS=4,LOW=10;
export const BASE={nm:'寻常夜',high:50,dist:[.15,.3,.25,.15,.15]};          // 贵客人数 0,1,2,3,≥4 的机会
export const SCENES=[
  {nm:'贵客价廉',hint:'贵客只肯出 25 文',high:25,dist:BASE.dist},
  {nm:'贵客价昂',hint:'贵客一掷 100 文',high:100,dist:BASE.dist},
  {nm:'贵客罕至',hint:'近来贵客少了',high:50,dist:[.45,.3,.15,.07,.03]}
];
export function tailProb(dist,k){let s=0;for(let i=Math.min(k,dist.length);i<dist.length;i++)s+=dist[i];return k<=0?1:s;}
export function expRevenue(y,sc){let r=LOW*(SEATS-y);for(let k=1;k<=y;k++)r+=sc.high*tailProb(sc.dist,k);return r;}
export function bestProtect(sc){let b=0;for(let y=1;y<=SEATS;y++)if(expRevenue(y,sc)>expRevenue(b,sc)+1e-9)b=y;return b;}
/* Littlewood 法则：只要「至少再来 y 位贵客」的机会大于 散客价 ÷ 贵客价，第 y 座就该留 */
export function littlewood(sc){let y=0;while(y<SEATS&&tailProb(sc.dist,y+1)>LOW/sc.high)y++;return y;}
export function sampleHigh(sc,rnd){let x=rnd();for(let i=0;i<sc.dist.length;i++){x-=sc.dist[i];if(x<0)return i<sc.dist.length-1?i:4+Math.floor(rnd()*2);}return 4;}
export function nightRevenue(y,dHigh,sc){return(SEATS-y)*LOW+Math.min(dHigh,y)*sc.high;}
export function simNights(y,sc,n,rnd){let s=0;for(let i=0;i<n;i++)s+=nightRevenue(y,sampleHigh(sc,rnd),sc);return s/n;}
export function innGrade(y,sc){const r=expRevenue(y,sc)/expRevenue(bestProtect(sc),sc);return r>=.99?'至妙':r>=.95?'上品':r>=.85?'中品':'下品';}
/* 第二回「推演一千夜」：每条规矩都推演同样的一千夜（同一串随机数），比较才公平；
   挑一串「不走样」的夜晚——推演出的最高点与期望的最高点一致 */
export function labSeed(rnd){for(let k=0;k<50;k++){const s=1+Math.floor(rnd()*1e6),v=[0,1,2,3,4].map(y=>simNights(y,BASE,1000,RNG(s)));if(v.indexOf(Math.max(...v))===bestProtect(BASE))return s;}return 1;}
