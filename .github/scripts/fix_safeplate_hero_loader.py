from pathlib import Path
from PIL import Image
import base64, io

assets=Path('site/assets')
def t(name): return (assets/name).read_text().strip()

# Reassemble the confirmed five-image source board already stored in the repo.
# The boundary repairs below restore the exact 197232-character base64 payload.
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
if len(encoded)!=197232: raise SystemExit(f'BAD SOURCE LENGTH {len(encoded)}')
raw=base64.b64decode(encoded,validate=True)
source=Image.open(io.BytesIO(raw)); source.load()
if source.size!=(1536,1024): raise SystemExit(f'UNEXPECTED SOURCE SIZE {source.size}')
print('CONFIRMED SOURCE VERIFIED:',source.size,source.format,len(raw),'bytes')

# These are the same panel boxes and left-edge badge removal used when the five
# confirmed separate files were prepared for the user. Output at 1800 px wide.
boxes=[(0,0,768,516),(770,0,1536,516),(0,518,509,1024),(511,518,1023,1024),(1025,518,1536,1024)]
expected=[(1800,1370),(1800,1374),(1800,2174),(1800,2158),(1800,2163)]
for i,(box,want) in enumerate(zip(boxes,expected),1):
    panel=source.crop(box)
    panel=panel.crop((90,0,panel.width,panel.height))
    panel=panel.resize(want,Image.Resampling.LANCZOS)
    out=assets/f'public-hero-{i}-confirmed.jpg'
    panel.save(out,'JPEG',quality=96,optimize=True,progressive=False,subsampling=0)
    with Image.open(out) as check:
        check.load()
        if check.size!=want or check.format!='JPEG' or out.stat().st_size<100000:
            raise SystemExit(f'HERO {i} validation failed: {check.size} {check.format} {out.stat().st_size}')
        print(f'CONFIRMED HERO {i}: {check.size[0]}x{check.size[1]}, {out.stat().st_size} bytes, JPEG')

p=Path('site/public-view-v1.html')
s=p.read_text()
# Point every hero slot to the five confirmed separate JPEG files.
old="const HEROES=['/assets/public-hero-1.webp','/assets/public-hero-2.webp','/assets/public-hero-3.webp','/assets/public-hero-4.webp','/assets/public-hero-5.webp'];"
new="const HEROES=['/assets/public-hero-1-confirmed.jpg','/assets/public-hero-2-confirmed.jpg','/assets/public-hero-3-confirmed.jpg','/assets/public-hero-4-confirmed.jpg','/assets/public-hero-5-confirmed.jpg'];"
if old in s:
    s=s.replace(old,new)
elif new not in s:
    raise SystemExit('HEROES array not found')
# Ensure the secondary food-knowledge image uses the same confirmed hero 1.
s=s.replace('/assets/public-hero-1.webp','/assets/public-hero-1-confirmed.jpg')
# Force a new cache key so iPhone/Safari cannot reuse corrupted prior assets.
s=s.replace("+'?v=20260829-approved-final'","+'?v=20260829-confirmed-five-v2'")
p.write_text(s)
print('HTML PATCHED TO THE FIVE CONFIRMED SEPARATE HERO FILES')
