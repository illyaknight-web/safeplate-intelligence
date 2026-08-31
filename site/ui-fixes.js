(()=>{
'use strict';
const restoreNativePublicImages=()=>{
 if(location.pathname!=='/'&&location.pathname!=='/public-view-v1.html')return;
 document.querySelectorAll('.quick .choice .pic').forEach(pic=>{
  pic.style.backgroundImage='none';
  pic.style.backgroundPosition='';
  pic.style.backgroundSize='';
  const img=pic.querySelector('img');
  if(img){img.style.opacity='1';img.style.visibility='visible';}
 });
 const heroPhoto=document.querySelector('.hero-photo');
 const heroImg=document.getElementById('heroImage');
 if(heroPhoto){
  heroPhoto.style.backgroundImage='none';
  heroPhoto.style.backgroundPosition='';
  heroPhoto.style.backgroundSize='';
  delete heroPhoto.dataset.approvedSprite;
 }
 if(heroImg){heroImg.style.opacity='1';heroImg.style.visibility='visible';}
};
const run=()=>restoreNativePublicImages();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
new MutationObserver(run).observe(document.documentElement,{subtree:true,childList:true});
})();
