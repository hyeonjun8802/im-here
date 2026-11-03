/* AFTERDAY event notification board — UI only; gameplay changes live in simulation.js.
 * Original illustrations: cropped from approved situation-board concept sheet.
 */
const BASE = new URL('./assets/events/', document.baseURI);
const NOTICE_SOUND = new URL('./assets/audio/dragon-studio-notification-sound-372474.mp3', document.baseURI);

export const EVENT_STYLES = Object.freeze({
  raiders:      { category:'위험', title:'강도들이 식량 보관함에 접근하고 있습니다!', description:'계단실에서 낯선 발소리가 들립니다. 보관함을 지키세요.', image:'raiders.webp', severity:'danger',duration:8500 },
  theft:        { category:'위험', title:'식량이 도난당했습니다', description:'밤사이 누군가 보관함을 열고 식량을 가져갔습니다.', image:'raiders.webp', severity:'danger',duration:7000 },
  infected:     { category:'위험', title:'도시에서 정체불명의 무리가 포착됐습니다', description:'먼 거리에서 움직이는 사람들의 무리가 관찰됩니다.', image:'infected.webp', severity:'danger', duration:7200, demoOnly:true },
  storm:        { category:'재난', title:'거센 폭풍이 다가오고 있습니다',description:'대피소와 전기 시설을 점검하세요.',image:'storm.webp',severity:'disaster', duration:6500 },
  tornado:      { category:'재난', title:'토네이도 접근 경보',description:'강풍에 대비하고 생존자를 안전한 곳으로 대피시키세요.',image:'storm.webp',severity:'disaster',duration:14000 },
  tornadoNear:  { category:'긴급 재난', title:'토네이도 · 옥상 바로 옆 접근!',description:'파편이 곧 들이닥칩니다. 먼저 대피하거나 물자를 고정하세요.',image:'storm.webp',severity:'danger',duration:16000 },
  tornadoDirect:{ category:'긴급 재난', title:'토네이도 · 옥상 직격 위험!',description:'건물 위를 덮치는 강풍입니다. 대피와 식량 보호를 결정하세요.',image:'storm.webp',severity:'danger',duration:16000 },
  milestone:    { category:'생존 일지', title:'또 하루를 버텼습니다',description:'다음 생존 계획을 확인하세요.',image:'supply_cache.webp',severity:'social',duration:8500 },
  rain:         { category:'재난', title:'강한 비가 시작됐습니다',description:'천막 누수와 배수로 상태를 확인하세요.',image:'storm.webp',severity:'disaster',duration:6000 },
  heat:         { category:'재난', title:'폭염 주의보',description:'식수와 그늘을 확보하고 활동을 줄이세요.',image:'food_shortage.webp',severity:'disaster',duration:6000 },
  cold:         { category:'재난', title:'한파가 찾아왔습니다',description:'체온과 물탱크 결빙에 주의하세요.',image:'cold.webp',severity:'disaster',duration:6500 },
  supply_cache: { category:'기회', title:'버려진 보급품을 확보했습니다',description:'탐색에서 생존에 필요한 자원을 찾았습니다.',image:'supply_cache.webp',severity:'opportunity',duration:6500 },
  stranger:     { category:'이벤트', title:'도움이 필요한 생존자가 보입니다',description:'멀리서 구조 신호가 관찰됩니다.',image:'stranger.webp',severity:'social',duration:7000, demoOnly:true },
  sickness:     { category:'위험', title:'생존자의 몸 상태가 좋지 않습니다',description:'의약품과 휴식이 필요합니다.',image:'sickness.webp',severity:'danger',duration:6500 },
  shortage:     { category:'위험', title:'식량이 부족합니다',description:'보급 계획을 확인하고 남은 식량을 관리하세요.',image:'food_shortage.webp',severity:'danger',duration:6500 }
});

export function eventFromMessage(message='') {
  const m = String(message);
  if (/^(날씨 시연|황혼 시연|음향 시작 불가|현재 재난 상황)/.test(m))return null;
  if (/도둑|강도|침입자|낯선 발소리|식량 보관함에 접근|도난/.test(m))return /도망|물리쳤|지켰|잠가|쫓아냈/.test(m)?null:/훔치|훔쳐|도난|가져갔|달아나/.test(m)?'theft':'raiders';
  if (/토네이도/.test(m))return /경보|다가오|접근|예보/.test(m)?'tornado':null;
  if (/^생존 일지 DAY/.test(m))return 'milestone';
  if (/폭풍|낙뢰|뇌우/.test(m))return 'storm';
  if (/폭우/.test(m))return 'rain';
  if (/한파|저체온|결빙/.test(m))return 'cold';
  if (/폭염/.test(m))return 'heat';
  if (/의약품 부족|아프|질병|병에 걸|건강 상태가 악화/.test(m))return 'sickness';
  if (/보급품을 확보|보급품을 발견|물자를 발견/.test(m))return 'supply_cache';
  if (/식량 부족|식량이 부족/.test(m))return 'shortage';
  return null;
}

export class AfterdayEventBoard {
  constructor({host,initialState,onSecure=()=>{},onCover=()=>{},onPrepare=()=>{},onNotice=()=>{},onLog=()=>{}}={}) {
    if (!host) throw new Error('AFTERDAY HUD container required');
    this.onSecure=onSecure;this.onCover=onCover;this.onPrepare=onPrepare;
    this.onNotice=onNotice;this.onLog=onLog;
    this.lastLog=initialState?.events?.at(-1)||'';
    this.lastLogSerial=initialState?.eventSerial||0;
    this.lastWeather=initialState?.weather||'clear';
    this.lastWeatherEpisode=initialState?.weatherEpisode||0;
    this.lastTornadoEncounter=initialState?.tornadoEncounter||0;
    this.lastRaider=Boolean(initialState?.raiderAlert);
    this.lastLowFood=(initialState?.supply?.food||0)<3;
    this.activeKey=null;this.timer=null;
    // One notification audio instance for all situation/scenario notices.
    this.noticeAudio=new Audio(NOTICE_SOUND.href);
    this.noticeAudio.preload='auto';this.noticeAudio.volume=.75;
    this.pendingNoticeSound=false;
    this.onNoticeGesture=()=>{
      if(this.pendingNoticeSound&&this.activeKey&&!this.element.hidden)this.playNoticeSound();
    };
    window.addEventListener('pointerdown',this.onNoticeGesture,{passive:true});
    window.addEventListener('keydown',this.onNoticeGesture);
    this.seen=[];
    this.element=document.createElement('section');
    this.element.className='afterday-board';this.element.setAttribute('role','status');
    this.element.setAttribute('aria-live','polite');this.element.setAttribute('aria-atomic','true');
    this.element.hidden=true;
    this.element.innerHTML=`<div class="afterday-board-art"><img alt="" /></div><div class="afterday-board-body"><small class="afterday-board-category"></small><strong class="afterday-board-title"></strong><span class="afterday-board-description"></span><button class="afterday-board-secure" hidden type="button">보관함 잠그기 · 부품 1개</button><button class="afterday-board-cover" hidden type="button">🛡 생존자 대피</button><button class="afterday-board-prepare" hidden type="button">📦 물자 고정 · 부품 1</button></div><button class="afterday-board-close" type="button" aria-label="알림 닫기">×</button>`;
    host.append(this.element);
    this.element.querySelector('.afterday-board-close').addEventListener('click',()=>this.dismiss());
    this.element.querySelector('.afterday-board-secure').addEventListener('click',()=>this.onSecure());
    this.element.querySelector('.afterday-board-cover').addEventListener('click',()=>this.onCover());
    this.element.querySelector('.afterday-board-prepare').addEventListener('click',()=>this.onPrepare());
    this.injectPreviewControls();
  }
  playNoticeSound(){
    this.pendingNoticeSound=false;
    const audio=this.noticeAudio;
    audio.pause();
    try{audio.currentTime=0;}catch{}
    try{
      const playing=audio.play();
      if(playing&&typeof playing.catch==='function')playing.catch(error=>{
        if(error?.name==='NotAllowedError'&&this.activeKey&&!this.element.hidden)this.pendingNoticeSound=true;
      });
    }catch(error){
      if(error?.name==='NotAllowedError'&&this.activeKey&&!this.element.hidden)this.pendingNoticeSound=true;
    }
  }
  show(key,options={}) {
    const data=EVENT_STYLES[key];if(!data)return false;
    clearTimeout(this.timer);this.activeKey=key;
    const el=this.element;el.hidden=false;el.className=`afterday-board afterday-board--${data.severity}`;
    el.querySelector('img').src=new URL(data.image,BASE).href;
    el.querySelector('.afterday-board-category').textContent=data.category;
    el.querySelector('.afterday-board-title').textContent=options.title||data.title;
    el.querySelector('.afterday-board-description').textContent=options.description||data.description;
    el.querySelector('.afterday-board-secure').hidden=!(key==='raiders'&&options.raiderActive);
    const risky=options.actionable&&['tornado','tornadoNear','tornadoDirect'].includes(key);
    el.querySelector('.afterday-board-cover').hidden=!risky;
    el.querySelector('.afterday-board-prepare').hidden=!risky;
    // Restart physical hanging animation for each newly arriving notice.
    void el.offsetHeight;el.classList.add('is-open');
    this.seen.push({key,at:Date.now()});if(this.seen.length>30)this.seen.shift();
    this.playNoticeSound();
    this.timer=setTimeout(()=>this.dismiss(),options.duration||data.duration);
    return true;
  }
  dismiss(){clearTimeout(this.timer);this.element.classList.remove('is-open');this.element.hidden=true;this.activeKey=null;this.pendingNoticeSound=false;this.noticeAudio.pause();}
  /** A hazard episode can produce dozens of state logs but ONE alarm/audio.
   * This signature persists across a reload; preview buttons are intentionally manual.
   */
  showOnce(state,key,id,options={}){
    if(!id)return false;
    if(!Array.isArray(state.noticeSeenIds))state.noticeSeenIds=[];
    if(state.noticeSeenIds.includes(id))return false;
    if(!this.show(key,options))return false;
    state.noticeSeenIds.push(id);
    if(state.noticeSeenIds.length>80)state.noticeSeenIds.splice(0,state.noticeSeenIds.length-80);
    this.onNotice();
    return true;
  }
  sync(state,{warningAhead=false}={}) {
    const current=state?.events?.at(-1)||'';
    const currentSerial=state.eventSerial||0;
    const weatherChanged=state.weather!==this.lastWeather||state.weatherEpisode!==this.lastWeatherEpisode;
    const tornadoChanged=state.tornadoEncounter!==this.lastTornadoEncounter;
    this.lastWeather=state.weather;
    this.lastWeatherEpisode=state.weatherEpisode;
    this.lastTornadoEncounter=state.tornadoEncounter;
    let shown=false;
    if(!this.lastRaider&&state.raiderAlert){
      shown=this.showOnce(state,'raiders',`raid:${state.raiderUntilAt}`,{raiderActive:true});
    }
    this.lastRaider=Boolean(state.raiderAlert);
    if((weatherChanged||tornadoChanged)&&!state.raiderAlert&&state.survivalStatus!=='dead'){
      const kind=state.weather;
      if(kind==='tornado'&&state.tornadoEncounterActive&&!state.tornadoPreview){
        const mode=state.tornadoApproach;
        const key=mode==='direct'?'tornadoDirect':mode==='near'?'tornadoNear':'tornado';
        shown=this.showOnce(state,key,`tornado:${state.tornadoEncounter}`,{
          actionable:mode!=='distant'&&state.tornadoRoofImpactEncounter!==state.tornadoEncounter
        })||shown;
      }else if(['storm','rain','cold','heat'].includes(kind)){
        shown=this.showOnce(state,kind,`weather:${state.weatherEpisode}:${kind}`)||shown;
      }
    }
    if(current!==this.lastLog||currentSerial!==this.lastLogSerial){
      this.lastLog=current;this.lastLogSerial=currentSerial;
      const key=eventFromMessage(current);
      const isStormLog=key==='tornado'&&state.weather==='tornado';
      const isWeatherLog=['storm','rain','cold','heat'].includes(key)&&state.weather===key;
      if(key&&!shown&&!isStormLog&&!isWeatherLog&&!state.raiderAlert){
        shown=this.showOnce(state,key,`event:${currentSerial}:${key}`)||shown;
      }
    }
    const lowFood=(state.supply?.food??99)<3;
    if(lowFood&&!this.lastLowFood&&!shown&&!state.raiderAlert&&state.survivalStatus!=='dead')
      this.showOnce(state,'shortage',`shortage:${currentSerial}`);
    this.lastLowFood=lowFood;
    if(this.activeKey==='raiders'&&!state.raiderAlert)this.element.querySelector('.afterday-board-secure').hidden=true;
    if(this.activeKey==='tornadoNear'||this.activeKey==='tornadoDirect'){
      const active=state.weather==='tornado'&&state.tornadoEncounterActive&&
        state.tornadoRoofImpactEncounter!==state.tornadoEncounter;
      this.element.querySelector('.afterday-board-cover').hidden=!active||state.tornadoCoverActive;
      this.element.querySelector('.afterday-board-prepare').hidden=!active||state.tornadoSuppliesSecured;
    }
  }
  injectPreviewControls(){
    const panel=document.querySelector('#weather-panel');if(!panel)return;
    const box=document.createElement('div');box.className='afterday-event-preview';
    const title=document.createElement('strong');title.textContent='상황 경고판 시연 (생존 데이터 변화 없음)';box.append(title);
    const grid=document.createElement('div');grid.className='afterday-event-preview-grid';
    for(const key of ['raiders','infected','storm','cold','supply_cache','stranger','sickness','shortage']){
      const b=document.createElement('button');b.type='button';b.textContent=EVENT_STYLES[key].title.replace(' 있습니다','').slice(0,15);
      b.addEventListener('click',()=>this.show(key));grid.append(b);
    }
    box.append(grid);panel.append(box);
  }
  destroy(){this.dismiss();this.element.remove();window.removeEventListener('pointerdown',this.onNoticeGesture);window.removeEventListener('keydown',this.onNoticeGesture);}
}
