"""把毛笔字体（马善政楷书，OFL 授权）按源码里实际用到的字子集化成 assets/brush.woff2。
用法：python3 build/subset-font.py        需要：pip install fonttools brotli
改了文案、出现新字时重跑一次；build.mjs 发现缺字会提示。"""
import os, re, sys, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
CACHE = os.path.join(ROOT, 'build', '.cache')
TTF = os.path.join(CACHE, 'MaShanZheng-Regular.ttf')
URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf'

def used_chars():
    chars = set('0123456789.·—–-+×%′″/,:;!?()[]「」『』《》〈〉“”‘’、，。：；！？（）…·　')
    for d, _, fs in os.walk(SRC):
        for f in fs:
            if f.endswith(('.js', '.html', '.css')) and not f.startswith('_'):
                t = open(os.path.join(d, f), encoding='utf-8').read()
                t = re.sub(r'/\*[\s\S]*?\*/', '', t)
                t = re.sub(r'(?m)^\s*//.*$', '', t)
                t = re.sub(r'<!--[\s\S]*?-->', '', t)
                chars.update(c for c in t if re.match(r'[　-〿一-鿿＀-￯]', c))
    return ''.join(sorted(chars))

def main():
    from fontTools import subset
    from fontTools.ttLib import TTFont
    if not os.path.exists(TTF):
        os.makedirs(CACHE, exist_ok=True)
        print('下载字体…', URL)
        urllib.request.urlretrieve(URL, TTF)
    text = used_chars()
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']
    font = TTFont(TTF); s = subset.Subsetter(opts); s.populate(text=text); s.subset(font)
    font.flavor = 'woff2'; out = os.path.join(ROOT, 'assets', 'brush.woff2'); font.save(out)
    open(os.path.join(ROOT, 'assets', 'brush.chars.txt'), 'w', encoding='utf-8').write(text)
    print(f'{len(text)} 字 → {out}（{os.path.getsize(out)//1024} KB）')

if __name__ == '__main__':
    main()
