const REFERENCES={
  'a-fng':{
    url:'https://store.hwofc.com/cdn/shop/files/A-FNGFront.png?v=1695231759',
    referer:'https://store.hwofc.com/',
    label:'Byron White Formulas A-FNG product reference'
  }
};

export default async function(req){
  try{
    const key=new URL(req.url).searchParams.get('key')||'';
    const ref=REFERENCES[key];
    if(!ref)return new Response('Unknown product reference',{status:404});
    const r=await fetch(ref.url,{headers:{
      'User-Agent':'Mozilla/5.0 (compatible; SAFEPLATE/1.3; +https://safeplate-intelligence.netlify.app/)',
      'Accept':'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Referer':ref.referer
    },redirect:'follow'});
    const type=r.headers.get('content-type')||'';
    if(!r.ok||!type.startsWith('image/'))return new Response('Product reference image unavailable',{status:502});
    return new Response(await r.arrayBuffer(),{status:200,headers:{
      'Content-Type':type,
      'Cache-Control':'public, max-age=3600, s-maxage=86400',
      'X-SAFEPLATE-Image-Class':'exact-named-product-reference',
      'X-Content-Type-Options':'nosniff'
    }});
  }catch{
    return new Response('Product reference image unavailable',{status:502});
  }
}

export const config={path:'/api/product-reference-photo'};
