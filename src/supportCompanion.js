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
export function resolveCompanionRescue(s,decision,{addLog=()=>{},day=1}={}){
 const c=s.companion;
 if(!c?.pending)return {good:false,msg:'수락할 구조 요청이 없습니다.'};
 if(s.survivalStatus==='dead')return {good:false,msg:'생존이 종료됐습니다.'};
 if(decision!=='invite'&&decision!=='decline')return {good:false,msg:'잘못된 구조 선택입니다.'};
 // Never create a second hungry survivor out of nothing. Refusal is always
 // allowed; accepting needs at least one real meal and clean water in stock.
 // A failed attempt does not consume the saved offer or reroll the radio.
 if(decision==='invite'&&(s.supply.food<1||s.supply.water<1))
   return {good:false,msg:'동료를 맞이하려면 식량 1개와 식수 1개를 확보해야 합니다. 합류 요청은 유지됩니다.'};
 c.pending=null;
 if(decision==='decline'){
  const msg='구조 요청을 거절했다. 식량과 식수를 보호했지만 다른 생존자는 도시 저편으로 사라졌다.';
  addLog(msg);return {good:true,outcome:'declined',msg};
 }
 c.present=true;c.lost=false;c.health=78;c.arrivedDay=day;
 c.foodMinutes=0;c.waterMinutes=0;c.salvageMinutes=0;
 const msg='지원 생존자를 옥상으로 받아들였다. 매 게임 하루 식량·식수 각 1개를 나누는 대신 정수·텃밭 효율이 30% 향상된다. 이 사람은 조작하는 주인공이 아니다.';
 addLog(msg);
 return {good:true,outcome:'joined',msg};
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
