import crypto from 'node:crypto';

const decode=value=>String(value||'')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&#039;/gi,"'")
  .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&nbsp;/gi,' ');
const clean=value=>decode(String(value||'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const absolute=(href,base)=>{try{return new URL(decode(href),base).toString()}catch{return null}};
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24);
const sourceDateToISO=value=>{const d=new Date(value||'');return Number.isNaN(d.getTime())?null:d.toISOString()};
const numberFrom=(text,label)=>Number((text.match(new RegExp(`${label}\\s*:\\s*([0-9,]+)`,'i'))||[])[1]?.replace(/,/g,'')||0);

export function parseCDCOutbreakIndex(html,base){
  const links=[];
  for(const match of String(html||'').matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)){
    const url=absolute(match[1],base);if(!url)continue;
    if(/^https:\/\/www\.cdc\.gov\/(?:campylobacter|ecoli|listeria|salmonella)\/outbreaks\/[^/]+\/index\.html$/i.test(url))links.push(url);
  }
  return [...new Set(links)];
}

export function parseCDCSearchResults(payload){
  const docs=Array.isArray(payload?.response?.docs)?payload.response.docs:[];
  return [...new Set(docs.map(x=>absolute(x?.permalink,'https://www.cdc.gov/')).filter(url=>
    /^https:\/\/www\.cdc\.gov\/(?:campylobacter|ecoli|listeria|salmonella)\/outbreaks\/[^/]+\/index\.html$/i.test(url)
  ))];
}

export function parseCDCNoticePage(html,url,checked=new Date().toISOString()){
  const source=String(html||''),main=(source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||[])[1]||source;
  const title=clean((main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]);
  const text=clean(main);
  if(!title||!/outbreak/i.test(title)||!/Investigation status\s*:\s*Open/i.test(text))return null;
  const product=clean((title.match(/linked to\s+(.+)$/i)||[])[1]||'Not yet identified');
  const pathogen=clean((title.match(/^(.+?)\s+Outbreak\b/i)||[])[1]||'Foodborne illness');
  const company=clean((text.match(/produced by\s+([^.;]+?)(?:\.|,\s*(?:If|which|located)|$)/i)||text.match(/([A-Z][^.;]{2,100}?)\s+recalled\s+/)||[])[1]||'');
  const dateText=(text.match(/\b(?:JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)\.?\s+\d{1,2},\s+\d{4}\b/i)||[])[0];
  const sourcePostedAt=sourceDateToISO(dateText);
  const cases=numberFrom(text,'Cases'),hospitalizations=numberFrom(text,'Hospitalizations'),deaths=numberFrom(text,'Deaths'),states=numberFrom(text,'States');
  const recallIssued=/Recall issued\s*:\s*Yes/i.test(text)||/\brecalled\b/i.test(text);
  const slug=new URL(url).pathname.split('/').filter(Boolean).at(-2)||hash(url);
  const summary=`CDC open multistate outbreak investigation. ${cases?`${cases} cases`:'Case count not stated'}${hospitalizations?`, ${hospitalizations} hospitalizations`:''}${deaths?`, ${deaths} deaths`:''}${states?` across ${states} states`:''}. Recall issued: ${recallIssued?'Yes':'Not stated'}.`;
  return {
    id:`CDC-OUTBREAK-${slug}`,title,product,company,hazard:pathogen,
    severity:recallIssued||hospitalizations?'HIGH':'WATCH',status:'CORROBORATING',category:'Outbreak investigation',
    states:[],distribution:'',lat:null,lng:null,source:'CDC Current Multistate Foodborne Investigations',
    sourcePostedAt,updatedAt:sourcePostedAt||checked,verifiedAt:checked,summary,lots:[],
    evidence:[{type:'AGENCY',status:'VERIFIED',source:'CDC Current Multistate Foodborne Investigations',text:summary,url}],
    entities:[
      {id:`incident-CDC-OUTBREAK-${slug}`,type:'Incident',name:title},
      {id:`hazard-CDC-OUTBREAK-${slug}`,type:'Hazard',name:pathogen},
      {id:`food-CDC-OUTBREAK-${slug}`,type:'Food',name:product},
      ...(company?[{id:`company-CDC-OUTBREAK-${slug}`,type:'Company',name:company}]:[])
    ],
    links:[
      [`incident-CDC-OUTBREAK-${slug}`,`hazard-CDC-OUTBREAK-${slug}`,'caused by'],
      [`incident-CDC-OUTBREAK-${slug}`,`food-CDC-OUTBREAK-${slug}`,'linked product'],
      ...(company?[[`incident-CDC-OUTBREAK-${slug}`,`company-CDC-OUTBREAK-${slug}`,'identified company']]:[])
    ],
    workflowStep:3,rawSource:'cdc_content',caseCount:cases,hospitalizations,deaths,stateCount:states,recallIssued
  };
}
