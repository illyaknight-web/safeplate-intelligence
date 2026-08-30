export default async (req) => {
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/public-view-v1.html`, { headers: { accept: "text/html" } });
  if (!r.ok) return new Response("SAFEPLATE Public View unavailable", { status: 502 });

  let html = await r.text();

  // Production navigation contract:
  // / = Public View
  // /unified-intelligence.html = Advanced View
  // Do this in the server response so navigation works even before client JS runs.
  html = html
    .replace(/href=["']\/public-view-v1\.html["']([^>]*)>Public View<\/a>/i, 'href="/" aria-current="page"$1>Public View</a>')
    .replace(/href=["']\/["']([^>]*)>Advanced View<\/a>/i, 'href="/unified-intelligence.html"$1>Advanced View</a>')
    .replace(/<a\s+href=["']\/["']([^>]*)>Open Advanced View(?:\s*→)?<\/a>/i, '<a href="/unified-intelligence.html"$1>Open Advanced View →</a>');

  // Final navigation guard. This is intentionally tiny and only owns the two view-switch links.
  // It prevents stale markup or future content edits from silently pointing Advanced View back to /.
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
