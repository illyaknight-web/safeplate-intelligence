
import { getStore } from "@netlify/blobs";
const STORE="safeplate-live-v34";
const env=name=>globalThis.Netlify?.env?.get?.(name)||process.env[name]||"";
const safe=v=>String(v||"").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"").slice(0,40);

export function stateStoreName(){
 const override=safe(env("SAFEPLATE_STORE_NAMESPACE"));
 if(override)return `${STORE}-${override}`.slice(0,64);
 const context=safe(env("CONTEXT"));
 if(!context||context==="production")return STORE;
 const deployment=safe(env("BRANCH"))||context;
 return `${STORE}-${deployment}`.slice(0,64);
}
export async function getJSON(key,fallback){
 const s=getStore({name:stateStoreName(),consistency:"strong"}); try{const v=await s.get(key,{type:"json"});return v??fallback}catch{return fallback}
}
export async function setJSON(key,val){const s=getStore({name:stateStoreName(),consistency:"strong"});await s.setJSON(key,val);return val}
export async function getState(){return getJSON("state",{meta:{lastSync:null},incidents:[],sourceHealth:[],changes:[],investigations:[]})}
export async function saveState(v){return setJSON("state",v)}
