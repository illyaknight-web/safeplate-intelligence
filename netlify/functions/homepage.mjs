export default async (req) => {
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/index.html`, { headers: { accept: "text/html" } });
  if (!r.ok) return new Response("SAFEPLATE homepage unavailable", { status: 502 });
  let html = await r.text();
  const tag = '<script src="/live-alert.js" defer></script>';
  if (!html.includes('/live-alert.js')) {
    html = html.includes('</body>') ? html.replace('</body>', `${tag}</body>`) : `${html}${tag}`;
  }
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache"
    }
  });
};

export const config = { path: "/" };
