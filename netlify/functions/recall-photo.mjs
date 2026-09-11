function abs(raw,base){try{return new URL(raw,base).toString()}catch{return null}}
function decodeHtml(s){return String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')}
function clean(s){return decodeHtml(String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim()}
const TRUSTED_SOURCE_HOSTS=[/(^|\.)fda\.gov$/i,/(^|\.)fsis\.usda\.gov$/i,/(^|\.)usda\.gov$/i];
const TRUSTED_ASSET_HOSTS=[...TRUSTED_SOURCE_HOSTS,/(^|\.)amazonaws\.com$/i,/(^|\.)cloudfront\.net$/i];
function trusted(host,asset=false){return (asset?TRUSTED_ASSET_HOSTS:TRUSTED_SOURCE_HOSTS).some(rx=>rx.test(host))}
function imageCandidates(html,base){
  const out=[];
  const marker=html.search(/<h[1-6][^>]*>[^<]*(?:Product\s+Photos?|Product\s+Images?|Labels?|Photos?)[^<]*<\/h[1-6]>/i);
  const tail=marker>=0?html.slice(marker):html;
  const end=tail.slice(1).search(/<h[1-2]\b/i);
  const primary=end>=0?tail.slice(0,end+1):tail.slice(0,70000);
  const sections=[{html:primary,bonus:20},{html:html.slice(0,140000),bonus:0}];
  const add=(raw,caption='',score=0)=>{
    const u=abs(decodeHtml(raw),base);if(!u||!/^https:\/\//i.test(u))return;
    if(/logo|icon|seal|social|spinner|placeholder|sprite|favicon|banner/i.test(`${caption} ${u}`))return;
    let host='';try{host=new URL(u).hostname}catch{return}
    if(!trusted(host,true))return;
    if(!out.some(x=>x.u===u))out.push({u,score,caption});
  };
  for(const section of sections){
    for(const m of section.html.matchAll(/<img\b[^>]*>/gi)){
      const tag=m[0],src=(tag.match(/(?:src|data-src|data-original)=["']([^"']+)["']/i)||[])[1],srcset=(tag.match(/srcset=["']([^"']+)["']/i)||[])[1];
      const alt=decodeHtml((tag.match(/alt=["']([^"']*)["']/i)||[])[1]||'');
      let score=6+section.bonus;if(/product|package|label|recalled|recall/i.test(`${alt} ${src||''}`))score+=8;
      if(src)add(src,alt,score);
      if(srcset){for(const candidate of srcset.split(',').slice(0,3)){const u=candidate.trim().split(/\s+/)[0];if(u)add(u,alt,score-1)}}
    }
    for(const m of section.html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
      const href=m[1],caption=clean(m[2]);
      if(/\.(?:png|jpe?g|webp)(?:\?|$)/i.test(href)||/\/files\/(?:styles\/[^/]+\/)?public\//i.test(href))add(href,caption,12+section.bonus);
    }
  }
  return out.sort((a,b)=>b.score-a.score);
}
function metadata(html,source){
  const text=clean(html),images=imageCandidates(html,source);
  const companyDate=(text.match(/Company Announcement Date\s*:?\s*([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i)||[])[1]||'';
  const publishDate=(text.match(/FDA Publish Date\s*:?\s*([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i)||[])[1]||'';
  const recallDate=(text.match(/Recall Date\s*:?\s*([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i)||[])[1]||'';
  return {officialDate:companyDate||publishDate||recallDate||null,imageUrl:images[0]?.u||null,imageCount:images.length,images:images.slice(0,12).map(x=>({url:x.u,caption:x.caption||null,verified:true}))};
}
async function fetchImage(url,referer){
  const asset=new URL(url);if(asset.protocol!=='https:'||!trusted(asset.hostname,true))return null;
  const r=await fetch(asset,{headers:{'User-Agent':'Mozilla/5.0 (compatible; SAFEPLATE/1.2; +https://safeplate-intelligence.netlify.app/)','Accept':'image/avif,image/webp,image/apng,image/*,*/*;q=0.8','Referer':referer},redirect:'follow'});
  const finalUrl=new URL(r.url||asset.toString());if(!trusted(finalUrl.hostname,true))return null;
  const type=r.headers.get('content-type')||'';if(!r.ok||!type.startsWith('image/'))return null;
  return new Response(await r.arrayBuffer(),{status:200,headers:{'Content-Type':type,'Cache-Control':'public, max-age=1800, s-maxage=21600','X-SAFEPLATE-Image-Source':'verified-government-source'}});
}
export default async req=>{
  try{
    const params=new URL(req.url).searchParams,q=params.get('source'),image=params.get('image'),mode=params.get('mode')||'image';
    if(!q)return new Response('Missing source',{status:400});
    const source=new URL(q);
    if(source.protocol!=='https:'||!trusted(source.hostname,false))return new Response('Unsupported source',{status:403});
    if(image){const response=await fetchImage(image,source.toString());return response||new Response('Official package image unavailable',{status:502})}
    const page=await fetch(source,{headers:{'User-Agent':'Mozilla/5.0 (compatible; SAFEPLATE/1.2; +https://safeplate-intelligence.netlify.app/)','Accept':'text/html,application/xhtml+xml'},redirect:'follow'});
    const finalSource=new URL(page.url||source.toString());if(!trusted(finalSource.hostname,false))return new Response('Unsupported redirect',{status:403});
    if(!page.ok)return new Response('Official source unavailable',{status:502});
    const html=await page.text(),meta=metadata(html,finalSource.toString());
    if(mode==='meta')return Response.json({...meta,source:finalSource.toString()},{headers:{'Cache-Control':'public, max-age=300, s-maxage=1800'}});
    for(const candidate of imageCandidates(html,finalSource.toString()).slice(0,24)){
      try{const response=await fetchImage(candidate.u,finalSource.toString());if(response)return response}catch{}
    }
    return new Response('Official package image unavailable',{status:404});
  }catch(e){return new Response('Image resolver error',{status:500})}
};
export const config={path:'/api/recall-photo'};
