(()=>{'use strict';
const switcher=document.querySelector('.viewSwitch');
const frames={
  public:document.getElementById('publicFrame'),
  booth:document.getElementById('boothFrame'),
  advanced:document.getElementById('advancedFrame')
};
const buttons={
  public:document.getElementById('pubBtn'),
  booth:document.getElementById('boothBtn'),
  advanced:document.getElementById('advBtn')
};
if(!switcher||Object.values(frames).some(x=>!x)||Object.values(buttons).some(x=>!x))return;

const style=document.createElement('style');
style.textContent='.viewSwitch{grid-template-columns:repeat(3,1fr)!important}.headerMeta{font-size:0}.headerMeta:before{content:"One site · three views · 30-minute live checks";font-size:10px}@media(max-width:760px){.brand{padding-right:0!important}.headerMeta{display:none!important}.viewSwitch button{font-size:12px!important;padding:12px 5px!important}}';
document.head.appendChild(style);

function patchPublicRecallModal(frame){
  if(frame!==frames.public)return;
  try{
    const d=frame.contentDocument;
    if(!d?.body||d.documentElement.dataset.safeplateRecallFreshnessPatch==='1')return;
    const dialog=d.getElementById('currentRecallDialog');
    const box=d.getElementById('currentRecallItems');
    if(!dialog||!box)return;
    d.documentElement.dataset.safeplateRecallFreshnessPatch='1';

    const array=v=>Array.isArray(v)?v:[];
    const parseDate=value=>{
      if(value==null||value==='')return 0;
      const s=String(value).trim();
      if(/^\d{8}$/.test(s))return Date.UTC(Number(s.slice(0,4)),Number(s.slice(4,6))-1,Number(s.slice(6,8)));
      const t=new Date(s).getTime();
      return Number.isFinite(t)?t:0;
    };
    const recordTime=x=>{
      const values=[x.recallDate,x.recall_initiation_date,x.announcedDate,x.sourcePostedAt,x.publicationDate,x.publishedAt,x.report_date,x.reportDate,x.date,x.verifiedAt,x.updatedAt];
      for(const value of values){const t=parseDate(value);if(t)return t}
      return 0;
    };
    const isCurrent=x=>{
      const status=String(x?.status||'').toLowerCase();
      return !/(terminated|resolved|closed|retracted)/.test(status)&&recordTime(x)>Date.now()-400*864e5;
    };
    const isRecallEvent=x=>{
      const raw=String(x?.rawSource||'');
      const text=`${x?.title||''} ${x?.summary||''} ${x?.category||''}`;
      if(/\bretract(?:s|ed|ion)?\b/i.test(text))return false;
      return ['fda_openfda','fda_recall_announcements','usda_fsis','cfia_recalls','uk_fsa_alerts'].includes(raw)||(raw.startsWith('state_')&&/\brecall\b/i.test(text));
    };
    const title=x=>x?.product||x?.title||'Food recall';
    const source=x=>[x?.url,x?.sourceUrl,x?.source_url,x?.link,...array(x?.evidence).map(e=>e?.url)].find(v=>/^https?:\/\//i.test(String(v||'')));
    const image=x=>[x?.imageUrl,x?.image_url,x?.photoUrl,x?.thumbnailUrl,...array(x?.images),...array(x?.evidence).flatMap(e=>[e?.imageUrl,e?.image_url,e?.photoUrl])].find(v=>/^https:\/\//i.test(String(v||'')));
    const formatDate=x=>{
      const t=recordTime(x);
      return t?new Date(t).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}):'Date not published by source';
    };
    const renderItem=x=>{
      const article=d.createElement('article');article.className='alertItem';
      const img=image(x);
      if(img){const el=d.createElement('img');el.src=img;el.alt=title(x)+' product or label image';article.appendChild(el)}
      else{const missing=d.createElement('div');missing.className='alertThumbMissing';missing.textContent='Official product image not published';article.appendChild(missing)}
      const body=d.createElement('div');
      const small=d.createElement('small');small.textContent='Recall date · '+formatDate(x);body.appendChild(small);
      const strong=d.createElement('b');strong.textContent=title(x);body.appendChild(strong);
      const u=source(x);if(u){const a=d.createElement('a');a.href=u;a.target='_blank';a.rel='noopener';a.textContent='Verify at official source';body.appendChild(a)}
      article.appendChild(body);return article;
    };
    async function refresh(){
      try{
        const r=await frame.contentWindow.fetch('/api/incidents',{cache:'no-store'});
        if(!r.ok)throw Error(String(r.status));
        const j=await r.json();
        const rows=(Array.isArray(j)?j:(j.incidents||j.items||j.records||[]));
        const current=rows.filter(x=>isCurrent(x)&&isRecallEvent(x)).sort((a,b)=>recordTime(b)-recordTime(a)).slice(0,6);
        box.replaceChildren();
        if(!current.length){const note=d.createElement('div');note.className='notice';note.innerHTML='<strong>No current verified recall records are available.</strong><br>SAFEPLATE will not substitute unrelated or historical records.';box.appendChild(note)}
        else current.forEach(x=>box.appendChild(renderItem(x)));
        const count=d.getElementById('alertStripCount');if(count)count.textContent=`${current.length} newest verified federal recall record${current.length===1?'':'s'} shown`;
      }catch(e){console.warn('SAFEPLATE recent-recall refresh skipped',e)}
    }
    const observer=new MutationObserver(()=>{if(!dialog.hidden)refresh()});
    observer.observe(dialog,{attributes:true,attributeFilter:['hidden']});
    if(!dialog.hidden)refresh();
  }catch(e){console.warn('SAFEPLATE recent-recall patch skipped',e)}
}

function childHeaderless(frame){
  try{
    const d=frame.contentDocument;
    if(!d?.body||!d.head)return;
    d.body.classList.add('embed');
    if(!d.getElementById('safeplate-embedded-header-rule')){
      const st=d.createElement('style');
      st.id='safeplate-embedded-header-rule';
      st.textContent='body.embed>header,body.embed>.top,body.embed>.topbar{display:none!important}';
      d.head.appendChild(st);
    }
    patchPublicRecallModal(frame);
  }catch(e){console.warn('SAFEPLATE embed cleanup skipped',e)}
}

function urlFor(mode){
  if(mode==='booth')return'/booth';
  if(mode==='advanced')return'/intelligence';
  return'/';
}

function selectedFromLocation(){
  if(location.pathname==='/booth'||location.pathname==='/foodbank')return'booth';
  if(['/intelligence','/journey','/sources','/system-status'].includes(location.pathname))return'advanced';
  return'public';
}

function select(mode,{write=false}={}){
  for(const name of Object.keys(frames)){
    const active=name===mode;
    frames[name].className='viewFrame '+(active?'active':'inactive');
    buttons[name].classList.toggle('active',active);
    buttons[name].setAttribute('aria-selected',String(active));
    buttons[name].tabIndex=active?0:-1;
    frames[name].setAttribute('aria-hidden',String(!active));
    if(active)childHeaderless(frames[name]);
  }
  if(write&&location.pathname!==urlFor(mode))history.pushState({mode},'',urlFor(mode));
  if(mode==='advanced'){
    frames.advanced.contentWindow?.postMessage({type:'safeplate-visible',mode:'advanced'},'*');
    setTimeout(()=>frames.advanced.contentWindow?.dispatchEvent(new Event('resize')),120);
  }
}

for(const frame of Object.values(frames))frame.addEventListener('load',()=>{
  childHeaderless(frame);
  if(frame===frames.advanced&&buttons.advanced.classList.contains('active')){
    frame.contentWindow?.postMessage({type:'safeplate-visible',mode:'advanced'},'*');
    setTimeout(()=>frame.contentWindow?.dispatchEvent(new Event('resize')),100);
  }
});

switcher.addEventListener('click',event=>{
  const button=event.target.closest('button');
  const mode=button===buttons.booth?'booth':button===buttons.advanced?'advanced':button===buttons.public?'public':null;
  if(!mode)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  select(mode,{write:true});
},true);

addEventListener('popstate',()=>select(selectedFromLocation()),{capture:true});
addEventListener('pageshow',()=>select(selectedFromLocation()));
select(selectedFromLocation());
})();