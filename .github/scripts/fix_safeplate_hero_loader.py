from pathlib import Path
from PIL import Image
import base64, io

assets=Path('site/assets')
def t(name): return (assets/name).read_text().strip()
# Reassemble the exact approved 1536x1024 source. Five one-character boundaries
# were clipped during the earlier text transfer; part08/pre1 share one boundary.
encoded=(
 t('approved-heroes-source.part01')+
 t('approved-heroes-source.part02')+
 t('approved-heroes-source.part03')+'k'+
 t('approved-heroes-source.part04')+'j'+
 t('approved-heroes-source.part05')+'b'+
 t('approved-heroes-source.part06')+'q'+
 t('approved-heroes-source.part07')+'1'+
 t('approved-heroes-source.part08')+
 t('approved-heroes-source.part09pre1')[1:]+
 t('approved-heroes-source.part09pre2')+
 t('approved-heroes-source.part09pre3')+
 t('approved-heroes-source.part09')+
 t('approved-heroes-source.part10a')+
 t('approved-heroes-source.part10b')+
 t('approved-heroes-source.part10c')+
 t('approved-heroes-source.part10d')+
 t('approved-heroes-source.part10e')+
 t('approved-heroes-source.part10f')+
 t('approved-heroes-source.part11a')+
 t('approved-heroes-source.part11b')
)
print('approved source base64 chars:',len(encoded))
if len(encoded)!=197232: raise SystemExit(f'BAD SOURCE LENGTH {len(encoded)}')
raw=base64.b64decode(encoded,validate=True)
source=Image.open(io.BytesIO(raw)); source.load()
print('APPROVED SOURCE VERIFIED:',source.size,source.format,len(raw),'bytes')
if source.size!=(1536,1024): raise SystemExit(f'UNEXPECTED SOURCE SIZE {source.size}')

boxes=[(0,0,768,516),(770,0,1536,516),(0,518,509,1024),(511,518,1023,1024),(1025,518,1536,1024)]
for i,box in enumerate(boxes,1):
    panel=source.crop(box)
    panel=panel.crop((90,0,panel.width,panel.height))
    tw=1200; th=round(panel.height*tw/panel.width)
    panel=panel.resize((tw,th),Image.Resampling.LANCZOS)
    out=assets/f'public-hero-{i}.webp'
    panel.save(out,'WEBP',quality=90,method=6)
    with Image.open(out) as check:
        check.load()
        print(f'HERO {i} VERIFIED: {check.size[0]}x{check.size[1]}, {out.stat().st_size} bytes, {check.format}')
        if check.size[0]!=1200 or out.stat().st_size<25000: raise SystemExit(f'HERO {i} validation failed')

p=Path('site/public-view-v1.html'); s=p.read_text()
start=s.index('function loadHero(startIndex){'); end=s.index('\nloadHero(chooseHeroIndex());',start)
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
