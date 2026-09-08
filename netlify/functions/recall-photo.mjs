function escapeRe(s){return String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function abs(raw,base){try{return new URL(raw,base).toString()}catch{return null}}
function decodeHtml(s){return String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function imageCandidates(html,base){
  const marker=Math.max(html.search(/Product\s+Photos/i),html.search(/View\s+Product\s+Photos/i));
  const tail=marker>=0?html.slice(marker):html;
  const out=[];
  for(const m of tail.matchAll(/<img\b[^>]*>/gi)){
    const tag=m[0],src=(tag.match(/(?:src|data-src)=["']([^"']+)["']/i)||[])[1];
    if(!src)continue;
    const alt=decodeHtml((tag.match(/alt=["']([^"']*)["']/i)||[])[1]||'');
    const u=abs(decodeHtml(src),base);if(!u||!/^https:\/\//i.test(u))continue;
    if(/logo|icon|seal|social|spinner|placeholder/i.test(`${alt} ${u}`))continue;
    out.push({u,score:(/product|salad|cream|powder|berry|package|label|recall/i.test(alt)?4:0)+(marker>=0?3:0)});
  }
  return out.sort((a,b)=>b.score-a.score).map(x=>x.u);
}
export default async req=>{
  try{
    const q=new URL(req.url).searchParams.get('source');
    if(!q)return new Response('Missing source',{status:400});
    const source=new URL(q);
    if(source.protocol!=='https:'||!/(^|\.)fda\.gov$/i.test(source.hostname))return new Response('Unsupported source',{status:403});
    const page=await fetch(source,{headers:{'User-Agent':'SAFEPLATE/1.0 Function Media LLC','Accept':'text/html,application/xhtml+xml'},redirect:'follow'});
    if(!page.ok)return new Response('Official source unavailable',{status:502});
    const html=await page.text(),candidates=imageCandidates(html,source.toString());
    for(const u of candidates.slice(0,12)){
      try{
        const r=await fetch(u,{headers:{'User-Agent':'SAFEPLATE/1.0 Function Media LLC','Accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'},redirect:'follow'});
        const type=r.headers.get('content-type')||'';
        if(r.ok&&type.startsWith('image/'))return new Response(await r.arrayBuffer(),{status:200,headers:{'Content-Type':type,'Cache-Control':'public, max-age=1800, s-maxage=21600'}})
      }catch{}
    }
    return new Response('Official package image unavailable',{status:404});
  }catch{return new Response('Image resolver error',{status:500})}
};
export const config={path:'/api/recall-photo'};
