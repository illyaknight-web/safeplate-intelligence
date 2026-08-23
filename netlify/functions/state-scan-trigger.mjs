export default async (req) => {
  const expected = Netlify.env.get("SAFEPLATE_ADMIN_TOKEN");
  if (!expected) throw new Error("SAFEPLATE_ADMIN_TOKEN missing");
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/.netlify/functions/state-scan-background`, {
    method: "POST",
    headers: { authorization: `Bearer ${expected}`, "content-type": "application/json" },
    body: "{}"
  });
  if (!(r.ok || r.status === 202)) throw new Error(`state-scan-background dispatch ${r.status}`);
};

export const config = { schedule: "4,34 * * * *" };
