(()=>{'use strict';
const switcher=document.querySelector('.viewSwitch'),stage=document.querySelector('.stage');
if(!switcher||!stage)return;
const boothBtn=document.getElementById('boothBtn');
const booth=document.getElementById('boothFrame');
if(!boothBtn||!booth)return;
const style=document.createElement('style');style.textContent='.viewSwitch{grid-template-columns:repeat(3,1fr)!important}.headerMeta{font-size:0}.headerMeta:before{content:"One site · three views · 30-minute live checks";font-size:10px}@media(max-width:760px){.brand{padding-right:0!important}.headerMeta{display:none!important}.viewSwitch button{font-size:12px!important;padding:12px 5px!important}}';document.head.appendChild(style);
const pub=document.getElementById('publicFrame'),adv=document.getElementById('advancedFrame'),pb=document.getElementById('pubBtn'),ab=document.getElementById('advBtn');
function hideBooth(){booth.className='viewFrame inactive';boothBtn.classList.remove('active');boothBtn.setAttribute('aria-selected','false')}
pb.addEventListener('click',hideBooth,true);ab.addEventListener('click',hideBooth,true);
boothBtn.addEventListener('click',()=>{pub.className='viewFrame inactive';adv.className='viewFrame inactive';booth.className='viewFrame active';pb.classList.remove('active');ab.classList.remove('active');boothBtn.classList.add('active');pb.setAttribute('aria-selected','false');ab.setAttribute('aria-selected','false');boothBtn.setAttribute('aria-selected','true');history.pushState({mode:'booth'},'', '/booth');booth.focus()});
if(location.pathname==='/booth')boothBtn.click();
addEventListener('popstate',()=>{if(location.pathname==='/booth')boothBtn.click();else hideBooth()});

/* Recovery-candidate recall rendering. Production remains frozen. */
const proxy=u=>'/.netlify/functions/recall-image?url='+encodeURIComponent(u);
const CURRENT_RECALLS=[
 {date:'September 3, 2026',title:'Great Value Organic Triple Berry Blend',reason:'Possible E. coli O145 contamination',image:proxy('https://i5.walmartimages.com/asr/3f94e1f8-bc6c-4648-83d6-a4cc27a51aed.96c84f4ae3ec722e2fa9f222bf08a224.jpeg'),alt:'Great Value Organic Triple Berry Blend 10 oz package',url:'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/frutas-y-hortalizas-del-sur-sa-expands-recall-include-one-lot-great-value-frozen-organic-triple'},
 {date:'August 31, 2026',title:'Little Temptations Chocolatey Eyeballs',reason:'Undeclared milk',image:'https://www.fda.gov/files/styles/recall_image_small/public/image_1_229.png?itok=l-mbSwFP',alt:'Little Temptations Chocolatey Eyeballs recalled package',url:'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/crystal-temptations-issues-allergy-alert-undeclared-milk-chocolatey-eyeballs'},
 {date:'August 29, 2026',title:'Everything Sprouts Robust Radish Mix',reason:'Potential STEC and Salmonella contamination; outbreak-linked',image:'https://www.fda.gov/files/styles/recall_image_small/public/image_1_228.png?itok=qEDDRZ6d',alt:'Everything Sprouts Robust Radish Mix 5 oz recalled package',url:'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/everything-sprouts-llc-expands-voluntarily-recall-include-robust-radish-mix-due-potential-e-coli-and'},
 {date:'August 29, 2026',title:'Martina Mangoes',reason:'Possible Salmonella contamination',image:'https://www.fda.gov/files/styles/recall_image_small/public/image_2_rev.png?itok=GQ6lKEnp',alt:'Martina recalled mango case and identifying label',url:'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/panorama-produce-recalls-mangoes-due-possible-salmonella-contamination'},
 {date:'August 26, 2026',title:'Jaime’s Spanish Village Jalapeño Ranch',reason:'Undeclared egg',image:'https://www.fda.gov/files/styles/recall_image_small/public/jamoe11_0.png?itok=LD6EOmbR',alt:'Jaime’s Spanish Village Jalapeño Ranch recalled product label',url:'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/jaimes-foods-atx-issues-allergy-alert-undeclared-egg-allergen-jaimes-spanish-village-jalapeno-ranch'}
];
function patchPublicRecalls(){
 try{
  const d=pub?.contentDocument;if(!d)return;
  const box=d.getElementById('currentRecallItems'),dialog=d.getElementById('currentRecallDialog');if(!box||!dialog)return;
  if(!d.getElementById('safeplate-recall-mobile-fix')){
    const st=d.createElement('style');st.id='safeplate-recall-mobile-fix';st.textContent=`
      #currentRecallDialog{overflow:auto!important;-webkit-overflow-scrolling:touch!important;align-items:flex-start!important;padding-top:12px!important;padding-bottom:12px!important}
      #currentRecallDialog .alertDialog{display:flex!important;flex-direction:column!important;max-height:calc(100dvh - 24px)!important;overflow:hidden!important}
      #currentRecallDialog .alertTop{flex:0 0 auto!important}
      #currentRecallDialog .alertItems{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;padding-bottom:18px!important}
      #currentRecallDialog .alertActions{flex:0 0 auto!important;position:sticky!important;bottom:0!important;background:#fffdf8!important;border-top:1px solid #e2e7e1!important;z-index:2!important}
      #currentRecallDialog .alertItem img{display:block!important;object-fit:contain!important;background:#fff!important}
      @media(max-width:560px){
        #currentRecallDialog{padding:8px!important}
        #currentRecallDialog .alertDialog{max-height:calc(100dvh - 16px)!important}
        #currentRecallDialog .alertItems{padding-left:18px!important;padding-right:18px!important}
      }`;
    d.head.appendChild(st);
  }
  const render=()=>{box.innerHTML=CURRENT_RECALLS.map(r=>`<article class="alertItem"><img src="${r.image}" alt="${r.alt}" loading="eager" decoding="async" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.hidden=false"><div class="alertThumbMissing" hidden>Official product photo unavailable</div><div><small>Recall date · ${r.date}</small><b>${r.title}</b><div style="margin-top:6px;color:#5a665d;font-size:11px;line-height:1.35">${r.reason}</div><a href="${r.url}" target="_blank" rel="noopener">Verify at official source</a></div></article>`).join('')};
  render();
  if(!dialog.dataset.safeplateCurrentFive){dialog.dataset.safeplateCurrentFive='1';new MutationObserver(()=>{if(!dialog.hidden){render();const items=dialog.querySelector('.alertItems');if(items)items.scrollTop=0}}).observe(dialog,{attributes:true,attributeFilter:['hidden']})}
 }catch(e){console.warn('SAFEPLATE current-recall patch skipped',e)}
}
pub?.addEventListener('load',()=>{patchPublicRecalls();setTimeout(patchPublicRecalls,250);setTimeout(patchPublicRecalls,1000)});
setTimeout(patchPublicRecalls,300);
})();
