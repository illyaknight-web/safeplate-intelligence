const UPSTREAM='https://translate.argosopentech.com/translate';
const ALLOWED=new Set(['es','fr','pt','zh','ko','vi','ru','ar']);

async function translateOne(text,target){
  const r=await fetch(UPSTREAM,{
    method:'POST',
    headers:{'content-type':'application/json','accept':'application/json'},
    body:JSON.stringify({q:text,source:'en',target,format:'text'})
  });
  if(!r.ok)throw new Error(`upstream ${r.status}`);
  const data=await r.json();
  if(!data||typeof data.translatedText!=='string')throw new Error('invalid upstream response');
  return data.translatedText;
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
  return Response.json({translations:out,partial,provider:'LibreTranslate/Argos'},{headers:{'cache-control':'no-store'}});
}

export const config={path:'/api/translate'};
