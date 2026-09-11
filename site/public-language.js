(()=>{
'use strict';
if(window.__SAFEPLATE_PUBLIC_LANGUAGE__)return;
window.__SAFEPLATE_PUBLIC_LANGUAGE__=true;

const STORAGE_KEY='safeplate-public-language';
const WRAP_ID='safeplate-language-control';
const BUTTON_ID='safeplate-language-button';
const PANEL_ID='safeplate-language-panel';
const SELECT_ID='safeplate-language-select';
const API='/api/translate';
const LANGS=[
  ['en','English'],['es','Español'],['fr','Français'],['pt','Português'],
  ['zh','中文'],['ko','한국어'],['vi','Tiếng Việt'],['ru','Русский'],['ar','العربية']
];
const originals=[];
let applying=false;

function installStyles(){
  if(document.getElementById('safeplate-language-style'))return;
  const style=document.createElement('style');
  style.id='safeplate-language-style';
  style.textContent=`
#${WRAP_ID}{position:fixed!important;right:18px!important;top:18px!important;left:auto!important;bottom:auto!important;z-index:2147483000!important;width:auto!important;max-width:calc(100vw - 36px)!important;min-width:0!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;display:block!important;font:700 14px/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;transform:none!important}
#${WRAP_ID},#${WRAP_ID} *{box-sizing:border-box!important}
#${BUTTON_ID}{appearance:none!important;-webkit-appearance:none!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:9px!important;width:auto!important;min-width:148px!important;max-width:220px!important;height:44px!important;margin:0!important;padding:0 15px!important;border:1px solid rgba(32,82,52,.28)!important;border-radius:999px!important;background:rgba(255,255,255,.97)!important;box-shadow:0 8px 24px rgba(0,0,0,.14)!important;color:#123522!important;font:800 14px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;cursor:pointer!important;white-space:nowrap!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important}
#${BUTTON_ID}:hover{background:#fff!important;border-color:rgba(32,82,52,.42)!important}
#${BUTTON_ID}:focus-visible{outline:3px solid rgba(31,112,67,.24)!important;outline-offset:3px!important}
#${PANEL_ID}{position:absolute!important;right:0!important;top:51px!important;width:280px!important;max-width:calc(100vw - 36px)!important;margin:0!important;padding:15px!important;border:1px solid rgba(32,82,52,.18)!important;border-radius:18px!important;background:rgba(255,255,255,.99)!important;box-shadow:0 18px 48px rgba(0,0,0,.18)!important;color:#102018!important;display:none!important}
#${PANEL_ID}.open{display:block!important}
#${PANEL_ID} .sp-lang-title{display:block!important;margin:0 0 5px!important;color:#123522!important;font:900 16px/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
#${PANEL_ID} .sp-lang-note{display:block!important;margin:0 0 12px!important;color:#5b6b61!important;font:600 11px/1.45 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
#${SELECT_ID}{display:block!important;width:100%!important;min-height:42px!important;margin:0!important;padding:8px 10px!important;border:1px solid #b8cbbf!important;border-radius:10px!important;background:#fff!important;color:#102018!important;font:700 13px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;cursor:pointer!important}
#${PANEL_ID} .sp-lang-status{display:block!important;min-height:16px!important;margin-top:9px!important;color:#68756d!important;font:600 11px/1.35 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
#${PANEL_ID} .sp-lang-status.error{color:#8a3b2b!important}
@media(max-width:720px){#${WRAP_ID}{right:10px!important;top:10px!important;max-width:calc(100vw - 20px)!important}#${BUTTON_ID}{height:40px!important;min-width:126px!important;max-width:180px!important;padding:0 12px!important;font-size:12px!important}#${PANEL_ID}{top:47px!important;width:min(270px,calc(100vw - 20px))!important;max-width:calc(100vw - 20px)!important;padding:13px!important}}
`;
  document.head.appendChild(style);
}

function closePanel(){
  const btn=document.getElementById(BUTTON_ID),panel=document.getElementById(PANEL_ID);
  if(!btn||!panel)return;
  panel.classList.remove('open');btn.setAttribute('aria-expanded','false');
}

function eligibleTextNodes(){
  const skip=new Set(['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','SVG','IFRAME']);
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode(node){
    const p=node.parentElement;
    if(!p||skip.has(p.tagName)||p.closest('#'+WRAP_ID)||p.closest('[data-no-translate]'))return NodeFilter.FILTER_REJECT;
    const t=node.nodeValue?.trim()||'';
    if(t.length<2||!/[A-Za-z]/.test(t))return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }});
  const arr=[];let n;
  while((n=walker.nextNode())&&arr.length<140)arr.push(n);
  return arr;
}

function captureOriginals(){
  if(originals.length)return;
  eligibleTextNodes().forEach(node=>originals.push({node,text:node.nodeValue}));
}

function restoreEnglish(){
  captureOriginals();
  originals.forEach(x=>{if(x.node?.isConnected)x.node.nodeValue=x.text});
  document.documentElement.lang='en';
}

async function applyLanguage(target){
  if(applying)return;
  applying=true;
  const status=document.querySelector('#'+PANEL_ID+' .sp-lang-status');
  const select=document.getElementById(SELECT_ID);
  if(select)select.disabled=true;
  try{
    restoreEnglish();
    if(target==='en'){
      if(status){status.classList.remove('error');status.textContent='English restored.'}
      try{localStorage.setItem(STORAGE_KEY,'en')}catch{}
      return;
    }
    const live=originals.filter(x=>x.node?.isConnected);
    const texts=live.map(x=>x.text.trim());
    if(status){status.classList.remove('error');status.textContent='Translating SAFEPLATE…'}
    const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({texts,target})});
    if(!r.ok)throw new Error('Translation service unavailable');
    const data=await r.json();
    if(!Array.isArray(data.translations)||data.translations.length!==live.length)throw new Error('Translation response incomplete');
    live.forEach((x,i)=>{
      const original=x.text;
      const translated=String(data.translations[i]??original);
      const lead=(original.match(/^\s*/)||[''])[0],trail=(original.match(/\s*$/)||[''])[0];
      x.node.nodeValue=lead+translated.trim()+trail;
    });
    document.documentElement.lang=target;
    try{localStorage.setItem(STORAGE_KEY,target)}catch{}
    if(status){status.classList.toggle('error',!!data.partial);status.textContent=data.partial?'Translation loaded with a few items left in English.':'Translation ready.'}
  }catch(err){
    restoreEnglish();
    if(select)select.value='en';
    if(status){status.classList.add('error');status.textContent='Translation is temporarily unavailable. SAFEPLATE remains available in English.'}
    console.warn('SAFEPLATE translation failed',err);
  }finally{
    applying=false;if(select)select.disabled=false;
  }
}

function installControl(){
  if(document.getElementById(WRAP_ID))return;
  installStyles();
  const wrap=document.createElement('aside');wrap.id=WRAP_ID;wrap.setAttribute('aria-label','Language and translation');
  const button=document.createElement('button');button.id=BUTTON_ID;button.type='button';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',PANEL_ID);button.innerHTML='<span aria-hidden="true">🌐</span><span>Language</span><span aria-hidden="true">▾</span>';
  const panel=document.createElement('div');panel.id=PANEL_ID;panel.setAttribute('role','region');panel.setAttribute('aria-label','Choose language');
  panel.innerHTML='<span class="sp-lang-title">Choose a language</span><span class="sp-lang-note">Translation is available for broad public access. Official source records remain authoritative.</span>';
  const select=document.createElement('select');select.id=SELECT_ID;select.setAttribute('aria-label','Choose SAFEPLATE language');
  LANGS.forEach(([code,name])=>{const o=document.createElement('option');o.value=code;o.textContent=name;select.appendChild(o)});
  const status=document.createElement('div');status.className='sp-lang-status';status.textContent='';
  panel.append(select,status);wrap.append(button,panel);document.body.appendChild(wrap);
  captureOriginals();
  button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const open=!panel.classList.contains('open');if(open){panel.classList.add('open');button.setAttribute('aria-expanded','true');setTimeout(()=>select.focus({preventScroll:true}),0)}else closePanel()});
  panel.addEventListener('click',e=>e.stopPropagation());document.addEventListener('click',closePanel);document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel()});
  select.addEventListener('change',()=>applyLanguage(select.value));
  let saved='en';try{saved=localStorage.getItem(STORAGE_KEY)||'en'}catch{}
  if(LANGS.some(([c])=>c===saved)){select.value=saved;if(saved!=='en')setTimeout(()=>applyLanguage(saved),350)}
}

function start(){if(document.body)installControl()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
