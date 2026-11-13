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
function companionRoll(seed,contact,salt){
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


/** Honest HUD view of the EXISTING passive labor modifier.
 * A healthy helper increases progress of OWNED, functional purifier/garden
 * at 1.3x; no bonus is awarded when the equipment is missing or broken. */
export function companionBuffView(s){
 const c=s?.companion;
 if(!c?.present)return {state:'absent',label:'',description:''};
 const health=Math.round(Number(c.health)||0);
 const dailyCost='매 게임 하루 식량 1개·식수 1개 소비';
 if(!companionWorks(s))return {
  state:'resting',label:'🤝 동료 지침 · 협업 중단',
  description:`동료 건강 ${health}% · 작업 속도 보너스 중단 · ${dailyCost}`
 };
 const purifier=Boolean(s.kit?.purifier&&Number(s.facilities?.tank)>=40);
 const garden=Boolean(s.kit?.seeds);
 if(!purifier&&!garden)return {
  state:'waiting',label:'🤝 동료 대기 · 설비 필요',
  description:`동료 건강 ${health}% · 정수기/씨앗을 확보하거나 탱크를 수리하면 협업 속도 +30% · ${dailyCost}`
 };
 const target=purifier&&garden?'정수·재배':purifier?'정수':'재배';
 const pct=Math.round((COMPANION_BALANCE.foodBonus-1)*100);
 return {
  state:'boosted',label:`🤝 ${target} 속도 +${pct}%`,
  description:`동료 건강 ${health}% · ${target} 작업 진행 속도 +${pct}% (정수 최대 생산량은 기존 상한 유지) · 안전한 날씨에는 폐자재 회수도 도움 · ${dailyCost}`
 };
}

/** Relationship story beats depend only on saved recruitment day, kit and
 * current health. Pure presentation: no new clock, loot, or save fields. */
export function companionStoryBeat(s,day){
 const c=s?.companion;
 if(!c?.present)return null;
 const since=Math.floor(Number(day)||0)-Math.floor(Number(c.arrivedDay)||0);
 if(since===1)return {
  title:'둘이 맞이한 첫 아침',
  line:'새 동료가 모닥불 옆에 두 사람 몫의 그릇을 놓았다. “같이 버티려면 오늘 먹을 몫부터 세야겠네요.”'
 };
 if(since===3)return s.kit?.purifier&&Number(s.facilities?.tank)>=40
  ?{title:'물탱크 아래 두 손',line:'동료가 정수기의 밸브를 살핀다. “물 한 병이 더 빨리 나오면 내일이 달라지겠죠.” 정수 작업에 손이 보태졌다.'}
  :s.kit?.seeds
   ?{title:'작은 화단의 약속',line:'동료는 마른 흙을 고르고 씨앗 옆에 물을 조금 남겨 두었다. “이게 자라면 우리도 좀 나아지겠죠.”'}
   :{title:'아직 비어 있는 작업대',line:'동료가 빈 물통을 닦으며 묻는다. “정수기나 씨앗이 있으면 제가 도울 수 있을 텐데요.”'};
 if(since===7)return c.obtainedParts>0
  ?{title:'녹슨 나사가 남긴 것',line:'동료가 직접 모아 둔 수리 부품을 보여 준다. 버려진 도시에서도 둘이 힘을 합치면 쓸 만한 것이 남는다.'}
  :{title:'낡은 계단실의 발소리',line:'처음에는 낯설던 발소리가 이제 익숙하다. 동료는 지친 몸으로도 옥상에 남아 다음 날을 준비한다.'};
 if(since===14)return c.health<=20
  ?{title:'두 사람의 균열',line:'동료가 작업대 옆에 주저앉았다. “식량과 물이 부족하면 일손도 멈춥니다.” 이제는 서로의 생존을 살펴야 한다.'}
  :{title:'같이 버틴 열네 번째 날',line:'동료가 잠든 도시를 바라보며 말했다. “처음에는 구조를 기다렸는데, 지금은 우리가 이 옥상을 지키고 있네요.”'};
 return null;
}
