/* AFTERDAY v108 | Pure gameplay-aware monologue selection.
 * Reads canonical simulation state; never mutates it, rolls game RNG, or
 * performs gameplay actions. Real time controls speech, not accelerated DAY. */
import {speechLinesFor} from './survivorSpeechLinesV108.js';

export const SPEECH_BASE_INTERVAL_MS=30000;
export const SPEECH_EVENT_MIN_GAP_MS=7000;
const asNumber=(n,d=0)=>Number.isFinite(Number(n))?Number(n):d;
const isTrue=value=>value===true;
const add=(items,key,priority,group='ambient')=>{
 if(speechLinesFor(key).length)items.push({key,priority,group});
};
export function speechSituationSignature(state){
 const s=state||{},supply=s.supply||{},facilities=s.facilities||{},kit=s.kit||{};
 const band=(v,t)=>asNumber(v)<t?'L':'H';
 return [
  s.weather||'clear',
  isTrue(s.tornadoEncounterActive)?String(s.tornadoApproach||'distant'):'none',
  ['tent','purifier','seeds','radio'].map(k=>isTrue(kit[k])?'1':'0').join(''),
  band(supply.water,2),band(supply.food,2),
  band(s.water,28),band(s.food,28),band(s.health,35),
  band(facilities.tank,40),band(facilities.shelter,40),
  isTrue(s.companion?.present)?'companion':'alone',
  isTrue(s.companion?.lost)?'lost':'',
  isTrue(s.animalAlert)?'animals':'',
  isTrue(s.raiderAlert)?'raiders':''
 ].join('|');
}
export function speechCandidates(state,life,gameNow=0){
 const s=state||{};
 if(s.survivalStatus==='dead')return [];
 const kit=s.kit||{},f=s.facilities||{},supply=s.supply||{};
 const weather=s.weather||'clear',items=[];
 const own=id=>isTrue(kit[id]);
 const stock=id=>Math.max(0,asNumber(supply[id]));
 const health=asNumber(s.health,100),hydration=asNumber(s.water,100),satiety=asNumber(s.food,100);
 const tank=asNumber(f.tank,100),shelter=asNumber(f.shelter,100),storage=asNumber(f.storage,100);
 const dangerWeather=['tornado','storm','dust','wildfire'].includes(weather);
 const tornado=weather==='tornado'&&isTrue(s.tornadoEncounterActive);
 const imminent=asNumber(s.majorDisasterAt)>gameNow&&
  asNumber(s.majorDisasterAt)-gameNow<=2*3600000;
 if(tornado){
  if(s.tornadoApproach==='direct')add(items,own('tent')?'tornadoDirectTent':'tornadoDirectNoTent',110,'danger');
  else if(s.tornadoApproach==='near')add(items,'tornadoNear',105,'danger');
  else add(items,'tornadoDistant',98,'danger');
 }else if(weather==='tornado'){
  // The weather can persist briefly after the encounter has settled.
  add(items,'tornadoDistant',90,'danger');
 }else if(weather==='storm'){
  add(items,own('tent')?'stormTent':'stormNoTent',94,'danger');
 }
 if(isTrue(s.animalAlert))add(items,'animalAlert',92,'danger');
 if(isTrue(s.raiderAlert))add(items,'raiderAlert',91,'danger');
 if(health<35)add(items,'injured',94,'danger');
 if(hydration<28)add(items,'thirsty',91,'danger');
 if(stock('water')===0)add(items,'noWaterStock',96,'danger');
 else if(stock('water')<=2)add(items,'lowWaterStock',83,'resource');
 if(stock('food')===0)add(items,own('seeds')?'noFoodWithSeeds':'noFoodNoSeeds',90,'danger');
 else if(stock('food')<=2)add(items,'lowFoodStock',76,'resource');
 if(satiety<28)add(items,'hungry',79,'resource');
 if(asNumber(s.sickness)>=35)add(items,'sick',87,'danger');
 if(imminent)add(items,'forecastNear',87,'danger');
 if(weather==='rain'||weather==='storm'){
  if(!own('purifier'))add(items,'rainNoPurifier',90,'equipment');
  else if(tank<40)add(items,'rainBrokenTank',91,'equipment');
  else if(stock('water')>=16)add(items,'rainWaterFull',76,'equipment');
  else add(items,'rainPurifier',83,'equipment');
  if(!own('tent'))add(items,'rainWithoutTent',76,'equipment');
  if(weather==='rain')add(items,'rainGeneral',41);
 }
 if(weather==='heat'){
  add(items,stock('water')<=2?'heatLowWater':'heatWaterReady',stock('water')<=2?95:72,'equipment');
 }
 if(weather==='cold')add(items,own('tent')?'coldTent':'coldNoTent',own('tent')?75:89,'equipment');
 if(weather==='dust')add(items,own('tent')?'dustTent':'dustNoTent',own('tent')?81:91,'equipment');
 if(weather==='wildfire')add(items,stock('water')<=2?'wildfireLowWater':'wildfireGeneral',95,'danger');
 if(weather==='clear')add(items,own('seeds')?'clearWithSeeds':'clearWithoutSeeds',50,'equipment');
 if(weather==='cloud')add(items,'cloudy',42);
 if(shelter<40)add(items,'weakShelter',82,'equipment');
 if(tank<40)add(items,'weakTank',82,'equipment');
 if(storage<40)add(items,'weakStorage',79,'equipment');
 if(stock('parts')<=1)add(items,'lowParts',39,'resource');
 if(stock('medicine')>0&&health<70)add(items,'medication',51,'resource');
 if(s.companion?.pending)add(items,'companionPending',87,'danger');
 else if(s.companion?.present)add(items,'companionPresent',37,'memory');
 else if(s.companion?.lost)add(items,'companionLost',38,'memory');
 if(own('radio')){
  if(s.scavenge?.radioNewsType==='silence'&&asNumber(s.scavenge?.radioNewsDay)>0)
   add(items,'radioSilent',55,'equipment');
  else if(['drop','contact'].includes(s.scavenge?.radioNewsType))add(items,'radioWithSignal',49,'equipment');
 }else add(items,'radioMissing',27,'equipment');
 if(!own('tent'))add(items,'tentMissing',27,'equipment');
 if(!own('purifier'))add(items,'purifierMissing',27,'equipment');
 if(!own('seeds'))add(items,'seedsMissing',22,'equipment');
 if(asNumber(s.tornadoDamageCount)>0&&!dangerWeather)add(items,'survivedTornado',24,'memory');
 const stage=life?.stage||'idle',action=life?.current||'idle';
 if(stage==='perform'&&!dangerWeather){
  const map={
   eat:'actionsEat',drink:'actionsDrink',repair:'actionsRepair',
   radio:'actionsRadio',cook:'actionsCook',guitar:'actionsGuitar',
   watch:'actionsWatch',stretch:'actionsStretch',shelter:'actionsShelter',
   medicine:'actionsMedicine',explore:'actionsExplore',sit:'actionsSit',
   rest:'actionsRest',install_tent:'actionsTent'
  };
  const key=map[action];
  if(key&&!(action==='radio'&&!own('radio'))&&
    !(action==='eat'&&stock('food')===0)&&
    !(action==='drink'&&stock('water')===0)){
   add(items,key,64,'action');
  }
 }
 // The daily routine clock is real-world Seoul time, not a fake preview.
 const time=asNumber(gameNow);
 const hour=((Math.floor((time+9*3600000)/3600000)%24)+24)%24;
 if(hour>=5&&hour<10)add(items,'calmMorning',18);
 else if(hour>=17&&hour<21)add(items,'calmEvening',18);
 else if(hour>=21||hour<5)add(items,'calmNight',18);
 else add(items,'calmDay',15);
 const day=asNumber(s.startedAt)>0?Math.floor(Math.max(0,time-asNumber(s.startedAt))/86400000)+1:1;
 if(day>=30)add(items,'lastingSurvivor',23,'memory');
 // Never pretend to talk while sleeping or on the way to a destination.
 if(action==='sleep'&&['enter','perform','exit'].includes(stage))return [];
 return items.sort((a,b)=>b.priority-a.priority);
}
function chooseLine(candidates,recentTopics,recentTexts,sequence,realNow){
 const fresh=candidates.filter(c=>!recentTopics.includes(c.key));
 const choices=fresh.length?fresh:candidates;
 for(const candidate of choices){
  const lines=speechLinesFor(candidate.key);
  const usable=lines.filter(line=>!recentTexts.includes(line));
  if(!usable.length&&fresh.length)continue;
  const pool=usable.length?usable:lines;
  const index=Math.abs((sequence*17+Math.floor(realNow/19000)+candidate.key.length*7))%pool.length;
  return {...candidate,text:pool[index]};
 }
 return null;
}
export class SurvivorSpeechDirectorV108{
 constructor({storage=null}={}){
  this.storage=storage;this.lastSpeakAt=0;this.nextAt=0;
  this.firstVisibleAt=null;this.lastSignature=null;this.pendingSignature=null;
  this.recentTopics=[];this.recentTexts=[];this.sequence=0;
  try{
   const saved=JSON.parse(storage?.getItem('AFTERDAY_SPEECH_RECENT_V108')||'null');
   if(Array.isArray(saved?.topics))this.recentTopics=saved.topics.filter(x=>typeof x==='string').slice(-5);
   if(Array.isArray(saved?.texts))this.recentTexts=saved.texts.filter(x=>typeof x==='string').slice(-7);
  }catch{}
 }
 tick({state,life,gameNow=0,realNow=Date.now(),enabled=true,visible=true}={}){
  if(!enabled||!visible||state?.survivalStatus==='dead')return null;
  if(this.firstVisibleAt===null){this.firstVisibleAt=realNow;this.lastSignature=speechSituationSignature(state);return null;}
  // Show a first thought while the user is still looking at the character.
  if(realNow-this.firstVisibleAt<3500)return null;
  const signature=speechSituationSignature(state);
  const changed=signature!==this.lastSignature;
  this.lastSignature=signature;
  // Preserve an urgent state transition even if it arrives during the
  // minimum speech gap. Without this pending flag the next tick forgot it.
  if(changed)this.pendingSignature=signature;
  const pending=this.pendingSignature===signature;
  if(realNow<this.nextAt&&(!pending||
     (this.lastSpeakAt>0&&realNow-this.lastSpeakAt<SPEECH_EVENT_MIN_GAP_MS)))return null;
  const candidates=speechCandidates(state,life,gameNow);
  if(!candidates.length)return null;
  const choice=chooseLine(candidates,this.recentTopics,this.recentTexts,this.sequence++,realNow);
  if(!choice)return null;
  this.pendingSignature=null;
  this.lastSpeakAt=realNow;
  const interval=choice.group==='danger'?18000:choice.group==='action'?26500:SPEECH_BASE_INTERVAL_MS;
  this.nextAt=realNow+interval+(this.sequence%4)*5500;
  this.recentTopics.push(choice.key);this.recentTopics=this.recentTopics.slice(-5);
  this.recentTexts.push(choice.text);this.recentTexts=this.recentTexts.slice(-7);
  try{this.storage?.setItem('AFTERDAY_SPEECH_RECENT_V108',JSON.stringify({topics:this.recentTopics,texts:this.recentTexts}));}catch{}
  return choice;
 }
}