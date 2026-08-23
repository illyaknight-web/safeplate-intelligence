export default async (req) => {
  if (new URL(req.url).pathname !== "/api/bootstrap-state-scan-a8df967b436dca55855e4f72") {
    return new Response("Not found", { status: 404 });
  }
  const expected = Netlify.env.get("SAFEPLATE_ADMIN_TOKEN");
  if (!expected) return new Response("SAFEPLATE_ADMIN_TOKEN missing", { status: 500 });
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/.netlify/functions/state-scan-background`, {
    method: "POST",
    headers: { authorization: `Bearer ${expected}`, "content-type": "application/json" },
    body: "{}"
  });
  return Response.json({ dispatched: r.ok || r.status === 202, status: r.status }, { status: (r.ok || r.status === 202) ? 202 : 502 });
};

export const config = { path: "/api/bootstrap-state-scan-a8df967b436dca55855e4f72" };
