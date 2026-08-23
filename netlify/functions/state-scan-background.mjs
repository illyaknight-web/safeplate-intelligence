import { runStateScan } from "./state-scan.mjs";

export default async (req) => {
  const expected = Netlify.env.get("SAFEPLATE_ADMIN_TOKEN");
  const auth = req.headers.get("authorization") || "";
  if (!expected || auth !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  await runStateScan();
};

export const config = { background: true };
