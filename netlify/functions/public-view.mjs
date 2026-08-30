export default async (req) => {
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/public-view-v1.html?static=1`, { headers: { accept: "text/html" } });
  if (!r.ok) return new Response("SAFEPLATE Public View unavailable", { status: 502 });

  let html = await r.text();

  // Public and Advanced are two modes of the same SAFEPLATE experience.
  html = html
    .replace('href="/">Advanced View</a>', 'href="/unified-intelligence.html">Advanced View</a>')
    .replace('<a href="/">Open Advanced View</a>', '<a href="/unified-intelligence.html">Open Advanced View</a>');

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache"
    }
  });
};

export const config = { path: "/public-view-v1.html" };
