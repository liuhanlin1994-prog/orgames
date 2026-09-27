# 千里江山 · 运筹录

水墨风格的运筹学闯关游戏，是「运筹奇境」的重做版。关卡地图是一幅自右向左展开的长卷，参透一处，那一段画卷就从水墨着上青绿，再钤一方印。全部画面和配乐都由代码生成，没有一张图片、一个音频文件。

**直接玩**：用浏览器打开 [`dist/index.html`](dist/index.html)。要给学生玩，把这一个文件上传到任意静态托管（Cloudflare Pages、腾讯云 COS 等）即可。

## 现在能玩的三关

| 地点 | 概念 | 三回合 |
|---|---|---|
| 茶寮 | 统筹方法（关键路径） | 一壶茶：按先后点工序 → 三枚「巧」字签：快在哪里才有用，关键路径何时转移 |
| 马市 | 最优停止 | 亲自相马 → 定规矩，推演一千次 → 一百匹马，找到 37% |
| 七洲洋 | 旅行商 | 凭直觉落笔 → 替老舵工解明结、暗结 → 29 座岛用「就近」「解结」巧解 |

另外八处题签已经在长卷上，点开可以看到每关的故事、玩法和顿悟设计；「终卷预览」可以看全卷上色后的样子。

## 目录

```
src/
  index.html  style.css  main.js     外壳与入口
  scroll.js                          长卷：构图、分块渲染、拖动、题签、上色、云气飞鸟
  core/ink.js                        笔墨引擎：宣纸、干湿笔、山石皴擦、点景、茶具、写意马、印章
  core/audio.js                      配乐与音效（Web Audio 合成）
  core/ui.js  core/rng.js            关卡通用界面、随机数与噪声
  levels/registry.js                 十一处题签的文案
  levels/<关卡>.js / <关卡>-core.js   每关的界面 / 纯逻辑（可在 Node 里测试）
tests/                               用每关自己的模拟验证文案里的每条结论
build/build.mjs                      打包成单文件 dist/index.html（零依赖）
build/subset-font.py                 毛笔字体按用到的字子集化
assets/brush.woff2                   子集化后的马善政楷书（SIL OFL 1.1）
docs/                                方案与原版试玩记录
```

## 开发

```bash
npm test            # 13 项模拟测试（Node 22+，无需安装依赖）
npm run build       # 生成 dist/index.html 与 dist/artifact.html
npm run dev         # 在仓库根目录起静态服务，打开 http://localhost:8000/src/ 直接调试源码
```

打包时会检查毛笔字体是否缺字；缺字会自动调用 `build/subset-font.py` 重新子集化（需要 `pip install fonttools brotli`）。

## 配乐

D 宫五声调式，64 拍每分钟。笙铺和声、古筝分解和弦与刮奏、箫吹旋律、低音琴弦打底，偶有碰铃。曲式为引子 → A → B → A′ → 间奏，循环时重新挑和弦走向和旋律乐句；进入关卡后换成更安静的编排。音效都在同一调式里，和配乐不打架。

## 致谢

- 字体：马善政楷书（Ma Shan Zheng，SIL Open Font License 1.1）、思源宋体（Noto Serif SC）
- 泡茶的例子出自华罗庚《统筹方法》；丁谓修宫见沈括《梦溪笔谈》
- 制作：刘翰林 @ SUSTech · Claude
