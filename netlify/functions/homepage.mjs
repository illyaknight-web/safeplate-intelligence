export default async (req) => {
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/public-view-v1.html`, { headers: { accept: "text/html" } });
  if (!r.ok) return new Response("SAFEPLATE Public View unavailable", { status: 502 });

  let html = await r.text();

  // Production navigation contract: one SAFEPLATE site, two internal views.
  html = html
    .replace(/href=["']\/public-view-v1\.html["']([^>]*)>Public View<\/a>/i, 'href="/" aria-current="page"$1>Public View</a>')
    .replace(/href=["']\/["']([^>]*)>Advanced View<\/a>/i, 'href="/unified-intelligence.html"$1>Advanced View</a>')
    .replace(/<a\s+href=["']\/["']([^>]*)>Open Advanced View(?:\s*→)?<\/a>/i, '<a href="/unified-intelligence.html"$1>Open Advanced View →</a>');

  // Restore the approved, confirmed photo assets and bypass the corrupted WEBP files.
  // The confirmed JPEGs are already stored in site/assets and were generated from the approved source board.
  html = html
    .replaceAll('/assets/public-hero-1.webp', '/assets/public-hero-1-confirmed.jpg')
    .replaceAll('/assets/public-hero-2.webp', '/assets/public-hero-2-confirmed.jpg')
    .replaceAll('/assets/public-hero-3.webp', '/assets/public-hero-3-confirmed.jpg')
    .replaceAll('/assets/public-hero-4.webp', '/assets/public-hero-4-confirmed.jpg')
    .replaceAll('/assets/public-hero-5.webp', '/assets/public-hero-5-confirmed.jpg')
    .replaceAll('?v=20260830-seven', '?v=20260830-approved-restore');

  // Keep the public page from auto-opening the retired recall modal even if an older script is cached.
  const popupGuard = `<script id="safeplate-popup-retire">(()=>{window.__SAFEPLATE_RECALL_ENTRY_ALERT__=true;const kill=()=>document.getElementById('safeplate-recall-entry')?.remove();kill();new MutationObserver(kill).observe(document.documentElement,{childList:true,subtree:true});})();</script>`;
  if (!html.includes('safeplate-popup-retire')) {
    html = html.includes('</body>') ? html.replace('</body>', `${popupGuard}</body>`) : `${html}${popupGuard}`;
  }

  // Final navigation guard so stale markup cannot silently break the view switch.
  const navGuard = `<script id="safeplate-view-navigation-guard">(()=>{const ADV='/unified-intelligence.html';const PUB='/';const fix=()=>{document.querySelectorAll('a').forEach(a=>{const t=(a.textContent||'').trim();if(t==='Advanced View'||t.startsWith('Open Advanced View'))a.setAttribute('href',ADV);if(t==='Public View')a.setAttribute('href',PUB)})};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix,{once:true});else fix();})();</script>`;
  if (!html.includes('safeplate-view-navigation-guard')) {
    html = html.includes('</body>') ? html.replace('</body>', `${navGuard}</body>`) : `${html}${navGuard}`;
  }

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
