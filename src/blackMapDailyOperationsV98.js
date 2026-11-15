/** AFTERDAY v98 | Mission operations display. No new rolls, currencies or save keys.
 * All preparation is informational; real actions remain owned by the V78 map. */
import {EXPLORATION_SITES,mapExpeditionAvailability,currentExplorationDay} from './explorationMapV78.js';
import {scavengeOdds} from './scavengeDirector.js';
import {REPAIR_PARTS_RESERVE} from './repairPartsBalanceV95.js';

const safeCount=value=>Math.max(0,Math.floor(Number(value)||0));
export function getDailyOperations(state,now){
 const day=currentExplorationDay(state,now);
 const supply=state?.supply||{};
 const ended=state?.explorationMap?.ending?.type!=='none'&&Boolean(state?.explorationMap?.ending?.type);
 let title='오늘의 탐사 판단',detail='식수와 식량을 확인한 뒤 오늘의 탐색을 선택하세요.';
 if(['storm','tornado','wildfire'].includes(state?.weather)){
  title='위험 기상 · 외출 판단';detail='대형 재난에는 지도 탐사를 출발할 수 없습니다. 옥상 안전을 먼저 확인하세요.';
 }else if((state?.health||0)<35||((state?.sickness||0)>=35)){
  title='생존 우선 · 건강 관리';detail='건강과 감염 상태를 먼저 확인하세요. 위험한 탐사보다 회복이 우선일 수 있습니다.';
 }else if(safeCount(supply.water)<=2){
  title='오늘의 우선 과제 · 식수';detail='식수가 부족합니다. 보급 탐색의 획득 가능 물자와 소모 자원을 확인하세요.';
 }else if(safeCount(supply.food)<=2){
  title='오늘의 우선 과제 · 식량';detail='식량이 부족합니다. 탐사 위험과 기존 보급 탐색 기회를 비교하세요.';
 }else if(safeCount(supply.parts)<4){
  title='오늘의 우선 과제 · 수리 부품';detail='시설 유지와 통신탑 복구에 쓰이는 부품 비축을 확인하세요.';
 }else{
  const label=['시설 점검','보급 상황 확인','도시 탐사 준비'][day%3];
  title='오늘의 생존 루틴 · '+label;
  detail='오늘의 물자와 날씨를 확인하고, 필요한 활동을 선택하세요.';
 }
 const pending=Boolean(state?.scavenge?.pending);
 const resolved=safeCount(state?.scavenge?.lastResolvedDay)===day;
 const status=pending?'기존 보급 의뢰 대기':resolved?'오늘 보급 선택 완료':'기존 보급 의뢰 없음';
 return {day,title,detail,status,pending,resolved,ended,
  action:pending?'daily':'emergency',
  actionLabel:pending?'오늘의 보급 의뢰 열기':ended?'생존 보급 활동 확인':'긴급 보급 활동 확인'};
}
export function getExpeditionPreparation(state,siteId,now){
 const site=EXPLORATION_SITES.find(item=>item.id===siteId);
 const availability=mapExpeditionAvailability(state,siteId,now);
 const water=safeCount(state?.supply?.water),parts=safeCount(state?.supply?.parts);
 const odds=Object.fromEntries(['go','scout','salvage'].map(action=>[action,scavengeOdds(action,state?.weather)]));
 return {siteId,siteName:site?.label||'미확인 장소',day:currentExplorationDay(state,now),
  ready:availability.ready,reason:availability.reason,health:safeCount(state?.health),water,parts,
  weather:state?.weather||'clear',expected:site?.reward||'확인 전',
  scoutReady:water>=1,salvageReady:parts<REPAIR_PARTS_RESERVE,
  odds,travelGameMinutes:25,realMinMs:2400};
}
export function getReturnReport(state,returned){
 if(!returned||returned.kind!=='returned')return null;
 const site=EXPLORATION_SITES.find(item=>item.id===returned.siteId);
 const label=site?.label||'탐사 장소';
 const success=Boolean(returned.completed);
 const outcome=returned.outcome||'';
 const withdrawn=outcome==='safe';
 const title=withdrawn?'위험 회피 · 무사 복귀':success?'조사 완료 · '+label:'조사 미완료 · '+label;
 const detail=withdrawn?'보상을 포기하고 안전하게 복귀했습니다. 방문 기록은 추가되지 않습니다.':
  (returned.msg||returned.story||'탐사 결과가 기록되었습니다.');
 const next=success?(returned.nextSite?'다음 장소 · '+returned.nextSite:
  '구역 조사 완료 · 통신탑 또는 마지막 생존 기록을 확인하세요.'):
  withdrawn?'다음 게임일에 다시 출발할 수 있습니다.':'다음 게임일에 같은 장소에 재도전할 수 있습니다.';
 return {title,detail,next,success,withdrawn,outcome,siteId:returned.siteId};
}
