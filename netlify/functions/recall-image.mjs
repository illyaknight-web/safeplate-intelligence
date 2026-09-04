const ALLOWED_HOSTS=new Set(['www.fda.gov','i5.walmartimages.com']);
export default async (req)=>{
  try{
    const u=new URL(req.url);const raw=u.searchParams.get('url');
    if(!raw)return new Response('Missing url',{status:400});
    const target=new URL(raw);
    if(target.protocol!=='https:'||!ALLOWED_HOSTS.has(target.hostname))return new Response('Blocked image host',{status:403});
    const r=await fetch(target,{headers:{'User-Agent':'SAFEPLATE/1.0 Function Media LLC','Accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'},redirect:'follow'});
    if(!r.ok)return new Response('Image unavailable',{status:502});
    const type=r.headers.get('content-type')||'image/jpeg';
    if(!type.startsWith('image/'))return new Response('Invalid image response',{status:502});
    const body=await r.arrayBuffer();
    return new Response(body,{status:200,headers:{'Content-Type':type,'Cache-Control':'public, max-age=86400, s-maxage=604800','Access-Control-Allow-Origin':'*'}});
  }catch(e){return new Response('Image proxy error',{status:500});}
};
