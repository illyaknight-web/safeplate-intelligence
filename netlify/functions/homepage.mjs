export default async (req) => {
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/index.html`, { headers: { accept: "text/html" } });
  if (!r.ok) return new Response("SAFEPLATE homepage unavailable", { status: 502 });

  let html = await r.text();

  // The published HTML still contains the legacy inline application runtime.
  // It has a parser defect and is intentionally removed at the public root so
  // only the repaired external runtime controls navigation/data rendering.
  const lastScriptStart = html.lastIndexOf("<script>");
  const lastScriptEnd = html.lastIndexOf("</script>");
  if (lastScriptStart >= 0 && lastScriptEnd > lastScriptStart) {
    const legacy = html.slice(lastScriptStart, lastScriptEnd + 9);
    if (legacy.includes("SAFEPLATE live load failed") || legacy.includes("const data={incidents")) {
      html = html.slice(0, lastScriptStart) + html.slice(lastScriptEnd + 9);
    }
  }

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
