from pathlib import Path
from PIL import Image

for i in range(1, 6):
    p = Path(f"site/assets/public-hero-{i}.webp")
    if not p.exists():
        raise SystemExit(f"MISSING {p}")
    with Image.open(p) as im:
        im.load()
        w, h = im.size
        print(f"HERO {i}: {w}x{h}, {p.stat().st_size} bytes, {im.format}")
        if w < 250 or h < 250:
            raise SystemExit(f"HERO {i} too small: {w}x{h}")

p = Path("site/public-view-v1.html")
s = p.read_text()
start = s.index("function loadHero(startIndex){")
end = s.index("\nloadHero(chooseHeroIndex());", start)
new = '''function loadHero(startIndex){
  let attempts=0;
  const tryIndex=(index)=>{
    const src=HEROES[index]+'?v=20260829-final-hero-2';
    heroImage.classList.remove('ready');
    heroImage.onload=()=>{
      heroImage.classList.add('ready');
      heroImage.onload=null;
      heroImage.onerror=null;
    };
    heroImage.onerror=()=>{
      attempts++;
      if(attempts<HEROES.length) tryIndex((index+1)%HEROES.length);
    };
    heroImage.src=src;
    if(heroImage.complete && heroImage.naturalWidth>0){
      heroImage.classList.add('ready');
    }
  };
  tryIndex(startIndex);
}'''
s = s[:start] + new + s[end:]
if "scroll-padding-top:86px" not in s:
    s = s.replace("@media(max-width:390px){", "html{scroll-padding-top:86px}\n@media(max-width:390px){", 1)
if ".hero-copy{padding:26px 0;position:relative;z-index:1}" not in s:
    s = s.replace(".hero-copy{padding:26px 0}", ".hero-copy{padding:26px 0;position:relative;z-index:1}", 1)
p.write_text(s)
print("ALL FIVE HERO FILES DECODE; LOADER PATCHED")
