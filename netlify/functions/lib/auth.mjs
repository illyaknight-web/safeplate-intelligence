
import crypto from "node:crypto";
export function requireAdmin(req){
 const expected=process.env.SAFEPLATE_ADMIN_TOKEN||"";
 if(!expected)return {ok:false,response:Response.json({error:"SAFEPLATE_ADMIN_TOKEN is not configured"},{status:503})};
 const supplied=req.headers.get("x-safeplate-admin-token")||"";
 const a=Buffer.from(supplied),b=Buffer.from(expected);
 const ok=a.length===b.length && crypto.timingSafeEqual(a,b);
 return ok?{ok:true}:{ok:false,response:Response.json({error:"Unauthorized"},{status:401})};
}
