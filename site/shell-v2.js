(()=>{'use strict';
const switcher=document.querySelector('.viewSwitch'),stage=document.querySelector('.stage');
if(!switcher||!stage||document.getElementById('boothBtn'))return;
const boothBtn=document.createElement('button');boothBtn.id='boothBtn';boothBtn.type='button';boothBtn.setAttribute('role','tab');boothBtn.setAttribute('aria-selected','false');boothBtn.textContent='Booth Mode';switcher.insertBefore(boothBtn,document.getElementById('advBtn'));
const booth=document.createElement('iframe');booth.id='boothFrame';booth.className='viewFrame inactive';booth.title='SAFEPLATE Booth Mode';booth.src='/booth.html?embed=1';stage.appendChild(booth);
const style=document.createElement('style');style.textContent='.viewSwitch{grid-template-columns:repeat(3,1fr)!important}.headerMeta{font-size:0}.headerMeta:before{content:"One site · three views · 30-minute live checks";font-size:10px}@media(max-width:760px){.brand{padding-right:0!important}.headerMeta{display:none!important}.viewSwitch button{font-size:12px!important;padding:12px 5px!important}}';document.head.appendChild(style);
const pub=document.getElementById('publicFrame'),adv=document.getElementById('advancedFrame'),pb=document.getElementById('pubBtn'),ab=document.getElementById('advBtn');
function hideBooth(){booth.className='viewFrame inactive';boothBtn.classList.remove('active');boothBtn.setAttribute('aria-selected','false')}
pb.addEventListener('click',hideBooth,true);ab.addEventListener('click',hideBooth,true);
boothBtn.addEventListener('click',()=>{pub.className='viewFrame inactive';adv.className='viewFrame inactive';booth.className='viewFrame active';pb.classList.remove('active');ab.classList.remove('active');boothBtn.classList.add('active');pb.setAttribute('aria-selected','false');ab.setAttribute('aria-selected','false');boothBtn.setAttribute('aria-selected','true');history.pushState({mode:'booth'},'', '/booth');booth.focus()});
if(location.pathname==='/booth')boothBtn.click();
addEventListener('popstate',()=>{if(location.pathname==='/booth')boothBtn.click();else hideBooth()});
})();
