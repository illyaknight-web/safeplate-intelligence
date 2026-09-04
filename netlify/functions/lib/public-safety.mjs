import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

const clean=(v,max=500)=>String(v??'').replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export const text=(v,max)=>clean(v,max);
export const id=()=>`${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}`;
export const hash=v=>crypto.createHash('sha256').update(String(v||'')).digest('hex');
export const json=(body,status=200,extra={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
export async function readBody(req,maxBytes=16000){const raw=await req.text();if(raw.length>maxBytes)throw Object.assign(Error('Request too large'),{status:413});try{return JSON.parse(raw||'{}')}catch{throw Object.assign(Error('Invalid JSON'),{status:400})}}
export async function rateLimit(req,bucket,limit=30,windowMinutes=10){const store=getStore({name:'safeplate-security',consistency:'strong'}),window=Math.floor(Date.now()/(windowMinutes*60000)),key=`rate/${bucket}/${window}/${hash(req.headers.get('x-nf-client-connection-ip')||req.headers.get('x-forwarded-for')||'unknown').slice(0,24)}`;const current=await store.get(key,{type:'json'}).catch(()=>null)||{count:0};current.count+=1;await store.setJSON(key,current,{metadata:{expiresAfterMinutes:windowMinutes*2}});return current.count<=limit}
export async function audit(event,req,data={}){const store=getStore({name:'safeplate-audit'}),time=new Date().toISOString(),key=`events/${time.slice(0,10)}/${time}-${id()}`;await store.setJSON(key,{event,time,requestId:req.headers.get('x-nf-request-id')||null,actorHash:hash(req.headers.get('authorization')||req.headers.get('x-nf-client-connection-ip')||'anonymous').slice(0,24),...data});return key}
