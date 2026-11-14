/** AFTERDAY | Black Map first playable exploration loop.
 * Separate from the DAILY scavenging director. Only the existing
 * resolveScavengeChoice roll is used for resources, equipment and risks.
 * Location, mission phase and reward receipt are persisted together. */
import {hash32,resolveScavengeChoice} from './scavengeDirector.js';

const DAY_MS=86400000;
export const EXPLORATION_TRAVEL_GAME_MS=25*60000;
export const EXPLORATION_MIN_REAL_MS=2400;
export const EXPLORATION_SITES=Object.freeze([
 // Six local scenes. The first two IDs and their progression remain stable.
 {id:'ruined_house',label:'무너진 주택',description:'금이 간 계단 아래 옛 거주자의 흔적이 남았다. 벽장 속 야전 텐트와 다른 장소의 단서를 찾는다.',scene:'기울어진 계단과 떨어진 콘크리트 사이로 생활 흔적이 이어진다.',risk:'낮음',reward:'야전 텐트 · 생활 물자',target:'tent',x:.28,y:.75,zone:'near',unlock:['convenience_store']},
 {id:'convenience_store',label:'버려진 편의점',description:'텅 빈 매대 뒤 잠긴 창고. 식수와 식량 흔적, 약국으로 이어지는 배송표를 조사한다.',scene:'유리 조각이 깔린 편의점 뒤편에서 창고 자물쇠가 흔들린다.',risk:'보통',reward:'식량 · 식수 · 수리 부품',target:'cache',x:.43,y:.31,zone:'near',unlock:['pharmacy','flower_shop']},
 {id:'pharmacy',label:'폐허 약국',description:'부상자를 치료할 약이 부족하다. 오염된 약품과 보관된 의약품을 구분해야 한다.',scene:'부서진 냉장고가 멈춘 약국 안, 봉인된 응급 상자가 보인다.',risk:'보통',reward:'의약품 · 보급 물자',target:'cache',x:.68,y:.30,zone:'near',unlock:['water_station']},
 {id:'flower_shop',label:'버려진 화원',description:'잡초가 자란 화원에 옥상에서 키울 종자 상자가 있을지 모른다.',scene:'깨진 온실 유리 아래에 씨앗 상자와 젖은 흙이 남아 있다.',risk:'보통',reward:'재배 씨앗 · 생활 물자',target:'seeds',x:.77,y:.69,zone:'near',unlock:['water_station']},
 {id:'water_station',label:'오래된 정수실',description:'침수된 배관실 안에서 정수 장치의 부품과 통신실 설계도를 찾는다.',scene:'허리까지 물이 찬 기계실, 녹슨 밸브 너머로 정수기가 보인다.',risk:'높음',reward:'정수기 · 수리 부품',target:'purifier',x:.17,y:.29,zone:'near',unlock:['communications_room']},
 {id:'communications_room',label:'통신실',description:'꺼진 교환대와 비상 주파수 기록. 단파 무전기와 통신탑의 위치를 확인한다.',scene:'무전기 부품 사이에서 17번 채널과 통신탑 배선 기록을 발견했다.',risk:'높음',reward:'단파 무전기 · 통신탑 단서',target:'radio',x:.84,y:.28,zone:'near',unlock:[]},
 // Six distant sites are revealed only after the repaired tower reaches channel 17.
 {id:'hypermarket',label:'대형 마트',description:'대형 창고의 남은 식량. 무너진 진열대와 잠긴 냉동실이 위험하다.',scene:'폐허가 된 대형 마트 바닥에 흔적이 선명한 손수레가 보인다.',risk:'높음',reward:'식량 · 물자',target:'cache',x:.19,y:.30,zone:'far',unlock:[]},
 {id:'underpass',label:'지하차도',description:'침수와 정체된 차량 사이의 우회 경로. 다음 지역으로 가는 길을 확인한다.',scene:'물에 잠긴 지하차도에서 바닥 배수구와 도로 표지의 흔적을 찾았다.',risk:'높음',reward:'우회 경로 기록 · 수리 부품',target:'cache',x:.46,y:.22,zone:'far',unlock:[]},
 {id:'hospital',label:'병원',description:'구급실에서 약을 찾아야 하지만 유리문 너머 오염된 구역이 기다린다.',scene:'진료실의 오래된 기록과 약품 보관함이 잔해 속에 드러난다.',risk:'높음',reward:'의약품 · 생존 기록',target:'cache',x:.79,y:.33,zone:'far',unlock:[]},
 {id:'substation',label:'변전소',description:'오래된 전기 설비를 조사해 도시의 희미한 송전 흔적을 파악한다.',scene:'전원이 끊긴 변압기 아래 살아 있는 케이블인지 확인해야 한다.',risk:'높음',reward:'수리 부품 · 전력 기록',target:'cache',x:.76,y:.73,zone:'far',unlock:[]},
 {id:'community_shelter',label:'공동 대피소',description:'버려진 침상과 기록 장부. 누가 이곳을 지나갔는지 조사한다.',scene:'체육관을 개조한 대피소 안에 마지막 배급 기록이 남아 있다.',risk:'보통',reward:'생존자 기록 · 식량',target:'cache',x:.48,y:.75,zone:'far',unlock:[]},
 {id:'rooftop_helipad',label:'옥상 헬기장',description:'도시 위 구조 신호를 보낼 높은 옥상. 접근로와 안전한 대피 지점을 찾는다.',scene:'금이 간 착륙 표시와 불빛이 꺼진 신호등. 마지막 구조 흔적을 확인한다.',risk:'높음',reward:'구조 신호 단서 · 장비 부품',target:'cache',x:.21,y:.68,zone:'far',unlock:[]}
]);
const SITE_IDS=new Set(EXPLORATION_SITES.map(site=>site.id));
const CHOICES=new Set(['go','scout','salvage','stay']);

export const TOWER_PHASES=Object.freeze(['unknown','discovered','surveyed','parts_ready','restored','channel17']);
const newTower=()=>({phase:'unknown',reservedParts:0});
const newEnding=()=>({type:'none',atDay:0});
const knownSiteIds=new Set(EXPLORATION_SITES.map(site=>site.id));
const siteEntry=(visibility='unknown')=>({visibility,visits:0,completed:false,lastOutcome:''});
function revealFollowing(map,site){
 for(const id of site.unlock||[]){
  if(map.sites[id]?.visibility==='unknown')map.sites[id].visibility='rumored';
 }
}
function refreshProgression(map){
 const house=map.sites.ruined_house;
 if(house.visits>0||house.completed)revealFollowing(map,EXPLORATION_SITES[0]);
 for(const site of EXPLORATION_SITES.filter(item=>item.zone==='near')){
  if(map.sites[site.id]?.visits>0||map.sites[site.id]?.completed)revealFollowing(map,site);
 }
 if(map.sites.communications_room?.completed&&map.tower.phase==='unknown')
  map.tower.phase='discovered';
 if(map.tower.phase==='channel17'){
  for(const site of EXPLORATION_SITES.filter(item=>item.zone==='far'))
   if(map.sites[site.id].visibility==='unknown')map.sites[site.id].visibility='rumored';
 }
}
export function advanceTowerStory(s,action){
 const map=s.explorationMap;
 if(!map?.tower||s.survivalStatus==='dead')return {good:false,msg:'탐사를 진행할 수 없습니다.'};
 const tower=map.tower,phase=tower.phase;
 if(action==='survey'&&phase==='discovered'){
  tower.phase='surveyed';
  return {good:true,phase:tower.phase,msg:'통신실에서 확보한 도면으로 탑의 파손 구간과 17번 채널 배선을 확인했습니다.'};
 }
 if(action==='prepare'&&phase==='surveyed'){
  if((s.supply?.parts||0)<4)return {good:false,msg:'안전한 통신탑 복구에는 수리 부품 4개가 필요합니다.'};
  s.supply.parts-=4;tower.reservedParts=4;tower.phase='parts_ready';
  return {good:true,phase:tower.phase,msg:'수리 부품 4개를 통신탑 복구용으로 확보했습니다.'};
 }
 if(action==='restore'&&phase==='parts_ready'){
  if(tower.reservedParts!==4)return {good:false,msg:'저장된 수리 부품 확보 기록을 먼저 확인해야 합니다.'};
  tower.phase='restored';
  return {good:true,phase:tower.phase,msg:'부품을 사용해 통신탑의 전원과 배선 경로를 복구했습니다.'};
 }
 if(action==='connect'&&phase==='restored'){
  if(!s.kit?.radio)return {good:false,msg:'17번 채널에 연결하려면 단파 무전기를 먼저 확보해야 합니다.'};
  tower.phase='channel17';refreshProgression(map);
  return {good:true,phase:tower.phase,msg:'17번 채널 연결 성공. 새로운 원거리 탐사 6곳의 위치를 확인했습니다.'};
 }
 return {good:false,msg:'현재 진행 단계에서 선택할 수 없는 통신탑 작업입니다.'};
}
export function mapFinaleAvailability(s){
 const map=s?.explorationMap;
 if(!map||map.tower?.phase!=='channel17')
  return {ready:false,reason:'17번 채널을 연결해야 먼 지역의 마지막 기록을 확인할 수 있습니다.'};
 const remaining=EXPLORATION_SITES.filter(site=>!map.sites[site.id]?.completed);
 if(remaining.length)return {ready:false,reason:'아직 조사가 끝나지 않은 장소 '+remaining.length+'곳이 있습니다.'};
 if(map.ending?.type!=='none')return {ready:false,reason:'이미 생존 기록의 결말을 선택했습니다.'};
 return {ready:true,reason:'모든 장소 조사 완료. 옥상의 다음 생존 방식을 기록할 수 있습니다.'};
}
export function resolveMapFinale(s,choice,now){
 const ready=mapFinaleAvailability(s);
 if(!ready.ready)return {good:false,msg:ready.reason};
 if(!['settle','signal'].includes(choice))return {good:false,msg:'선택할 수 없는 결말입니다.'};
 s.explorationMap.ending={type:choice,atDay:currentExplorationDay(s,now)};
 return {good:true,kind:'finale',choice,msg:choice==='settle'?
  '정착의 기록: 무너진 도시 속에서도 이 옥상을 지키며 살아가기로 했습니다. 생존은 계속됩니다.':
  '구조 신호의 기록: 17번 채널로 위치와 생존 기록을 송신했습니다. 구조를 보장하지는 않으며, 생존은 계속됩니다.'};
}

const safeInt=(value,min=0,max=1000000)=>Number.isFinite(Number(value))?
 Math.max(min,Math.min(max,Math.floor(Number(value)))):min;
const safeMs=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
export const currentExplorationDay=(s,now)=>1+Math.floor(Math.max(0,now-s.startedAt)/DAY_MS);

export function newExplorationMap(){
 return {
  version:2,lastAttemptDay:0,
  sites:Object.fromEntries(EXPLORATION_SITES.map(site=>
   [site.id,siteEntry(site.id==='ruined_house'?'rumored':'unknown')])),
  tower:newTower(),ending:newEnding(),mission:null
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
 const oldTower=input.tower&&typeof input.tower==='object'?input.tower:{};
 const phase=TOWER_PHASES.includes(oldTower.phase)?oldTower.phase:'unknown';
 b.tower={phase,reservedParts:phase==='unknown'||phase==='discovered'||phase==='surveyed'?0:
  Math.min(4,safeInt(oldTower.reservedParts,0,4))};
 const oldEnding=input.ending&&typeof input.ending==='object'?input.ending:{};
 b.ending={type:['settle','signal'].includes(oldEnding.type)?oldEnding.type:'none',
  atDay:safeInt(oldEnding.atDay)};

 const m=input.mission;
 if(m&&SITE_IDS.has(m.siteId)&&['outbound','encounter','returning'].includes(m.phase)){
  b.mission={siteId:m.siteId,phase:m.phase,dueAt:safeMs(m.dueAt),
   realReadyAt:safeMs(m.realReadyAt),
   result:['item','supplies','injury','sickness','empty','safe'].includes(m.result)?m.result:'',
   message:String(m.message||'').slice(0,250)};
 }
 // Keep legacy v1 map progress and the old house-to-store unlock intact.
 refreshProgression(b);
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
   const explored=EXPLORATION_SITES.find(entry=>entry.id===mission.siteId);
   if(explored)revealFollowing(s.explorationMap,explored);
   refreshProgression(s.explorationMap);
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
  scavenge:{seed:hash32((s.scavenge?.seed||19821) ^ (site.id==='ruined_house'?18457:site.id==='convenience_store'?84901:hash32([...site.id].reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))|0,0)))),
   pending:{id:'map:'+site.id+':'+day,day,title:site.label,target:site.target},
   expeditionCount:attempts,lastResolvedDay:0,recoveryTarget:null}
 };
 const result=resolveScavengeChoice(trial,choice,{day});
 if(!result.good)return result;
 s.health=trial.health;s.sickness=trial.sickness;
 Object.assign(s.supply,trial.supply);Object.assign(s.kit,trial.kit);
 // Emergency-medicine sites give one actual medicine only after a successful
 // existing scavenging result. A resolved mission cannot award again.
 if(['pharmacy','hospital'].includes(site.id)&&
    ['item','supplies'].includes(result.outcome)){
  const gained=Math.min(1,Math.max(0,999-(s.supply.medicine||0)));
  s.supply.medicine+=gained;
  if(gained)result.msg+=' 봉인된 의약품 +1.';
 }
 mission.phase='returning';mission.result=result.outcome;
 mission.message=site.label+' · '+result.msg;
 mission.dueAt=now+EXPLORATION_TRAVEL_GAME_MS;
 mission.realReadyAt=realNow+EXPLORATION_MIN_REAL_MS;
 return {...result,siteId:site.id,kind:'returning'};
}