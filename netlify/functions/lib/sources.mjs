
export const SOURCE_REGISTRY = [
  {id:"fda_openfda",name:"FDA openFDA Food Enforcement",family:"Federal",kind:"api",active:true,authority:true,url:"https://api.fda.gov/food/enforcement.json"},
  {id:"fda_outbreaks",name:"FDA Active Foodborne Outbreak Investigations",family:"Federal",kind:"web",active:true,authority:true,url:"https://www.fda.gov/food/outbreaks-foodborne-illness/investigations-foodborne-illness-outbreaks"},
  {id:"fda_food_events",name:"FDA Food Adverse Events",family:"Federal",kind:"api",active:true,authority:true,url:"https://api.fda.gov/food/event.json",note:"Optional FDA_API_KEY increases rate limits"},
  {id:"usda_fsis",name:"USDA FSIS Recall API",family:"Federal",kind:"api",active:true,authority:true,url:"https://www.fsis.usda.gov/fsis/api/recall/v/1"},

  {id:"cdc_content",name:"CDC Content Services — Public Foodborne Content",family:"Federal",kind:"api",active:false,authority:true,url:"https://tools.cdc.gov/api/v2/resources/media?q=foodborne%20outbreak"},
  {id:"states",name:"State Health + Agriculture Departments",family:"State / Local",kind:"registry",active:false,authority:true,note:"Activate jurisdiction-by-jurisdiction"},
  {id:"locals",name:"County + City Health Departments",family:"State / Local",kind:"registry",active:false,authority:true,note:"Activate jurisdiction-by-jurisdiction"},
  {id:"international",name:"International Food Safety Authorities",family:"International",kind:"registry",active:false,authority:true,note:"International authority registry"},
  {id:"cfia_recalls",name:"CFIA Food Recalls & Safety Alerts",family:"International",kind:"rss",active:false,authority:true,note:"CFIA publicly offers RSS; exact production feed URL must be verified before activation"},
  {id:"eu_rasff",name:"EU RASFF Window",family:"International",kind:"web",active:false,authority:true,note:"Public searchable database; connector pending stable public interface validation"},

  {id:"retailers",name:"Retailers + Manufacturers",family:"Industry",kind:"registry",active:false,authority:false,note:"Expanded retailer registry; source-specific connectors activate after validation"},
  {id:"trader_joes_recalls",name:"Trader Joe’s Food Safety & Product Recalls",family:"Retailer",kind:"web",active:false,authority:false,url:"https://www.traderjoes.com/home/announcements?category=recalls"},
  {id:"uk_fsa_alerts",name:"UK Food Standards Agency Alerts",family:"International",kind:"web",active:false,authority:true,url:"https://alerts.food.gov.uk/"},
  {id:"suppliers",name:"Suppliers + Distributors",family:"Industry",kind:"registry",active:false,authority:false,note:"Supplier notices and trace-forward evidence"},
  {id:"labs_science",name:"Laboratories + Scientific Literature",family:"Science",kind:"registry",active:false,authority:false,note:"Public-health labs, universities, journals"},

  {id:"noaa_enso",name:"NOAA/CPC ENSO + El Niño",family:"Climate",kind:"web",active:true,authority:true,url:"https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.html",note:"Contextual climate intelligence — never proof of food contamination"},
  {id:"nws_hazards",name:"NWS Flood + Heat + Tropical Hazards",family:"Climate",kind:"api",active:true,authority:true,url:"https://api.weather.gov/alerts/active",note:"No API key required; context only"},
  {id:"water_irrigation",name:"Water + Irrigation + Environmental Quality",family:"Environment",kind:"registry",active:false,authority:false,note:"Environmental evidence layer"},
  {id:"ag_environment",name:"Agriculture + Growing Region Conditions",family:"Environment",kind:"registry",active:false,authority:false,note:"Crop regions, harvest windows and environmental signals"},
  {id:"logistics",name:"Logistics + Cold Chain",family:"Logistics",kind:"registry",active:false,authority:false,note:"Ports, imports, distribution and cold-chain events"},
  {id:"emerging",name:"News + Consumer + Emerging Signals",family:"Emerging",kind:"registry",active:false,authority:false,note:"Never treated as verified without corroboration"}
];

export const FOOD_CATEGORIES = [
  "Produce","Meat","Poultry","Eggs","Seafood","Dairy","Frozen foods","Prepared foods","Bakery","Snacks","Beverages",
  "Infant foods/formula","Pet/animal food","Imported foods","Ingredients","Spices","Sauces","Grains","Nuts","Confectionery",
  "Food service","Institutional foods","Other food-safety relevant"
];

export const INTELLIGENCE_STATES = ["DETECTED","CORROBORATING","VERIFIED","CONTRADICTED","RETRACTED","RESOLVED"];
