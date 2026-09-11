(()=>{
'use strict';
if(window.__SAFEPLATE_PUBLIC_LANGUAGE__)return;
window.__SAFEPLATE_PUBLIC_LANGUAGE__=true;

const STORAGE_KEY='safeplate-public-language';
const WRAP_ID='safeplate-language-control';
const GOOGLE_ID='safeplate-google-translate';
const BUTTON_ID='safeplate-language-button';
const PANEL_ID='safeplate-language-panel';

function installStyles(){
  if(document.getElementById('safeplate-language-style'))return;
  const style=document.createElement('style');
  style.id='safeplate-language-style';
  style.textContent=`
#${WRAP_ID}{position:fixed!important;right:18px!important;top:18px!important;left:auto!important;bottom:auto!important;z-index:2147483000!important;width:auto!important;max-width:calc(100vw - 36px)!important;min-width:0!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;display:block!important;font:700 14px/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;transform:none!important}
#${WRAP_ID},#${WRAP_ID} *{box-sizing:border-box!important}
#${BUTTON_ID}{appearance:none!important;-webkit-appearance:none!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:9px!important;width:auto!important;min-width:148px!important;max-width:220px!important;height:44px!important;margin:0!important;padding:0 15px!important;border:1px solid rgba(32,82,52,.28)!important;border-radius:999px!important;background:rgba(255,255,255,.97)!important;box-shadow:0 8px 24px rgba(0,0,0,.14)!important;color:#123522!important;font:800 14px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;letter-spacing:0!important;text-transform:none!important;cursor:pointer!important;white-space:nowrap!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important}
#${BUTTON_ID}:hover{background:#fff!important;border-color:rgba(32,82,52,.42)!important}
#${BUTTON_ID}:focus-visible{outline:3px solid rgba(31,112,67,.24)!important;outline-offset:3px!important}
#${BUTTON_ID} .sp-lang-globe{font-size:16px!important;line-height:1!important}
#${BUTTON_ID} .sp-lang-caret{font-size:12px!important;transition:transform .18s ease!important}
#${BUTTON_ID}[aria-expanded="true"] .sp-lang-caret{transform:rotate(180deg)!important}
#${PANEL_ID}{position:absolute!important;right:0!important;top:51px!important;width:260px!important;max-width:calc(100vw - 36px)!important;min-width:0!important;margin:0!important;padding:14px!important;border:1px solid rgba(32,82,52,.18)!important;border-radius:18px!important;background:rgba(255,255,255,.99)!important;box-shadow:0 18px 48px rgba(0,0,0,.18)!important;color:#102018!important;display:none!important;overflow:visible!important}
#${PANEL_ID}.open{display:block!important}
#${PANEL_ID} .sp-lang-title{display:block!important;margin:0 0 5px!important;color:#123522!important;font:900 14px/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
#${PANEL_ID} .sp-lang-note{display:block!important;margin:0 0 10px!important;color:#5b6b61!important;font:500 11px/1.4 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
#${GOOGLE_ID}{display:block!important;width:100%!important;min-width:0!important;min-height:38px!important;margin:0!important;padding:0!important}
#${GOOGLE_ID} .goog-te-gadget{width:100%!important;margin:0!important;color:#52645a!important;font:600 11px/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;white-space:normal!important}
#${GOOGLE_ID} .goog-te-combo{display:block!important;width:100%!important;max-width:100%!important;min-height:40px!important;margin:0!important;padding:7px 10px!important;border:1px solid #b8cbbf!important;border-radius:10px!important;background:#fff!important;color:#102018!important;font:700 13px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;cursor:pointer!important}
#${GOOGLE_ID} a{color:#315f45!important}
#${PANEL_ID} .sp-lang-status{display:none;margin-top:8px;color:#6a756e;font:600 11px/1.35 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#${PANEL_ID}.loading .sp-lang-status{display:block}
body{top:0!important}
.goog-te-banner-frame.skiptranslate{display:none!important}
@media(max-width:720px){#${WRAP_ID}{right:10px!important;top:10px!important;max-width:calc(100vw - 20px)!important}#${BUTTON_ID}{height:40px!important;min-width:126px!important;max-width:180px!important;padding:0 12px!important;font-size:12px!important}#${PANEL_ID}{top:47px!important;width:min(250px,calc(100vw - 20px))!important;max-width:calc(100vw - 20px)!important;padding:12px!important}}
`;
  document.head.appendChild(style);
}

function closePanel(){
  const btn=document.getElementById(BUTTON_ID);
  const panel=document.getElementById(PANEL_ID);
  if(!btn||!panel)return;
  panel.classList.remove('open');
  btn.setAttribute('aria-expanded','false');
}

function installControl(){
  if(document.getElementById(WRAP_ID))return;
  installStyles();

  const wrap=document.createElement('aside');
  wrap.id=WRAP_ID;
  wrap.setAttribute('aria-label','Language and translation');

  const button=document.createElement('button');
  button.id=BUTTON_ID;
  button.type='button';
  button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-controls',PANEL_ID);
  button.innerHTML='<span class="sp-lang-globe" aria-hidden="true">🌐</span><span>Language</span><span class="sp-lang-caret" aria-hidden="true">▾</span>';

  const panel=document.createElement('div');
  panel.id=PANEL_ID;
  panel.setAttribute('role','region');
  panel.setAttribute('aria-label','Choose language');
  panel.innerHTML='<span class="sp-lang-title">Choose a language</span><span class="sp-lang-note">Translation is available for broad public access. Official source records remain authoritative.</span>';

  const host=document.createElement('div');
  host.id=GOOGLE_ID;

  const status=document.createElement('div');
  status.className='sp-lang-status';
  status.textContent='Loading translation options…';

  panel.append(host,status);
  wrap.append(button,panel);
  document.body.appendChild(wrap);

  button.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    const opening=!panel.classList.contains('open');
    if(opening){
      panel.classList.add('open');
      button.setAttribute('aria-expanded','true');
      ensureTranslator();
      setTimeout(()=>{
        const combo=host.querySelector('select.goog-te-combo');
        if(combo)combo.focus({preventScroll:true});
      },250);
    }else closePanel();
  });
  panel.addEventListener('click',e=>e.stopPropagation());
  document.addEventListener('click',closePanel);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel()});
}

function rememberSelection(){
  const combo=document.querySelector('#'+GOOGLE_ID+' select.goog-te-combo');
  if(!combo)return false;
  document.getElementById(PANEL_ID)?.classList.remove('loading');
  const status=document.querySelector('#'+PANEL_ID+' .sp-lang-status');
  if(status)status.textContent='';
  if(combo.dataset.safeplateBound==='1')return true;
  combo.dataset.safeplateBound='1';
  combo.setAttribute('aria-label','Translate SAFEPLATE public information');
  combo.addEventListener('change',()=>{
    try{localStorage.setItem(STORAGE_KEY,combo.value||'en')}catch{}
  });
  let saved='';
  try{saved=localStorage.getItem(STORAGE_KEY)||''}catch{}
  if(saved&&saved!=='en'&&combo.value!==saved){
    const option=[...combo.options].find(o=>o.value===saved);
    if(option){combo.value=saved;combo.dispatchEvent(new Event('change',{bubbles:true}))}
  }
  return true;
}

window.safeplateGoogleTranslateInit=function(){
  try{
    if(!window.google?.translate?.TranslateElement)throw new Error('Google Translate API unavailable');
    const host=document.getElementById(GOOGLE_ID);
    if(!host)return;
    if(!host.querySelector('.goog-te-gadget')){
      new google.translate.TranslateElement({
        pageLanguage:'en',
        includedLanguages:'ar,bn,zh-CN,fr,ht,ko,pt,ru,es,vi',
        autoDisplay:false,
        layout:google.translate.TranslateElement.InlineLayout.SIMPLE
      },GOOGLE_ID);
    }
    [50,250,650,1200].forEach(ms=>setTimeout(rememberSelection,ms));
  }catch(err){
    console.warn('SAFEPLATE translation control unavailable',err);
    showTranslatorError();
  }
};

function showTranslatorError(){
  const panel=document.getElementById(PANEL_ID);
  const status=document.querySelector('#'+PANEL_ID+' .sp-lang-status');
  if(panel)panel.classList.add('loading');
  if(status){
    status.style.display='block';
    status.textContent='Translation service could not load. Check your connection or content-blocking settings, then try again.';
  }
}

function ensureTranslator(){
  const panel=document.getElementById(PANEL_ID);
  if(rememberSelection())return;
  panel?.classList.add('loading');
  const existing=document.getElementById('safeplate-google-translate-loader');
  if(window.google?.translate?.TranslateElement){
    window.safeplateGoogleTranslateInit();
    return;
  }
  if(existing)return;
  const script=document.createElement('script');
  script.id='safeplate-google-translate-loader';
  script.src='https://translate.google.com/translate_a/element.js?cb=safeplateGoogleTranslateInit';
  script.async=true;
  script.defer=true;
  script.onerror=showTranslatorError;
  document.head.appendChild(script);
  setTimeout(()=>{if(!rememberSelection()&&!window.google?.translate?.TranslateElement)showTranslatorError()},6000);
}

function start(){
  if(!document.body)return;
  installControl();
  /* Preload after the page settles, but the control itself works immediately. */
  if('requestIdleCallback' in window)requestIdleCallback(()=>ensureTranslator(),{timeout:1800});
  else setTimeout(ensureTranslator,900);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
