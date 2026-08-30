export default async (req) => {
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/public-view-v1.html`, { headers: { accept: "text/html" } });
  if (!r.ok) return new Response("SAFEPLATE Public View unavailable", { status: 502 });

  let html = await r.text();

  html = html
    .replace('href="/public-view-v1.html">Public View</a>', 'href="/" aria-current="page">Public View</a>')
    .replace('href="/">Advanced View</a>', 'href="/unified-intelligence.html">Advanced View</a>')
    .replace('<a href="/">Open Advanced View</a>', '<a href="/unified-intelligence.html">Open Advanced View</a>');

  const uiFixes = '<script src="/ui-fixes.js" defer></script>';
  if (!html.includes('/ui-fixes.js')) {
    html = html.includes('</body>') ? html.replace('</body>', `${uiFixes}</body>`) : `${html}${uiFixes}`;
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache"
    }
  });
};

export const config = { path: "/" };
