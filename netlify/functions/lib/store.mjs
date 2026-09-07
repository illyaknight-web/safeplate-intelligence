
import { getStore } from "@netlify/blobs";
const STORE="safeplate-live-v34";
export async function getJSON(key,fallback){
 const s=getStore({name:STORE,consistency:"strong"}); try{const v=await s.get(key,{type:"json"});return v??fallback}catch{return fallback}
}
export async function setJSON(key,val){const s=getStore({name:STORE,consistency:"strong"});await s.setJSON(key,val);return val}
export async function getState(){return getJSON("state",{meta:{lastSync:null},incidents:[],sourceHealth:[],changes:[],investigations:[]})}
export async function saveState(v){return setJSON("state",v)}
