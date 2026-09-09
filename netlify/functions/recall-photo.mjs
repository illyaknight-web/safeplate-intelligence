function abs(raw,base){try{return new URL(raw,base).toString()}catch{return null}}
function decodeHtml(s){return String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')}
function clean(s){return decodeHtml(String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim()}
function field(text,label,nextLabels){
  const stop=(nextLabels||['FDA Publish Date','Product Type','Reason for Announcement','Company Name','Brand Name','Product Description','Company Announcement']).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const rx=new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*:?\\s*(.+?)(?=\\s+(?:'+stop+')\\s*:|$)','i');
  return (text.match(rx)||[])[1]?.trim()||'';
}
function imageCandidates(html,base){
  const marker=html.search(/<h[1-6][^>]*>[^<]*Product\s+Photos[^<]*<\/h[1-6]>/i);
  const tail=marker>=0?html.slice(marker):html;
  const end=tail.slice(1).search(/<h2\b/i);const section=end>=0?tail.slice(0,end+1):tail.slice(0,50000);
  const out=[];
  const add=(raw,caption='',score=0)=>{const u=abs(decodeHtml(raw),base);if(!u||!/^https:\/\//i.test(u))return;if(/logo|icon|seal|social|spinner|placeholder/i.test(`${caption} ${u}`))return;if(!out.some(x=>x.u===u))out.push({u,score})};
  for(const m of section.matchAll(/<img\b[^>]*>/gi)){
    const tag=m[0],src=(tag.match(/(?:src|data-src)=["']([^"']+)["']/i)||[])[1],srcset=(tag.match(/srcset=["']([^"']+)["']/i)||[])[1];
    const alt=decodeHtml((tag.match(/alt=["']([^"']*)["']/i)||[])[1]||'');
    if(src)add(src,alt,8);if(srcset){const first=srcset.split(',')[0]?.trim().split(/\s+/)[0];if(first)add(first,alt,7)}
  }
  for(const m of section.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    const href=m[1],caption=clean(m[2]);
    if(/\/files\/(?:styles\/[^/]+\/)?public\//i.test(href)||/\.(?:png|jpe?g|webp)(?:\?|$)/i.test(href))add(href,caption,10);
  }
  return out.sort((a,b)=>b.score-a.score).map(x=>x.u);
}
function metadata(html,source){
  const text=clean(html);
  const companyDate=(text.match(/Company Announcement Date\s*:?\s*([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i)||[])[1]||'';
  const publishDate=(text.match(/FDA Publish Date\s*:?\s*([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i)||[])[1]||'';
  const company=(text.match(/Company Name\s*:?\s*(.+?)(?=\s+Brand Name\b|\s+Product Description\b)/i)||[])[1]?.trim()||'';
  const brand=(text.match(/Brand Name(?:\(s\))?\s*:?\s*(.+?)(?=\s+Product Description\b)/i)||[])[1]?.replace(/^Brand Name\(s\)\s*/i,'').trim()||'';
  const product=(text.match(/Product Description\s*:?\s*(.+?)(?=\s+Company Announcement\b|\s+Reason for Announcement\b|\s+\* \* \*)/i)||[])[1]?.replace(/^Product Description\s*/i,'').trim()||'';
  const terminated=/recall has been completed and FDA has terminated this recall/i.test(text);
  const images=imageCandidates(html,source);
  return {companyAnnouncementDate:companyDate||null,fdaPublishDate:publishDate||null,officialDate:companyDate||publishDate||null,company:company||null,brand:brand||null,productDescription:product||null,terminated,imageUrl:images[0]||null,imageCount:images.length};
}
export default async req=>{
  try{
    const params=new URL(req.url).searchParams,q=params.get('source'),image=params.get('image'),mode=params.get('mode')||'image';
    if(!q)return new Response('Missing source',{status:400});
    const source=new URL(q);
    if(source.protocol!=='https:'||!/(^|\.)fda\.gov$/i.test(source.hostname))return new Response('Unsupported source',{status:403});
    if(image){
      const asset=new URL(image);
      if(asset.protocol!=='https:'||!/(^|\.)fda\.gov$/i.test(asset.hostname)||!asset.pathname.startsWith('/files/'))return new Response('Unsupported image',{status:403});
      const r=await fetch(asset,{headers:{'User-Agent':'Mozilla/5.0 (compatible; SAFEPLATE/1.1; +https://safeplate-intelligence.netlify.app/)','Accept':'image/avif,image/webp,image/apng,image/*,*/*;q=0.8','Referer':source.toString()},redirect:'follow'}),type=r.headers.get('content-type')||'';
      if(!r.ok||!type.startsWith('image/'))return new Response('Official package image unavailable',{status:502});
      return new Response(await r.arrayBuffer(),{status:200,headers:{'Content-Type':type,'Cache-Control':'public, max-age=1800, s-maxage=21600'}});
    }
    const page=await fetch(source,{headers:{'User-Agent':'Mozilla/5.0 (compatible; SAFEPLATE/1.1; +https://safeplate-intelligence.netlify.app/)','Accept':'text/html,application/xhtml+xml'},redirect:'follow'});
    if(!page.ok)return new Response('Official source unavailable',{status:502});
    const html=await page.text(),meta=metadata(html,source.toString());
    if(mode==='meta')return Response.json({...meta,source:source.toString()},{headers:{'Cache-Control':'public, max-age=300, s-maxage=1800'}});
    const candidates=imageCandidates(html,source.toString());
    for(const u of candidates.slice(0,16)){
      try{
        const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0 (compatible; SAFEPLATE/1.1; +https://safeplate-intelligence.netlify.app/)','Accept':'image/avif,image/webp,image/apng,image/*,*/*;q=0.8','Referer':source.toString()},redirect:'follow'});
        const type=r.headers.get('content-type')||'';
        if(r.ok&&type.startsWith('image/'))return new Response(await r.arrayBuffer(),{status:200,headers:{'Content-Type':type,'Cache-Control':'public, max-age=1800, s-maxage=21600'}})
      }catch{}
    }
    return new Response('Official package image unavailable',{status:404});
  }catch(e){return new Response('Image resolver error',{status:500})}
};
export const config={path:'/api/recall-photo'};
