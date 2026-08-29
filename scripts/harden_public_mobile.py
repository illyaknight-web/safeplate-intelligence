from pathlib import Path

p = Path('site/public-view-v1.html')
s = p.read_text()
old = """function chooseHeroIndex(){
  const last=Number(sessionStorage.getItem('safeplateHeroIndex'));
  const pool=HEROES.map((_,i)=>i).filter(i=>i!==last);
  const chosen=pool[Math.floor(Math.random()*pool.length)];
  sessionStorage.setItem('safeplateHeroIndex',String(chosen));
  return chosen;
}"""
new = """function chooseHeroIndex(){
  const raw=sessionStorage.getItem('safeplateHeroIndex');
  const chosen=raw===null?0:(Number(raw)+1)%HEROES.length;
  sessionStorage.setItem('safeplateHeroIndex',String(chosen));
  return chosen;
}"""
if old in s:
    s = s.replace(old, new)
s = s.replace("HEROES[index]+'?v=2'", "HEROES[index]+'?v=20260829-meeting'")
mobile = """
@media(max-width:390px){
  .top{flex-wrap:wrap;align-items:center;gap:7px;padding:8px 10px}
  .brand{min-width:0;flex:1 1 155px}
  .brand strong{font-size:17px}.brand small{font-size:8px}.mark{width:36px;height:36px}
  .mode{margin-left:auto;max-width:100%}.mode a{font-size:10px;padding:7px 8px}
  .hero{padding:16px 12px 18px}.hero-copy{padding:10px 0 4px}h1{font-size:clamp(40px,13vw,52px)}
  .hero-photo{min-height:0;aspect-ratio:auto;border-radius:22px;background:#ecefe9}
  .hero-photo img{position:relative;width:100%;height:auto;max-height:none;object-fit:contain;object-position:center;opacity:0}
  .hero-photo img.ready{opacity:1}
  .search-wrap{grid-template-columns:minmax(0,1fr) auto;width:100%}.search-wrap button{white-space:nowrap}
  .quick{grid-template-columns:1fr}.choice{min-height:0}.choice .pic{height:180px}
  .result-head{align-items:flex-start;flex-direction:column}.result-head h3{font-size:30px}
  .cards{grid-template-columns:1fr}.photo-card{min-height:280px}
  footer{padding:20px 12px}
}
@media(max-width:340px){
  .mode{width:100%;display:flex}.mode a{flex:1;text-align:center}
  .search-wrap{grid-template-columns:1fr}.search-wrap button{min-height:44px;padding:10px 14px}
}
"""
if '@media(max-width:390px)' not in s:
    s = s.replace('</style>', mobile + '</style>', 1)
p.write_text(s)
