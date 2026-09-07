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
style.textContent='.viewSwitch{grid-template-columns:repeat(3,minmax(0,1fr))!important}.headerMeta{font-size:0}.headerMeta:before{content:"One site · three views · 30-minute live checks";font-size:10px}@media(max-width:760px){.brand{padding-right:0!important}.headerMeta{display:none!important}.viewSwitch button{font-size:12px!important;padding:12px 5px!important}}';
document.head.appendChild(style);

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
