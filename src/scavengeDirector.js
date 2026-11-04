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
export const SCAVENGE_CHANCE=Object.freeze({day1:1,early:.78,mid:.66,late:.51});
export const SCAVENGE_OUTCOME=Object.freeze({item:.64,injury:.20,sickness:.11,nothing:.05});
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
   pending:null,radioLastDay:0,radioNewsDay:0,radioNewsId:0,radioNewsType:'',
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
 return d;
}
export function normalizeKit(input,legacy=false){
 const prior=legacy?OLD_SAVE_KIT:STARTING_KIT;
 const p=input&&typeof input==='object'?input:{};
 return Object.fromEntries(ITEM_IDS.map(k=>[k,typeof p[k]==='boolean'?p[k]:prior[k]]));
}
export function offerDailyScavenge(s,day,{force=false}={}){
 const d=s.scavenge;
 if(s.survivalStatus==='dead'||d.pending||day<=d.lastOfferedDay||day<1)return null;
 // Only a *live* player sees a new offer. Missed days aren't auto-looted.
 d.lastOfferedDay=day;
 const probability=day===1?1:day<=5?SCAVENGE_CHANCE.early:
   day<=14?SCAVENGE_CHANCE.mid:SCAVENGE_CHANCE.late;
 if(!force&&roll(d.seed,day*971+12)>=probability)return null;
 const missing=anyOwn(s);
 const target=missing.length?
   missing[Math.min(missing.length-1,Math.floor(roll(d.seed,day*937+89)*missing.length))]:'cache';
 const intro=day===1?'옥상 아래 계단실에서 금속성 소리가 들린다. 무언가를 찾을 수 있을 것 같다.':
  day<=5?'폐허 창고 쪽에서 쓸 만한 흔적이 보인다.':'어둠이 내린 건물 사이에서 보급 흔적이 발견됐다.';
 const title=day===1?'DAY 1 · 첫 번째 선택':`DAY ${day} · 폐허의 흔적`;
 const description=`${intro} 내려가면 부상이나 질병에 걸릴 수 있다. 오늘은 탐색할까, 옥상에 남을까?`;
 d.pending={day,id:`scavenge:${day}:${target}`,title,description,target};
 return d.pending;
}
export function resolveScavengeChoice(s,decision,{day,addLog=()=>{}}={}){
 const d=s.scavenge,p=d.pending;
 if(!p)return {good:false,msg:'선택할 탐색 기회가 없습니다.'};
 if(s.survivalStatus==='dead')return {good:false,msg:'생존이 종료되었습니다.'};
 if(decision!=='go'&&decision!=='stay')return {good:false,msg:'잘못된 선택입니다.'};
 // Commit the decision before mutating inventory: repeat click/reload cannot reroll.
 d.pending=null;d.lastResolvedDay=p.day;
 if(decision==='stay'){
  const msg='탐색 포기: 오늘은 옥상에 남아 몸을 지키기로 했다. 물자와 건강은 그대로다.';
  addLog(msg);return {good:true,choice:'stay',outcome:'safe',msg};
 }
 d.expeditionCount++;
 const r=roll(d.seed,p.day*601+d.expeditionCount*701+19);
 const w=s.weather;
 const danger=['storm','tornado'].includes(w)?.14:['heat','cold'].includes(w)?.07:0;
 const successChance=Math.max(.38,SCAVENGE_OUTCOME.item-danger);
 let outcome='nothing',msg;
 if(r<successChance){
   const target=p.target;
   if(target==='cache'||hasItem(s,target)){
     const spare=roll(d.seed,p.day*411+29);
     if(spare<.35){const gained=Math.min(2,Math.max(0,16-s.supply.water));s.supply.water+=gained;msg=`탐색 성공: 버려진 식수 ${gained}개를 건졌다.`;}
     else if(spare<.68){s.supply.food+=3;msg='탐색 성공: 오래된 비상식량 3개를 찾았다.';}
     else {s.supply.parts+=3;s.supply.medicine+=1;msg='탐색 성공: 수리 부품 3개와 응급 치료제 1개를 찾았다.';}
     outcome='supplies';
   }else{
     s.kit[target]=true;outcome='item';
     const extra=target==='purifier'?' 이제 빗물 정수와 맑은 물 생산이 가능하다.':
       target==='seeds'?' 옥상 화단에서 식량이 자라기 시작한다.':
       target==='tent'?' 이제는 비를 피하고 누워 잘 공간이 생겼다.':
       ' 주파수를 맞추면 다른 생존자의 신호와 구조 보급 기회를 얻는다.';
     msg=`탐색 성공: ${ITEM_INFO[target].label} 획득!${extra}`;
   }
 }else if(r<successChance+.20){
   const injury=7+Math.floor(roll(d.seed,p.day*415+33)*15);
   s.health=Math.max(0,s.health-injury);
   outcome='injury';msg=`탐색 실패: 무너진 계단실 파편에 다쳐 건강 -${injury}. 아무것도 얻지 못했다.`;
 }else if(r<successChance+.32){
   const sickness=17+Math.floor(roll(d.seed,p.day*113+41)*21);
   s.sickness=Math.min(100,s.sickness+sickness);
   s.health=Math.max(0,s.health-4);
   outcome='sickness';msg=`탐색 실패: 오염된 지하 공간에서 병을 얻었다. 질병 +${sickness}, 건강 -4.`;
 }else{
   outcome='empty';msg='탐색 실패: 빈 창고뿐이었다. 아무것도 얻지 못했지만 몸은 무사하다.';
 }
 addLog('탐색 결과: '+msg);
 return {good:true,choice:'go',outcome,msg,item:outcome==='item'?p.target:null};
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
   d.filterMinutes+=efficiency*(weather==='cold'?.32:1)*companionProductionFactor(s);
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
   d.farmMinutes+=sunshine*companionProductionFactor(s);
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
