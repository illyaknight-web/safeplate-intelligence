
import { getStore } from "@netlify/blobs";
const STORE="safeplate-live-v34";
export async function getJSON(key,fallback){
 const s=getStore(STORE); try{const v=await s.get(key,{type:"json",consistency:"strong"});return v??fallback}catch{return fallback}
}
export async function setJSON(key,val){const s=getStore(STORE);await s.setJSON(key,val);return val}
export async function getState(){return getJSON("state",{meta:{lastSync:null},incidents:[],sourceHealth:[],changes:[],investigations:[]})}
export async function saveState(v){return setJSON("state",v)}
