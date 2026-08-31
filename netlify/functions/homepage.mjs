export default async (req) => {
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/public-view-v1.html`, { headers: { accept: "text/html" } });
  if (!r.ok) return new Response("SAFEPLATE Public View unavailable", { status: 502 });

  let html = await r.text();

  // One SAFEPLATE site, two internal views. Use the existing static Advanced page directly.
  const ADV = '/unified-intelligence-v12.html';
  html = html
    .replace(/href=["']\/public-view-v1\.html["']([^>]*)>Public View<\/a>/i, 'href="/" aria-current="page"$1>Public View</a>')
    .replace(/href=["']\/["']([^>]*)>Advanced View<\/a>/i, `href="${ADV}"$1>Advanced View</a>`)
    .replace(/<a\s+href=["']\/["']([^>]*)>Open Advanced View(?:\s*→)?<\/a>/i, `<a href="${ADV}"$1>Open Advanced View →</a>`)
    .replaceAll('/unified-intelligence.html', ADV);

  // Preserve only the confirmed approved photograph set. Do not use the corrupted WEBP/social/editorial fallbacks.
  html = html
    .replaceAll('/assets/public-hero-1.webp', '/assets/public-hero-1-confirmed.jpg')
    .replaceAll('/assets/public-hero-2.webp', '/assets/public-hero-2-confirmed.jpg')
    .replaceAll('/assets/public-hero-3.webp', '/assets/public-hero-3-confirmed.jpg')
    .replaceAll('/assets/public-hero-4.webp', '/assets/public-hero-4-confirmed.jpg')
    .replaceAll('/assets/public-hero-5.webp', '/assets/public-hero-5-confirmed.jpg')
    .replaceAll('/assets/safeplate-social.jpg', '/assets/public-hero-1-confirmed.jpg')
    .replaceAll('/assets/safeplate-editorial.jpg', '/assets/public-hero-2-confirmed.jpg')
    .replaceAll('?v=20260830-seven', '?v=20260830-approved-surgical');

  // Lock hero rotation to confirmed assets only. This removes corrupted fallback images without changing the approved layout.
  html = html.replace(
    /const HEROES=\[[^;]+\];/,
    "const HEROES=['/assets/public-hero-1-confirmed.jpg','/assets/public-hero-2-confirmed.jpg','/assets/public-hero-3-confirmed.jpg','/assets/public-hero-4-confirmed.jpg','/assets/public-hero-5-confirmed.jpg'];"
  );

  // Retire the automatic recall modal and clear any stale overlay/body lock from an older cached script.
  const popupGuard = `<script id="safeplate-popup-retire">(()=>{window.__SAFEPLATE_RECALL_ENTRY_ALERT__=true;const kill=()=>{document.getElementById('safeplate-recall-entry')?.remove();document.querySelectorAll('[data-safeplate-recall-entry],.safeplate-recall-entry').forEach(el=>el.remove());if(document.body){document.body.style.overflow='';document.body.style.position=''}};kill();new MutationObserver(kill).observe(document.documentElement,{childList:true,subtree:true});})();</script>`;
  if (!html.includes('safeplate-popup-retire')) {
    html = html.includes('</body>') ? html.replace('</body>', `${popupGuard}</body>`) : `${html}${popupGuard}`;
  }

  // Small-screen containment only: prevent the existing brand/toggle from wrapping over page content.
  const mobileFix = `<style id="safeplate-mobile-surgical-fix">
  @media(max-width:560px){
    .top{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:8px!important;padding:9px 12px!important;flex-wrap:nowrap!important}
    .brand{min-width:0!important;margin-right:0!important;overflow:hidden}
    .brand>div:last-child{min-width:0}
    .brand strong,.brand small{white-space:nowrap}
    .mode{min-width:0!important;flex-shrink:0!important;margin-left:0!important;white-space:nowrap}
    .mode a{white-space:nowrap}
  }
  @media(max-width:390px){
    .mark{width:34px!important;height:34px!important;border-radius:11px!important}
    .brand{gap:7px!important}
    .brand strong{font-size:16px!important}
    .brand small{font-size:9px!important}
    .mode{padding:3px!important;gap:2px!important}
    .mode a{padding:7px 7px!important;font-size:10px!important}
  }
  </style>`;
  if (!html.includes('safeplate-mobile-surgical-fix')) {
    html = html.includes('</head>') ? html.replace('</head>', `${mobileFix}</head>`) : `${mobileFix}${html}`;
  }

  // ui-fixes only restores native approved images; it does not own navigation.
  const uiFixes = '<script src="/ui-fixes.js" defer></script>';
  if (!html.includes('/ui-fixes.js')) {
    html = html.includes('</body>') ? html.replace('</body>', `${uiFixes}</body>`) : `${html}${uiFixes}`;
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate"
    }
  });
};

export const config = { path: "/" };
