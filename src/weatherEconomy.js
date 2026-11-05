/** AFTERDAY weather economy — tuneable GAME rules, not real rainfall measurements.
 * Called once per simulated minute by the survival loop (real 4h = game 1 day).
 * Deterministic, bounded and save/reload friendly; never changes preview weather.
 */
export const WEATHER_WATER_CAPACITY=16;
export const WEATHER_RAIN_DAILY_LIMIT=4;
export const WEATHER_ECONOMY=Object.freeze({
  rain:Object.freeze({harvestPerMinute:.042,evaporationPerMinute:0}),
  storm:Object.freeze({harvestPerMinute:.068,evaporationPerMinute:0}),
  heat:Object.freeze({harvestPerMinute:0,evaporationPerMinute:.060}),
  clear:Object.freeze({harvestPerMinute:0,evaporationPerMinute:.0015}),
  cloud:Object.freeze({harvestPerMinute:0,evaporationPerMinute:0}),
  cold:Object.freeze({harvestPerMinute:0,evaporationPerMinute:0}),
  tornado:Object.freeze({harvestPerMinute:0,evaporationPerMinute:.008}),
  dust:Object.freeze({harvestPerMinute:0,evaporationPerMinute:.010}),
  wildfire:Object.freeze({harvestPerMinute:0,evaporationPerMinute:.085})
});
export const defaultWeatherEconomy=()=>({
  waterHarvestProgress:0,waterEvaporationProgress:0,foodSpoilageProgress:0,
  rainCollectedDay:0,rainCollectedToday:0,
  frostEpisode:-1,benefitNotifiedEpisode:-1,lossNotifiedEpisode:-1
});
const progress=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(.999999,Number(v))):0;
const positiveInt=v=>Math.max(0,Math.min(100000,Math.floor(Number(v)||0)));
export function sanitizeWeatherEconomy(raw){
  const d=defaultWeatherEconomy(),v=raw&&typeof raw==='object'?raw:{};
  return {
    ...d,
    waterHarvestProgress:progress(v.waterHarvestProgress),
    waterEvaporationProgress:progress(v.waterEvaporationProgress),
    foodSpoilageProgress:progress(v.foodSpoilageProgress),
    rainCollectedDay:positiveInt(v.rainCollectedDay),
    rainCollectedToday:Math.min(WEATHER_RAIN_DAILY_LIMIT,positiveInt(v.rainCollectedToday)),
    frostEpisode:Number.isFinite(Number(v.frostEpisode))?Math.max(-1,Math.floor(Number(v.frostEpisode))):-1,
    benefitNotifiedEpisode:Number.isFinite(Number(v.benefitNotifiedEpisode))?Math.max(-1,Math.floor(Number(v.benefitNotifiedEpisode))):-1,
    lossNotifiedEpisode:Number.isFinite(Number(v.lossNotifiedEpisode))?Math.max(-1,Math.floor(Number(v.lossNotifiedEpisode))):-1
  };
}
export function effectiveTankCapacity(){return WEATHER_WATER_CAPACITY;}
/** Filtered water in the playable inventory, never raw rainwater.
 * The old rooftop tank has an integrated filter: under 40% integrity it
 * cannot harvest potable rainwater. No unlimited passive resource farming.
 */
export function applyWeatherEconomyMinute(s,weather,day){
  const w=s.weatherEconomy||(s.weatherEconomy=defaultWeatherEconomy());
  const mode=WEATHER_ECONOMY[weather]||WEATHER_ECONOMY.clear;
  if(w.rainCollectedDay!==day){
    w.rainCollectedDay=day;w.rainCollectedToday=0;
  }
  let waterGained=0,waterLost=0,foodLost=0,frostLoss=0;
  const tank=s.facilities.tank;
  const storage=s.facilities.storage;
  const full=s.supply.water>=WEATHER_WATER_CAPACITY;
  const canHarvest=tank>=40&&(!s.kit||s.kit.purifier)&&!full&&w.rainCollectedToday<WEATHER_RAIN_DAILY_LIMIT;
  if(mode.harvestPerMinute>0&&canHarvest){
    // A damaged but functional filter harvests less efficiently.
    const efficiency=tank>=70?1:.55;
    w.waterHarvestProgress+=mode.harvestPerMinute*efficiency;
    if(w.waterHarvestProgress>=1){
      const gained=Math.min(Math.floor(w.waterHarvestProgress),
        WEATHER_WATER_CAPACITY-s.supply.water,WEATHER_RAIN_DAILY_LIMIT-w.rainCollectedToday);
      if(gained>0){
        s.supply.water+=gained;
        w.rainCollectedToday+=gained;
        waterGained=gained;
      }
      w.waterHarvestProgress-=Math.floor(w.waterHarvestProgress);
    }
  }else if(mode.harvestPerMinute>0&&!canHarvest){
    // No invisible water can accumulate when the tank is broken/full.
    w.waterHarvestProgress=0;
  }

  // Heat affects BOTH body hydration (in simulation.js) and open/damaged water storage.
  let evap=mode.evaporationPerMinute;
  if(weather==='heat'||weather==='wildfire')evap*=tank>=70?.85:tank>=40?1.45:2.4;
  // A cracked tank leaks even under cloudy skies.
  if(tank<30)evap+=.004;
  else if(tank<45)evap+=.001;
  if(evap>0&&s.supply.water>0){
    w.waterEvaporationProgress+=evap;
    const loss=Math.min(s.supply.water,Math.floor(w.waterEvaporationProgress));
    if(loss>0){s.supply.water-=loss;waterLost=loss;}
    w.waterEvaporationProgress-=Math.floor(w.waterEvaporationProgress);
  }else if(s.supply.water<=0)w.waterEvaporationProgress=0;

  // Only unprotected food spoils: a healthy food cache keeps supplies safe.
  const foodRisk=storage<60?Math.max(0,(60-storage)/60):0;
  const spoilageRate=weather==='wildfire'?.014:weather==='heat'?.010:weather==='storm'?.006:weather==='dust'?.0035:weather==='rain'?.0025:0;
  if(foodRisk&&spoilageRate&&s.supply.food>0){
    w.foodSpoilageProgress+=spoilageRate*(.65+foodRisk);
    const spoiled=Math.min(s.supply.food,Math.floor(w.foodSpoilageProgress));
    if(spoiled>0){s.supply.food-=spoiled;foodLost=spoiled;}
    w.foodSpoilageProgress-=Math.floor(w.foodSpoilageProgress);
  }else w.foodSpoilageProgress=0;

  // Cold preserves stored food but can crack a severely damaged tank ONCE
  // per weather episode. No permanent freeze/debuff on a healthy tank.
  if(weather==='cold'&&tank<40&&w.frostEpisode!==s.weatherEpisode){
    w.frostEpisode=s.weatherEpisode;
    if(s.supply.water>0){
      s.supply.water--;waterLost++;frostLoss=1;
    }
  }
  if(weather==='heat'||weather==='clear')s.sickness=Math.max(0,s.sickness-.012);
  else if(weather==='cloud')s.sickness=Math.max(0,s.sickness-.003);
  return {waterGained,waterLost,foodLost,frostLoss};
}
export function describeWeatherEconomy(s){
  const t=Math.round(s.facilities?.tank||0);
  const w=s.weatherEconomy||defaultWeatherEconomy();
  const water=s.supply?.water??0;
  if(s.weather==='rain'||s.weather==='storm'){
    if(s.kit&&!s.kit.purifier)return '🚰 정수기 없음 · 폐허 탐색에서 장비를 확보해야 한다';
    const heavy=s.weather==='storm';
    if(t<40)return '🚰 물탱크 고장 · 자동 빗물 정수 불가 · 수리 필요';
    if(water>=WEATHER_WATER_CAPACITY)return '💧 물탱크 가득 참 · 비축 유지 / 누수 주의';
    if(w.rainCollectedToday>=WEATHER_RAIN_DAILY_LIMIT)return '💧 오늘 자동 집수 한도 완료 · 수리·비축 시간';
    return `💧 빗물 자동 정수 중 ${Math.floor(w.waterHarvestProgress*100)}% · ${heavy?'낙뢰·침수 주의':'천막 누수 주의'}`;
  }
  if(s.weather==='heat')return '☀ 식수 자동 증발 · 갈증 1.38배 · 음식 변질 위험';
  if(s.weather==='clear')return '🌤 건조·건강 회복 · 저장수 미세 증발';
  if(s.weather==='cloud')return '☁ 물 증발 억제 · 천막 정비하기 좋은 날씨';
  if(s.weather==='cold')return '❄ 식량 보존 · 칼로리 소모 증가 · 파손 탱크 결빙';
  if(s.weather==='dust')return '🌫 황사 · 호흡기 부담 증가 · 식수 증발 · 야외 탐색 중단';
  if(s.weather==='wildfire')return '🔥 산불 연기 · 급격한 수분 소모 · 식량 변질 · 시설 열손상';
  return '🌪 강풍·건물 붕괴 · 물자 고정과 대피 필요';
}
