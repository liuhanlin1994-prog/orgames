/* 打包：把 src/ 下的 ES 模块、样式和子集化的毛笔字体内联成单文件。
   产物：dist/index.html（完整网页，丢到任意静态托管即可）与 dist/artifact.html（去掉外壳的片段）。
   零依赖：只用 Node 自带模块。 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC=path.join(ROOT,'src'),DIST=path.join(ROOT,'dist');
const rd=p=>fs.readFileSync(p,'utf8');

/* 1. 按依赖顺序打包模块：每个模块包进自己的函数作用域，导出挂到 __m 上 */
const order=[],seen=new Set();
function visit(file){
  if(seen.has(file))return;seen.add(file);
  const code=rd(file);
  for(const m of code.matchAll(/^import\s*\{[^}]*\}\s*from\s*'([^']+)';?\s*$/gm))visit(path.resolve(path.dirname(file),m[1]));
  order.push(file);
}
visit(path.join(SRC,'main.js'));
const id=f=>JSON.stringify(path.relative(SRC,f));
/* 读出 export const/let 语句里所有声明的名字（顶层逗号分隔） */
function declNames(code,pos){
  const names=[];let i=pos,depth=0,start=pos,q=null;
  const flush=()=>{const m=code.slice(start,i).match(/^\s*([A-Za-z_$][\w$]*)/);if(m)names.push(m[1]);};
  for(;i<code.length;i++){const ch=code[i];
    if(q){if(ch==='\\'){i++;continue;}if(ch===q)q=null;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){q=ch;continue;}
    if('([{'.includes(ch))depth++;else if(')]}'.includes(ch))depth--;
    else if(depth===0&&ch===','){flush();start=i+1;}
    else if(depth===0&&(ch===';'||ch==='\n')){flush();return names;}}
  flush();return names;
}
let js='const __m={};\n';
for(const f of order){
  let code=rd(f);
  if(/\bimport\s*\{[^}]*\bas\b/.test(code))throw new Error('打包器不支持 import … as：'+f);
  code=code.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
  code=code.replace(/^import\s*\{([^}]*)\}\s*from\s*'([^']+)';?\s*$/gm,(_,names,dep)=>`const {${names}}=__m[${id(path.resolve(path.dirname(f),dep))}];`);
  const exported=[];
  code=code.replace(/^export\s+((?:async\s+)?function\*?|class)\s+([A-Za-z_$][\w$]*)/gm,(_,kw,name)=>{exported.push(name);return kw+' '+name;});
  let m;const re=/^export\s+(const|let)\s+/gm;const decls=[];
  while((m=re.exec(code)))decls.push({at:m.index,len:m[0].length,kw:m[1]});
  for(let k=decls.length-1;k>=0;k--){const d=decls[k];exported.push(...declNames(code,d.at+d.len));code=code.slice(0,d.at)+d.kw+' '+code.slice(d.at+d.len);}
  if(/^\s*export\b/m.test(code))throw new Error('不支持的 export 写法：'+f);
  js+=`\n/* ---- ${path.relative(SRC,f)} ---- */\n__m[${id(f)}]=(()=>{\n${code}\nreturn{${exported.join(',')}};\n})();\n`;
}
js=`(()=>{"use strict";\n${js}\n})();`;
new vm.Script(js,{filename:'bundle.js'});            // 语法检查

/* 2. 字体：检查缺字，必要时自动重新子集化 */
const html=rd(path.join(SRC,'index.html')),css=rd(path.join(SRC,'style.css'));
const need=new Set([...(html.replace(/<!--[\s\S]*?-->/g,'')+js+css.replace(/\/\*[\s\S]*?\*\//g,''))].filter(c=>/[　-〿一-鿿＀-￯]/.test(c)));
const charsFile=path.join(ROOT,'assets','brush.chars.txt');
const have=new Set(fs.existsSync(charsFile)?[...rd(charsFile)]:[]);
let missing=[...need].filter(c=>!have.has(c));
if(missing.length){
  console.log(`毛笔字体缺 ${missing.length} 字：${missing.slice(0,30).join('')}${missing.length>30?'…':''}，尝试重新子集化`);
  try{execSync('python3 build/subset-font.py',{cwd:ROOT,stdio:'inherit'});missing=[];}
  catch(e){console.warn('子集化失败（需要 python3 + fonttools + brotli），缺字将回退到系统楷体');}
}
const woff=path.join(ROOT,'assets','brush.woff2');
const fontCss=fs.existsSync(woff)?`<style>@font-face{font-family:'QJ Brush';src:url(data:font/woff2;base64,${fs.readFileSync(woff).toString('base64')}) format('woff2');font-display:block}</style>\n`:'';
/* 正文宋体：dist/index.html 不连谷歌字体（国内与微信里连不上，会卡住首屏），直接用系统宋体；
   artifact 片段在 claude.ai 上打开，异步加载思源宋体，加载不到也不耽误显示 */
const bodyFont='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap" media="print" onload="this.media=\'all\'">\n';

/* 3. 组装 */
let out=html.replace(/<!--BUILD:FONTS-->[\s\S]*?<!--\/BUILD:FONTS-->/,fontCss)
  .replace('<link rel="stylesheet" href="style.css">',`<style>\n${css}</style>`)
  .replace('<script type="module" src="main.js"></script>',()=>`<script>\n${js}\n</script>`);
fs.mkdirSync(DIST,{recursive:true});
fs.writeFileSync(path.join(DIST,'index.html'),out);
/* artifact 片段：去掉 doctype/html/head/body，只留内容 */
const head=out.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset="utf-8">\s*/,'').replace(/<meta name="viewport"[^>]*>\s*/,'');
const body=out.match(/<body>([\s\S]*?)<\/body>/)[1];
const title=head.match(/<title>[\s\S]*?<\/title>/)[0];
fs.writeFileSync(path.join(DIST,'artifact.html'),title+'\n'+bodyFont+head.replace(title,'')+body);
const kb=f=>Math.round(fs.statSync(path.join(DIST,f)).size/1024);
console.log(`dist/index.html ${kb('index.html')} KB · dist/artifact.html ${kb('artifact.html')} KB · ${order.length} 个模块`);
