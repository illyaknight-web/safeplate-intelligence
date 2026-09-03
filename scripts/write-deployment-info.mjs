import { writeFileSync } from "node:fs";

const metadata = {
  commit: process.env.COMMIT_REF || null,
  deployId: process.env.DEPLOY_ID || null,
  context: process.env.CONTEXT || null,
  productionUrl: process.env.URL || "https://safeplate-intelligence.netlify.app",
  builtAt: new Date().toISOString()
};

if (!metadata.commit && process.env.NETLIFY === "true") {
  throw new Error("Netlify build is missing COMMIT_REF");
}

writeFileSync("site/deployment.json", `${JSON.stringify(metadata, null, 2)}\n`);
console.log(`Wrote deployment marker for ${metadata.commit || "local build"}`);
