(()=>{
'use strict';
if(window.__SAFEPLATE_PUBLIC_QA_HARDENING__)return;
window.__SAFEPLATE_PUBLIC_QA_HARDENING__=true;

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const text=e=>(e?.textContent||'').replace(/\s+/g,' ').trim();

function addStyle(){
  if($('#safeplate-public-qa-style'))return;
  const s=document.createElement('style');
  s.id='safeplate-public-qa-style';
  s.textContent=`
button,a,input,select{touch-action:manipulation}
button,.choice,.infoChips button,.examples button,.alertActions button,.schoolForm button,.zipForm button,.infoSearch button,.searchWrap button{min-height:44px}
button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #d9a928!important;outline-offset:3px!important}
button[aria-busy="true"]{cursor:progress;opacity:.72}
.safeplateQaMessage{margin-top:10px;font-size:11px;line-height:1.45;color:inherit;opacity:.8}
@media(max-width:560px){.examples button,.infoChips button{min-height:44px;padding:10px 13px!important}}
`;
  document.head.appendChild(s);
}

function secureLinks(root=document){
  $$('a[href]',root).forEach(a=>{
    let u;try{u=new URL(a.href,location.href)}catch{return}
    if(u.origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer'}
    if(!a.getAttribute('aria-label')&&!text(a) && a.title)a.setAttribute('aria-label',a.title);
  });
}

function labelControls(root=document){
  $$('button',root).forEach(b=>{
    if(!b.getAttribute('type')) b.type=b.closest('form')?'submit':'button';
    if(!b.getAttribute('aria-label')){
      const name=text(b)||b.title;
      if(name)b.setAttribute('aria-label',name);
    }
  });
  $$('input',root).forEach(i=>{
    if(i.getAttribute('aria-label')||i.id&&document.querySelector(`label[for="${CSS.escape(i.id)}"]`))return;
    if(i.placeholder)i.setAttribute('aria-label',i.placeholder);
  });
  ['#results','#schoolResults','#schoolStatus','#zipRecallResults','#zipRecallStatus','#currentRecallItems'].forEach(sel=>{
    const el=$(sel);if(el){el.setAttribute('aria-live',el.id.includes('Status')?'polite':'polite');el.setAttribute('aria-atomic','false')}
  });
}

function enterToSearch(containerSelector){
  const box=$(containerSelector);if(!box||box.dataset.safeplateEnterBound==='1')return;
  const input=$('input',box),button=$('button',box);if(!input||!button)return;
  box.dataset.safeplateEnterBound='1';
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.isComposing){
      e.preventDefault();
      if(!button.disabled)button.click();
    }
  });
}

function bindPresetButtons(groupSelector,inputContainerSelector){
  const group=$(groupSelector),container=$(inputContainerSelector);if(!group||!container)return;
  const input=$('input',container),submit=$('button',container);if(!input||!submit)return;
  $$('button',group).forEach(btn=>{
    if(btn.dataset.safeplatePresetQa==='1')return;
    btn.dataset.safeplatePresetQa='1';
    btn.addEventListener('click',()=>{
      const q=(btn.dataset.query||btn.getAttribute('data-question')||text(btn)).trim();
      if(!q)return;
      setTimeout(()=>{
        if(!input.value.trim())input.value=q;
        if(document.activeElement===btn||!input.value.trim())input.focus();
      },0);
    });
  });
}

function bindBusyForms(){
  ['#zipRecallForm','#schoolForm'].forEach(sel=>{
    const form=$(sel);if(!form||form.dataset.safeplateBusyBound==='1')return;
    form.dataset.safeplateBusyBound='1';
    const button=$('button[type="submit"],button',form);
    const status=sel.includes('zip')?$('#zipRecallStatus'):$('#schoolStatus');
    form.addEventListener('submit',()=>{
      if(!button)return;
      button.setAttribute('aria-busy','true');
      button.disabled=true;
      const original=button.dataset.originalText||text(button);
      button.dataset.originalText=original;
      button.textContent=sel.includes('zip')?'Checking…':'Finding…';
      const restore=()=>{button.disabled=false;button.removeAttribute('aria-busy');button.textContent=button.dataset.originalText||original};
      if(status){const mo=new MutationObserver(()=>{if(text(status)&&!/checking|finding/i.test(text(status))){restore();mo.disconnect()}});mo.observe(status,{childList:true,subtree:true,characterData:true});setTimeout(()=>{restore();mo.disconnect()},12000)}else setTimeout(restore,12000);
    },true);
  });
}

function hardenAlertDialog(){
  const dialog=$('#currentRecallDialog');if(!dialog||dialog.dataset.safeplateDialogQa==='1')return;
  dialog.dataset.safeplateDialogQa='1';
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
  const title=$('h2',dialog);if(title){if(!title.id)title.id='safeplate-current-recall-title';dialog.setAttribute('aria-labelledby',title.id)}
  const close=$('#currentRecallClose,.alertClose',dialog);if(close&&!close.getAttribute('aria-label'))close.setAttribute('aria-label','Close current recalls');
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.hidden&&close)close.click()});
}

function hardenChoiceCards(){
  $$('.choice').forEach(card=>{
    if(card.tagName==='BUTTON')return;
    if(card.id==='schoolChoice' || card.getAttribute('role')==='button'){
      card.setAttribute('role','button');if(!card.hasAttribute('tabindex'))card.tabIndex=0;
      if(!card.getAttribute('aria-label'))card.setAttribute('aria-label',text(card));
      if(card.dataset.safeplateKeyboardBound!=='1'){
        card.dataset.safeplateKeyboardBound='1';
        card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click()}});
      }
    }
  });
}

function ensureTranslationNotice(){
  const control=$('#safeplate-language-control');if(!control||control.dataset.safeplateNoticeReady==='1')return;
  control.dataset.safeplateNoticeReady='1';
  control.setAttribute('aria-describedby','safeplate-translation-trust-note');
  let note=$('#safeplate-translation-trust-note');
  if(!note){note=document.createElement('span');note.id='safeplate-translation-trust-note';note.hidden=true;note.textContent='Automated translation is provided for accessibility. The linked official source remains authoritative.';control.appendChild(note)}
}

function inventory(){
  const report={
    generatedAt:new Date().toISOString(),
    buttons:$$('button').length,
    links:$$('a[href]').length,
    inputs:$$('input').length,
    presetQuestions:$$('.examples button').map(text),
    informationChips:$$('.infoChips button').map(text),
    choiceCards:$$('.choice').map(text),
    hasAskSearch:!!$('.searchWrap input')&&!!$('.searchWrap button'),
    hasInformationSearch:!!$('.infoSearch input')&&!!$('.infoSearch button'),
    hasZipRecallSearch:!!$('#zipRecallForm'),
    hasSchoolSearch:!!$('#schoolForm'),
    hasRecallDialog:!!$('#currentRecallDialog'),
    hasLanguageControl:!!$('#safeplate-language-control')
  };
  window.__SAFEPLATE_PUBLIC_QA_REPORT__=report;
  document.documentElement.dataset.safeplateQa='passed-runtime-hardening';
  return report;
}

function run(){
  addStyle();secureLinks();labelControls();
  enterToSearch('.searchWrap');enterToSearch('.infoSearch');
  bindPresetButtons('.examples','.searchWrap');
  bindPresetButtons('.infoChips','.infoSearch');
  bindBusyForms();hardenAlertDialog();hardenChoiceCards();ensureTranslationNotice();inventory();
}

function boot(){
  run();
  const observer=new MutationObserver(()=>run());
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),30000);
  [250,800,1800,4500].forEach(ms=>setTimeout(run,ms));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
