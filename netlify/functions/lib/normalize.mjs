import crypto from "node:crypto";

const hazardFrom=(s="")=>{
  const t=s.toLowerCase();
  if(t.includes("salmonella"))return"Salmonella";
  if(t.includes("listeria"))return"Listeria";
  if(t.includes("e. coli")||t.includes("e.coli"))return"E. coli";
  if(t.includes("allergen"))return"Undeclared allergen";
  if(t.includes("foreign"))return"Foreign material";
  if(t.includes("cyclospora"))return"Cyclospora";
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

const US_STATES={
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",DC:"District of Columbia"
};
const NAME_TO_CODE=Object.fromEntries(Object.entries(US_STATES).map(([k,v])=>[v.toLowerCase(),k]));

function parseStates(v=""){
  const t=String(v||"");
  if(!t)return[];
  if(/nationwide|all states|throughout the united states|u\.s\. nationwide/i.test(t))return Object.keys(US_STATES).filter(x=>x!=="DC");
  const out=new Set();
  for(const [name,code] of Object.entries(NAME_TO_CODE)){
    const rx=new RegExp(`\\b${name.replace(/ /g,"\\s+")}\\b`,`i`);
    if(rx.test(t))out.add(code);
  }
  for(const code of Object.keys(US_STATES)){
    const rx=new RegExp(`(?:^|[\\s,;/()])${code}(?=$|[\\s,;/().])`,`i`);
    if(rx.test(t))out.add(code);
  }
  return [...out];
}

function cleanPlace(parts){return parts.map(v=>String(v||"").trim()).filter(Boolean).join(", ")}

export function normalizeFDA(r){
  const id=`FDA-${r.recall_number||fingerprint([r.recalling_firm,r.product_description,r.recall_initiation_date])}`;
  const text=[r.reason_for_recall,r.product_description].filter(Boolean).join(" ");
  const distribution=r.distribution_pattern||"";
  const firmPlace=cleanPlace([r.city,r.state,r.country]);
  return {
    id,
    title:r.product_description||"FDA food enforcement record",
    product:r.product_description||"",
    company:r.recalling_firm||"",
    hazard:hazardFrom(text),
    severity:severityFrom(r.classification,text),
    status:r.status==="Ongoing"?"VERIFIED":"RESOLVED",
    category:"Food",
    states:parseStates(distribution),
    distribution,
    firmLocation:firmPlace?{type:"recalling_firm",city:r.city||"",state:r.state||"",country:r.country||"",label:firmPlace}:null,
    origin:null,
    lat:null,lng:null,
    source:"FDA openFDA",
    updatedAt:toISO(r.report_date||r.recall_initiation_date),
    verifiedAt:toISO(r.report_date||r.recall_initiation_date),
    recallDate:toISO(r.recall_initiation_date||r.report_date),
    summary:r.reason_for_recall||"",
    lots:[],
    evidence:[
      {type:"AGENCY",status:"VERIFIED",source:"FDA openFDA Food Enforcement",text:r.reason_for_recall||"FDA enforcement record",url:"https://open.fda.gov/apis/food/enforcement/"},
      ...(firmPlace?[{type:"LOCATION",status:"VERIFIED",source:"FDA recalling-firm location",text:firmPlace,role:"recalling_firm"}]:[]),
      ...(distribution?[{type:"DISTRIBUTION",status:"VERIFIED",source:"FDA distribution pattern",text:distribution}]:[])
    ],
    entities:[
      {id:`food-${id}`,type:"Food",name:(r.product_description||"Food").slice(0,90)},
      {id:`company-${id}`,type:"Company",name:r.recalling_firm||"Recalling firm"},
      {id:`hazard-${id}`,type:"Hazard",name:hazardFrom(text)},
      ...(firmPlace?[{id:`firm-location-${id}`,type:"Recalling firm location",name:firmPlace}]:[])
    ],
    links:[[`food-${id}`,`company-${id}`,"recalled by"],[`food-${id}`,`hazard-${id}`,"hazard"]],
    rawSource:"fda_openfda"
  };
}

export function normalizeFSIS(r){
  const rid=r.field_recall_number||r.recall_number||r.id||fingerprint([r.field_title,r.field_recall_date]);
  const title=r.field_title||r.title||"USDA FSIS recall / public health alert";
  const reason=r.field_reason_for_recall||r.reason_for_recall||r.field_summary||"";
  const distribution=r.field_states||r.states||r.distribution||"";
  const establishment=r.field_establishment||r.establishment||"";
  const id=`FSIS-${String(rid).replace(/\s+/g,"-")}`;
  return {
    id,title,
    product:r.field_product_items||r.product_items||title,
    company:establishment,
    hazard:hazardFrom(reason),
    severity:severityFrom(r.field_recall_classification||"",reason),
    status:"VERIFIED",
    category:"Meat / poultry / egg / FSIS regulated",
    states:parseStates(distribution),
    distribution,
    establishment:establishment?{name:establishment,role:"FSIS establishment"}:null,
    origin:null,
    lat:null,lng:null,
    source:"USDA FSIS",
    updatedAt:toISO(r.field_recall_date||r.recall_date||new Date()),
    verifiedAt:toISO(r.field_recall_date||r.recall_date||new Date()),
    recallDate:toISO(r.field_recall_date||r.recall_date||new Date()),
    summary:reason,
    lots:[],
    evidence:[
      {type:"AGENCY",status:"VERIFIED",source:"USDA FSIS Recall API",text:reason||title,url:r.field_recall_url||"https://www.fsis.usda.gov/recalls"},
      ...(distribution?[{type:"DISTRIBUTION",status:"VERIFIED",source:"USDA FSIS distribution",text:distribution}]:[]),
      ...(establishment?[{type:"ESTABLISHMENT",status:"VERIFIED",source:"USDA FSIS establishment",text:establishment}]:[])
    ],
    entities:[
      {id:`food-${id}`,type:"Food",name:String(title).slice(0,90)},
      {id:`company-${id}`,type:"Company",name:establishment||"FSIS establishment"},
      {id:`hazard-${id}`,type:"Hazard",name:hazardFrom(reason)}
    ],
    links:[[`food-${id}`,`company-${id}`,"recalled by"],[`food-${id}`,`hazard-${id}`,"hazard"]],
    rawSource:"usda_fsis"
  };
}

function toISO(v){
  if(!v)return new Date().toISOString();
  const s=String(v);
  if(/^\d{8}$/.test(s))return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T00:00:00.000Z`;
  const d=new Date(v);
  return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();
}
