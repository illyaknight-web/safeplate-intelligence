const UPSTREAM='https://translate.argosopentech.com/translate';
const GOOGLE_FALLBACK='https://translate.googleapis.com/translate_a/single';
const GOOGLE_CODE={zt:'zh-TW',zh:'zh-CN',tl:'tl'};
const ALLOWED=new Set(['es','fr','pt','zh','zt','ko','vi','ru','ar','bn','hi','tl','ja','de','it','pl','uk','tr','fa','he','th','id','sw','nl','el','ro','sv','cs','fi']);

async function argosTranslate(text,target){
  const r=await fetch(UPSTREAM,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({q:text,source:'en',target,format:'text'})});
  if(!r.ok)throw new Error(`argos ${r.status}`);
  const data=await r.json();
  if(!data||typeof data.translatedText!=='string'||!data.translatedText.trim())throw new Error('invalid Argos response');
  return data.translatedText;
}
async function googleTranslate(text,target){
  const tl=GOOGLE_CODE[target]||target;
  const u=new URL(GOOGLE_FALLBACK);u.searchParams.set('client','gtx');u.searchParams.set('sl','en');u.searchParams.set('tl',tl);u.searchParams.set('dt','t');u.searchParams.set('q',text);
  const r=await fetch(u,{headers:{'accept':'application/json','user-agent':'SAFEPLATE/1.0'}});
  if(!r.ok)throw new Error(`fallback ${r.status}`);
  const data=await r.json();
  const translated=Array.isArray(data?.[0])?data[0].map(x=>Array.isArray(x)?x[0]:'').join(''):'';
  if(!translated.trim())throw new Error('invalid fallback response');
  return translated;
}
async function translateOne(text,target){
  try{return await argosTranslate(text,target)}catch{return await googleTranslate(text,target)}
}

export default async function(req){
  if(req.method!=='POST')return Response.json({error:'POST required'},{status:405});
  let body;
  try{body=await req.json()}catch{return Response.json({error:'Invalid JSON'},{status:400})}
  const target=String(body?.target||'').toLowerCase();
  if(!ALLOWED.has(target))return Response.json({error:'Unsupported language'},{status:400});
  const texts=Array.isArray(body?.texts)?body.texts:[];
  if(!texts.length||texts.length>140)return Response.json({error:'texts must contain 1-140 items'},{status:400});
  const clean=texts.map(v=>String(v??'').slice(0,600));
  if(clean.reduce((n,v)=>n+v.length,0)>24000)return Response.json({error:'Translation request too large'},{status:413});
  const out=new Array(clean.length);
  let partial=false;
  for(let i=0;i<clean.length;i+=6){
    const batch=clean.slice(i,i+6);
    const translated=await Promise.all(batch.map(async(text)=>{
      if(!text.trim())return text;
      try{return await translateOne(text,target)}catch{partial=true;return text}
    }));
    translated.forEach((v,j)=>{out[i+j]=v});
  }
  return Response.json({translations:out,partial,provider:'Argos with automatic translation fallback'},{headers:{'cache-control':'no-store'}});
}

export const config={path:'/api/translate'};
