export default async (req) => {
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/unified-intelligence-v12.html`, { headers: { accept: "text/html" } });
  if (!r.ok) return new Response("SAFEPLATE Food Journey unavailable", { status: 502 });

  let html = await r.text();

  const mobileRelease = `<style id="safeplate-journey-mobile-release">
  html,body{max-width:100%;overflow-x:hidden}
  .journey-public-toggle{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9999;text-decoration:none;background:#fff;color:#0b6b36;border:1px solid #cfe7d8;border-radius:999px;padding:10px 13px;font:900 11px/1 Inter,system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.22)}
  @media(max-width:420px){
    nav{gap:7px;padding:8px 10px}.brand{min-width:0}.brand strong{font-size:18px}.brand small{font-size:8px}.mark{width:36px;height:36px}
    .status{font-size:9px;padding:6px 8px;max-width:45vw;overflow:hidden;text-overflow:ellipsis}
    .links{width:100%;flex-basis:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}.links a{font-size:10px;padding:8px 9px}
    .app{padding:8px 0 70px}.wrap{padding:0 8px}.intro h1{font-size:32px}.intro p{font-size:12px}
    .toolbar{display:block}.search{font-size:16px}.toggle{display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch}.toggle button{flex:0 0 auto;font-size:10px;padding:9px 11px}
    .quick button{min-width:78vw}.journeyHeader{display:block}.playBig{margin-top:8px;min-height:44px}
    .story{grid-template-columns:1fr}.layout{margin:0 -8px}.mapframe{height:560px;min-height:560px}.stage{left:8px;right:8px;top:8px;padding:10px}.trace{left:8px;right:8px;bottom:8px;padding:8px}
    .traceTop{grid-template-columns:1fr 28px 1fr}.tracebox{padding:8px}.tracebox strong{font-size:10px}.tracebox span{font-size:8px}.arrow{font-size:18px}
    .transport{grid-template-columns:1fr}.transportBtns{overflow-x:auto;-webkit-overflow-scrolling:touch}.transportBtns button{flex:0 0 auto;min-height:36px}.progress{grid-column:1}.panel{margin:8px;border-radius:12px;padding:12px}
    .journey-public-toggle{right:8px;bottom:calc(8px + env(safe-area-inset-bottom))}
  }
  @media(max-width:340px){.status{display:none}.mapframe{height:520px;min-height:520px}.journey-public-toggle{font-size:10px;padding:9px 11px}}
  </style>`;
  if (!html.includes('safeplate-journey-mobile-release')) {
    html = html.includes('</head>') ? html.replace('</head>', `${mobileRelease}</head>`) : `${mobileRelease}${html}`;
  }

  const publicToggle = '<a class="journey-public-toggle" href="/public-view-v1.html" aria-label="Switch to SAFEPLATE Public View">Public View</a>';
  if (!html.includes('journey-public-toggle')) {
    html = html.includes('</body>') ? html.replace('</body>', `${publicToggle}</body>`) : `${html}${publicToggle}`;
  } else if (!html.includes('aria-label="Switch to SAFEPLATE Public View"')) {
    html = html.includes('</body>') ? html.replace('</body>', `${publicToggle}</body>`) : `${html}${publicToggle}`;
  }

  const queryBridge = `<script>
  window.addEventListener('DOMContentLoaded',()=>{
    const q=new URLSearchParams(location.search).get('q');
    if(!q)return;
    const apply=()=>{
      const input=document.getElementById('q');
      if(!input)return false;
      input.value=q;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      return true;
    };
    if(!apply()){
      let tries=0;
      const t=setInterval(()=>{tries++;if(apply()||tries>30)clearInterval(t)},100);
    }
  });
  </script>`;
  if (!html.includes("URLSearchParams(location.search).get('q')")) {
    html = html.includes('</body>') ? html.replace('</body>', `${queryBridge}</body>`) : `${html}${queryBridge}`;
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache"
    }
  });
};

export const config = { path: "/unified-intelligence.html" };
