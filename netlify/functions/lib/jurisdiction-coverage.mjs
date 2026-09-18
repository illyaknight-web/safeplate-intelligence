// U.S. Census Bureau Vintage 2025 resident population estimates (July 1, 2025).
// NST-EST2025-POP, released January 2026. States + District of Columbia only.
export const CENSUS_POPULATION_SOURCE='https://www.census.gov/data/tables/time-series/demo/popest/2020s-state-total.html';
export const CENSUS_POPULATION_VINTAGE='2025';
export const STATE_POPULATION_2025=Object.freeze({
  'Alabama':5193088,'Alaska':737270,'Arizona':7623818,'Arkansas':3114791,'California':39355309,
  'Colorado':6012561,'Connecticut':3688496,'Delaware':1059952,'District of Columbia':693645,'Florida':23462518,
  'Georgia':11302748,'Hawaii':1432820,'Idaho':2029733,'Illinois':12719141,'Indiana':6973333,
  'Iowa':3238387,'Kansas':2977220,'Kentucky':4606864,'Louisiana':4618189,'Maine':1414874,
  'Maryland':6265347,'Massachusetts':7154084,'Michigan':10127884,'Minnesota':5830405,'Mississippi':2954160,
  'Missouri':6270541,'Montana':1144694,'Nebraska':2018006,'Nevada':3282188,'New Hampshire':1415342,
  'New Jersey':9548215,'New Mexico':2125498,'New York':20002427,'North Carolina':11197968,'North Dakota':799358,
  'Ohio':11900510,'Oklahoma':4123288,'Oregon':4273586,'Pennsylvania':13059432,'Rhode Island':1114521,
  'South Carolina':5570274,'South Dakota':935094,'Tennessee':7315076,'Texas':31709821,'Utah':3538904,
  'Vermont':644663,'Virginia':8880107,'Washington':8001020,'West Virginia':1766147,'Wisconsin':5972787,'Wyoming':588753
});

export function populationCoverage(results=[]){
  const total=Object.values(STATE_POPULATION_2025).reduce((a,b)=>a+b,0);
  const online=results.filter(x=>x.status==='ONLINE');
  const actionable=results.filter(x=>x.status==='ONLINE'&&x.actionableSurface===true);
  const peopleOnline=online.reduce((n,x)=>n+(STATE_POPULATION_2025[x.state]||0),0);
  const peopleActionable=actionable.reduce((n,x)=>n+(STATE_POPULATION_2025[x.state]||0),0);
  const blindSpots=results.filter(x=>x.status!=='ONLINE'||x.actionableSurface!==true).map(x=>({state:x.state,population:STATE_POPULATION_2025[x.state]||0,status:x.status,reason:x.note})).sort((a,b)=>b.population-a.population);
  return {source:CENSUS_POPULATION_SOURCE,vintage:CENSUS_POPULATION_VINTAGE,totalPopulation:total,technicallyReachablePopulation:peopleOnline,actionablyCoveredPopulation:peopleActionable,technicalCoveragePercent:+(peopleOnline/total*100).toFixed(2),actionableCoveragePercent:+(peopleActionable/total*100).toFixed(2),largestPopulationBlindSpots:blindSpots.slice(0,10)};
}
