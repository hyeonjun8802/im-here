export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
export const SAVE_KEY = 'AFTERDAY_THREEJS_SIMCITY_v04';
export const CAP = (v,min=0,max=100)=>Math.max(min, Math.min(max, v));
export const DAY_MS = 86400000;
export const WEATHER = ['clear','heat','cloud','rain','storm','tornado','cold'];
export const WEATHER_KO = {clear:'맑음', heat:'폭염', cloud:'흐림', rain:'폭우', storm:'낙뢰', tornado:'토네이도', cold:'한파'};
export const defaults = (now=Date.now())=>({
  version:4, animalAlert:false, raiderAlert:false, raiderUntilAt:0, raiderCooldownAt:0, sickness:0, startedAt:now, lastTickAt:now, nextWeatherAt:now+22*60000, pendingWeather:'rain', simRemainderMs:0,
  weather:'clear', weatherSeed:47283, health:88, food:72, water:68, temperature:50,
  supply:{food:8,water:12,medicine:2,parts:8}, facilities:{shelter:91,tank:90,storage:88},
  events:['폐허 옥상에 작은 캠프를 마련했다.'], mission:'오늘도 살아남기', action:'idle', actionUntil:0
});
export function sanitize(raw, now=Date.now()) {
  if (!raw || raw.version!==4 || !Number.isFinite(raw.startedAt)) return defaults(now);
  const b=defaults(now),s={...b,...raw,supply:{...b.supply,...(raw.supply&&typeof raw.supply==='object'?raw.supply:{})},facilities:{...b.facilities,...(raw.facilities&&typeof raw.facilities==='object'?raw.facilities:{})}};
  s.startedAt=Math.min(Math.max(s.startedAt,0),now);
  s.lastTickAt=Math.min(Math.max(s.lastTickAt,s.startedAt),now);
  for (const k of ['health','food','water','temperature']) s[k]=CAP(Number(s[k])||0);
  for (const k of Object.keys(s.supply)) s.supply[k]=Math.max(0,Math.min(999,Math.floor(Number(s.supply[k])||0)));
  for (const k of Object.keys(s.facilities)) s.facilities[k]=CAP(Number(s.facilities[k])||0);
  s.events=Array.isArray(s.events)?s.events.filter(v=>typeof v==='string').slice(-16):b.events;
  s.animalAlert=Boolean(s.animalAlert);s.sickness=CAP(Number(s.sickness)||0);
  s.raiderAlert=Boolean(s.raiderAlert);
  s.raiderUntilAt=Number.isFinite(Number(s.raiderUntilAt))?Math.max(0,Number(s.raiderUntilAt)):0;
  s.raiderCooldownAt=Number.isFinite(Number(s.raiderCooldownAt))?Math.max(0,Number(s.raiderCooldownAt)):0;
  if (!WEATHER.includes(s.weather)) s.weather='clear';
  return s;
}
export function getDay(startedAt,now=Date.now()) { const kst=9*3600000; const a=Math.floor((startedAt+kst)/DAY_MS), b=Math.floor((Math.max(now,startedAt)+kst)/DAY_MS); return Math.max(1,b-a+1); }
export function wallClock(now=Date.now()) {return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(now));}
export function localHour(now=Date.now()) {const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now));const get=k=>Number(parts.find(p=>p.type===k)?.value||0);return get('hour')+get('minute')/60+get('second')/3600;}
function nextRandom(s){s.weatherSeed=(Math.imul(s.weatherSeed,1664525)+1013904223)>>>0;return s.weatherSeed/4294967296;}
export function addEvent(s,msg){if(s.events[s.events.length-1]!==msg)s.events.push(msg);if(s.events.length>16)s.events.shift();}
function pickWeather(s){const r=nextRandom(s);const choices=s.temperature<25?['clear','cloud','rain','cold','storm']:['clear','cloud','heat','rain','storm','tornado'];return choices[Math.min(choices.length-1,Math.floor(r*choices.length))];}
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
    if(tickTime>=s.nextWeatherAt){
      s.weather=s.pendingWeather||pickWeather(s);
      s.pendingWeather=pickWeather(s);
      s.nextWeatherAt=tickTime+(15+Math.round(nextRandom(s)*17))*60000;
      addEvent(s,`날씨가 ${WEATHER_KO[s.weather]} 상태로 바뀌었다.`);
    }
    const e=s.weather;
    s.food=CAP(s.food-(e==='cold'?.041:.032));
    s.water=CAP(s.water-(e==='heat'?.075:.043));
    s.health=CAP(s.health-(s.water<12||s.food<10?.067:.002));
    const targetTemp=e==='heat'?79:e==='cold'?23:e==='rain'||e==='storm'?43:51;
    s.temperature=CAP(s.temperature+(targetTemp-s.temperature)/90);
    const damage=(e==='storm'?.045:e==='tornado'?.14:e==='rain'?.019:0);
    if(damage){s.facilities.shelter=CAP(s.facilities.shelter-damage);s.facilities.storage=CAP(s.facilities.storage-damage*.4)}
    if(s.facilities.shelter<25)s.health=CAP(s.health-.024);
    if(e==='heat'&&s.water<28)s.health=CAP(s.health-.036);
    if(e==='cold'&&s.facilities.shelter<55)s.health=CAP(s.health-.025);
    if(e==='rain'&&s.facilities.shelter<36)s.sickness=CAP(s.sickness+.018);
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
  }
  s.lastTickAt=now;
  return s;
}
export function applyAction(s,action,now=Date.now()){
 const out=(good,msg)=>({good,msg});
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
 if(action==='repair'){if(s.supply.parts<2)return out(false,'수리 재료가 부족하다.');s.supply.parts-=2;const weakest=Object.keys(s.facilities).sort((a,b)=>s.facilities[a]-s.facilities[b])[0];s.facilities[weakest]=CAP(s.facilities[weakest]+27);s.action='repair';s.actionUntil=now+10000;return out(true,'손상된 시설을 보수했다.');}
 if(action==='rest'){s.health=CAP(s.health+Math.max(0,3-(s.water<12?2:0)));s.action='rest';s.actionUntil=now+9000;return out(true,'대피소에서 휴식을 취한다.');}
 if(action==='explore'){const need=s.supply.food<3||s.supply.water<4||s.health<38||s.facilities.shelter<38;
 if(!need) return out(false,'탐험은 식량·식수 부족 또는 위기일 때만 가능하다.');
 const r=nextRandom(s);s.health=CAP(s.health-(r<.18?12:3));s.supply.food+=r<.35?2:5;s.supply.water+=r<.4?1:4;if(r>.5)s.supply.parts+=3;if(r>.7)s.supply.medicine++;s.action='explore';s.actionUntil=now+18000;return out(true,r<.18?'긴급 탐색 중 다쳤지만 식량을 확보했다.':'폐허에서 긴급 보급품을 확보했다.');}
 return out(false,'알 수 없는 행동');
}
