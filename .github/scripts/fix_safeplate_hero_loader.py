from pathlib import Path
from PIL import Image
import base64, io

assets = Path('site/assets')
parts = [
    'approved-heroes-source.part01','approved-heroes-source.part02','approved-heroes-source.part03',
    'approved-heroes-source.part04','approved-heroes-source.part05','approved-heroes-source.part06',
    'approved-heroes-source.part07','approved-heroes-source.part08','approved-heroes-source.part09',
    'approved-heroes-source.part09pre1','approved-heroes-source.part09pre2','approved-heroes-source.part09pre3',
    'approved-heroes-source.part10a','approved-heroes-source.part10b','approved-heroes-source.part10c',
    'approved-heroes-source.part10d','approved-heroes-source.part10e','approved-heroes-source.part10f',
    'approved-heroes-source.part11a','approved-heroes-source.part11b'
]
chunks=[]
for name in parts:
    t=(assets/name).read_text().strip()
    chunks.append(t)
    print(name, len(t), t[:16], t[-16:])
encoded=''.join(chunks)
print('approved source base64 chars:', len(encoded))
raw=base64.b64decode(encoded, validate=True)
source=Image.open(io.BytesIO(raw)); source.load()
print('approved source:', source.size, source.format)
if source.size != (1536,1024): raise SystemExit(f'UNEXPECTED SOURCE SIZE {source.size}')
boxes=[(0,0,768,516),(770,0,1536,516),(0,518,509,1024),(511,518,1023,1024),(1025,518,1536,1024)]
for i,box in enumerate(boxes,1):
    panel=source.crop(box).crop((90,0,source.crop(box).width,source.crop(box).height))
    target_w=1200; target_h=round(panel.height*target_w/panel.width)
    panel=panel.resize((target_w,target_h),Image.Resampling.LANCZOS)
    out=assets/f'public-hero-{i}.webp'; panel.save(out,'WEBP',quality=90,method=6)
    with Image.open(out) as check:
        check.load(); print(f'HERO {i}: {check.size}, {out.stat().st_size} bytes')
        if check.size[0]!=1200 or out.stat().st_size<25000: raise SystemExit(f'HERO {i} validation failed')
p=Path('site/public-view-v1.html'); s=p.read_text(); start=s.index('function loadHero(startIndex){'); end=s.index('\nloadHero(chooseHeroIndex());',start)
new='''function loadHero(startIndex){
  let attempts=0;
  const tryIndex=(index)=>{
    const src=HEROES[index]+'?v=20260829-approved-final';
    heroImage.classList.remove('ready');
    heroImage.onload=()=>{heroImage.classList.add('ready');heroImage.onload=null;heroImage.onerror=null;};
    heroImage.onerror=()=>{attempts++;if(attempts<HEROES.length)tryIndex((index+1)%HEROES.length);};
    heroImage.src=src;
    if(heroImage.complete&&heroImage.naturalWidth>0)heroImage.classList.add('ready');
  };
  tryIndex(startIndex);
}'''
s=s[:start]+new+s[end:]
if 'scroll-padding-top:86px' not in s:s=s.replace('@media(max-width:390px){','html{scroll-padding-top:86px}\n@media(max-width:390px){',1)
if '.hero-copy{padding:26px 0;position:relative;z-index:1}' not in s:s=s.replace('.hero-copy{padding:26px 0}', '.hero-copy{padding:26px 0;position:relative;z-index:1}',1)
p.write_text(s)
print('ALL FIVE APPROVED HEROES REBUILT, DECODED, AND LOADER PATCHED')
