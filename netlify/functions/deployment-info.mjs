const env = (name) => process.env[name] || globalThis.Netlify?.env?.get?.(name) || null;

export default async () => Response.json({
  commit: env("COMMIT_REF"),
  deployId: env("DEPLOY_ID"),
  context: env("CONTEXT"),
  productionUrl: env("URL") || "https://safeplate-intelligence.netlify.app",
  checkedAt: new Date().toISOString()
}, { headers: { "cache-control": "no-store" } });

export const config = { path: "/api/deployment-info" };
