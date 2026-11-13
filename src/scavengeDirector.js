import {companionProductionFactor,offerCompanionRescue} from './supportCompanion.js';
/** AFTERDAY · one playable survivor, one rooftop, risk-and-choice expeditions.
 * Day is a GAME DAY (4 real hours at 1x); all rolls use immutable starter seed,
 * not render frames or mutable weather RNG. No backend or monetized loot.
 */
export const ITEM_IDS=Object.freeze(['tent','purifier','seeds','radio']);
export const ITEM_INFO=Object.freeze({
 tent:{icon:'⛺',label:'야전 텐트',description:'차가운 시멘트 바닥의 밤을 끝낸다. 휴식 회복량 증가·야간 질병 위험 감소'},
 purifier:{icon:'🚰',label:'물탱크 정수기',description:'비를 마실 수 있는 식수로 바꾸고 하루에 소량의 물을 정수한다'},
 seeds:{icon:'🌱',label:'먹을 수 있는 씨앗',description:'옥상 화단에서 채소가 자라며 며칠 간격으로 식량이 수확된다'},
 radio:{icon:'📻',label:'단파 무전기',description:'다른 생존자의 신호를 듣고 구조 헬기에 보급품을 요청한다'}
});
export const SCAVENGE_CHANCE=Object.freeze({day1:1,early:.72,mid:.60,late:.49});
export const SCAVENGE_OUTCOME=Object.freeze({item:.48,injury:.29,sickness:.15,nothing:.08});
export const QUEST_DECISIONS=Object.freeze(['go','scout','salvage','stay']);
export const SCAVENGE_PROFILES=Object.freeze({"go":{"item":0.48,"supplies":0,"injury":0.29,"sickness":0.15,"empty":0.08},"scout":{"item":0.27,"supplies":0.3,"injury":0.13,"sickness":0.1,"empty":0.2},"salvage":{"item":0,"supplies":0.65,"injury":0.17,"sickness":0.08,"empty":0.1}});
export function scavengeOdds(decision,weather='clear'){
 const p=SCAVENGE_PROFILES[decision];
 if(!p)return null;
 const penalty=['storm','tornado','wildfire'].includes(weather)?.12:
  ['heat','cold','dust','rain'].includes(weather)?.06:0;
 return {item:p.item?Math.max(0,p.item-penalty):0,
  supplies:p.supplies?Math.max(0,p.supplies-(p.item?0:penalty)):0,
  injury:p.injury+penalty*.55,sickness:p.sickness+penalty*.45,empty:p.empty};
}
export const STARTING_KIT=Object.freeze({
  tent:false,purifier:false,seeds:false,radio:false
});
export const OLD_SAVE_KIT=Object.freeze({
  tent:true,purifier:true,seeds:true,radio:true
});
const asInt=v=>Number.isFinite(Number(v))?Math.floor(Number(v)):0;
export const hash32=(n)=>{
 let a=(Number(n)||1)>>>0;
 a=Math.imul(a^(a>>>16),0x7feb352d);
 a=Math.imul(a^(a>>>15),0x846ca68b);
 return (a^(a>>>16))>>>0;
};
const roll=(seed,salt)=>hash32((seed>>>0)+(salt>>>0))/4294967296;
const anyOwn=s=>ITEM_IDS.filter(id=>!s.kit[id]);
export const hasItem=(s,id)=>Boolean(s?.kit?.[id]);
export function makeScavengeDirector(startedAt=Date.now()){
 return {
   version:1,seed:hash32(Math.floor(startedAt/1000)+94882),
   lastOfferedDay:0,lastResolvedDay:0,expeditionCount:0,
   pending:null,recoveryTarget:null,radioLastDay:0,radioNewsDay:0,radioNewsId:0,radioNewsType:'',
   farmMinutes:0,lastHarvestDay:0,
   purifierDay:0,purifierProduced:0,filterMinutes:0,
   lastRoutineDay:0
 };
}
export function sanitizeScavengeDirector(input,startAt=Date.now()){
 const b=makeScavengeDirector(startAt),v=input&&typeof input==='object'?input:{};
 const d={...b,...v};
 d.seed=(asInt(d.seed)>>>0)||b.seed;
 for(const key of ['lastOfferedDay','lastResolvedDay','expeditionCount','radioLastDay','radioNewsDay','radioNewsId','lastHarvestDay','purifierDay','purifierProduced','lastRoutineDay'])
   d[key]=Math.max(0,Math.min(1000000,asInt(d[key])));
 for(const key of ['farmMinutes','filterMinutes'])
   d[key]=Math.max(0,Math.min(8000,Number(d[key])||0));
 d.pending=v.pending&&typeof v.pending==='object'&&
   Number.isInteger(v.pending.day)&&v.pending.day>=1&&v.pending.day<1000000&&
   typeof v.pending.id==='string'&&v.pending.id.length<80?
     {day:v.pending.day,id:v.pending.id,title:String(v.pending.title||'폐허 탐색').slice(0,140),
      description:String(v.pending.description||'계단실 밖에는 무엇이 남았을까?').slice(0,300),
      target:ITEM_IDS.includes(v.pending.target)?v.pending.target:'cache'}:null;
 d.radioNewsType=['drop','contact','silence'].includes(v.radioNewsType)?v.radioNewsType:'';
 d.recoveryTarget=ITEM_IDS.includes(v.recoveryTarget)?v.recoveryTarget:null;
 return d;
}
export function normalizeKit(input,legacy=false){
 const prior=legacy?OLD_SAVE_KIT:STARTING_KIT;
 const p=input&&typeof input==='object'?input:{};
 return Object.fromEntries(ITEM_IDS.map(k=>[k,typeof p[k]==='boolean'?p[k]:prior[k]]));
}
/** Replace or queue an actual expedition target when a disaster destroys gear.
 * No free item grant; successful exploration still runs through existing odds. */
export function offerRecoveryScavenge(s,day,item){
 const d=s.scavenge;
 if(s.survivalStatus==='dead'||!ITEM_IDS.includes(item)||s.kit[item])return null;
 // Preserve the objective across a failed/declined expedition. No free reroll.
 d.recoveryTarget=item;
 // Preserve a previously offered mission when it already targets missing gear.
 if(d.pending){
   if(d.pending.target!=='cache'&&!s.kit[d.pending.target])return d.pending;
 }else{
   d.lastOfferedDay=Math.max(d.lastOfferedDay,day);
 }
 const title=`재난 피해 복구 · ${ITEM_INFO[item].label}`;
 const description=`${ITEM_INFO[item].label}이(가) 파손됐다. 폐허 탐색에서 다시 회수할 수 있다. 성공 여부와 부상 위험은 기존 탐색 규칙을 따른다.`;
 d.pending={day,id:`scavenge:recovery:${day}:${item}:${d.expeditionCount}`,title,description,target:item};
 return d.pending;
}
export function offerDailyScavenge(s,day,{force=false}={}){
 const d=s.scavenge;
 if(s.survivalStatus==='dead'||d.pending||day<=d.lastOfferedDay||day<1)return null;
 // Only a *live* player sees a new offer. Missed days aren't auto-looted.
 d.lastOfferedDay=day;
 // Lost gear gets another chance on subsequent game days, but loot odds,
 // injury risk and the one-offer-per-day rule are unchanged.
 const recovery=ITEM_IDS.includes(d.recoveryTarget)&&!s.kit[d.recoveryTarget]
   ?d.recoveryTarget:null;
 if(!recovery)d.recoveryTarget=null;
 const probability=day===1?1:day<=5?SCAVENGE_CHANCE.early:
   day<=14?SCAVENGE_CHANCE.mid:SCAVENGE_CHANCE.late;
 if(!recovery&&!force&&roll(d.seed,day*971+12)>=probability)return null;
 const missing=anyOwn(s);
 const target=recovery||(missing.length?
   missing[Math.min(missing.length-1,Math.floor(roll(d.seed,day*937+89)*missing.length))]:'cache');
 const {title,description}=questNarrative(target,day,s.weather);
 d.pending={day,id:`scavenge:${day}:${target}`,title,description,target};
 return d.pending;
}
export function questNarrative(target,day,weather){
 const scenes={
  tent:['찢어진 방수포가 남겨진 대피소','철제 침대 틀과 방수포 흔적이 보인다. 추락 위험을 감수하고 회수할 것인가?'],
  purifier:['무너진 급수실의 정수 장치','급수실 아래서 정수 장치의 부품이 보인다. 어두운 배관에 접근해야 한다.'],
  seeds:['폐허 온실의 종자 상자','부서진 옥상 온실에 씨앗이 남아 있다. 깨진 유리와 오염에 주의하라.'],
  radio:['정전된 통신실의 신호','무전기 부품이 발견됐다. 무너진 전기실에서 신호가 끊기기 전에 회수해야 한다.'],
  cache:['계단실 보급 상자의 흔적','누군가 남긴 보급품 상자다. 안에는 식수나 부품이 있을 수도 있다.']
 };
 const story=scenes[target]||scenes.cache;
 const weatherText=['storm','tornado','wildfire'].includes(weather)?'밖은 매우 위험하다.':
  ['heat','cold','dust','rain'].includes(weather)?'날씨 때문에 이동 위험이 높다.':'옥상 밖의 안전은 보장되지 않는다.';
 return {title:day===1?'DAY 1 · 생존 첫날의 선택':`DAY ${day} · ${story[0]}`,
  description:`${story[1]} ${weatherText} 네 가지 행동 중 하나를 결정하라.`};
}
export function resolveScavengeChoice(s,decision,{day,addLog=()=>{}}={}){
 const d=s.scavenge,p=d.pending;
 if(!p)return {good:false,msg:'선택할 탐색 기회가 없습니다.'};
 if(s.survivalStatus==='dead')return {good:false,msg:'생존이 종료되었습니다.'};
 if(!QUEST_DECISIONS.includes(decision))return {good:false,msg:'잘못된 선택입니다.'};
 if(decision==='scout'&&s.supply.water<1)
  return {good:false,msg:'안전 정찰에는 식수 1개가 필요합니다. 다른 행동을 선택할 수 있습니다.'};
 // Commit before the deterministic roll; no duplicate resource award on reload.
 d.pending=null;d.lastResolvedDay=p.day;
 if(decision==='stay'){
  const msg='옥상 방어를 선택했다. 부상과 감염을 피했지만 오늘 발견한 보급 기회는 사라졌다.';
  addLog(msg);return {good:true,choice:'stay',outcome:'safe',msg};
 }
 d.expeditionCount++;
 if(decision==='scout')s.supply.water--;
 const r=roll(d.seed,p.day*601+d.expeditionCount*701+(decision==='go'?19:decision==='scout'?37:53));
 const odds=scavengeOdds(decision,s.weather);
 let outcome='empty',msg;
 const lootRoll=roll(d.seed,p.day*411+d.expeditionCount*107+29);
 const acquireSupplies=()=>{
  if(decision==='salvage'){
   const gained=1+Math.floor(lootRoll*3);s.supply.parts=Math.min(999,s.supply.parts+gained);
   return `폐자재 회수 성공: 부품 +${gained}.`;
  }
  if(lootRoll<.34){
   const gained=Math.min(decision==='scout'?1:2,Math.max(0,16-s.supply.water));
   s.supply.water+=gained;return `보급품 발견: 깨끗한 식수 +${gained}.`;
  }
  if(lootRoll<.70){
   const gained=decision==='scout'?1:3;s.supply.food=Math.min(999,s.supply.food+gained);
   return `보급품 발견: 식량 +${gained}.`;
  }
  const gained=decision==='scout'?1:2;
  s.supply.parts=Math.min(999,s.supply.parts+gained);
  return `보급품 발견: 수리 부품 +${gained}.`;
 };
 if(r<odds.item){
  if(p.target==='cache'||hasItem(s,p.target)){
   outcome='supplies';msg=acquireSupplies();
  }else{
   s.kit[p.target]=true;outcome='item';
   if(d.recoveryTarget===p.target)d.recoveryTarget=null;
   msg=`장비 획득: ${ITEM_INFO[p.target].label}. 재난에 잃지 않도록 시설을 관리해야 한다.`;
  }
 }else if(r<odds.item+odds.supplies){
  outcome='supplies';msg=acquireSupplies();
 }else if(r<odds.item+odds.supplies+odds.injury){
  const unit=roll(d.seed,p.day*415+d.expeditionCount*31+33);
  const injury=(decision==='go'?10:decision==='scout'?4:6)+Math.floor(unit*(decision==='go'?17:decision==='scout'?9:11));
  s.health=Math.max(0,s.health-injury);
  outcome='injury';msg=`탐색 중 붕괴 잔해에 다쳤다. 건강 -${injury}, 획득 물자 없음.`;
 }else if(r<odds.item+odds.supplies+odds.injury+odds.sickness){
  const unit=roll(d.seed,p.day*113+d.expeditionCount*41+41);
  const sickness=(decision==='go'?17:decision==='scout'?7:11)+Math.floor(unit*(decision==='go'?22:12));
  s.sickness=Math.min(100,s.sickness+sickness);
  s.health=Math.max(0,s.health-(decision==='go'?4:2));
  outcome='sickness';msg=`오염된 폐허에서 감염됐다. 질병 +${sickness}, 건강 감소. 획득 물자 없음.`;
 }else{
  outcome='empty';msg='수색했지만 쓸 만한 물자를 얻지 못했다. 시간을 허비한 채 복귀했다.';
 }
 addLog('탐색 결과: '+msg);
 return {good:true,choice:decision,outcome,msg,item:outcome==='item'?p.target:null};
}
export function applyAcquiredItemMinute(s,day,weather,{addLog=()=>{}}={}){
 const d=s.scavenge,kit=s.kit;
 if(d.purifierDay!==day){d.purifierDay=day;d.purifierProduced=0;}
 let food=0,water=0;
 // The purifier supplements (not replaces) rain harvesting. A broken tank
 // or no filter yields zero. Max two bottles per GAME DAY, no resource minting
 // on a mere page reload.
 if(kit.purifier&&s.facilities.tank>=40&&d.purifierProduced<2&&s.supply.water<16){
   const efficiency=s.facilities.tank>=70?1:.55;
   d.filterMinutes+=efficiency*(weather==='cold'?.32:1)*companionProductionFactor(s,day);
   if(d.filterMinutes>=240){
     const n=Math.min(Math.floor(d.filterMinutes/240),2-d.purifierProduced,16-s.supply.water);
     if(n>0){s.supply.water+=n;d.purifierProduced+=n;water=n;
       addLog(`정수기 가동: 깨끗한 식수 +${n} (오늘 ${d.purifierProduced}/2).`);}
     d.filterMinutes%=240;
   }
 }
 if(!kit.purifier)d.filterMinutes=0;
 // Surviving a day and protecting the garden pays off over time.
 if(kit.seeds&&s.facilities.storage>=20&&s.supply.food<16){
   const sunshine=weather==='heat'?.24:weather==='cold'?.25:weather==='tornado'?.10:
     weather==='rain'?.95:weather==='storm'?.45:1;
   d.farmMinutes+=sunshine*companionProductionFactor(s,day);
   if(d.farmMinutes>=1860){
     const n=Math.min(2,16-s.supply.food);
     if(n>0){s.supply.food+=n;food=n;d.lastHarvestDay=day;
       addLog(`옥상 텃밭 수확: 재배한 식량 +${n}. 다음 수확까지 관리가 필요하다.`);}
     d.farmMinutes%=1860;
   }
 }
 return {food,water};
}
export function requestRadioContact(s,day,{addLog=()=>{}}={}){
 const d=s.scavenge;
 if(!s.kit.radio)return {good:false,msg:'단파 무전기가 없다. 폐허 탐색으로 먼저 찾아야 한다.'};
 if(s.survivalStatus==='dead')return {good:false,msg:'생존이 종료됐다.'};
 if(d.radioLastDay===day)return {good:false,msg:'오늘 교신은 이미 시도했다. 다음 GAME DAY에 다시 호출할 수 있다.'};
 d.radioLastDay=day;d.radioNewsDay=day;d.radioNewsId++; // one interaction per day, no reroll
 const v=roll(d.seed,day*8803+129);
 let msg,kind='silence';
 if(v<.24){
   kind='drop';
   const reward=roll(d.seed,day*1531+77);
   if(reward<.35){s.supply.food+=4;msg='구조 헬기가 옥상 근처에 식량 4개를 투하했다.';}
   else if(reward<.68){const n=Math.min(4,Math.max(0,16-s.supply.water));s.supply.water+=n;msg=`구조 헬기가 정수 식수 ${n}개를 투하했다.`;}
   else if(reward<.90){s.supply.medicine+=2;msg='구조 헬기에서 응급 치료제 2개를 떨어뜨렸다.';}
   else{s.supply.parts+=4;msg='구조 헬기가 수리용 부품 4개를 투하했다.';}
 }else if(v<.56){
   kind='contact';
   const pending=offerCompanionRescue(s,day);
   msg=pending?'무전 교신: 다친 생존자가 계단실로 접근하고 있다. 식량과 식수를 함께 쓰는 대신 정수와 재배를 도울 수 있다. 받아들일지 선택하라.':
     s.companion?.present?'무전 교신: 외부 생존자와 소식을 나눴다. 지원 생존자는 여전히 옥상에서 함께 일한다.':
     '무전 교신: 다른 생존자의 신호를 받았다. 더 이상의 동행은 어렵지만 생존자의 존재를 확인했다.';
 }else msg='무전 교신: 잡음뿐이다. 헬기의 위치를 확인하지 못했다.';
 d.radioNewsType=kind;
 addLog('무전 교신 결과: '+msg);
 return {good:true,kind,msg};
}
