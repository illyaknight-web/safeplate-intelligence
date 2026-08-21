
import corpus from "../../validation-corpus.json" with { type: "json" };
export default async()=>Response.json(corpus,{headers:{"cache-control":"no-store"}});
export const config={path:"/api/validation-corpus"};
