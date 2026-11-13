import {scavengeOdds} from './scavengeDirector.js';
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
  expedition:   { category:'오늘의 생존 선택',title:'계단실 아래에서 물자 흔적 발견',description:'내려갈지, 옥상에 남을지 결정하세요. 부상과 질병 위험이 있습니다.',image:'supply_cache.webp',severity:'opportunity',duration:300000 },
  expeditionResult:{ category:'탐색의 결과',title:'옥상으로 돌아왔다',description:'이번 선택의 결과가 다음 생존에 영향을 줍니다.',image:'supply_cache.webp',severity:'social',duration:7800 },
  helicopter:   { category:'구조 신호',title:'구조 헬기 보급품 투하!',description:'무전기에 응답한 헬기가 생존 물자를 떨어뜨렸습니다.',image:'supply_cache.webp',severity:'opportunity',duration:9500 },
  companionInvite:{ category:'구조 요청',title:'생존자 한 명이 옥상 입구에서 도움을 요청합니다',description:'받아들이면 식량·식수를 나눠야 합니다. 대신 정수와 텃밭 수확을 도와줄 수 있습니다. 들일까요?',image:'stranger.webp',severity:'social',duration:300000 },
  survivorCall: { category:'무전 교신',title:'다른 생존자의 신호가 잡혔습니다',description:'도시 어딘가에 살아 있는 사람이 있습니다. 옥상 캠프에는 생존자 한 명만 머뭅니다.',image:'stranger.webp',severity:'social',duration:8000 },
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
  if (/^(날씨 시연|황혼 시연|음향 시작 불가|현재 재난 상황|탐색 결과|탐색 기회|무전 교신 결과|정수기 가동|옥상 텃밭 수확)/.test(m))return null;
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
  constructor({host,initialState,onSecure=()=>{},onCover=()=>{},onPrepare=()=>{},onExpeditionChoice=()=>{},onCompanionChoice=()=>{},onNotice=()=>{},onLog=()=>{}}={}) {
    if (!host) throw new Error('AFTERDAY HUD container required');
    this.onSecure=onSecure;this.onCover=onCover;this.onPrepare=onPrepare;
    this.onNotice=onNotice;this.onLog=onLog;this.onExpeditionChoice=onExpeditionChoice;this.onCompanionChoice=onCompanionChoice;
    this.lastLog=initialState?.events?.at(-1)||'';
    this.lastLogSerial=initialState?.eventSerial||0;
    this.lastWeather=initialState?.weather||'clear';
    this.lastWeatherEpisode=initialState?.weatherEpisode||0;
    this.lastTornadoEncounter=initialState?.tornadoEncounter||0;
    this.lastRaider=Boolean(initialState?.raiderAlert);
    this.lastLowFood=(initialState?.supply?.food||0)<3;
    this.activeKey=null;this.timer=null;this.choiceLocked=false;
    this.backdrop=document.createElement('div');this.backdrop.className='afterday-quest-backdrop';this.backdrop.hidden=true;this.backdrop.setAttribute('aria-hidden','true');host.append(this.backdrop);
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
    this.element.innerHTML=`<div class="afterday-board-art"><img alt="" /></div><div class="afterday-board-body"><small class="afterday-board-category"></small><strong class="afterday-board-title"></strong><span class="afterday-board-description"></span><button class="afterday-board-secure" hidden type="button">보관함 잠그기 · 부품 1개</button><button class="afterday-board-cover" hidden type="button">🛡 생존자 대피</button><button class="afterday-board-prepare" hidden type="button">📦 물자 고정 · 부품 1</button><div class="afterday-board-expedition" hidden>
<button class="afterday-board-expedition-go" type="button"><strong>① 깊이 탐색 · 장비 확보</strong><small>고위험 · 높은 장비 획득 확률</small></button>
<button class="afterday-board-expedition-scout" type="button"><strong>② 정찰 후 진입</strong><small>식수 -1 · 부상 위험 감소</small></button>
<button class="afterday-board-expedition-salvage" type="button"><strong>③ 폐자재 회수</strong><small>장비 없음 · 부품 확보 기회</small></button>
<button class="afterday-board-expedition-stay" type="button"><strong>④ 옥상 방어</strong><small>안전 · 오늘의 보급 기회 포기</small></button>
</div><div class="afterday-board-companion" hidden>
<button class="afterday-board-companion-invite" type="button"><strong>① 함께 살아간다</strong><small>매일 식량·식수 -1 · 생산 +30%</small></button>
<button class="afterday-board-companion-aid" type="button"><strong>② 식수만 지원한다</strong><small>식수 -1 · 부품 정보 45%</small></button>
<button class="afterday-board-companion-trade" type="button"><strong>③ 물자를 교환한다</strong><small>식량 -1 · 유용한 보상 75%</small></button>
<button class="afterday-board-companion-decline" type="button"><strong>④ 출입을 거절한다</strong><small>물자 손실 없음 · 도움도 없음</small></button>
</div></div><button class="afterday-board-close" type="button" aria-label="알림 닫기">×</button>`;
    host.append(this.element);
    this.element.querySelector('.afterday-board-close').addEventListener('click',()=>this.deferChoice());
    this.element.querySelector('.afterday-board-secure').addEventListener('click',()=>this.onSecure());
    this.element.querySelector('.afterday-board-cover').addEventListener('click',()=>this.onCover());
    this.element.querySelector('.afterday-board-prepare').addEventListener('click',()=>this.onPrepare());
    this.element.querySelector('.afterday-board-expedition-go').addEventListener('click',()=>this.onExpeditionChoice('go'));
    this.element.querySelector('.afterday-board-expedition-scout').addEventListener('click',()=>this.onExpeditionChoice('scout'));
    this.element.querySelector('.afterday-board-expedition-salvage').addEventListener('click',()=>this.onExpeditionChoice('salvage'));
    this.element.querySelector('.afterday-board-expedition-stay').addEventListener('click',()=>this.onExpeditionChoice('stay'));
    this.element.querySelector('.afterday-board-companion-invite').addEventListener('click',()=>this.onCompanionChoice('invite'));
    this.element.querySelector('.afterday-board-companion-aid').addEventListener('click',()=>this.onCompanionChoice('aid'));
    this.element.querySelector('.afterday-board-companion-trade').addEventListener('click',()=>this.onCompanionChoice('trade'));
    this.element.querySelector('.afterday-board-companion-decline').addEventListener('click',()=>this.onCompanionChoice('decline'));
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
    if(this.choiceLocked&&this.activeKey!==key)return false;
    clearTimeout(this.timer);this.activeKey=key;
    const mandatory=key==='expedition'||key==='companionInvite';
    this.choiceLocked=mandatory;this.backdrop.hidden=!mandatory;
    const el=this.element;el.hidden=false;el.className=`afterday-board afterday-board--${data.severity}${mandatory?' is-choice':''}`;
    el.setAttribute('role',mandatory?'dialog':'status');
    if(mandatory)el.setAttribute('aria-modal','true');else el.removeAttribute('aria-modal');
    // A story decision is important, but the player can postpone it rather
    // than having all survival actions permanently blocked.
    const close=el.querySelector('.afterday-board-close');
    close.hidden=false;
    close.title=mandatory?'나중에 선택 · 하단 보급/생존자 버튼에서 다시 열기':'알림 닫기';
    close.setAttribute('aria-label',mandatory?'나중에 선택':'알림 닫기');
    el.querySelector('img').src=new URL(data.image,BASE).href;
    el.querySelector('.afterday-board-category').textContent=data.category;
    el.querySelector('.afterday-board-title').textContent=options.title||data.title;
    el.querySelector('.afterday-board-description').textContent=options.description||data.description;
    el.querySelector('.afterday-board-secure').hidden=!(key==='raiders'&&options.raiderActive);
    const risky=options.actionable&&['tornado','tornadoNear','tornadoDirect'].includes(key);
    el.querySelector('.afterday-board-cover').hidden=!risky;
    el.querySelector('.afterday-board-prepare').hidden=!risky;
    el.querySelector('.afterday-board-expedition').hidden=key!=='expedition';
    el.querySelector('.afterday-board-companion').hidden=key!=='companionInvite';
    // Restart physical hanging animation for each newly arriving notice.
    void el.offsetHeight;el.classList.add('is-open');
    this.seen.push({key,at:Date.now()});if(this.seen.length>30)this.seen.shift();
    if(options.silent)this.pendingNoticeSound=false;
    else this.playNoticeSound();
    if(!mandatory)this.timer=setTimeout(()=>this.dismiss(),options.duration||data.duration);
    else el.querySelector('button:not([hidden])')?.focus({preventScroll:true});
    return true;
  }
  requiresChoice(){return this.choiceLocked===true;}
  deferChoice(){
    // Keep the underlying pending expedition/invitation intact and reopenable.
    // Only the visible modal is dismissed; no resource or quest is consumed.
    return this.dismiss(true);
  }
  dismiss(force=false){
    if(this.choiceLocked&&!force)return false;
    clearTimeout(this.timer);this.choiceLocked=false;this.backdrop.hidden=true;
    this.element.classList.remove('is-open');this.element.hidden=true;this.activeKey=null;
    this.pendingNoticeSound=false;this.noticeAudio.pause();return true;
  }
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
  openPendingExpedition(state){
    const pending=state?.scavenge?.pending;
    if(!pending)return false;
    const shown=this.show('expedition',{title:pending.title,description:pending.description,silent:true});
    if(shown)this.updateQuestChoices(state);
    return shown;
  }
  openPendingCompanion(state){
    if(!state?.companion?.pending)return false;
    const shown=this.show('companionInvite',{silent:true});
    if(shown)this.updateQuestChoices(state);
    return shown;
  }
  updateQuestChoices(state){
    const el=this.element;
    if(this.activeKey==='expedition'){
      for(const decision of ['go','scout','salvage']){
        const odds=scavengeOdds(decision,state?.weather);
        const btn=el.querySelector('.afterday-board-expedition-'+decision);
        const pct=n=>Math.round(n*100);
        btn.querySelector('small').textContent=decision==='go'
         ?`장비 ${pct(odds.item)}% · 부상 ${pct(odds.injury)}% · 감염 ${pct(odds.sickness)}%`
         :decision==='scout'
         ?`식수 -1 · 장비 ${pct(odds.item)}% · 보급 ${pct(odds.supplies)}%`
         :`부품 ${pct(odds.supplies)}% · 부상 ${pct(odds.injury)}%`;
        btn.disabled=decision==='scout'&&(state?.supply?.water||0)<1;
      }
    }else if(this.activeKey==='companionInvite'){
      el.querySelector('.afterday-board-companion-invite').disabled=
        (state?.supply?.food||0)<1||(state?.supply?.water||0)<1;
      el.querySelector('.afterday-board-companion-aid').disabled=(state?.supply?.water||0)<1;
      el.querySelector('.afterday-board-companion-trade').disabled=(state?.supply?.food||0)<1;
    }
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
    const expedition=state.scavenge?.pending;
    if(expedition&&state.survivalStatus!=='dead'){
      shown=this.showOnce(state,'expedition',expedition.id,
        {title:expedition.title,description:expedition.description})||shown;
      // A postponed or previously-seen quest stays available via the
      // bottom supply badge; never force-reopen it on every HUD refresh.
    }
    const invitation=state.companion?.pending;
    if(invitation&&!expedition&&state.survivalStatus!=='dead'){
      shown=this.showOnce(state,'companionInvite',invitation.id)||shown;
      // Pending companion invitations likewise remain manually reopenable.
    }
    const radio=state.scavenge;
    // A contacted survivor already produced a rescue-choice notice.
    // After accept/decline it must NEVER also emit a second 'survivorCall'
    // notice/audio for the exact same radioNewsId.
    const contactWasRescue=radio?.radioNewsType==='contact'&&
      state.companion?.lastContactId===radio.radioNewsId;
    if(radio?.radioNewsId&&radio.radioNewsType!=='silence'&&!contactWasRescue){
      const style=radio.radioNewsType==='drop'?'helicopter':'survivorCall';
      if(!expedition&&!invitation)shown=this.showOnce(state,style,
        `radio:${radio.radioNewsId}:${radio.radioNewsDay}`)||shown;
    }
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
    if(this.activeKey==='expedition'&&!expedition)this.dismiss(true);
    if(this.activeKey==='companionInvite'&&!invitation)this.dismiss(true);
    if(typeof this.updateQuestChoices==='function'&&this.choiceLocked)this.updateQuestChoices(state);
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
  destroy(){this.dismiss(true);this.element.remove();this.backdrop.remove();window.removeEventListener('pointerdown',this.onNoticeGesture);window.removeEventListener('keydown',this.onNoticeGesture);}
}
