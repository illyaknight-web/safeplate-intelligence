export default async (req) => {
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/public-view-v1.html`, { headers: { accept: "text/html" } });
  if (!r.ok) return new Response("SAFEPLATE Public View unavailable", { status: 502 });

  let html = await r.text();

  // One SAFEPLATE site, two internal views. Use the existing static Advanced page directly.
  // This avoids the fragile custom /unified-intelligence.html route that has returned 404s in production.
  const ADV = '/unified-intelligence-v12.html';
  html = html
    .replace(/href=["']\/public-view-v1\.html["']([^>]*)>Public View<\/a>/i, 'href="/" aria-current="page"$1>Public View</a>')
    .replace(/href=["']\/["']([^>]*)>Advanced View<\/a>/i, `href="${ADV}"$1>Advanced View</a>`)
    .replace(/<a\s+href=["']\/["']([^>]*)>Open Advanced View(?:\s*→)?<\/a>/i, `<a href="${ADV}"$1>Open Advanced View →</a>`)
    .replaceAll('/unified-intelligence.html', ADV);

  // Preserve the approved, confirmed photo assets and bypass the corrupted WEBP files.
  html = html
    .replaceAll('/assets/public-hero-1.webp', '/assets/public-hero-1-confirmed.jpg')
    .replaceAll('/assets/public-hero-2.webp', '/assets/public-hero-2-confirmed.jpg')
    .replaceAll('/assets/public-hero-3.webp', '/assets/public-hero-3-confirmed.jpg')
    .replaceAll('/assets/public-hero-4.webp', '/assets/public-hero-4-confirmed.jpg')
    .replaceAll('/assets/public-hero-5.webp', '/assets/public-hero-5-confirmed.jpg')
    .replaceAll('?v=20260830-seven', '?v=20260830-approved-restore');

  // Retire the automatic recall modal. Recall data remains available through normal SAFEPLATE results.
  const popupGuard = `<script id="safeplate-popup-retire">(()=>{window.__SAFEPLATE_RECALL_ENTRY_ALERT__=true;const kill=()=>document.getElementById('safeplate-recall-entry')?.remove();kill();new MutationObserver(kill).observe(document.documentElement,{childList:true,subtree:true});})();</script>`;
  if (!html.includes('safeplate-popup-retire')) {
    html = html.includes('</body>') ? html.replace('</body>', `${popupGuard}</body>`) : `${html}${popupGuard}`;
  }

  // ui-fixes now only restores native approved images; it no longer owns navigation.
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
