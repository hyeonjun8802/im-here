/** AFTERDAY | Black Map first playable exploration loop.
 * Separate from the DAILY scavenging director. Only the existing
 * resolveScavengeChoice roll is used for resources, equipment and risks.
 * Location, mission phase and reward receipt are persisted together. */
import {hash32,resolveScavengeChoice} from './scavengeDirector.js';

const DAY_MS=86400000;
export const EXPLORATION_TRAVEL_GAME_MS=25*60000;
export const EXPLORATION_MIN_REAL_MS=2400;
export const EXPLORATION_SITES=Object.freeze([
 {id:'ruined_house',label:'무너진 주택',description:'옛 거주자의 흔적. 야전 텐트와 지도 단서가 남아 있을지 모른다.',risk:'낮음',reward:'야전 텐트 · 생활 물자',target:'tent',x:.49,y:.78},
 {id:'convenience_store',label:'버려진 편의점',description:'지하 창고에 물자와 낡은 영수증이 있을 수 있다.',risk:'보통',reward:'식량 · 식수 · 수리 부품',target:'cache',x:.43,y:.33}
]);
const SITE_IDS=new Set(EXPLORATION_SITES.map(site=>site.id));
const CHOICES=new Set(['go','scout','salvage','stay']);
const safeInt=(value,min=0,max=1000000)=>Number.isFinite(Number(value))?
 Math.max(min,Math.min(max,Math.floor(Number(value)))):min;
const safeMs=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
export const currentExplorationDay=(s,now)=>1+Math.floor(Math.max(0,now-s.startedAt)/DAY_MS);

export function newExplorationMap(){
 return {
  version:1,lastAttemptDay:0,
  sites:{
   ruined_house:{visibility:'rumored',visits:0,completed:false,lastOutcome:''},
   convenience_store:{visibility:'unknown',visits:0,completed:false,lastOutcome:''}
  },
  mission:null
 };
}
export function sanitizeExplorationMap(input){
 const b=newExplorationMap();
 if(!input||typeof input!=='object')return b;
 const sites=input.sites&&typeof input.sites==='object'?input.sites:{};
 for(const site of EXPLORATION_SITES){
  const old=sites[site.id]&&typeof sites[site.id]==='object'?sites[site.id]:{};
  const visits=safeInt(old.visits,0,1000);
  const completed=Boolean(old.completed)&&visits>0;
  const visibility=completed?'completed':visits>0?'visited':
   ['rumored','unknown'].includes(old.visibility)?old.visibility:b.sites[site.id].visibility;
  b.sites[site.id]={visibility,visits,completed,
   lastOutcome:['item','supplies','injury','sickness','empty','safe'].includes(old.lastOutcome)?old.lastOutcome:''};
 }
 b.lastAttemptDay=safeInt(input.lastAttemptDay);
 const m=input.mission;
 if(m&&SITE_IDS.has(m.siteId)&&['outbound','encounter','returning'].includes(m.phase)){
  b.mission={siteId:m.siteId,phase:m.phase,dueAt:safeMs(m.dueAt),
   realReadyAt:safeMs(m.realReadyAt),
   result:['item','supplies','injury','sickness','empty','safe'].includes(m.result)?m.result:'',
   message:String(m.message||'').slice(0,250)};
 }
 // A location should never become unknown again after a veteran explored it.
 if(b.sites.ruined_house.visits>0&&b.sites.convenience_store.visibility==='unknown')
  b.sites.convenience_store.visibility='rumored';
 return b;
}
export function mapExpeditionAvailability(s,id,now){
 if(!SITE_IDS.has(id))return {ready:false,reason:'아직 탐험할 수 없는 지역입니다.'};
 if(s.survivalStatus==='dead')return {ready:false,reason:'생존이 종료됐습니다.'};
 const map=s.explorationMap||newExplorationMap(),site=map.sites[id];
 if(map.mission)return {ready:false,reason:'진행 중인 탐험을 먼저 마쳐야 합니다.'};
 if(!site||site.visibility==='unknown')return {ready:false,reason:'먼저 주변을 탐사해 위치를 확인하세요.'};
 if(site.completed)return {ready:false,reason:'이미 조사를 마친 장소입니다. 다시 방문할 필요가 없습니다.'};
 if(['tornado','storm','wildfire'].includes(s.weather))
  return {ready:false,reason:'대형 재난 중에는 도시 탐험을 시작할 수 없습니다.'};
 if(s.health<25)return {ready:false,reason:'건강이 너무 나쁩니다. 치료 후 출발하세요.'};
 if(map.lastAttemptDay>=currentExplorationDay(s,now))
  return {ready:false,reason:'오늘은 이미 동네를 탐험했습니다. 다음 생존일에 다시 출발할 수 있습니다.'};
 return {ready:true,reason:'계단실에서 출발합니다. 돌아올 때 지도가 밝아집니다.'};
}
export function beginMapExpedition(s,id,now,realNow=Date.now()){
 const available=mapExpeditionAvailability(s,id,now);
 if(!available.ready)return {good:false,msg:available.reason};
 const map=s.explorationMap;
 map.lastAttemptDay=currentExplorationDay(s,now);
 map.mission={siteId:id,phase:'outbound',dueAt:now+EXPLORATION_TRAVEL_GAME_MS,
  realReadyAt:realNow+EXPLORATION_MIN_REAL_MS,result:'',message:''};
 return {good:true,kind:'departed',siteId:id,msg:'옥상 계단실을 통해 탐험을 떠났습니다.'};
}
export function advanceMapExpedition(s,now,realNow=Date.now()){
 const mission=s.explorationMap?.mission;
 if(!mission||now<mission.dueAt||realNow<mission.realReadyAt)
  return {changed:false};
 if(mission.phase==='outbound'){
  mission.phase='encounter';
  mission.realReadyAt=realNow;
  return {changed:true,kind:'arrived',siteId:mission.siteId};
 }
 if(mission.phase==='returning'){
  const site=s.explorationMap.sites[mission.siteId];
  if(site&&mission.result!=='safe'){
   site.visits=Math.min(1000,site.visits+1);
   site.lastOutcome=mission.result;
   if(['item','supplies'].includes(mission.result)){
    site.completed=true;site.visibility='completed';
   }else site.visibility='visited';
   if(mission.siteId==='ruined_house'&&s.explorationMap.sites.convenience_store.visibility==='unknown')
    s.explorationMap.sites.convenience_store.visibility='rumored';
  }
  const completed=Boolean(site?.completed),message=mission.message;
  const siteId=mission.siteId;
  s.explorationMap.mission=null; // Commit exactly once before the map is redrawn.
  return {changed:true,kind:'returned',siteId,completed,msg:message};
 }
 return {changed:false};
}
export function resolveMapExpedition(s,choice,now,realNow=Date.now()){
 const mission=s.explorationMap?.mission;
 if(!mission||mission.phase!=='encounter')return {good:false,msg:'현재 선택할 현장 탐험이 없습니다.'};
 if(!CHOICES.has(choice))return {good:false,msg:'잘못된 탐색 선택입니다.'};
 const site=EXPLORATION_SITES.find(item=>item.id===mission.siteId);
 const attempts=s.explorationMap.sites[mission.siteId].visits;
 const day=currentExplorationDay(s,now);
 // Isolate the normal scavenging quest from mapped expeditions. Its pending
 // offer, recovery target, serial and daily deterministic results are untouched.
 const trial={
  survivalStatus:s.survivalStatus,weather:s.weather,health:s.health,sickness:s.sickness,
  supply:{...s.supply},kit:{...s.kit},
  scavenge:{seed:hash32((s.scavenge?.seed||19821) ^ (site.id==='ruined_house'?18457:84901)),
   pending:{id:'map:'+site.id+':'+day,day,title:site.label,target:site.target},
   expeditionCount:attempts,lastResolvedDay:0,recoveryTarget:null}
 };
 const result=resolveScavengeChoice(trial,choice,{day});
 if(!result.good)return result;
 s.health=trial.health;s.sickness=trial.sickness;
 Object.assign(s.supply,trial.supply);Object.assign(s.kit,trial.kit);
 mission.phase='returning';mission.result=result.outcome;mission.message=result.msg;
 mission.dueAt=now+EXPLORATION_TRAVEL_GAME_MS;
 mission.realReadyAt=realNow+EXPLORATION_MIN_REAL_MS;
 return {...result,siteId:site.id,kind:'returning'};
}