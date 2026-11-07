/** AFTERDAY: choice-based non-playable rooftop companion, not a new hero.
 * One saved radio contact can create ONE rescue choice. Every effect is
 * calculated on the authoritative game-minute loop, never per render frame.
 */
export const COMPANION_BALANCE=Object.freeze({
  foodMinutes:1440,waterMinutes:1440,foodBonus:1.3,waterBonus:1.3,
  salvageMinutes:2880,salvageCap:14,shelterlessHealthLoss:.006
});
const bound=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
export const newCompanion=()=>({
  present:false,pending:null,health:78,
  arrivedDay:0,foodMinutes:0,waterMinutes:0,salvageMinutes:0,
  lastContactId:0,lost:false,departedDay:0,
  obtainedParts:0,lastNarrativeDay:0
});
export function sanitizeCompanion(raw){
 const b=newCompanion(),v=raw&&typeof raw==='object'?raw:{},a={...b,...v};
 a.present=Boolean(v.present);a.lost=Boolean(v.lost);
 for(const name of ['arrivedDay','lastContactId','departedDay','obtainedParts','lastNarrativeDay']){
  a[name]=Math.floor(bound(v[name],0,100000));
 }
 for(const name of ['foodMinutes','waterMinutes','salvageMinutes'])a[name]=bound(v[name],0,COMPANION_BALANCE.salvageMinutes);
 a.health=bound(v.health??b.health,0,100);
 a.pending=v.pending&&!a.present&&!a.lost&&
   Number.isInteger(v.pending.radioNewsId)&&v.pending.radioNewsId>0&&
   Number.isInteger(v.pending.day)&&v.pending.day>=1?
   {radioNewsId:v.pending.radioNewsId,day:v.pending.day,
    id:`companion:${v.pending.radioNewsId}`}:null;
 if(a.lost)a.present=false;
 return a;
}
export function offerCompanionRescue(s,day){
 const c=s.companion;
 if(!c||c.present||c.lost||c.pending||!s.kit?.radio||s.survivalStatus==='dead')return null;
 const id=Math.max(0,Math.floor(s.scavenge?.radioNewsId||0));
 if(!id||id<=c.lastContactId)return null;
 c.lastContactId=id;
 c.pending={radioNewsId:id,day,id:`companion:${id}`};
 return c.pending;
}
export const COMPANION_DECISIONS=Object.freeze(['invite','aid','trade','decline']);
export const COMPANION_EXCHANGE_ODDS=Object.freeze({aidParts:.45,tradeParts:.55,tradeMedicine:.20,tradeNothing:.25});
const function companionRoll(seed,contact,salt){
 let a=((Number(seed)||1)>>>0)^Math.imul((contact+salt)>>>0,0x9e3779b1);
 a=Math.imul(a^(a>>>16),0x7feb352d);
 a=Math.imul(a^(a>>>15),0x846ca68b);
 return ((a^(a>>>16))>>>0)/4294967296;
}
export function resolveCompanionRescue(s,decision,{addLog=()=>{},day=1}={}){
 const c=s.companion,p=c?.pending;
 if(!p)return {good:false,msg:'수락할 구조 요청이 없습니다.'};
 if(s.survivalStatus==='dead')return {good:false,msg:'생존이 종료됐습니다.'};
 if(!COMPANION_DECISIONS.includes(decision))return {good:false,msg:'잘못된 구조 선택입니다.'};
 if(decision==='invite'&&(s.supply.food<1||s.supply.water<1))
  return {good:false,msg:'동료를 맞이하려면 식량 1개와 식수 1개를 확보해야 합니다. 합류 요청은 유지됩니다.'};
 if(decision==='aid'&&s.supply.water<1)
  return {good:false,msg:'식수 지원에는 식수 1개가 필요합니다. 구조 요청은 유지됩니다.'};
 if(decision==='trade'&&s.supply.food<1)
  return {good:false,msg:'물자 교환에는 식량 1개가 필요합니다. 구조 요청은 유지됩니다.'};
 c.pending=null;
 if(decision==='decline'){
  const msg='구조 요청을 거절했다. 식량과 식수를 보호했지만 다른 생존자는 도시 저편으로 사라졌다.';
  addLog(msg);return {good:true,outcome:'declined',msg};
 }
 if(decision==='aid'){
  s.supply.water--;
  const parts=companionRoll(s.scavenge?.seed,p.radioNewsId,41)<COMPANION_EXCHANGE_ODDS.aidParts;
  if(parts)s.supply.parts=Math.min(999,s.supply.parts+1);
  const msg=parts?'식수를 나눠준 생존자가 안전한 폐자재 위치를 알려줬다. 식수 -1, 부품 +1.':
   '생존자에게 식수 1개를 건넸다. 그는 밤길로 떠났다. 물자 보상은 없었다.';
  addLog(msg);return {good:true,outcome:parts?'aided_parts':'aided',msg};
 }
 if(decision==='trade'){
  s.supply.food--;
  const r=companionRoll(s.scavenge?.seed,p.radioNewsId,73);
  let outcome='traded_empty',msg='식량 1개를 건넸지만 거래할 만한 물건이 없었다.';
  if(r<COMPANION_EXCHANGE_ODDS.tradeParts){
   s.supply.parts=Math.min(999,s.supply.parts+2);
   outcome='traded_parts';msg='식량 1개로 수리 부품 2개를 교환했다.';
  }else if(r<COMPANION_EXCHANGE_ODDS.tradeParts+COMPANION_EXCHANGE_ODDS.tradeMedicine){
   s.supply.medicine=Math.min(999,s.supply.medicine+1);
   outcome='traded_medicine';msg='식량 1개로 응급 치료제 1개를 교환했다.';
  }
  addLog(msg);return {good:true,outcome,msg};
 }
 c.present=true;c.lost=false;c.health=78;c.arrivedDay=day;
 c.foodMinutes=0;c.waterMinutes=0;c.salvageMinutes=0;
 const msg='지원 생존자를 옥상으로 받아들였다. 매 게임 하루 식량·식수 각 1개를 나누는 대신 정수·텃밭 효율이 30% 향상된다. 이 사람은 조작하는 주인공이 아니다.';
 addLog(msg);return {good:true,outcome:'joined',msg};
}
export const companionWorks=s=>Boolean(s?.companion?.present&&s.companion.health>20);
export function companionProductionFactor(s){
 return companionWorks(s)?COMPANION_BALANCE.foodBonus:1;
}
export function applyCompanionMinute(s,day,weather,{addLog=()=>{}}={}){
 const c=s.companion;if(!c?.present)return {foodUsed:0,waterUsed:0,partsFound:0,departed:false};
 let foodUsed=0,waterUsed=0,partsFound=0;
 c.foodMinutes++;c.waterMinutes++;
 const basic=COMPANION_BALANCE;
 if(c.foodMinutes>=basic.foodMinutes){
  c.foodMinutes-=basic.foodMinutes;
  if(s.supply.food>0){s.supply.food--;foodUsed=1;}
  else c.health=Math.max(0,c.health-9);
 }
 if(c.waterMinutes>=basic.waterMinutes){
  c.waterMinutes-=basic.waterMinutes;
  if(s.supply.water>0){s.supply.water--;waterUsed=1;}
  else c.health=Math.max(0,c.health-12);
 }
 if(!s.kit?.tent&&['rain','storm','cold'].includes(weather))
  c.health=Math.max(0,c.health-basic.shelterlessHealthLoss);
 if(c.health<=0){
  c.present=false;c.lost=true;c.departedDay=day;
  const msg='지원 생존자가 물자와 체력을 버티지 못해 캠프를 떠났다. 남은 생존자는 다시 혼자다.';
  addLog(msg);
  return {foodUsed,waterUsed,partsFound,departed:true};
 }
 // Work is slow: one salvaged repair component about every two game days,
 // only during safe weather and while the rooftop keeps a viable food reserve.
 if(companionWorks(s)&&['clear','cloud'].includes(weather)&&s.supply.parts<basic.salvageCap){
  c.salvageMinutes++;
  if(c.salvageMinutes>=basic.salvageMinutes){
   c.salvageMinutes=0;s.supply.parts++;c.obtainedParts++;partsFound=1;
   addLog('지원 생존자가 옥상 폐자재를 분류해 수리 부품 +1을 확보했다.');
  }
 }
 if((foodUsed||waterUsed)&&c.lastNarrativeDay!==day){
  c.lastNarrativeDay=day;
  addLog(`지원 생존자와 물자를 나눴다. 식량 -${foodUsed}, 식수 -${waterUsed}. 정수·재배 작업에 도움을 받는다.`);
 }
 return {foodUsed,waterUsed,partsFound,departed:false};
}
