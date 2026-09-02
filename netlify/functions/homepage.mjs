export default async (req) => {
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/safeplate-shell.html`, { headers: { accept: "text/html" } });
  if (!r.ok) return new Response("SAFEPLATE unavailable", { status: 502 });
  return new Response(await r.text(), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate"
    }
  });
};

export const config = { path: "/" };
