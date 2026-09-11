(()=>{
'use strict';
if(window.__SAFEPLATE_PUBLIC_LANGUAGE__)return;
window.__SAFEPLATE_PUBLIC_LANGUAGE__=true;

const STORAGE_KEY='safeplate-public-language';
const WRAP_ID='safeplate-language-control';
const GOOGLE_ID='safeplate-google-translate';

function installStyles(){
  if(document.getElementById('safeplate-language-style'))return;
  const style=document.createElement('style');
  style.id='safeplate-language-style';
  style.textContent=`
#${WRAP_ID}{position:fixed;right:16px;top:14px;z-index:2147483000;display:flex;align-items:center;gap:9px;padding:9px 11px;border:1px solid rgba(32,82,52,.25);border-radius:14px;background:rgba(255,255,255,.96);box-shadow:0 10px 28px rgba(0,0,0,.16);color:#102018;font:700 12px/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;backdrop-filter:blur(12px)}
#${WRAP_ID} .sp-lang-label{white-space:nowrap;font-weight:900;color:#123522}
#${WRAP_ID} .sp-lang-note{display:none}
#${GOOGLE_ID}{min-width:148px}
#${GOOGLE_ID} .goog-te-gadget{font:600 11px/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;color:#52645a!important;white-space:nowrap}
#${GOOGLE_ID} .goog-te-combo{max-width:190px;min-height:34px;margin:0!important;padding:5px 8px;border:1px solid #b8cbbf;border-radius:9px;background:#fff;color:#102018;font:700 12px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}
#${GOOGLE_ID} a{color:#315f45!important}
body{top:0!important}
@media(max-width:720px){#${WRAP_ID}{right:9px;top:9px;padding:7px 8px;border-radius:12px;gap:6px}#${WRAP_ID} .sp-lang-label{font-size:10px}#${GOOGLE_ID}{min-width:128px}#${GOOGLE_ID} .goog-te-combo{max-width:150px;min-height:31px;font-size:11px}}
`;
  document.head.appendChild(style);
}

function installControl(){
  if(document.getElementById(WRAP_ID))return;
  installStyles();
  const wrap=document.createElement('aside');
  wrap.id=WRAP_ID;
  wrap.setAttribute('aria-label','Language and translation');
  wrap.title='Translate SAFEPLATE public information. Automated translations are provided for accessibility; official source records remain authoritative.';

  const label=document.createElement('span');
  label.className='sp-lang-label';
  label.textContent='Language / Translate';

  const host=document.createElement('div');
  host.id=GOOGLE_ID;

  const note=document.createElement('span');
  note.className='sp-lang-note';
  note.textContent='Automated translation. Official source wording remains authoritative.';

  wrap.append(label,host,note);
  document.body.appendChild(wrap);
}

function rememberSelection(){
  const combo=document.querySelector('#'+GOOGLE_ID+' select.goog-te-combo');
  if(!combo||combo.dataset.safeplateBound==='1')return;
  combo.dataset.safeplateBound='1';
  combo.setAttribute('aria-label','Translate SAFEPLATE public view');
  combo.addEventListener('change',()=>{
    try{localStorage.setItem(STORAGE_KEY,combo.value||'en')}catch{}
  });
  let saved='';
  try{saved=localStorage.getItem(STORAGE_KEY)||''}catch{}
  if(saved&&saved!=='en'&&combo.value!==saved){
    const option=[...combo.options].find(o=>o.value===saved);
    if(option){combo.value=saved;combo.dispatchEvent(new Event('change',{bubbles:true}))}
  }
}

window.safeplateGoogleTranslateInit=function(){
  try{
    if(!window.google?.translate?.TranslateElement)return;
    new google.translate.TranslateElement({
      pageLanguage:'en',
      includedLanguages:'ar,bn,zh-CN,fr,ht,ko,pt,ru,es,vi',
      autoDisplay:false,
      layout:google.translate.TranslateElement.InlineLayout.SIMPLE
    },GOOGLE_ID);
    [50,300,900].forEach(ms=>setTimeout(rememberSelection,ms));
  }catch(err){console.warn('SAFEPLATE translation control unavailable',err)}
};

function loadTranslator(){
  if(document.getElementById('safeplate-google-translate-loader'))return;
  const script=document.createElement('script');
  script.id='safeplate-google-translate-loader';
  script.src='https://translate.google.com/translate_a/element.js?cb=safeplateGoogleTranslateInit';
  script.async=true;
  script.onerror=()=>console.warn('SAFEPLATE automated translation service could not be loaded.');
  document.head.appendChild(script);
}

function start(){
  if(!document.body)return;
  installControl();
  loadTranslator();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
