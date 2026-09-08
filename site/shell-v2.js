(()=>{'use strict';
const switcher=document.querySelector('.viewSwitch');
const frames={public:document.getElementById('publicFrame'),booth:document.getElementById('boothFrame'),advanced:document.getElementById('advancedFrame')};
const buttons={public:document.getElementById('pubBtn'),booth:document.getElementById('boothBtn'),advanced:document.getElementById('advBtn')};
if(!switcher||Object.values(frames).some(x=>!x)||Object.values(buttons).some(x=>!x))return;
frames.booth.setAttribute('allow','camera');
const style=document.createElement('style');
style.textContent='.viewSwitch{grid-template-columns:repeat(3,1fr)!important}.viewFrame.inactive{opacity:0!important;visibility:hidden!important;pointer-events:none!important}.viewFrame.active{opacity:1!important;visibility:visible!important;pointer-events:auto!important}.headerMeta{font-size:0}.headerMeta:before{content:"One site · three views · 30-minute live checks";font-size:10px}@media(max-width:760px){.brand{padding-right:0!important}.headerMeta{display:none!important}.viewSwitch button{font-size:12px!important;padding:12px 5px!important}}';
document.head.appendChild(style);
function patchPublicRecallModal(frame){
  if(frame!==frames.public)return;
  try{
    const d=frame.contentDocument;if(!d?.body)return;
    const dialog=d.getElementById('currentRecallDialog'),box=d.getElementById('currentRecallItems');if(!dialog||!box)return;
    const scheduleAutoOpen=()=>{
      if(!buttons.public.classList.contains('active')||d.documentElement.dataset.safeplateRecallAutoShown==='1')return;
      d.documentElement.dataset.safeplateRecallAutoShown='1';
      setTimeout(()=>{
        if(buttons.public.classList.contains('active')&&dialog.hidden){
          dialog.hidden=false;
          d.getElementById('currentRecallClose')?.focus?.();
        }
      },350);
    };
    if(d.documentElement.dataset.safeplateRecallFreshnessPatch==='8'){scheduleAutoOpen();return}
    d.documentElement.dataset.safeplateRecallFreshnessPatch='8';
    const array=v=>Array.isArray(v)?v:[];
    const parseDate=value=>{if(value==null||value==='')return 0;const s=String(value).trim();if(/^\d{8}$/.test(s))return Date.UTC(Number(s.slice(0,4)),Number(s.slice(4,6))-1,Number(s.slice(6,8)));const t=new Date(s).getTime();return Number.isFinite(t)?t:0};
    const recordTime=x=>{for(const value of [x.recallDate,x.recall_initiation_date,x.announcedDate,x.sourcePostedAt,x.publicationDate,x.publishedAt,x.report_date,x.reportDate,x.date,x.verifiedAt,x.updatedAt]){const t=parseDate(value);if(t)return t}return 0};
    const isCurrent=x=>{const status=String(x?.status||'').toLowerCase();return !/(terminated|resolved|closed|retracted)/.test(status)&&recordTime(x)>Date.now()-400*864e5};
    const GENERIC=/^(u\.?s\.? food and drug administration|food and drug administration|recall webpage|recalls webpage|recall page|food recall|food recalls|recall announcement|recalls and outbreaks)$/i;
    const displayTitle=x=>[x?.product,x?.product_description,x?.brand&&x?.title?`${x.brand} — ${x.title}`:null,x?.title,x?.company].map(v=>String(v||'').trim()).find(v=>v&&!GENERIC.test(v))||'';
    const isRecallEvent=x=>{const raw=String(x?.rawSource||''),text=`${x?.title||''} ${x?.product||''} ${x?.summary||''} ${x?.category||''}`;if(/\bretract(?:s|ed|ion)?\b/i.test(text)||!displayTitle(x))return false;return ['fda_openfda','fda_recall_announcements','usda_fsis','cfia_recalls','uk_fsa_alerts'].includes(raw)||(raw.startsWith('state_')&&/\brecall\b/i.test(text))};
    const source=x=>[x?.url,x?.sourceUrl,x?.source_url,x?.link,...array(x?.evidence).map(e=>e?.url)].find(v=>/^https?:\/\//i.test(String(v||'')));
    const imageCandidate=v=>{if(!v)return null;if(typeof v==='string')return /^https:\/\//i.test(v)?v:null;if(typeof v==='object'){const u=v.url||v.src||v.imageUrl||v.image_url||v.photoUrl||v.thumbnailUrl;return /^https:\/\//i.test(String(u||''))?u:null}return null};
    const directImage=x=>[x?.imageUrl,x?.image_url,x?.photoUrl,x?.thumbnailUrl,...array(x?.images),...array(x?.photos),...array(x?.evidence).flatMap(e=>[e?.imageUrl,e?.image_url,e?.photoUrl,e?.thumbnailUrl,...array(e?.images)])].map(imageCandidate).find(Boolean)||null;
    const image=x=>{const direct=directImage(x);if(direct)return direct;const u=source(x);try{const parsed=new URL(u);if(/(^|\.)fda\.gov$/i.test(parsed.hostname))return '/api/recall-photo?source='+encodeURIComponent(u)}catch{}return null};
    const formatDate=x=>{const t=recordTime(x);return t?new Date(t).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}):'Date not published by source'};
    const storeName=x=>{
      const title=displayTitle(x);
      const explicit=[x?.company,x?.firm_name,x?.recalling_firm,x?.brand].map(v=>String(v||'').trim()).find(v=>v&&!GENERIC.test(v)&&title.toLowerCase().includes(v.toLowerCase()));
      if(explicit)return explicit;
      const m=title.match(/^(.+?)\s+(?:announces?|issues?|expands?|recalls?|recalling)\b/i);
      return m?.[1]?.trim()||'';
    };
    const foodName=x=>{
      const title=displayTitle(x);
      if(!title)return'';
      const stop='(?:\\s+because\\b|\\s+due\\s+to\\b|\\s+for\\s+(?:possible|potential)\\b|$)';
      const patterns=[
        new RegExp('\\brecall\\s+of\\s+(.+?)'+stop,'i'),
        new RegExp('\\b(?:recalls?|recalling)\\s+(.+?)'+stop,'i'),
        new RegExp('\\b(?:announces?|issues?)\\s+(?:a\\s+)?recall\\s+(?:of\\s+)?(.+?)'+stop,'i'),
        /^(.+?)\s+Recall(?:\s*[–—-].*)?$/i,
        /(?:^|—|-)\s*(.+?)\s+recall notice\b/i
      ];
      let food='';
      for(const rx of patterns){const m=title.match(rx);if(m?.[1]){food=m[1].trim();break}}
      const company=storeName(x);
      if(food&&company&&food.toLowerCase().startsWith(company.toLowerCase()))food=food.slice(company.length).replace(/^[\s:—-]+/,'').trim();
      food=food.replace(/^(?:to\s+include|include|of)\s+/i,'').replace(/^(?:a|an|the)\s+/i,'').replace(/\brecall notice\b.*$/i,'').replace(/[\s,;:.—-]+$/,'').trim();
      if(food&&food.length<title.length&&title.toLowerCase().includes(food.toLowerCase()))return food;
      const explicit=[x?.productName,x?.product_name,x?.product_description,x?.product].map(v=>String(v||'').trim()).find(v=>v&&!GENERIC.test(v)&&v.length<title.length*.72&&!/\b(?:announces?|issues?|recall notice|because|due to)\b/i.test(v));
      if(explicit&&title.toLowerCase().includes(explicit.toLowerCase()))return explicit;
      return'';
    };
    const appendEmphasizedTitle=(container,title,terms)=>{
      const lower=title.toLowerCase(),ranges=[];
      for(const term of terms){if(!term)continue;const idx=lower.indexOf(term.toLowerCase());if(idx>=0)ranges.push([idx,idx+term.length])}
      ranges.sort((a,b)=>a[0]-b[0]);
      const merged=[];for(const r of ranges){const last=merged[merged.length-1];if(last&&r[0]<=last[1])last[1]=Math.max(last[1],r[1]);else merged.push(r.slice())}
      if(!merged.length){container.textContent=title;return}
      let pos=0;for(const [start,end] of merged){if(start>pos)container.append(d.createTextNode(title.slice(pos,start)));const mark=d.createElement('span');mark.textContent=title.slice(start,end);mark.style.cssText='font-weight:900;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px';container.appendChild(mark);pos=end}if(pos<title.length)container.append(d.createTextNode(title.slice(pos)));
    };
    const renderItem=x=>{const title=displayTitle(x),food=foodName(x),store=storeName(x),article=d.createElement('article');article.className='alertItem';const img=image(x);if(img){const el=d.createElement('img');el.src=img;el.alt=title+' recalled package or product image';el.loading='eager';el.onerror=()=>{const missing=d.createElement('div');missing.className='alertThumbMissing';missing.textContent='Official package image unavailable';el.replaceWith(missing)};article.appendChild(el)}else{const missing=d.createElement('div');missing.className='alertThumbMissing';missing.textContent='Official package image unavailable';article.appendChild(missing)}const body=d.createElement('div'),small=d.createElement('small');small.textContent='Recall date · '+formatDate(x);small.style.fontWeight='400';body.appendChild(small);const label=d.createElement('span');label.textContent='RECALLED PRODUCT';label.style.cssText='display:block;margin-top:7px;color:#a63a2a;font-size:11px;font-weight:400;letter-spacing:.08em';body.appendChild(label);const context=d.createElement('div');context.style.cssText='display:block;color:#a63a2a;font-weight:400;line-height:1.28;margin-top:3px';appendEmphasizedTitle(context,title,[store,food]);body.appendChild(context);const u=source(x);if(u){const a=d.createElement('a');a.href=u;a.target='_blank';a.rel='noopener';a.textContent='Verify at official source';body.appendChild(a)}article.appendChild(body);return article};
    async function refresh(){try{const r=await frame.contentWindow.fetch('/api/incidents',{cache:'no-store'});if(!r.ok)throw Error(String(r.status));const j=await r.json(),rows=Array.isArray(j)?j:(j.incidents||j.items||j.records||[]),current=rows.filter(x=>isCurrent(x)&&isRecallEvent(x)).sort((a,b)=>recordTime(b)-recordTime(a)),selected=current.slice(0,6);box.replaceChildren();if(!selected.length){const note=d.createElement('div');note.className='notice';note.innerHTML='<strong>No current verified recall records are available.</strong><br>SAFEPLATE will not substitute unrelated or historical records.';box.appendChild(note)}else selected.forEach(x=>box.appendChild(renderItem(x)));const count=d.getElementById('alertStripCount');if(count)count.textContent=`${current.length} current verified recall record${current.length===1?'':'s'} · official package photos loaded when published`}catch(e){console.warn('SAFEPLATE recent-recall refresh skipped',e)}}
    new MutationObserver(()=>{if(!dialog.hidden)refresh()}).observe(dialog,{attributes:true,attributeFilter:['hidden']});
    if(!dialog.hidden)refresh();
    scheduleAutoOpen();
  }catch(e){console.warn('SAFEPLATE recent-recall patch skipped',e)}
}
function childHeaderless(frame){
  try{const d=frame.contentDocument;if(!d?.body||!d.head)return;d.body.classList.add('embed');if(!d.getElementById('safeplate-embedded-header-rule')){const st=d.createElement('style');st.id='safeplate-embedded-header-rule';st.textContent='body.embed>header,body.embed>.top,body.embed>.topbar{display:none!important}';d.head.appendChild(st)}if(frame===frames.booth){d.documentElement.style.overflowY='auto';d.documentElement.style.webkitOverflowScrolling='touch';d.body.style.overflowY='auto';d.body.style.webkitOverflowScrolling='touch';d.body.style.touchAction='pan-y'}patchPublicRecallModal(frame)}catch(e){console.warn('SAFEPLATE embed cleanup skipped',e)}
}
function urlFor(mode){if(mode==='booth')return'/booth';if(mode==='advanced')return'/intelligence';return'/'}
function selectedFromLocation(){if(location.pathname==='/booth'||location.pathname==='/foodbank')return'booth';if(['/intelligence','/journey','/sources','/system-status'].includes(location.pathname))return'advanced';return'public'}
function select(mode,{write=false}={}){for(const name of Object.keys(frames)){const active=name===mode;frames[name].className='viewFrame '+(active?'active':'inactive');buttons[name].classList.toggle('active',active);buttons[name].setAttribute('aria-selected',String(active));buttons[name].tabIndex=active?0:-1;frames[name].setAttribute('aria-hidden',String(!active));if(active)childHeaderless(frames[name])}if(write&&location.pathname!==urlFor(mode))history.pushState({mode},'',urlFor(mode));if(mode==='booth'){setTimeout(()=>{childHeaderless(frames.booth);frames.booth.contentWindow?.dispatchEvent(new Event('resize'))},60)}if(mode==='advanced'){frames.advanced.contentWindow?.postMessage({type:'safeplate-visible',mode:'advanced'},'*');setTimeout(()=>frames.advanced.contentWindow?.dispatchEvent(new Event('resize')),120)}}
for(const frame of Object.values(frames))frame.addEventListener('load',()=>{childHeaderless(frame);if(frame===frames.advanced&&buttons.advanced.classList.contains('active')){frame.contentWindow?.postMessage({type:'safeplate-visible',mode:'advanced'},'*');setTimeout(()=>frame.contentWindow?.dispatchEvent(new Event('resize')),100)}});
switcher.addEventListener('click',event=>{const button=event.target.closest('button'),mode=button===buttons.booth?'booth':button===buttons.advanced?'advanced':button===buttons.public?'public':null;if(!mode)return;event.preventDefault();event.stopImmediatePropagation();select(mode,{write:true})},true);
addEventListener('popstate',()=>select(selectedFromLocation()),{capture:true});addEventListener('pageshow',()=>select(selectedFromLocation()));select(selectedFromLocation());
})();