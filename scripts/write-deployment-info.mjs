import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const gitCommit=()=>{try{return execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim()}catch{return null}};
const suppliedCommit=process.env.COMMIT_REF||null;
const immutableCommit=/^[0-9a-f]{40}$/i.test(suppliedCommit||"")?suppliedCommit:gitCommit();

const metadata = {
  commit: immutableCommit,
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
