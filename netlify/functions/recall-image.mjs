const ALLOWED_HOSTS=new Set(['www.fda.gov','i5.walmartimages.com']);
const BROWSER_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
export default async (req)=>{
  try{
    const u=new URL(req.url);const raw=u.searchParams.get('url');
    if(!raw)return new Response('Missing url',{status:400});
    const target=new URL(raw);
    if(target.protocol!=='https:'||!ALLOWED_HOSTS.has(target.hostname))return new Response('Blocked image host',{status:403});
    const headers={
      'User-Agent':BROWSER_UA,
      'Accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language':'en-US,en;q=0.9',
      'Cache-Control':'no-cache'
    };
    if(target.hostname==='www.fda.gov')headers.Referer='https://www.fda.gov/';
    const r=await fetch(target,{headers,redirect:'follow'});
    if(!r.ok)return new Response('Image unavailable',{status:502,headers:{'Cache-Control':'no-store'}});
    const type=(r.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(!type.startsWith('image/'))return new Response('Invalid image response',{status:502,headers:{'Cache-Control':'no-store'}});
    const body=await r.arrayBuffer();
    if(!body.byteLength)return new Response('Empty image response',{status:502,headers:{'Cache-Control':'no-store'}});
    return new Response(body,{status:200,headers:{
      'Content-Type':type,
      'Content-Length':String(body.byteLength),
      'Cache-Control':'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      'X-Content-Type-Options':'nosniff'
    }});
  }catch(e){return new Response('Image proxy error',{status:500,headers:{'Cache-Control':'no-store'}});}
};
