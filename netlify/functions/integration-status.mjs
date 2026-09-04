const env=n=>globalThis.Netlify?.env?.get?.(n)||process.env[n]||'';
const configured=(...names)=>names.every(n=>Boolean(env(n)));
export default async()=>Response.json({checkedAt:new Date().toISOString(),integrations:[
 {id:'twilio_sms',name:'SMS recall alerts',status:configured('TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER')?'CONFIGURED':'AWAITING_CREDENTIALS'},
 {id:'openfoodfacts',name:'OpenFoodFacts UPC enrichment',status:'PUBLIC_SUPPLEMENT_AVAILABLE',authority:'Supplementary only; never overrides FDA/USDA'},
 {id:'gs1',name:'GS1 product identity',status:configured('GS1_API_KEY')?'CONFIGURED':'AWAITING_CONTRACT_AND_CREDENTIALS'},
 {id:'mealconnect',name:'Feeding America MealConnect',status:configured('MEALCONNECT_API_KEY')?'CONFIGURED':'AWAITING_PARTNER_ACCESS'},
 {id:'charity_tracker',name:'CharityTracker',status:configured('CHARITY_TRACKER_API_KEY')?'CONFIGURED':'AWAITING_PARTNER_ACCESS'},
 {id:'primarius',name:'Primarius inventory',status:configured('PRIMARIUS_API_KEY')?'CONFIGURED':'AWAITING_PARTNER_ACCESS'},
 {id:'veriscope_supplier',name:'VERISCOPE supplier reporting bridge',status:configured('VERISCOPE_INGEST_URL','VERISCOPE_INGEST_TOKEN')?'CONFIGURED':'AWAITING_SECURE_SERVICE_AGREEMENT'},
 {id:'northline_school',name:'NORTHLINE school recall service',status:'SHARED_API_READY',endpoint:'/api/recall-service?channel=school'}
]},{headers:{'Cache-Control':'public,max-age=0,must-revalidate','Netlify-CDN-Cache-Control':'public,durable,max-age=300,stale-while-revalidate=600'}});
export const config={path:'/api/integration-status'};
