
import crypto from "node:crypto";
const hazardFrom=(s="")=>{
 const t=s.toLowerCase();
 if(t.includes("salmonella"))return"Salmonella";if(t.includes("listeria"))return"Listeria";if(t.includes("e. coli")||t.includes("e.coli"))return"E. coli";
 if(t.includes("allergen"))return"Undeclared allergen";if(t.includes("foreign"))return"Foreign material";if(t.includes("cyclospora"))return"Cyclospora";
 return "Food safety / compliance";
};
const severityFrom=(classification="",reason="")=>{
 const c=classification.trim().toLowerCase(),r=reason.toLowerCase();
 if(c==="class i"||r.includes("death")||r.includes("hospital"))return"CRITICAL";
 if(c==="class ii"||/(salmonella|listeria|e\.? coli|cyclospora)/.test(r))return"HIGH";
 if(c==="class iii")return"WATCH";
 return"WATCH";
};
export function fingerprint(parts){return crypto.createHash("sha256").update(parts.filter(Boolean).join("|").toLowerCase()).digest("hex").slice(0,24)}
export function normalizeFDA(r){
 const id=`FDA-${r.recall_number||fingerprint([r.recalling_firm,r.product_description,r.recall_initiation_date])}`;
 const text=[r.reason_for_recall,r.product_description].filter(Boolean).join(" ");
 return {id,title:r.product_description||"FDA food enforcement record",product:r.product_description||"",company:r.recalling_firm||"",hazard:hazardFrom(text),severity:severityFrom(r.classification,text),status:r.status==="Ongoing"?"VERIFIED":"RESOLVED",category:"Food",states:[],distribution:r.distribution_pattern||"",lat:null,lng:null,source:"FDA openFDA",updatedAt:toISO(r.report_date||r.recall_initiation_date),verifiedAt:toISO(r.report_date||r.recall_initiation_date),summary:r.reason_for_recall||"",lots:[],evidence:[{type:"AGENCY",status:"VERIFIED",source:"FDA openFDA Food Enforcement",text:r.reason_for_recall||"FDA enforcement record",url:"https://open.fda.gov/apis/food/enforcement/"}],entities:[{id:`food-${id}`,type:"Food",name:(r.product_description||"Food").slice(0,90)},{id:`company-${id}`,type:"Company",name:r.recalling_firm||"Recalling firm"},{id:`hazard-${id}`,type:"Hazard",name:hazardFrom(text)}],links:[[ `food-${id}`,`company-${id}`,"recalled by"],[`food-${id}`,`hazard-${id}`,"hazard"]],rawSource:"fda_openfda"};
}
export function normalizeFSIS(r){
 const rid=r.field_recall_number||r.recall_number||r.id||fingerprint([r.field_title,r.field_recall_date]);
 const title=r.field_title||r.title||"USDA FSIS recall / public health alert"; const reason=r.field_reason_for_recall||r.reason_for_recall||r.field_summary||"";
 const id=`FSIS-${String(rid).replace(/\s+/g,"-")}`;
 return {id,title,product:r.field_product_items||r.product_items||title,company:r.field_establishment||r.establishment||"",hazard:hazardFrom(reason),severity:severityFrom(r.field_recall_classification||"",reason),status:"VERIFIED",category:"Meat / poultry / egg / FSIS regulated",states:[],distribution:r.field_states||"",lat:null,lng:null,source:"USDA FSIS",updatedAt:toISO(r.field_recall_date||r.recall_date||new Date()),verifiedAt:toISO(r.field_recall_date||r.recall_date||new Date()),summary:reason,lots:[],evidence:[{type:"AGENCY",status:"VERIFIED",source:"USDA FSIS Recall API",text:reason||title,url:r.field_recall_url||"https://www.fsis.usda.gov/recalls"}],entities:[{id:`food-${id}`,type:"Food",name:String(title).slice(0,90)},{id:`company-${id}`,type:"Company",name:r.field_establishment||"FSIS establishment"},{id:`hazard-${id}`,type:"Hazard",name:hazardFrom(reason)}],links:[[`food-${id}`,`company-${id}`,"recalled by"],[`food-${id}`,`hazard-${id}`,"hazard"]],rawSource:"usda_fsis"};
}
function toISO(v){if(!v)return new Date().toISOString();const s=String(v);if(/^\d{8}$/.test(s))return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T00:00:00.000Z`;const d=new Date(v);return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString()}
