import { AfterWorld } from './world.js';
import { AfterdayEventBoard } from './eventBoard.js';
import {installPremiumHudV1000} from './premiumHudV1000.js';
import {GameClock,GAME_DAY_REAL_MS} from './gameClock.js';
import {survivalChapter} from './survivalBalance.js';
import {WEATHER_WATER_CAPACITY,describeWeatherEconomy} from './weatherEconomy.js';
import {ITEM_IDS,ITEM_INFO,offerDailyScavenge} from './scavengeDirector.js';
import {moonPhaseAt,SYNODIC_MONTH} from './lunar.js';
import {SAVE_KEY,defaults,sanitize,advance,applyAction,addEvent,recordTornadoDamage,resolveTornadoRoofImpact,getDay,migrateLegacyGameDay,wallClock,WEATHER,WEATHER_KO} from './simulation.js';
import {persistFreshRestart} from './restartSession.js';

const $=s=>document.querySelector(s),now=Date.now();
let saved=null;try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch{}
// One in-game day passes every ten minutes of active play; background time pauses.
const gameClock=new GameClock(now,saved?.gameClockOffsetMs,
  Number(saved?.clockSchema)>=2?saved?.gameClockSavedRealAtMs:null);
const state=sanitize(saved,gameClock.virtualNow);
migrateLegacyGameDay(state,gameClock.virtualNow); // Preserve DAY and permanent ruins from old saves.
advance(state,gameClock.virtualNow,true);
const disasterForecast=installPremiumHudV1000($('#disaster-forecast'));
let restartInProgress=false;
const save=()=>{
 if(restartInProgress)return true;
 try{
  const real=Date.now();
  gameClock.tick(real,document.visibilityState==='visible'&&!eventBoard?.requiresChoice());
  state.gameClockOffsetMs=gameClock.offset(real);
  state.gameClockSavedRealAtMs=real;
  state.clockSchema=3;
  localStorage.setItem(SAVE_KEY,JSON.stringify(state));
  return true;
 }catch{return false}
};
let world;
let eventBoard=null;
let autoLifeCamera=true;
// One brief chapter caption per in-game day. Regular HUD refreshes must not
// restart its timeout or leave a permanent black backdrop over the 3D world.
const CHAPTER_CAPTION_MS=6500;
let displayedChapterDay=null;
let chapterCaptionTimer=null;
function syncChapterCaption(day,dead){
 const node=$('#survival-chapter');
 if(!node)return;
 if(dead){
  node.classList.remove('is-visible');
  node.classList.add('is-hidden');
  if(chapterCaptionTimer!==null){clearTimeout(chapterCaptionTimer);chapterCaptionTimer=null;}
  return;
 }
 if(displayedChapterDay===day)return;
 displayedChapterDay=day;
 const chapter=survivalChapter(day);
 node.textContent=chapter.title+' · '+chapter.line;
 node.classList.remove('is-hidden');
 node.classList.add('is-visible');
 if(chapterCaptionTimer!==null)clearTimeout(chapterCaptionTimer);
 chapterCaptionTimer=setTimeout(()=>{
  node.classList.remove('is-visible');
  node.classList.add('is-hidden');
  chapterCaptionTimer=null;
 },CHAPTER_CAPTION_MS);
}
const statusBars=[['health','건강','#a4c2a4'],['food','포만감','#e5bc78'],['water','수분','#80bed9'],['temperature','체온 안정','#d5a280'],['sickness','질병 위험','#c78686']];
function renderHUD(){
 const t=gameClock.virtualNow,day=getDay(state.startedAt,t),dead=state.survivalStatus==='dead';
 $('#days').textContent='DAY '+String(day).padStart(3,'0');$('#clock').textContent=wallClock(t);
  const dayChip=$('#survival-day-chip'); if(dayChip)dayChip.textContent='생존 '+day+'일차';
 disasterForecast.sync(state,t);
 $('#days').title='실제 플레이 10분마다 게임 하루가 지나갑니다 (기본 1×)';
 $('#day-pace').textContent='1일 = 플레이 10분';
 $('#clock').title='게임 내 서울 시각 · 플레이 10분 = 게임 1일 · 미접속 시 일시정지';
 syncChapterCaption(day,dead);
 $('#game-over').classList.toggle('hidden',!dead);
 if(dead){
   $('#game-over-days').textContent='DAY '+String(getDay(state.startedAt,state.diedAt||t)).padStart(3,'0');
   $('#game-over-cause').textContent=state.deathCause||'생존자가 더 이상 움직일 수 없습니다.';
 }
 document.querySelectorAll('[data-action]').forEach(button=>button.disabled=dead);
 const approaching=state.weather==='tornado'&&state.tornadoEncounterActive&&
   state.tornadoRoofImpactEncounter!==state.tornadoEncounter;
 $('#take-cover').hidden=!approaching||state.tornadoCoverActive||dead;
 $('#secure-supplies').hidden=!approaching||state.tornadoSuppliesSecured||dead;
 $('#collect-water').hidden=!['rain','storm'].includes(state.weather)||dead;
 const open=state.scavenge?.pending;
 $('#expedition-toggle').hidden=!open||dead;
 const waiting=state.companion?.pending;
 $('#companion-toggle').hidden=!waiting||dead;
 $('#companion-status').textContent=state.companion?.present
   ?'🤝 지원 생존자 동행 · 건강 '+Math.round(state.companion.health)+'% · 식량/식수 매일 -1 · 정수/재배 +30%'
   : waiting?'📡 다른 생존자의 구조 요청 · 받아들일지 선택하세요'
   : state.companion?.lost?'🕯 함께하던 생존자는 캠프를 떠났습니다'
   :'🏙 주변 생존자 신호를 기다리는 중';
 $('#radio-contact').hidden=!state.kit.radio||dead;
 const owned=ITEM_IDS.filter(id=>state.kit?.[id]);
 $('#inventory-items').textContent=owned.length?
   owned.map(id=>ITEM_INFO[id].icon+' '+ITEM_INFO[id].label).join(' · '):
   '아직 생존 장비가 없습니다 · 탐색으로 획득';
 $('#life-panel-intro').textContent=state.kit?.tent?'매일 23시~07시에 야전 텐트 안에서 잠듭니다. 비·한파·황사와 연기를 피하며 회복할 수 있습니다.':'매일 23시~07시에 노출된 시멘트 바닥에서 잠듭니다. 비·한파·황사·연기에 병들 수 있습니다. 텐트를 찾아야 합니다.';
 $('#sleep-arrangement').textContent=state.kit?.tent?
   '⛺ 텐트에서 수면 · 회복력 강화':'🧱 콘크리트에서 수면 · 감염·체력 위험';
 $('#radio-contact').title=state.kit?.radio?'오늘 무전으로 구조 신호를 요청합니다':'무전기를 찾아야 합니다';
 $('#repair-tank').hidden=state.facilities.tank>=80||dead;
 $('#weather-brief').textContent=WEATHER_KO[state.weather]+' · '+({heat:'37°C',clear:'21°C',rain:'17°C',storm:'16°C',tornado:'18°C',cloud:'19°C',cold:'−5°C',dust:'29°C',wildfire:'43°C'}[state.weather]);
 $('#weather-effect').textContent=describeWeatherEconomy(state);
 const warningAhead=state.majorDisasterAt>t&&state.majorDisasterAt-t<=2*3600000;
 const danger=['storm','tornado','dust','wildfire'].includes(state.weather)||state.health<35||state.water<18||state.sickness>=35||warningAhead;
 $('#mood').textContent=dead?'생존 종료':state.health<32?'위험':state.sickness>=50?'질병 악화':danger?'주의':'생존 중';
 $('#warning').classList.toggle('hidden',!danger);$('#warning').textContent=state.animalAlert?'⚠ 굶주린 동물이 보급품을 노리고 있습니다':state.weather==='tornado'?(state.tornadoApproach==='direct'?'⚠ 옥상 직격 위험 · 즉시 대피 또는 물자 고정':state.tornadoApproach==='near'?'⚠ 토네이도 근접 · 파편과 식량 유실 위험':'⚠ 토네이도 위험 · 대피소를 보강하세요'):state.weather==='storm'?'⚡ 낙뢰 경보 · 외부 활동을 피하세요':state.weather==='dust'?'🌪 모래폭풍 경보 · 강풍과 비산 모래 · 대피소 보호':state.weather==='wildfire'?'🔥 산불 연기 접근 · 식수 확보 · 외부 활동 금지':state.water<18?'⚠ 식수 부족 · 보급이 필요합니다':state.sickness>=35?'⚠ 감염 의심 · 치료제가 필요합니다':warningAhead?`⚠ ${WEATHER_KO[state.majorDisasterType]} 예보 · 대비하세요`:'⚠ 생존자 건강 상태가 악화되고 있습니다';
 $('#survivor-bars').innerHTML=statusBars.map(([key,label,color])=>`<div class="stat"><div class="stat-line"><span>${label}</span><strong>${Math.round(state[key])}</strong></div><div class="bar"><i style="width:${state[key]}%;background:${color}"></i></div></div>`).join('');
 // v9.5: mirror the authoritative survivor model into the integrated top frame.
 // The HUD is display-only. No duplicated inventory or synthetic 'stamina' state.
 const telemetry=[['health',state.health],['food',state.food],['water',state.water]];
 for(const [name,value] of telemetry){
   const ratio=Math.max(0,Math.min(100,Number(value)||0));
   const fill=$('#hud-'+name+'-fill'),valueNode=$('#hud-'+name+'-val');
   if(fill)fill.style.width=ratio.toFixed(1)+'%';
   if(valueNode)valueNode.textContent=Math.round(ratio)+'%';
   const meter=document.querySelector('.survival-hud-stat[data-meter="'+name+'"]');
   if(meter)meter.dataset.danger=String(ratio<25);
 }
 for(const [name,value] of Object.entries(state.supply)){
   const node=$('#hud-stock-'+name);
   if(node)node.textContent=String(Math.max(0,Math.round(Number(value)||0)));
 }
 const r=state.supply;$('#resources').innerHTML=`<span>🥫 ${r.food}</span><span title="정수된 식수 저장량">💧 ${r.water}/${WEATHER_WATER_CAPACITY}</span><span>⚕ ${r.medicine}</span><span>⚙ ${r.parts}</span><span title="빗물 정수 시설 상태">🚰 ${Math.round(state.facilities.tank)}%</span>`;
 $('#log span').textContent=state.events.at(-1)||'고요한 하루가 이어지고 있다.';
 $('#medicine').classList.toggle('needs-attention',state.health<65&&state.supply.medicine>0);
 $('#explore').classList.toggle('needs-attention',r.food<3||r.water<4||state.health<38||state.facilities.shelter<38);
 eventBoard?.sync(state,{warningAhead});
}
function toast(msg,kind=''){if(kind!=='quiet')addEvent(state,msg);$('#log span').textContent=msg;$('#log').classList.remove('pulse');void $('#log').offsetHeight;$('#log').classList.add('pulse');renderHUD();}
function runSurvivalAction(action){
 // Resolve mandatory quests before allowing unrelated survival actions.
 if(eventBoard?.requiresChoice()){
   const valid=eventBoard.activeKey==='expedition'
     ?['scavenge_go','scavenge_scout','scavenge_salvage','scavenge_stay'].includes(action)
     :eventBoard.activeKey==='companionInvite'
     ?['companion_invite','companion_aid','companion_trade','companion_decline'].includes(action)
     :false;
   if(!valid)return {good:false,msg:'진행 중인 퀘스트를 먼저 선택하세요.'};
 }
 const result=applyAction(state,action,gameClock.virtualNow);
 if((action.startsWith('scavenge_')&&result.good)||(action.startsWith('companion_')&&result.good))eventBoard?.dismiss(true);
 if(result.good){
   if(action.startsWith('scavenge_')||action.startsWith('companion_'))world?.syncSurvivalInventory(state);
   if(action==='radio_contact')world?.setAction('radio');
   else if(action==='take_cover')world?.setAction('shelter');
   else if(action==='secure_supplies'||action==='repair_tank')world?.setAction('repair');
   else if(!action.startsWith('scavenge_')&&!action.startsWith('companion_')&&action!=='radio_contact')world?.setAction(action);
   if(action==='eat'&&autoLifeCamera)world?.setCameraView('survivor');
   // The camera only celebrates a decision after it has resolved successfully.
   // No extra roll, item grant, damage, or clock alteration.
   if(action==='scavenge_go'||action==='scavenge_scout'||action==='scavenge_salvage'||action==='scavenge_stay'){
     const type=result.item||(result.outcome==='injury'||result.outcome==='sickness'?result.outcome:null);
     if(type)world?.playCinematic(type);
     // Tent construction is a visible actor performance. Loot/rewards remain
     // committed exactly once in the existing simulation.
     if(result.item==='tent')world?.setAction('install_tent');
   }else if(action==='radio_contact'&&result.kind==='drop'){
     world?.playCinematic('helicopter');
   }else if(action==='companion_invite'){
     world?.playCinematic('companion');
   }
   save();
 }
 toast(result.msg,action.startsWith('scavenge_')||action.startsWith('companion_')||action==='radio_contact'?'quiet':'');
 return result;
}
function bindEvents(){
 const speedButton=$('#speed-toggle');
 const updateSpeedLabel=()=>{
  speedButton.textContent=gameClock.speed===1?'▶ 1×':`⏩ ${gameClock.speed}×`;
  speedButton.setAttribute('aria-label',`게임 속도 ${gameClock.speed}배 · 게임 하루당 플레이 ${(GAME_DAY_REAL_MS/60000/gameClock.speed).toFixed(2)}분. 클릭하면 배속 변경`);
  speedButton.setAttribute('aria-pressed',String(gameClock.speed!==1));
  speedButton.title='게임 1일: 1× 10분 · 2× 5분 · 4× 2.5분 · 8× 75초 · 16× 37.5초 · 32× 18.75초 · 50× 12초 (테스트)';
 };
 speedButton.addEventListener('click',()=>{
  gameClock.cycleSpeed();
  updateSpeedLabel();
  save();
 });
 updateSpeedLabel();
 // Tap the actual 3D canvas (not a dialog/button) to dismiss open overlays.
 // Dragging to rotate the camera must not close panels.
 const canvas=$('#world');
 let start=null;
 canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  start={id:event.pointerId,x:event.clientX,y:event.clientY};
 });
 canvas.addEventListener('pointercancel',()=>{start=null;});
 canvas.addEventListener('pointerup',event=>{
  if(!start||start.id!==event.pointerId)return;
  const distance=Math.hypot(event.clientX-start.x,event.clientY-start.y);
  start=null;
  if(distance>10)return;
  $('#life-panel').classList.add('hidden');
  $('#weather-panel').classList.add('hidden');
  eventBoard?.dismiss();
  const status=$('#survivor-status-panel');
  if(status&&!status.classList.contains('is-collapsed'))$('#survivor-status-toggle')?.click();
 });
 document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>{
    if(btn.dataset.action==='explore'&&state.scavenge?.pending){
      eventBoard?.openPendingExpedition(state);return;
    }
    runSurvivalAction(btn.dataset.action);
  }));
 $('#expedition-toggle').addEventListener('click',()=>eventBoard?.openPendingExpedition(state));
 $('#companion-toggle').addEventListener('click',()=>eventBoard?.openPendingCompanion(state));
 $('#radio-contact').addEventListener('click',()=>runSurvivalAction('radio_contact'));
 $('#restart-game').addEventListener('click',()=>{
  if(!window.confirm('현재 생존 기록을 초기화하고 DAY 001부터 다시 시작하시겠습니까?'))return;
  restartInProgress=true;
  const button=$('#restart-game');
  if(button){button.disabled=true;button.textContent='DAY 001 준비 중…';}
  try{
    // Persist a known-good fresh session BEFORE navigation. pagehide,
    // visibilitychange and the 15s autosave are all blocked by restartInProgress.
    persistFreshRestart(localStorage,Date.now());
  }catch{
    // If persistence itself is unavailable, at least remove the dead save.
    try{localStorage.removeItem(SAVE_KEY)}catch{}
  }
  window.location.reload();
 });
 $('#life-panel-toggle').addEventListener('click',()=>{$('#life-panel').classList.toggle('hidden');$('#weather-panel').classList.add('hidden')});
 $('#close-life').addEventListener('click',()=>$('#life-panel').classList.add('hidden'));
 document.querySelectorAll('[data-life-action]').forEach(button=>button.addEventListener('click',async()=>{
  const activity=button.dataset.lifeAction;
  if(activity==='radio'){
    runSurvivalAction('radio_contact');return;
  }
  const accepted=world?.setAction(activity);
  if(accepted&&autoLifeCamera)world?.setCameraView(['guitar','radio','sit','rest','cook'].includes(activity)?'portrait':'survivor');
  if(!accepted){toast('현재 재난 상황에서는 해당 활동을 진행할 수 없습니다.');return;}
  if(activity==='guitar'){
   // User gesture required before Web Audio can start. Music remains optional.
   try{await world.enableCampMusic();$('#camp-music-toggle').textContent='🔊 기타·허밍 음향 끄기';$('#camp-music-toggle').setAttribute('aria-pressed','true')}catch(e){toast('음향 시작 불가: '+e.message)}
  }
  document.querySelectorAll('[data-life-action]').forEach(b=>b.classList.toggle('active',b===button));
  toast(`${{sit:'의자로 이동해 쉬기',guitar:'모닥불 옆에서 기타 연주·허밍',radio:'무전기에서 교신 시도',cook:'모닥불에서 요리 준비',stretch:'가벼운 스트레칭',watch:'도시를 바라보며 경계하기',rest:'천막 안으로 이동해 휴식',repair:'작업대로 이동해 도구 정리'}[activity]} · 이동 중`);
 }));
 document.querySelectorAll('[data-routine-preview]').forEach(button=>button.addEventListener('click',()=>{
  const raw=button.dataset.routinePreview, hour=raw==='auto'?null:Number(raw);
  world.life.setRoutinePreview(hour);
  const caption=$('#routine-preview-caption');
  if(caption)caption.textContent=hour===null?'실제 서울 시간으로 복귀 · 자동 루틴 작동':hour>20?'수면 동작 시연 중 · 실제 시간과 생존 데이터는 변경되지 않습니다':'기상·스트레칭 동작 시연 중 · 실제 시간과 생존 데이터는 변경되지 않습니다';
  document.querySelectorAll('[data-routine-preview]').forEach(b=>b.classList.toggle('active',b===button&&raw!=='auto'));
 }));
 $('#life-camera-toggle').addEventListener('click',e=>{autoLifeCamera=!autoLifeCamera;e.currentTarget.textContent=autoLifeCamera?'✓ 일상 행동 자동 연출 카메라 켜짐':'일상 행동 자동 카메라 꺼짐';e.currentTarget.setAttribute('aria-pressed',String(autoLifeCamera));});
 $('#follow-survivor-camera').addEventListener('click',()=>{world.setCameraView('survivor');$('#life-panel').classList.add('hidden')});
 $('#portrait-survivor-camera').addEventListener('click',()=>{world.setCameraView('portrait');$('#life-panel').classList.add('hidden')});
 $('#camp-music-toggle').addEventListener('click',async e=>{try{const on=await world.toggleCampMusic();e.currentTarget.textContent=on?'🔊 기타·허밍 음향 끄기':'🔇 오리지널 기타·허밍 음향 켜기';e.currentTarget.setAttribute('aria-pressed',String(on))}catch(err){toast('음향 시작 불가: '+err.message)}});
 $('#weather-panel-toggle').addEventListener('click',()=>{$('#weather-panel').classList.toggle('hidden');$('#life-panel').classList.add('hidden')});
 $('#close-weather').addEventListener('click',()=>$('#weather-panel').classList.add('hidden'));
 const options=$('#weather-options');options.innerHTML='<button data-weather="auto">게임 자동 날씨</button>'+WEATHER.map(k=>`<button data-weather="${k}">${WEATHER_KO[k]}</button>`).join('');
 options.addEventListener('click',e=>{const target=e.target.closest('button[data-weather]');if(!target)return;world.setWeather(target.dataset.weather);options.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===target));toast(`날씨 시연: ${target.dataset.weather==='auto'?'게임 자동 기상':WEATHER_KO[target.dataset.weather]}`)});
 const input=$('#time-preview');input.addEventListener('input',()=>{world.setHour(Number(input.value));$('#hour-value').textContent=String(Math.floor(Number(input.value))).padStart(2,'0')+':'+(String(Math.round((Number(input.value)%1)*60)).padStart(2,'0'));});
 $('#time-auto').addEventListener('click',()=>{world.setHour(null);world.setLunarPreviewOffset(0);$('#hour-value').textContent='자동';$('#moon-phase-caption').textContent='실제 날짜 기준 · 자동 달 위상';document.querySelectorAll('[data-moon-phase]').forEach(b=>b.classList.remove('active'));});
 const moonPreviewHours={'.125':19,'.25':20,'.5':23,'.75':5};
 document.querySelectorAll('[data-moon-phase]').forEach(button=>button.addEventListener('click',()=>{
  const target=Number(button.dataset.moonPhase);
  const current=moonPhaseAt(Date.now()).phase;
  // Display preview only; never mutates the actual survival date or saved state.
  const days=((target-current+1)%1)*SYNODIC_MONTH;
  world.setLunarPreviewOffset(days);
  const hour=moonPreviewHours[button.dataset.moonPhase]??21;
  world.setHour(hour);input.value=String(hour);$('#hour-value').textContent=String(hour).padStart(2,'0')+':00 · 시연';
  $('#moon-phase-caption').textContent=button.textContent.trim()+' 시연 · 실제 날짜/생존시간 유지';
  document.querySelectorAll('[data-moon-phase]').forEach(b=>b.classList.toggle('active',b===button));
 }));
 $('#reset-cinematic-camera').addEventListener('click',()=>world?.setCameraView('cinematic'));
 $('#show-overhead-camera').addEventListener('click',()=>world?.setCameraView('overhead'));
 $('#showcase-sunset').addEventListener('click',()=>{world.setHour(18.2);world.setWeather('clear');$('#hour-value').textContent='18:12 · 시연';input.value='18.2';toast('황혼 시연 중 · 실제 생존 시간과 날짜는 변경되지 않습니다.');});
 $('#quality').addEventListener('change',e=>world.setQuality(e.target.value));
 $('#weather-audio-toggle').addEventListener('click',async e=>{try{const on=await world.toggleWeatherSound();e.currentTarget.textContent=on?'🔊 환경음 끄기':'🔇 환경음 켜기 (수동)';e.currentTarget.setAttribute('aria-pressed',String(on))}catch(err){toast('오디오를 시작할 수 없습니다: '+err.message)}});
 window.addEventListener('pagehide',save);
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){
   // Resuming a sleeping browser tab never accelerates missed background time.
   const t=gameClock.tick(Date.now(),false);
   advance(state,t,true);renderHUD();save();
  }else{
   gameClock.tick(Date.now(),false);save();
  }
 });
}
function animation(){
 let last=performance.now(),lastHUD=0,lastSave=Date.now();
 const draw=t=>{
  const realDt=Math.min(Math.max((t-last)/1000,0),.05);last=t;
  const real=Date.now(),foreground=document.visibilityState==='visible';
  const questPaused=Boolean(eventBoard?.requiresChoice());
  // Pause virtual survival clock, not the user's ability to read or choose.
  const gameNow=gameClock.tick(real,foreground&&!questPaused);
  if(gameNow-state.lastTickAt>10000)advance(state,gameNow,!foreground);
  disasterForecast.syncProgress(state,gameNow);
  if(t-lastHUD>700){renderHUD();lastHUD=t}
  if(real-lastSave>15000){save();lastSave=real}
  try{
   if(questPaused)world.update(0,gameNow,state,realDt);
   else world.update(Math.min(.12,realDt*gameClock.speed),gameNow,state,realDt);
  }catch(e){
   console.error('3D frame error',e);
   $('#error').classList.remove('hidden');
   $('#error').textContent='렌더링 오류: '+e.message;
   return;
  }
  requestAnimationFrame(draw);
 };
 requestAnimationFrame(draw);
}
async function boot(){try{
  $('#load-progress').textContent='실제 황혼의 생존 옥상을 준비하는 중…';world=new AfterWorld($('#world'),msg=>{$('#load-progress').textContent=msg});
  // A new world begins without gear. Day 1 always offers a real player decision;
  // old saves retain their original camp assets and supply.
  offerDailyScavenge(state,getDay(state.startedAt,gameClock.virtualNow));
  world.syncSurvivalInventory(state);
  // The preview is safe for survivor resources/time, but demolished city buildings are permanent.
  world.onTornadoEncounterChange=()=>save(); // Persist each new tornado track immediately.
  world.onTornadoImpact=(id,index)=>{
    state.tornadoEpisodeDamageCount=Math.max(state.tornadoEpisodeDamageCount||0,index);
    if(recordTornadoDamage(state,[id],'preview')){
      save(); // Permanent per-building destruction, including weather preview.
      renderHUD();
    }
  };
  world.onTornadoClosePass=()=>{
    // Visual flyby and resource loss are ONE persisted event. Weather preview is visual-only.
    if(world.previewWeather||state.weather!=='tornado')return;
    const outcome=resolveTornadoRoofImpact(state,gameClock.virtualNow);
    if(outcome.applied){
      world?.playCinematic(outcome.approach==='direct'?'tornadoDirect':'tornadoNear');
      save();renderHUD();
    }
  };
  // v6.6: slow structural decay can partially collapse background ruins even
  // without a tornado. IDs/timing are persisted, but this never changes health,
  // food, water or facilities.
  world.onAmbientCollapseStateChange=()=>save();
  world.onAmbientCollapse=(id,serial)=>{
    addEvent(state,`도시 어딘가에서 노후 건물 일부가 붕괴했다. 붕괴 흔적은 그대로 남는다. · #${serial}`);
    save();renderHUD();
  };
  world.life.onActivityChange=(label,activity)=>{const node=$('#activity-label');if(node)node.textContent=label;};
  eventBoard=new AfterdayEventBoard({host:$('#hud'),initialState:state,onNotice:()=>save(),
    onExpeditionChoice:choice=>runSurvivalAction('scavenge_'+choice),
    onCompanionChoice:choice=>runSurvivalAction('companion_'+choice),
    onSecure:()=>runSurvivalAction('secure_storage'),
    onCover:()=>runSurvivalAction('take_cover'),
    onPrepare:()=>runSurvivalAction('secure_supplies')});
  window.afterday={state,world,save,renderHUD,eventBoard,gameClock};
  bindEvents();renderHUD();if(new URLSearchParams(location.search).has('showcase')){$('#showcase-sunset').click();}
  if(new URLSearchParams(location.search).has('characterqa')){world.setCameraView('portrait');}
  animation();
  // Prefer actual locally baked GLB assets before displaying the scene. A 7-second
  // maximum ensures offline users still see the original procedural fallbacks.
  Promise.race([world.heroAssetPromise,new Promise(r=>setTimeout(r,7000))]).finally(()=>{$('#loading').classList.add('hidden')});
  world.start().then(()=>{}).catch(e=>console.warn('asset atlas',e));
  setInterval(()=>{const a=world.assets;const target=$('#asset-progress');if(target)target.textContent=`캐릭터 ${world.beardedSurvivor?.status==='ready'?'3D GLB 로딩 완료':'3D 로딩 '+(world.beardedSurvivor?.status||'중')} · 시설 GLB ${world.heroAssetStatus?.loaded||0}/3 · GitHub 도시 ${a.success}개 · 미로드 ${a.failed.size}개`;},3000);
 }catch(e){console.error('BOOT ERROR',e);$('#loading').classList.add('hidden');$('#error').classList.remove('hidden');$('#error').innerHTML='<b>3D 엔진을 초기화하지 못했습니다.</b><p>'+String(e.message).replace(/[<>&]/g,'')+'</p><p>페이지를 새로고침해 주세요. 오류가 계속되면 위 오류 메시지와 함께 알려 주세요.</p>'}}
boot();
