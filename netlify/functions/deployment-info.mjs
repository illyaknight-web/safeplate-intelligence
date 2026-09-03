export default async () => Response.json({
  commit: Netlify.env.get("COMMIT_REF") || null,
  deployId: Netlify.env.get("DEPLOY_ID") || null,
  context: Netlify.env.get("CONTEXT") || null,
  productionUrl: Netlify.env.get("URL") || "https://safeplate-intelligence.netlify.app",
  checkedAt: new Date().toISOString()
}, { headers: { "cache-control": "no-store" } });

export const config = { path: "/api/deployment-info" };
