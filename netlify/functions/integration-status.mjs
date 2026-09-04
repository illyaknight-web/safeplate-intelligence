const env=n=>globalThis.Netlify?.env?.get?.(n)||process.env[n]||'';
const configured=(...names)=>names.every(n=>Boolean(env(n)));
const active=name=>/^(1|true|yes)$/i.test(env(name));
export default async()=>Response.json({checkedAt:new Date().toISOString(),integrations:[
 {id:'twilio_sms',name:'SMS recall alerts',implementation:'SUBSCRIPTION_CAPTURE_READY',status:configured('TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER')?'CREDENTIAL_PRESENT_NOT_DELIVERY_VERIFIED':'AWAITING_CREDENTIALS'},
 {id:'openfoodfacts',name:'OpenFoodFacts UPC enrichment',status:'PUBLIC_SUPPLEMENT_AVAILABLE',authority:'Supplementary only; never overrides FDA/USDA'},
 {id:'gs1',name:'GS1 product identity',implementation:'ADAPTER_CONTRACT_DEFINED',status:configured('GS1_API_KEY')?'CREDENTIAL_PRESENT_NOT_RUNTIME_VERIFIED':'AWAITING_CONTRACT_AND_CREDENTIALS'},
 {id:'mealconnect',name:'Feeding America MealConnect',implementation:'SECURE_IMPORT_CONTRACT_READY',status:configured('MEALCONNECT_API_KEY')?'CREDENTIAL_PRESENT_NOT_RUNTIME_VERIFIED':'AWAITING_PARTNER_ACCESS'},
 {id:'charity_tracker',name:'CharityTracker',implementation:'SECURE_IMPORT_CONTRACT_READY',status:configured('CHARITY_TRACKER_API_KEY')?'CREDENTIAL_PRESENT_NOT_RUNTIME_VERIFIED':'AWAITING_PARTNER_ACCESS'},
 {id:'primarius',name:'Primarius inventory',implementation:'SECURE_IMPORT_CONTRACT_READY',status:configured('PRIMARIUS_API_KEY')?'CREDENTIAL_PRESENT_NOT_RUNTIME_VERIFIED':'AWAITING_PARTNER_ACCESS'},
 {id:'veriscope_supplier',name:'VERISCOPE supplier reporting bridge',implementation:'CONTROLLED_BRIDGE_CODE_READY',status:configured('VERISCOPE_INGEST_URL','VERISCOPE_INGEST_TOKEN')?'CONFIGURED_NOT_RUNTIME_VERIFIED':'AWAITING_SECURE_SERVICE_AGREEMENT'},
 {id:'veriscope_detective',name:'VERISCOPE detective cycle',implementation:'15_MINUTE_SHADOW_BRIDGE_READY',status:configured('VERISCOPE_INGEST_URL','VERISCOPE_INGEST_TOKEN')&&active('VERISCOPE_BRIDGE_ENABLED')?'CONFIGURED_NOT_RUNTIME_VERIFIED':'DISABLED_PENDING_VERISCOPE_ENDPOINT'},
 {id:'northline_school',name:'NORTHLINE school recall service',status:'SHARED_API_READY',endpoint:'/api/recall-service?channel=school'}
]},{headers:{'Cache-Control':'public,max-age=0,must-revalidate','Netlify-CDN-Cache-Control':'public,durable,max-age=300,stale-while-revalidate=600'}});
export const config={path:'/api/integration-status'};
