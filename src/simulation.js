import {scriptedDisasterType,disasterGapMsAfter,chooseScenarioWeather,weatherDurationMs} from './weatherScenarioV920.js';
import {SURVIVAL_BALANCE, SURVIVAL_CHAPTERS, chooseTornadoApproach, tornadoWarningText} from './survivalBalance.js';
import {WEATHER_WATER_CAPACITY,defaultWeatherEconomy,sanitizeWeatherEconomy,applyWeatherEconomyMinute} from './weatherEconomy.js';
import {ITEM_INFO,makeScavengeDirector,sanitizeScavengeDirector,normalizeKit,offerDailyScavenge,offerRecoveryScavenge,resolveScavengeChoice,applyAcquiredItemMinute,requestRadioContact} from './scavengeDirector.js';
import {newCompanion,sanitizeCompanion,resolveCompanionRescue,applyCompanionMinute,offerCompanionRationChoice,resolveCompanionRationChoice,applyCompanionRationAftermath,applyCompanionAutoRepair} from './supportCompanion.js';
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
export const SAVE_KEY = 'AFTERDAY_THREEJS_SIMCITY_v04';
export const CAP = (v,min=0,max=100)=>Math.max(min, Math.min(max, v));
export const DAY_MS = 86400000;
export const WEATHER = ['clear','heat','cloud','rain','storm','tornado','cold','dust','wildfire'];
export const WEATHER_KO = {clear:'맑음', heat:'폭염', cloud:'흐림', rain:'폭우', storm:'낙뢰', tornado:'토네이도', cold:'한파', dust:'모래폭풍', wildfire:'산불'};
export const MAJOR_DISASTERS=['rain','storm','tornado','heat','cold','dust','wildfire'];
export const MAJOR_DISASTER_LEAD_MS=24*60*60*1000;
export function majorDisasterTypeFor(seed,serial){
 return scriptedDisasterType(seed,serial);
}
export const defaults = (now=Date.now())=>({
  version:4, clockSchema:3, weatherScheduleVersion:2, gameClockOffsetMs:0, gameClockSavedRealAtMs:now, deviceSaveAtMs:now, tornadoCityDamaged:false, tornadoDamageCount:0, tornadoDamagedIds:[], ambientCollapseIds:[], ambientCollapseSerial:0, nextAmbientCollapseAt:now+18*60000, tornadoCurrentSites:[], tornadoPreviousCenterId:null, tornadoEncounter:0, tornadoEncounterActive:false, tornadoEpisodeDamageCount:0, tornadoApproach:'distant', tornadoStartedAt:0, tornadoPreview:false, tornadoRoofImpactEncounter:0, tornadoCoverActive:false, tornadoSuppliesSecured:false, animalAlert:false, raiderAlert:false, raiderUntilAt:0, raiderCooldownAt:0, sickness:0, startedAt:now, lastTickAt:now, nextWeatherAt:now+4*3600000, pendingWeather:'cloud', simRemainderMs:0, weatherEpisode:0, weatherSinceAt:now, nextTornadoAllowedAt:0, majorDisasterSerial:1, majorDisasterType:majorDisasterTypeFor(47283,1), majorDisasterAt:now+MAJOR_DISASTER_LEAD_MS, majorDisasterAppliedSerial:0, noticeSeenIds:[], eventSerial:0, survivalStatus:'alive', diedAt:0, deathCause:'', survivalMilestones:[], restCooldownAt:0, exploreCooldownAt:0, collectWaterCooldownAt:0,
  weather:'clear', weatherSeed:47283, health:88, food:72, water:68, temperature:50,
  weatherEconomy:defaultWeatherEconomy(),
  itemSystemVersion:1,kit:normalizeKit(null),scavenge:makeScavengeDirector(now),companion:newCompanion(),
  structureImpactEpisode:-1,equipmentLossEpisode:-1,
  supply:{food:3,water:4,medicine:0,parts:2}, facilities:{shelter:50,tank:66,storage:72},
  events:['DAY 1: 옥상 콘크리트에 누웠다. 텐트도 정수기도 없다. 오늘 탐색할지 결정해야 한다.'], mission:'오늘도 살아남기', action:'idle', actionUntil:0
});
export function sanitize(raw, now=Date.now()) {
  if (!raw || raw.version!==4 || !Number.isFinite(raw.startedAt)) return defaults(now);
  const b=defaults(now),s={...b,...raw,supply:{...b.supply,...(raw.supply&&typeof raw.supply==='object'?raw.supply:{})},facilities:{...b.facilities,...(raw.facilities&&typeof raw.facilities==='object'?raw.facilities:{})}};
  s.startedAt=Math.min(Math.max(s.startedAt,0),now);
  s.lastTickAt=Math.min(Math.max(s.lastTickAt,s.startedAt),now);
  for (const k of ['health','food','water','temperature']) s[k]=CAP(Number(s[k])||0);
  for (const k of Object.keys(s.supply)) s.supply[k]=Math.max(0,Math.min(999,Math.floor(Number(s.supply[k])||0)));
  for (const k of Object.keys(s.facilities)) s.facilities[k]=CAP(Number(s.facilities[k])||0);
  s.weatherEconomy=sanitizeWeatherEconomy(raw.weatherEconomy);
  // Existing players keep all rooftop items they already saw. Fresh games own none.
  const legacy=Number(raw.itemSystemVersion)!==1;
  s.itemSystemVersion=1;
  s.kit=normalizeKit(raw.kit,legacy);
  s.scavenge=sanitizeScavengeDirector(raw.scavenge,s.startedAt);
  s.companion=sanitizeCompanion(raw.companion);
  const offset=Number(s.gameClockOffsetMs);
  s.gameClockOffsetMs=Number.isFinite(offset)?offset:0;
  // v9.2: legacy accelerated saves retain their DAY and ruins; the new
  // 10-minute day clock resumes from the last saved virtual timestamp.
  // Schema 1 still uses the one-time KST day migration.
  s.clockSchema=Number(raw.clockSchema)>=2?3:1;
  const savedRealAt=Number(raw.gameClockSavedRealAtMs);
  s.gameClockSavedRealAtMs=Number.isFinite(savedRealAt)&&savedRealAt>0?savedRealAt:0;
  const cloudStamp=Number(raw.deviceSaveAtMs);
  s.deviceSaveAtMs=Number.isFinite(cloudStamp)&&cloudStamp>0?cloudStamp:s.gameClockSavedRealAtMs;
  s.events=Array.isArray(s.events)?s.events.filter(v=>typeof v==='string').slice(-16):b.events;
  s.animalAlert=Boolean(s.animalAlert);s.sickness=CAP(Number(s.sickness)||0);
  // Compatible with the previous one-building damage save flag.
  // Old saves counted at most three ruins; new saves preserve distinct city building IDs.
  s.tornadoDamagedIds=Array.isArray(s.tornadoDamagedIds)?
    [...new Set(s.tornadoDamagedIds.filter(v=>typeof v==='string'&&v.length>0&&v.length<120))].slice(0,512):[];
  const legacyCount=Math.max(0,Math.min(3,Math.floor(Number(s.tornadoDamageCount)||0)));
  s.tornadoDamageCount=Math.max(legacyCount,s.tornadoDamagedIds.length);
  if(s.tornadoCityDamaged&&s.tornadoDamageCount===0)s.tornadoDamageCount=1;
  s.tornadoCityDamaged=s.tornadoDamageCount>0;
  // v6.6 autonomous background-city decay. This state is visual-only for the
  // survival economy, but must be monotonic so a partially collapsed skyline
  // never repairs itself after reload.
  s.ambientCollapseIds=Array.isArray(raw.ambientCollapseIds)?
    [...new Set(raw.ambientCollapseIds.filter(v=>typeof v==='string'&&v.length>0&&v.length<120))].slice(0,18):[];
  s.ambientCollapseSerial=Math.max(s.ambientCollapseIds.length,
    Math.max(0,Math.floor(Number(raw.ambientCollapseSerial)||0)));
  const ambientAt=Number(raw.nextAmbientCollapseAt);
  s.nextAmbientCollapseAt=Number.isFinite(ambientAt)&&ambientAt>0?ambientAt:now+18*60000;
  s.tornadoCurrentSites=Array.isArray(s.tornadoCurrentSites)?
    [...new Set(s.tornadoCurrentSites.filter(v=>typeof v==='string'&&v.length<120))].slice(0,3):[];
  s.tornadoPreviousCenterId=typeof s.tornadoPreviousCenterId==='string'?s.tornadoPreviousCenterId:null;
  s.tornadoEncounter=Math.max(0,Math.floor(Number(s.tornadoEncounter)||0));
  s.tornadoEpisodeDamageCount=Math.max(0,Math.min(3,Math.floor(Number(s.tornadoEpisodeDamageCount)||0)));
  s.tornadoEncounterActive=Boolean(s.tornadoEncounterActive);
  s.tornadoApproach=['distant','near','direct'].includes(s.tornadoApproach)?s.tornadoApproach:'distant';
  s.tornadoStartedAt=Math.max(0,Number(s.tornadoStartedAt)||0);
  s.tornadoRoofImpactEncounter=Math.max(0,Math.floor(Number(s.tornadoRoofImpactEncounter)||0));
  s.tornadoCoverActive=Boolean(s.tornadoCoverActive);
  s.tornadoSuppliesSecured=Boolean(s.tornadoSuppliesSecured);
  s.tornadoPreview=Boolean(s.tornadoPreview);
  s.weatherEpisode=Math.max(0,Math.floor(Number(s.weatherEpisode)||0));
  const boundedEpisode=value=>Number.isFinite(value)?Math.max(-1,Math.min(s.weatherEpisode,Math.floor(value))):-1;
  s.structureImpactEpisode=boundedEpisode(raw.structureImpactEpisode);
  s.equipmentLossEpisode=boundedEpisode(raw.equipmentLossEpisode);
  const legacyWeatherSchedule=Number(raw.weatherScheduleVersion)!==2;
  s.weatherScheduleVersion=2;
  s.weatherSinceAt=Math.max(0,Number(s.weatherSinceAt)||s.startedAt);
  s.nextTornadoAllowedAt=Math.max(0,Number(s.nextTornadoAllowedAt)||0);
  // v9.3: retain the full multi-day scheduled gap. Only old saves with
  // shorter weather-schedule schemas are migrated to a 24-hour first warning.
  // HUD still shows the moving forecast in its final 24 game hours.
  // v8.9: persistent 24-hour major-disaster forecast. The HUD has four
  // physical checkpoints at T-24h, T-18h, T-12h and T-6h.
  s.majorDisasterSerial=Math.max(1,Math.floor(Number(raw.majorDisasterSerial)||1));
  s.majorDisasterType=MAJOR_DISASTERS.includes(raw.majorDisasterType)
    ?raw.majorDisasterType:majorDisasterTypeFor(s.weatherSeed,s.majorDisasterSerial);
  const majorAt=Number(raw.majorDisasterAt);
  if(Number.isFinite(majorAt)&&majorAt>0){
    // Migrate v8.0-v8.8 seven-day forecasts into the new 24-hour planning
    // horizon without postponing an event that is already due.
    s.majorDisasterAt=legacyWeatherSchedule&&majorAt>now+MAJOR_DISASTER_LEAD_MS
      ?now+MAJOR_DISASTER_LEAD_MS
      :majorAt;
  }else{
    s.majorDisasterAt=now+MAJOR_DISASTER_LEAD_MS;
  }
  s.majorDisasterAppliedSerial=Math.max(0,Math.floor(Number(raw.majorDisasterAppliedSerial)||0));
  s.noticeSeenIds=Array.isArray(s.noticeSeenIds)?[...new Set(s.noticeSeenIds.filter(v=>typeof v==='string'&&v.length<160))].slice(-80):[];
  s.eventSerial=Math.max(0,Math.floor(Number(s.eventSerial)||0));
  s.survivalStatus=s.survivalStatus==='dead'?'dead':'alive';
  s.diedAt=Math.max(0,Number(s.diedAt)||0);
  s.deathCause=typeof s.deathCause==='string'?s.deathCause.slice(0,160):'';
  s.survivalMilestones=Array.isArray(s.survivalMilestones)?[...new Set(s.survivalMilestones.filter(Number.isInteger))].slice(-25):[];
  for(const key of ['restCooldownAt','exploreCooldownAt','collectWaterCooldownAt'])s[key]=Math.max(0,Number(s[key])||0);
  s.raiderAlert=Boolean(s.raiderAlert);
  s.raiderUntilAt=Number.isFinite(Number(s.raiderUntilAt))?Math.max(0,Number(s.raiderUntilAt)):0;
  s.raiderCooldownAt=Number.isFinite(Number(s.raiderCooldownAt))?Math.max(0,Number(s.raiderCooldownAt)):0;
  if (!WEATHER.includes(s.weather)) s.weather='clear';
  return s;
}
/** DAY 2 begins exactly 24 in-game hours after creation (10 real minutes at 1×).
 * Unlike the old KST-midnight counter, a player never gets a partial first day.
 */
export function getDay(startedAt,now=Date.now()){
  return 1+Math.floor(Math.max(0,now-startedAt)/DAY_MS);
}
/** Preserve the displayed DAY and time-to-next-DAY from a 1:1 KST save.
 * Never reset food, damaged buildings, warnings, milestones or user actions.
 */
export function migrateLegacyGameDay(s,virtualNow){
  if(s.clockSchema>=2)return false;
  const now=Number(virtualNow);
  const kst=9*3600000;
  const legacyDay=Math.max(1,Math.floor((now+kst)/DAY_MS)-Math.floor((s.startedAt+kst)/DAY_MS)+1);
  const phase=((now+kst)%DAY_MS+DAY_MS)%DAY_MS;
  s.startedAt=now-(legacyDay-1)*DAY_MS-phase;
  s.clockSchema=3;
  return true;
}
export function wallClock(now=Date.now()) {return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(now));}
export function localHour(now=Date.now()) {const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now));const get=k=>Number(parts.find(p=>p.type===k)?.value||0);return get('hour')+get('minute')/60+get('second')/3600;}
function nextRandom(s){s.weatherSeed=(Math.imul(s.weatherSeed,1664525)+1013904223)>>>0;return s.weatherSeed/4294967296;}
export function addEvent(s,msg){if(s.events[s.events.length-1]!==msg){s.events.push(msg);s.eventSerial=(Number(s.eventSerial)||0)+1;}if(s.events.length>16)s.events.shift();}

/* Gameplay durability belongs to the playable rooftop shelter, water tank and
 * storage. Distant city towers keep their separate permanent-collapse state.
 * These are balance values applied ONCE per real weather episode, not per frame. */
export const DISASTER_STRUCTURE_DAMAGE=Object.freeze({
 rain:Object.freeze({shelter:3,tank:4,storage:1}),
 storm:Object.freeze({shelter:9,tank:7,storage:8}),
 tornado:Object.freeze({shelter:7,tank:6,storage:8}),
 heat:Object.freeze({shelter:2,tank:5,storage:4}),
 cold:Object.freeze({shelter:5,tank:9,storage:3}),
 dust:Object.freeze({shelter:8,tank:3,storage:7}),
 wildfire:Object.freeze({shelter:14,tank:6,storage:12})
});
const EQUIPMENT_EXPOSURE=Object.freeze({
 rain:[['tent','shelter',20],['purifier','tank',20]],
 storm:[['tent','shelter',45],['radio','storage',30],['purifier','tank',30]],
 tornado:[['tent','shelter',75],['radio','storage',70],['purifier','tank',45],['seeds','storage',65]],
 heat:[['seeds','storage',35]],
 cold:[['purifier','tank',45]],
 dust:[['radio','storage',35],['tent','shelter',25]],
 wildfire:[['seeds','storage',60],['tent','shelter',50],['radio','storage',35]]
});
function loseExposedEquipment(s,type,day){
 if(s.equipmentLossEpisode===s.weatherEpisode)return null;
 const exposed=EQUIPMENT_EXPOSURE[type]||[];
 const found=exposed.find(([id,structure,threshold])=>s.kit[id]&&s.facilities[structure]<threshold);
 if(!found)return null;
 const [id]=found;
 s.kit[id]=false;
 s.equipmentLossEpisode=s.weatherEpisode;
 addEvent(s,`${WEATHER_KO[type]} 피해로 ${ITEM_INFO[id].label}이(가) 파손됐다. 폐허 탐색으로 다시 확보할 수 있다.`);
 offerRecoveryScavenge(s,day,id);
 return id;
}
export function applyDisasterStructureDamage(s,type,day,{offline=false}={}){
 const values=DISASTER_STRUCTURE_DAMAGE[type];
 if(!values||s.structureImpactEpisode===s.weatherEpisode)return {applied:false,lostItem:null};
 s.structureImpactEpisode=s.weatherEpisode;
 for(const [structure,amount] of Object.entries(values))
   s.facilities[structure]=CAP(s.facilities[structure]-amount);
 addEvent(s,`${WEATHER_KO[type]} 재난으로 옥상 시설 내구도가 감소했다. 대피소 -${values.shelter}, 물탱크 -${values.tank}, 보관시설 -${values.storage}.`);
 // A near/direct tornado has a separate protected rooftop-impact phase.
 const lostItem=(!offline&&type!=='tornado')?loseExposedEquipment(s,type,day):null;
 return {applied:true,lostItem};
}

/** Monotonic tornado damage: preview and real weather have the same permanent city consequences.
 * Safe to replay after autosave or reload; a ruined tower can never be repaired by weather changes. */
export function recordTornadoDamage(s,targetCount,source='weather'){
 if(Array.isArray(targetCount)){
   const current=Array.isArray(s.tornadoDamagedIds)?s.tornadoDamagedIds:[];
   const incoming=targetCount.filter(id=>typeof id==='string'&&id.length>0&&id.length<120);
   const added=incoming.filter(id=>!current.includes(id));
   if(!added.length)return false;
   s.tornadoDamagedIds=[...new Set([...current,...added])].slice(0,512);
   s.tornadoDamageCount=Math.max(Number(s.tornadoDamageCount)||0,s.tornadoDamagedIds.length);
   s.tornadoCityDamaged=true;
   addEvent(s,`토네이도가 폐허 건물 ${s.tornadoDamageCount}채를 무너뜨렸다. 파괴된 건물은 복구되지 않는다.`);
   return true;
 }
 const prior=Math.max(0,Math.min(3,Math.floor(Number(s.tornadoDamageCount)||0)),s.tornadoCityDamaged?1:0);
 const next=Math.max(prior,Math.min(3,Math.max(0,Math.floor(Number(targetCount)||0))));
 if(next<=prior)return false;
 s.tornadoDamageCount=next;
 s.tornadoCityDamaged=true;
 addEvent(s,`토네이도가 폐허 건물 ${next}채를 무너뜨렸다. 파괴된 건물은 복구되지 않는다.`);
 return true;
}
/** A single, persisted encounter decides distance, warning and rooftop consequences. */
export function beginTornadoEncounter(s,now=Date.now(),{preview=false}={}){
 const encounter=(Number(s.tornadoEncounter)||0)+1;
 s.tornadoEncounter=encounter;
 s.tornadoEncounterActive=true;
 s.tornadoStartedAt=now;
 s.tornadoPreview=Boolean(preview);
 s.tornadoEpisodeDamageCount=0;
 s.tornadoRoofImpactEncounter=0;
 s.tornadoCoverActive=false;
 s.tornadoSuppliesSecured=false;
 s.tornadoApproach=chooseTornadoApproach((Number(s.weatherSeed)||1)+encounter*7919,getDay(s.startedAt,now));
 if(!preview)addEvent(s,`토네이도 경보: ${tornadoWarningText(s.tornadoApproach)}`);
 return s.tornadoApproach;
}
export function resolveTornadoRoofImpact(s,now=Date.now()){
 const episode=Math.max(0,Number(s.tornadoEncounter)||0);
 if(s.survivalStatus==='dead'||!episode||!s.tornadoEncounterActive||s.tornadoPreview||
    s.tornadoRoofImpactEncounter===episode||!['near','direct'].includes(s.tornadoApproach))return {applied:false};
 const base=SURVIVAL_BALANCE.tornado[s.tornadoApproach];
 const protectedHealth=s.tornadoCoverActive?SURVIVAL_BALANCE.tornado.coverHealthFactor:(s.kit?.tent?1:1.25);
 const lowShelter=s.facilities.shelter<45?1.23:1;
 const healthLoss=Math.max(1,Math.ceil(base.health*protectedHealth*lowShelter));
 const foodLoss=Math.min(s.supply.food,Math.ceil(base.food*(s.tornadoSuppliesSecured?SURVIVAL_BALANCE.tornado.secureFoodFactor:1)));
 const waterLoss=Math.min(s.supply.water,Math.floor(base.water*(s.tornadoSuppliesSecured?SURVIVAL_BALANCE.tornado.secureWaterFactor:1)));
 s.tornadoRoofImpactEncounter=episode; // idempotency BEFORE saving or re-entering the callback
 s.health=CAP(s.health-healthLoss);
 s.supply.food-=foodLoss;
 s.supply.water-=waterLoss;
 s.facilities.shelter=CAP(s.facilities.shelter-Math.ceil(base.shelter*(s.tornadoCoverActive?SURVIVAL_BALANCE.tornado.coverShelterFactor:1)));
 s.facilities.storage=CAP(s.facilities.storage-base.storage);
 // A real close pass can damage the rainwater filter, making later rain less useful.
 s.facilities.tank=CAP(s.facilities.tank-(s.tornadoApproach==='direct'?24:11));
 loseExposedEquipment(s,'tornado',getDay(s.startedAt,now));
 const label=s.tornadoApproach==='direct'?'옥상 직격':'옥상 바로 옆 통과';
 addEvent(s,`${label}: 건강 -${healthLoss}, 식량 -${foodLoss}, 식수 -${waterLoss}. ${s.tornadoCoverActive?'대피로 부상을 줄였다.':'대피하지 못해 파편에 노출됐다.'}`);
 evaluateSurvival(s,now);
 return {applied:true,healthLoss,foodLoss,waterLoss,approach:s.tornadoApproach};
}
export function evaluateSurvival(s,now=Date.now()){
 if(s.survivalStatus==='dead')return false;
 if(s.health>0)return false;
 s.health=0;s.survivalStatus='dead';s.diedAt=now;
 s.deathCause=s.water<12?'탈수와 누적 부상':s.food<12?'기아와 누적 부상':'재난과 누적 부상';
 addEvent(s,`생존 종료. ${s.deathCause}. 마지막 날까지 버텼지만 더 이상 움직일 수 없다.`);
 return true;
}
function armScheduledMajorDisaster(s,tickTime){
  if(!Number.isFinite(s.majorDisasterAt)||tickTime<s.majorDisasterAt||
     s.majorDisasterAppliedSerial===s.majorDisasterSerial)return false;
  const serial=s.majorDisasterSerial;
  const type=MAJOR_DISASTERS.includes(s.majorDisasterType)
    ?s.majorDisasterType:majorDisasterTypeFor(s.weatherSeed,serial);
  // Feed the event through the existing authoritative weather transition so
  // health, water, structures, tornado encounters and saves keep one code path.
  s.pendingWeather=type;
  s.nextWeatherAt=Math.min(Number(s.nextWeatherAt)||tickTime,tickTime);
  s.majorDisasterAppliedSerial=serial;
  s.majorDisasterSerial=serial+1;
  s.majorDisasterType=majorDisasterTypeFor(s.weatherSeed,s.majorDisasterSerial);
  s.majorDisasterAt=tickTime+disasterGapMsAfter(serial);
  addEvent(s,`예보 관측망이 예측했던 ${WEATHER_KO[type]} 재난이 도달했다.`);
  return true;
}
function pickWeather(s,now=Date.now()){
 // The current weather is the source of the next ordinary transition.
 // Upcoming major events override the surrounding six-hour prelude.
 return chooseScenarioWeather(
  s.weather,s.majorDisasterType,(s.majorDisasterAt-now)/3600000,nextRandom(s)
 );
}
export function advance(s,now=Date.now(),offline=false){
  if(now<s.lastTickAt) return s; // Never process a backward system clock.
  const step=Math.min(now-s.lastTickAt,MAX_OFFLINE_MS);
  // Fixed 60-second simulation steps: predictable on resume and across frame rates.
  const accumulated=(Number(s.simRemainderMs)||0)+step;
  const ticks=Math.floor(accumulated/60000);
  s.simRemainderMs=accumulated%60000;
  const finalTickTime=now-s.simRemainderMs;
  for(let i=0;i<ticks;i++){
    const tickTime=finalTickTime-(ticks-1-i)*60000;
    if(s.survivalStatus==='dead')break;
    const scheduledImpact=armScheduledMajorDisaster(s,tickTime);
    if(tickTime>=s.nextWeatherAt){
      const was=s.weather;
      // The forecasted impact must take precedence over ordinary transitions.
      // Outside impact, nearby forecasts direct their own weather prelude.
      s.weather=scheduledImpact?s.pendingWeather:pickWeather(s,tickTime);
      if(s.weather==='tornado')s.nextTornadoAllowedAt=tickTime+60*3600000;
      s.pendingWeather=pickWeather(s,tickTime);
      s.nextWeatherAt=tickTime+weatherDurationMs(s.weather,nextRandom(s));
      // v8.5: weatherSinceAt marks the start of the ACTIVE WEATHER INTERVAL,
      // not only a label change. If rain rolls into rain again, the player sees
      // one new scheduled rain interval and the progress ring restarts at 0%.
      s.weatherSinceAt=tickTime;
      if(s.weather!==was||scheduledImpact){
        s.weatherEpisode++;
        if(s.weather!==was)addEvent(s,`날씨가 ${WEATHER_KO[s.weather]} 상태로 바뀌었다.`);
        applyDisasterStructureDamage(s,s.weather,getDay(s.startedAt,tickTime),{offline});
      }
    }
    const e=s.weather;
    // In actual weather, each minute ruins another background tower, at most three.
    // The same monotonic state update is used by previewed tornado impacts.
    if(e==='tornado'){
      if(s.tornadoEncounterActive&&!s.tornadoPreview&&s.tornadoCurrentSites?.length){
        const next=Math.min(3,(s.tornadoEpisodeDamageCount||0)+1);
        if(next>s.tornadoEpisodeDamageCount){
          s.tornadoEpisodeDamageCount=next;
          recordTornadoDamage(s,s.tornadoCurrentSites.slice(0,next),'weather');
        }
      }else if(!s.tornadoDamagedIds?.length){
        // Compatibility with saved games created before per-building IDs existed.
        recordTornadoDamage(s,(s.tornadoDamageCount||0)+1,'weather');
      }
    }
    s.food=CAP(s.food-SURVIVAL_BALANCE.satietyDrainMinute*(e==='cold'?SURVIVAL_BALANCE.coldSatietyMultiplier:1));
    s.water=CAP(s.water-SURVIVAL_BALANCE.hydrationDrainMinute*(e==='wildfire'?1.62:e==='dust'?1.18:e==='heat'?SURVIVAL_BALANCE.heatHydrationMultiplier:1));
    if(s.water<SURVIVAL_BALANCE.lowVitalThreshold||s.food<SURVIVAL_BALANCE.lowVitalThreshold)
      s.health=CAP(s.health-SURVIVAL_BALANCE.lowVitalHealthLossMinute);
    if(s.water<SURVIVAL_BALANCE.lowVitalThreshold&&s.food<SURVIVAL_BALANCE.lowVitalThreshold)
      s.health=CAP(s.health-SURVIVAL_BALANCE.bothLowHealthLossMinute);
    if(s.water>44&&s.food>44&&s.facilities.shelter>65&&s.kit.tent&&['clear','cloud'].includes(e))
      s.health=CAP(s.health+SURVIVAL_BALANCE.healthyRestRecoveryMinute);
    const targetTemp=e==='wildfire'?88:e==='heat'?79:e==='dust'?63:e==='cold'?23:e==='rain'||e==='storm'?43:51;
    s.temperature=CAP(s.temperature+(targetTemp-s.temperature)/90);
    const damage=(e==='wildfire'?.072:e==='dust'?.006:e==='storm'?.045:e==='tornado'?.14:e==='rain'?.019:0);
    if(damage){s.facilities.shelter=CAP(s.facilities.shelter-damage);s.facilities.storage=CAP(s.facilities.storage-damage*.4)}
    // Rain fills the filtered tank automatically; heat evaporates stored water.
    // Tick only from the actual simulation clock, never from weather preview VFX.
    const gameDay=getDay(s.startedAt,tickTime);
    const economy=applyWeatherEconomyMinute(s,e,gameDay);
    applyCompanionMinute(s,gameDay,e,{addLog:msg=>addEvent(s,msg)});
    applyCompanionRationAftermath(s,gameDay,e,{addLog:msg=>addEvent(s,msg)});
    // Repairs consume real parts once a game day; never spend silently offline.
    // Run before producer work so a restored water tank helps immediately.
    if(!offline)applyCompanionAutoRepair(s,gameDay,e,{addLog:msg=>addEvent(s,msg)});
    applyAcquiredItemMinute(s,gameDay,e,{addLog:msg=>addEvent(s,msg)});
    const weatherLedger=s.weatherEconomy;
    if(economy.waterGained&&weatherLedger.benefitNotifiedEpisode!==s.weatherEpisode){
      weatherLedger.benefitNotifiedEpisode=s.weatherEpisode;
      addEvent(s,`자동 집수 성공: 빗물을 정수해 식수 ${economy.waterGained}개가 저장됐다. (탱크 ${s.supply.water}/${WEATHER_WATER_CAPACITY})`);
    }
    if((economy.waterLost||economy.foodLost)&&weatherLedger.lossNotifiedEpisode!==s.weatherEpisode){
      weatherLedger.lossNotifiedEpisode=s.weatherEpisode;
      const explanation=e==='heat'?'높은 기온으로 물이 증발하거나 식량이 상했다.':e==='cold'?'손상된 탱크가 얼어 식수가 유실됐다.':'날씨와 손상된 저장시설 때문에 물자가 손실됐다.';
      addEvent(s,`${explanation} 식수 -${economy.waterLost}, 식량 -${economy.foodLost}.`);
    }
    if(s.facilities.shelter<25)s.health=CAP(s.health-SURVIVAL_BALANCE.weakShelterHealthLossMinute);
    if(e==='heat'&&s.water<28)s.health=CAP(s.health-.036);
    if(e==='wildfire'&&s.water<35)s.health=CAP(s.health-.050);
    if(e==='cold'&&s.facilities.shelter<55)s.health=CAP(s.health-.025);
    if(e==='rain'&&s.facilities.shelter<36)s.sickness=CAP(s.sickness+.018);
    if(e==='dust')s.sickness=CAP(s.sickness+(s.facilities.shelter<65?.026:.008));
    if(e==='wildfire')s.sickness=CAP(s.sickness+(s.facilities.shelter<60?.021:.006));
    // Until the tent is found, the survivor sleeps on cold, exposed concrete.
    if(!s.kit.tent&&((tickTime+9*3600000)%DAY_MS<7*3600000||
      (tickTime+9*3600000)%DAY_MS>22*3600000)&&
      ['rain','cold','storm','dust','wildfire'].includes(e)){
       s.sickness=CAP(s.sickness+.024);
       s.health=CAP(s.health-.012);
    }
    if(s.sickness>50)s.health=CAP(s.health-.023);
    // Night-time urban scavengers: gameplay hazard, not a weather state.
    if(tickTime%DAY_MS>13*3600000&&nextRandom(s)<.004){s.animalAlert=true;addEvent(s,'밤에 야생동물이 식량 상자 주변을 맴돌기 시작했다.');}
    if(s.animalAlert){if(nextRandom(s)<.03){s.supply.food=Math.max(0,s.supply.food-1);s.animalAlert=false;addEvent(s,'야생동물이 식량 일부를 훔치고 떠났다.');}}
    // Human night raiders: non-combat threat. Offline players are protected.
    const kstHour=Math.floor(((tickTime+9*3600000)%DAY_MS)/3600000);
    const atNight=(kstHour>=22||kstHour<5);
    if(!offline && atNight && getDay(s.startedAt,tickTime)>=3 && !s.raiderAlert &&
       tickTime>=s.raiderCooldownAt && s.supply.food>1 &&
       nextRandom(s)<(s.facilities.storage<60?.0015:.0005)){
      s.raiderAlert=true;
      s.raiderUntilAt=tickTime+4*60000;
      addEvent(s,'낯선 발소리가 들린다. 강도들이 계단실에서 식량 보관함에 접근하고 있다.');
    }
    if(s.raiderAlert && tickTime>=s.raiderUntilAt){
      s.raiderAlert=false;
      s.raiderCooldownAt=tickTime+2*DAY_MS;
      if(offline){addEvent(s,'계단실에 침입 흔적이 남아 있다. 물자는 지켜냈다.');}
      else {
        const stolen=Math.min(s.supply.food,s.facilities.storage<55?3:1);
        s.supply.food-=stolen;
        s.facilities.storage=CAP(s.facilities.storage-4);
        addEvent(s,`강도들이 식량 ${stolen}개를 훔쳐 달아났다.`);
      }
    }
    if(s.water<35&&s.supply.water>0){s.supply.water--;s.water=CAP(s.water+36);addEvent(s,'생존자가 물탱크에서 물을 마셨다.')}
    if(s.food<32&&s.supply.food>0){s.supply.food--;s.food=CAP(s.food+39);addEvent(s,'생존자가 저장해 둔 식량으로 식사했다.')}
    if(!offline&&e==='tornado'&&s.tornadoEncounterActive&&!s.tornadoPreview&&
       tickTime>=s.tornadoStartedAt+60000)resolveTornadoRoofImpact(s,tickTime);
    const day=getDay(s.startedAt,tickTime);
    // An optional expedition appears in live time, NEVER automatically accepted.
    if(!offline){
      offerDailyScavenge(s,day);
      if(offerCompanionRationChoice(s,day))
        addEvent(s,'함께 버틴 세 번째 날, 동료가 식량 배분을 상의하자고 했다. 주변 생존 장비에서 결정할 수 있다.');
    }
    for(const beat of SURVIVAL_CHAPTERS){
      if(day>=beat.day&&!s.survivalMilestones.includes(beat.day)){
        s.survivalMilestones.push(beat.day);
        addEvent(s,`생존 일지 DAY ${beat.day}: ${beat.title} — ${beat.line}`);
      }
    }
    if(evaluateSurvival(s,tickTime))break;
  }
  s.lastTickAt=now;
  return s;
}

/** UI and action logic share the same gate for emergency supply runs.
 * Story expeditions (scavenge.pending) are separate and remain selectable. */
export function emergencyExploreAvailability(s,now=Date.now()){
 if(s.survivalStatus==='dead')return {ready:false,reason:'생존이 종료됐습니다.'};
 const need=s.supply.food<3||s.supply.water<4||s.health<38||
   s.facilities.shelter<38||s.facilities.tank<40;
 if(!need)return {ready:false,reason:'비상 탐색은 식량·식수 부족 또는 시설 위기일 때 열립니다.'};
 if(['storm','tornado','dust','wildfire'].includes(s.weather))
   return {ready:false,reason:'대형 재난 중에는 외부 탐색이 위험합니다. 날씨가 잦아들면 다시 가능합니다.'};
 if(now<s.exploreCooldownAt){
   const hours=Math.max(1,Math.ceil((s.exploreCooldownAt-now)/3600000));
   return {ready:false,reason:`긴급 탐색 재사용 대기 · 게임 시간 약 ${hours}시간 후 가능`};
 }
 return {ready:true,reason:'긴급 보급 가능 · 식량·식수·수리 부품을 회수할 수 있습니다.'};
}
export function applyAction(s,action,now=Date.now()){
 const out=(good,msg)=>({good,msg});
 if(s.survivalStatus==='dead')return out(false,'생존이 종료됐다. 새 생존을 시작해야 한다.');
 if(['companion_invite','companion_aid','companion_trade','companion_decline'].includes(action)){
   const result=resolveCompanionRescue(s,action.slice('companion_'.length),
     {day:getDay(s.startedAt,now),addLog:msg=>addEvent(s,msg)});
   return {good:result.good,msg:result.msg,outcome:result.outcome};
 }
 if(['companion_rations_share','companion_rations_conserve'].includes(action)){
   const result=resolveCompanionRationChoice(s,action.slice('companion_rations_'.length),
     {day:getDay(s.startedAt,now),addLog:msg=>addEvent(s,msg)});
   return {good:result.good,msg:result.msg,outcome:result.outcome};
 }
 if(['scavenge_go','scavenge_scout','scavenge_salvage','scavenge_stay'].includes(action)){
   const result=resolveScavengeChoice(s,action.slice('scavenge_'.length),
     {addLog:msg=>addEvent(s,msg)});
   if(result.good)evaluateSurvival(s,now);
   return {good:result.good,msg:result.msg,outcome:result.outcome,item:result.item};
 }
 if(action==='radio_contact'){
   const result=requestRadioContact(s,getDay(s.startedAt,now),{addLog:msg=>addEvent(s,msg)});
   return {good:result.good,msg:result.msg,kind:result.kind};
 }
 if(action==='take_cover'){
   if(s.weather!=='tornado'||!s.tornadoEncounterActive||s.tornadoRoofImpactEncounter===s.tornadoEncounter)
     return out(false,'현재 대피할 토네이도가 없다.');
   if(s.tornadoCoverActive)return out(false,'이미 대피소에 몸을 숨겼다.');
   s.tornadoCoverActive=true;s.action='rest';s.actionUntil=now+16000;
   addEvent(s,'생존자가 대피소에 몸을 낮췄다. 이번 강풍의 부상 위험이 줄어든다.');
   return out(true,'대피 완료 · 이번 토네이도 부상 피해 감소');
 }
 if(action==='secure_supplies'){
   if(s.weather!=='tornado'||!s.tornadoEncounterActive||s.tornadoRoofImpactEncounter===s.tornadoEncounter)
     return out(false,'현재 고정할 긴급 물자가 없다.');
   if(s.tornadoSuppliesSecured)return out(false,'이번 강풍에 대비한 물자 고정은 완료됐다.');
   if(s.supply.parts<1)return out(false,'물자 고정용 부품 1개가 필요하다.');
   s.supply.parts--;s.tornadoSuppliesSecured=true;
   addEvent(s,'보관함에 고정끈을 묶었다. 이번 토네이도 식량 손실이 줄어든다.');
   return out(true,'물자 고정 완료 · 식량·식수 피해 감소');
 }
 if(action==='collect_water'){
   if(!['rain','storm'].includes(s.weather))return out(false,'실제 비가 내릴 때만 빗물을 정수해 모을 수 있다.');
   if(s.facilities.tank<40)return out(false,'물탱크 정수 시설이 너무 파손돼 수리가 필요하다.');
   if(s.supply.water>=WEATHER_WATER_CAPACITY)return out(false,'식수 저장소가 가득 차 더 모을 수 없다.');
   if(now<s.collectWaterCooldownAt)return out(false,'수동 정수 설비를 다시 사용하려면 기다려야 한다.');
   // Without a permanent purifier, improvised filtration is still possible
   // but costs scarce parts. No free drinking water from untreated rain.
   if(!s.kit.purifier&&s.supply.parts<1)
     return out(false,'정수기가 없어 임시 정수에 부품 1개가 필요하다.');
   if(!s.kit.purifier)s.supply.parts--;
   const gained=Math.min(2,WEATHER_WATER_CAPACITY-s.supply.water);
   s.supply.water+=gained;s.collectWaterCooldownAt=now+SURVIVAL_BALANCE.collectWaterCooldownMs;
   addEvent(s,`수동 빗물 정수를 마쳐 식수 ${gained}개를 확보했다.`);
   return out(true,`빗물 수집 완료 · 식수 +${gained}`);
 }
 if(action==='secure_storage'){
   if(!s.raiderAlert)return out(false,'현재 침입 경보가 없다.');
   if(s.supply.parts<1)return out(false,'보관함 잠금에 필요한 수리 부품이 부족하다.');
   s.supply.parts--;
   s.raiderAlert=false;
   s.raiderUntilAt=0;
   s.raiderCooldownAt=now+2*DAY_MS;
   s.facilities.storage=CAP(s.facilities.storage+6);
   addEvent(s,'보관함을 걸어 잠가 강도들을 쫓아냈다. 식량을 지켜냈다.');
   return out(true,'보관함을 잠가 강도들을 쫓아냈다.');
 }
 if(action==='drink'){if(s.supply.water<1)return out(false,'저장된 물이 없다.');s.supply.water--;s.water=CAP(s.water+31);s.action='drink';s.actionUntil=now+6500;return out(true,'물탱크에서 물을 마셨다.');}
 if(action==='eat'){if(s.supply.food<1)return out(false,'식량이 부족하다.');s.supply.food--;s.food=CAP(s.food+34);s.action='eat';s.actionUntil=now+6900;return out(true,'오래된 비상식량으로 식사했다.');}
 if(action==='medicine'){if(s.supply.medicine<1)return out(false,'의약품이 부족하다.');if(s.health>=97&&s.sickness<1)return out(false,'치료가 필요한 상태가 아니다.');s.supply.medicine--;s.sickness=CAP(s.sickness-65);s.health=CAP(s.health+22);s.action='medicine';s.actionUntil=now+8000;return out(true,'응급 약품으로 치료했다.');}
 if(action==='repair_tank'){
   if(s.facilities.tank>=96)return out(false,'정수 탱크가 이미 충분히 견고하다.');
   if(s.supply.parts<2)return out(false,'정수 탱크 수리에 필요한 부품 2개가 부족하다.');
   s.supply.parts-=2;
   s.facilities.tank=CAP(s.facilities.tank+38);
   s.action='repair';s.actionUntil=now+10000;
   addEvent(s,'정수 탱크를 수리했다. 빗물 자동 집수 효율이 회복된다.');
   return out(true,`정수 탱크 수리 완료 · 내구도 ${Math.round(s.facilities.tank)}%`);
 }
 if(action==='repair'){if(s.supply.parts<2)return out(false,'수리 재료가 부족하다.');s.supply.parts-=2;const weakest=Object.keys(s.facilities).sort((a,b)=>s.facilities[a]-s.facilities[b])[0];s.facilities[weakest]=CAP(s.facilities[weakest]+27);s.action='repair';s.actionUntil=now+10000;return out(true,'손상된 시설을 보수했다.');}
 if(action==='rest'){
   if(now<s.restCooldownAt)return out(false,'아직 충분히 휴식하지 못했다. 4시간 간격으로 회복할 수 있다.');
   s.restCooldownAt=now+SURVIVAL_BALANCE.restCooldownMs;
   const healed=s.kit?.tent?(s.water<12?3:9):(s.water<12?1:3);
   if(!s.kit?.tent&&['rain','cold','storm','dust','wildfire'].includes(s.weather))
     s.sickness=CAP(s.sickness+2);
   s.health=CAP(s.health+healed);s.action='rest';s.actionUntil=now+9000;
   return out(true,`대피소에서 휴식해 건강을 ${healed}만큼 회복했다.`);
 }
 if(action==='explore'){
 const availability=emergencyExploreAvailability(s,now);
 if(!availability.ready)return out(false,availability.reason);
 const r=nextRandom(s),injury=r<.22?12:4;
 s.health=CAP(s.health-injury);s.supply.food+=r<.23?3:5;
 s.supply.water=s.supply.water>=WEATHER_WATER_CAPACITY?s.supply.water:Math.min(WEATHER_WATER_CAPACITY,s.supply.water+(r<.30?2:4));
 // Emergency expeditions are dangerous and limited to once per 20 game hours,
 // but return enough repair components to make long-term survival achievable.
 s.supply.parts+=r<.30?2:r<.65?3:4;if(r>.65)s.supply.medicine++;
 s.exploreCooldownAt=now+SURVIVAL_BALANCE.exploreCooldownMs;
 s.action='explore';s.actionUntil=now+18000;
 addEvent(s,r<.22?'긴급 탐색 중 부상을 입었지만 생존 물자를 가져왔다.':'폐허 창고에서 식량과 식수를 확보했다.');
 evaluateSurvival(s,now);
 return out(true,r<.22?'부상을 입고 식량과 식수를 확보했다.':'긴급 보급품을 확보했다.');}
 return out(false,'알 수 없는 행동');
}
