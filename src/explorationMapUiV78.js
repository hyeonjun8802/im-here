/** AFTERDAY | Black Map interface, phase-aware and save-aware.
 * Rendering layer only. No asynchronous reward rolls or secondary save keys.
 * Artwork is deliberately separate from labels and localized HTML. */
import {
 EXPLORATION_SITES,mapExpeditionAvailability,beginMapExpedition,
 advanceMapExpedition,resolveMapExpedition,advanceTowerStory,
 mapFinaleAvailability,resolveMapFinale,currentExplorationDay
} from './explorationMapV78.js';
import {scavengeOdds} from './scavengeDirector.js';
import {explorationScene} from './explorationStoryV85.js';
import {explorationFogStage,FOG_ALPHA_BY_STAGE} from './explorationFogStageV91.js';
import {
 EXPLORATION_REGIONS,explorationQuestProgress,explorationZoneProgress,
 explorationPinPosition
} from './explorationQuestRegionsV90.js';
import {buildBlackMapGuide} from './blackMapMissionGuideV97.js';
import {getDailyOperations,getExpeditionPreparation,getReturnReport} from './blackMapDailyOperationsV98.js';
import {REPAIR_PARTS_RESERVE} from './repairPartsBalanceV95.js';

const ASSET='/assets/exploration/';
const LABELS={unknown:'미발견',rumored:'위치 발견',visited:'방문함',completed:'조사 완료'};
/* Different story actions per location. Underlying action IDs still use the
 * single established four-choice survival economy and risk validation. */
const SCENARIO_ACTIONS=Object.freeze({
 ruined_house:['무너진 안방 깊이 수색','계단 안정성 정찰','낡은 철골과 목재 회수'],
 convenience_store:['지하 창고 깊이 수색','배송표와 출입구 정찰','매대와 창고 부품 회수'],
 pharmacy:['봉인된 약품 상자 수색','약품 오염 위험 정찰','의료 수납장 부품 회수'],
 flower_shop:['종자 창고 깊이 수색','깨진 온실 유리 정찰','온실 프레임 회수'],
 water_station:['정수기 제어실 깊이 수색','침수된 배관 정찰','밸브와 수리 부품 회수'],
 communications_room:['통신 교환대 깊이 수색','17번 주파수 기록 정찰','송수신 회로 부품 회수'],
 hypermarket:['물류 창고 깊이 수색','붕괴된 지붕 정찰','진열대 구조재 회수'],
 underpass:['침수된 차도 깊이 진입','수위와 우회 경로 정찰','버려진 차량 부품 회수'],
 hospital:['응급실 약품 깊이 수색','격리실 진입로 정찰','검사실 수납 부품 회수'],
 substation:['변전소 제어실 깊이 수색','잔류 전류 위험 정찰','낡은 배선 부품 회수'],
 community_shelter:['대피소 비축 창고 수색','생존자 장부 정찰','침상과 보호재 회수'],
 rooftop_helipad:['착륙장 제어실 깊이 수색','안전한 접근로 정찰','신호등 부품 회수']
});
const siteById=id=>EXPLORATION_SITES.find(site=>site.id===id);
export function createExplorationMapV78({getState,getNow,save,onDepart,onReturn,onChoice,onStory,onEmergency,onDaily,hasBlockingChoice,isAutoEnabled}){
 const openButton=document.getElementById('exploration-map-open');
 const root=document.createElement('section');
 root.id='exploration-map-v78';
 root.className='exploration-map-v78';
 root.setAttribute('role','dialog');
 root.setAttribute('aria-label','검은 지도 · 동네 탐사');
 root.setAttribute('aria-modal','true');
 root.hidden=true;
 root.innerHTML=`
 <div class="exploration-map__panel">
  <div class="exploration-map__heading">
   <div><small>AFTERDAY · THE BLACK MAP</small><strong>검은 지도</strong><span id="exploration-map-count"></span></div>
   <button id="exploration-map-close" class="exploration-map__control exploration-map__control--icon" type="button" aria-label="탐사 지도 닫기">✕</button>
  </div>
  <section class="exploration-map__mission-guide" aria-label="현재 탐사 목표">
   <div class="exploration-map__mission-meta">
    <span id="exploration-map-guide-chapter">CHAPTER 01 · 생활권 확보</span>
    <span id="exploration-map-guide-progress">0 / 12 조사 완료</span>
   </div>
   <strong id="exploration-map-guide-title">다음 탐사 목표를 확인하세요</strong>
   <p id="exploration-map-guide-description">아직 탐사할 장소가 남아 있습니다.</p>
   <div class="exploration-map__mission-meter" role="progressbar" aria-label="전체 탐사 완료율" aria-valuemin="0" aria-valuemax="12" aria-valuenow="0"><span id="exploration-map-guide-meter"></span></div>
   <div class="exploration-map__mission-controls">
    <button type="button" class="exploration-map__control exploration-map__control--primary" id="exploration-map-guide-action">다음 목표 확인</button>
    <div id="exploration-map-guide-status" class="exploration-map__passive-state" role="status" aria-live="polite" hidden>진행 상황 확인 중</div>
    <span id="exploration-map-guide-hint"></span>
   </div>
  </section>
  <section class="exploration-map__daily-ops" aria-label="오늘의 생존 과제">
   <div class="exploration-map__daily-copy">
    <small id="exploration-map-daily-status"></small>
    <strong id="exploration-map-daily-title"></strong>
    <p id="exploration-map-daily-detail"></p>
   </div>
   <button type="button" class="exploration-map__control exploration-map__control--secondary" id="exploration-map-daily-shortcut">보급 활동 확인</button>
  </section>
  <section class="exploration-map__return-report" id="exploration-map-return-report" role="status" aria-label="귀환 결과" hidden>
   <strong id="exploration-map-return-title"></strong>
   <p id="exploration-map-return-detail"></p><small id="exploration-map-return-next"></small>
   <button id="exploration-map-return-dismiss" type="button" class="exploration-map__control exploration-map__control--primary">확인 · 다음 목표 보기</button>
  </section>
  <section class="exploration-map__prep" id="exploration-map-prep" aria-label="출발 준비" hidden>
   <strong id="exploration-map-prep-title"></strong>
   <p id="exploration-map-prep-detail"></p>
   <div id="exploration-map-prep-metrics" class="exploration-map__prep-metrics"></div>
   <div id="exploration-map-prep-options" class="exploration-map__prep-options"></div>
   <div class="exploration-map__prep-actions">
    <button id="exploration-map-prep-confirm" type="button" class="exploration-map__control exploration-map__control--primary">준비 확인 · 탐사 출발</button>
    <button id="exploration-map-prep-cancel" type="button" class="exploration-map__control exploration-map__control--secondary">취소</button>
   </div>
  </section>
  <details class="exploration-map__howto">
   <summary>탐사 진행 방법 · 출발 → 현장 선택 → 귀환</summary>
   <p>① 강조된 다음 목표를 확인하고 출발합니다. ② 현장에서 수색·정찰·회수·복귀를 선택합니다. ③ 귀환 결과를 확인합니다. 물자 확보에 성공하면 해당 장소가 조사 완료되고 다음 장소가 열립니다. 실패 시 방문 기록만 남으며 다음 생존일에 재도전할 수 있습니다.</p>
  </details>
  <div class="exploration-map__columns">
   <div class="exploration-map__map-wrap">
    <div class="exploration-map__areas" role="group" aria-label="탐사 구역">
     <button id="exploration-area-near" class="exploration-map__control exploration-map__control--tab" type="button" aria-pressed="true">근거리 · 6곳</button>
     <button id="exploration-area-far" class="exploration-map__control exploration-map__control--tab" type="button" aria-pressed="false">원거리 · 6곳</button>
    </div>
    <p id="exploration-map-zone-brief" class="exploration-map__zone-brief">근거리 · 옥상 주변 생활권</p>
    <div class="exploration-map__fog-progress" role="group" aria-label="지도 탐사 단계">
     <span id="exploration-map-fog-stage" class="exploration-map__fog-stage" aria-live="polite">STAGE 0/6 · 미탐사</span>
     <div id="exploration-map-fog-bars" class="exploration-map__fog-bars" aria-hidden="true">
      <span></span><span></span><span></span><span></span><span></span><span></span>
     </div>
    </div>
    <div class="exploration-map__map" data-zone="near" aria-label="방문하면 안개가 밝아지는 동네 지도">
     <img class="exploration-map__city" src="${ASSET}regions/near_neighborhood.webp" alt="옥상 주변의 가까운 폐허 동네"/>
     <canvas id="exploration-fog" width="320" height="213" aria-hidden="true"></canvas>
     <span class="exploration-map__home" aria-label="나의 옥상"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 10.5 12 3.7l8.5 6.8M6.8 9.8v10.3h10.4V9.8M10 20.1v-6.4h4v6.4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
     <div id="exploration-map-markers" class="exploration-map__markers"></div>
    </div>
    <div class="exploration-map__legend"><span>● 내 옥상</span><span>◌ 위치 발견</span><span>✓ 조사 완료</span></div>
   </div>
   <div class="exploration-map__detail">
    <div id="exploration-map-card" class="exploration-map__card"></div>
    <div id="exploration-map-stage" class="exploration-map__stage" role="status" aria-live="polite"></div>
    <div id="exploration-map-choices" class="exploration-map__choices"></div>
    <section id="exploration-tower" class="exploration-map__tower" aria-label="통신탑 복구 이야기" hidden>
     <img class="exploration-map__narrative-photo" src="/assets/exploration/photos/tower_story.webp" loading="lazy" decoding="async" alt="황혼의 폐허 속 통신탑과 17번 채널 복구 장면"/>
     <strong id="exploration-tower-title">통신탑 · 끊긴 신호</strong>
     <p id="exploration-tower-story"></p>
     <div id="exploration-tower-actions" class="exploration-map__tower-actions"></div>
    </section>
    <section id="exploration-finale" class="exploration-map__finale" aria-label="생존 이야기 결말" hidden>
     <img class="exploration-map__narrative-photo" src="/assets/exploration/photos/ending_stories.webp" loading="lazy" decoding="async" alt="폐허 도시 옥상의 정착과 구조 신호에 관한 결말 장면"/>
     <strong>마지막 기록 · 옥상의 내일</strong>
     <p id="exploration-finale-story"></p>
     <div id="exploration-finale-actions" class="exploration-map__tower-actions"></div>
    </section>
    <div class="exploration-map__routine">
     <button id="exploration-map-daily" class="exploration-map__control exploration-map__control--secondary" type="button">오늘의 기존 탐색 선택</button>
     <button id="exploration-map-emergency" class="exploration-map__control exploration-map__control--secondary" type="button">긴급 보급 탐색</button>
    </div>
   </div>
  </div>
 </div>`;
 document.body.appendChild(root);
 const q=selector=>root.querySelector(selector);
 const markers=q('#exploration-map-markers');
 const mapCard=q('#exploration-map-card');
 const stage=q('#exploration-map-stage');
 const choices=q('#exploration-map-choices');
 let selected='ruined_house',zone='near',lastTrigger=null,lastMissionKey='',snoozeUntil=0;
 let fogLastZone=null,fogLastStage=null,fogLastSignature='',fogFrame=0;
 let latestGuide=null;
 let preparedSite=null,prepConfirmedFor=null,lastReturnReport=null;
 const visible=()=>!root.hidden;
 const hidePreparation=()=>{
  preparedSite=null;q('#exploration-map-prep').hidden=true;
 };
 function showPreparation(siteId=selected){
  const site=siteById(siteId);
  if(!site||siteId!==selected)return;
  const data=getExpeditionPreparation(getState(),site.id,getNow());
  if(!data.ready){stage.textContent=data.reason;hidePreparation();return;}
  preparedSite=site.id;
  const panel=q('#exploration-map-prep'),metrics=q('#exploration-map-prep-metrics');
  q('#exploration-map-prep-title').textContent='출발 전 준비 · '+data.siteName;
  q('#exploration-map-prep-detail').textContent=
   '게임 시간 편도 25분 · 오늘 지도 탐사 1회 소모 · 현장 도착 후 탐색 방식 선택. 예상 발견: '+data.expected;
  metrics.replaceChildren();
  for(const label of ['건강 '+data.health,'식수 '+data.water,'부품 '+data.parts]){
   const span=document.createElement('span');span.textContent=label;metrics.append(span);
  }
  const odds=action=>{
   const value=data.odds[action];
   return Math.round(value.injury*100)+'% / '+Math.round(value.sickness*100)+'%';
  };
  q('#exploration-map-prep-options').textContent=
   '행동별 부상·감염 위험 기준치: 깊이 수색 '+odds('go')+
   ' · 정찰 '+odds('scout')+(data.scoutReady?' (식수 1개 소모)':' (식수 부족)')+
   ' · 자재 회수 '+odds('salvage')+(data.salvageReady?'':' (부품 충분)')+
   ' · 실제 위험은 탐사 판정 결과에 따릅니다.';
  panel.hidden=false;panel.scrollIntoView({block:'nearest'});
  q('#exploration-map-prep-confirm').focus({preventScroll:true});
 }
 const setZone=next=>{
  if(!['near','far'].includes(next)||getState().explorationMap?.mission)return;
  zone=next;
  hidePreparation();
  const current=siteById(selected);
  if(current?.zone!==zone){
   const local=EXPLORATION_SITES.filter(site=>site.zone===zone);
   const next=local.find(site=>getSiteState(site.id).visibility!=='unknown'&&!getSiteState(site.id).completed);
   const visited=local.find(site=>getSiteState(site.id).visibility!=='unknown');
   selected=next?.id||visited?.id||local[0].id;
  }
  q('#exploration-area-near').setAttribute('aria-pressed',String(zone==='near'));
  q('#exploration-area-far').setAttribute('aria-pressed',String(zone==='far'));
  render();
 };
 q('#exploration-area-near').addEventListener('click',()=>setZone('near'));
 q('#exploration-area-far').addEventListener('click',()=>setZone('far'));
 const getSiteState=id=>getState().explorationMap?.sites?.[id]||{visibility:'unknown',visits:0,completed:false};
 const close=()=>{
  if(!visible())return;
  if(getState().explorationMap?.mission?.phase==='encounter')
   snoozeUntil=Date.now()+6000; // Let the player inspect supplies before reopening.
  root.hidden=true;
  hidePreparation();
  if(fogFrame){window.cancelAnimationFrame(fogFrame);fogFrame=0;}
  // A reopened map always paints its saved stage at the exact final opacity.
  fogLastZone=null;fogLastStage=null;fogLastSignature='';
  if(lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});
 };
 function open(trigger=null){
  if(getState().survivalStatus==='dead')return;
  if(hasBlockingChoice?.())return;
  lastTrigger=trigger||document.activeElement;
  hidePreparation();
  if(!getState().explorationMap?.mission){
   const guide=buildBlackMapGuide(getState());
   if(guide.kind==='site'&&guide.targetId)zone=guide.zone;
   else if(guide.kind==='tower')zone='near';
   else if(guide.kind==='finale'||guide.kind==='done')zone='far';
   const active=EXPLORATION_SITES.find(site=>site.zone===zone&&
    getSiteState(site.id).visibility!=='unknown'&&!getSiteState(site.id).completed);
   if(active)selected=active.id; // Reopen at the next playable story stage.
   else if(guide.targetId)selected=guide.targetId;
  }
  root.hidden=false;
  render();
  q('.exploration-map__panel').scrollTop=0;
  q('#exploration-map-close').focus({preventScroll:true});
 }
 function renderFog(){
  const canvas=q('#exploration-fog'),ctx=canvas.getContext('2d');
  if(!ctx)return;
  const progress=explorationFogStage(getState().explorationMap,zone,EXPLORATION_SITES);
  // The original save flags are the sole source of truth: 0/6 starts black,
  // each *completed* site opens one stage; a failed visit reveals only its
  // immediate surroundings and never grants a free completion stage.
  const sig=zone+':'+progress.stage+':'+
   EXPLORATION_SITES.filter(site=>site.zone===zone)
    .map(site=>{const p=getSiteState(site.id);return [p.visibility,p.visits,p.completed].join(',')}).join(':');
  const ratio=Math.min(3,Math.max(1,window.devicePixelRatio||1));
  const width=Math.round(320*ratio),height=Math.round(213*ratio);
  const resized=canvas.width!==width||canvas.height!==height;
  if(resized){canvas.width=width;canvas.height=height;}
  if(sig===fogLastSignature&&!resized)return;
  const oldStage=fogLastZone===zone?fogLastStage:null;
  fogLastZone=zone;fogLastStage=progress.stage;fogLastSignature=sig;
  if(fogFrame){window.cancelAnimationFrame(fogFrame);fogFrame=0;}
  const paint=alpha=>{
   ctx.setTransform(ratio,0,0,ratio,0,0);
   ctx.globalCompositeOperation='source-over';
   ctx.clearRect(0,0,320,213);
   if(alpha<=.001)return; // Stage 6: all six sites completed, no dark mask.
   ctx.fillStyle=`rgba(3,6,10,${alpha.toFixed(3)})`;
   ctx.fillRect(0,0,320,213);
   const reveal=(x,y,r,opacity=1)=>{
    const cx=x*320,cy=y*213,rad=r*320;
    const gradient=ctx.createRadialGradient(cx,cy,rad*.15,cx,cy,rad);
    gradient.addColorStop(0,`rgba(0,0,0,${opacity})`);
    gradient.addColorStop(.62,`rgba(0,0,0,${opacity*.95})`);
    gradient.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalCompositeOperation='destination-out';
    ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.fill();
    ctx.globalCompositeOperation='source-over';
   };
   // Only a small pocket around the shelter is legible in the first stage.
   const homeRadius=zone==='far'?.045:.07;
   reveal(.50,.50,homeRadius+progress.stage*.009,.74);
   for(const site of EXPLORATION_SITES.filter(entry=>entry.zone===zone)){
    const data=getSiteState(site.id);
    if(data.visibility==='unknown')continue;
    const pin=explorationPinPosition(zone,site.id)||site;
    const visited=data.visits>0||data.completed;
    const radius=data.completed?(zone==='far'?.19:.25):
     visited?(zone==='far'?.13:.18):(zone==='far'?.052:.07);
    reveal(pin.x,pin.y,radius,data.completed?1:visited?.94:.3);
   }
  };
  const shouldAnimate=oldStage!==null&&progress.stage>oldStage&&
   !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(!shouldAnimate){paint(progress.alpha);return;}
  const fromAlpha=FOG_ALPHA_BY_STAGE[oldStage];
  const start=window.performance.now(),duration=900;
  // Interpolate only when the saved completion count increases; do not
  // replay fake stage-unlocks on reopen, reload or tab switch.
  const animate=now=>{
   const t=Math.min(1,Math.max(0,(now-start)/duration));
   const eased=t*t*(3-2*t);
   paint(fromAlpha+(progress.alpha-fromAlpha)*eased);
   fogFrame=t<1?window.requestAnimationFrame(animate):0;
  };
  paint(fromAlpha);
  fogFrame=window.requestAnimationFrame(animate);
 }
 function updateRoute(){
  const old=q('.exploration-map__route');
  old?.remove();
  const site=siteById(selected),data=getSiteState(selected);
  if(!site||site.zone!==zone||data.visibility==='unknown')return;
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 320 213');
  svg.setAttribute('preserveAspectRatio','none');
  svg.setAttribute('aria-hidden','true');
  svg.classList.add('exploration-map__route');
  const path=document.createElementNS(ns,'path');
  const pin=explorationPinPosition(zone,site.id)||site;
  const targetX=pin.x*320,targetY=pin.y*213;
  // Soft corner follows nearby ruined streets instead of a straight UI arrow.
  const jointX=160+(targetX-160)*.62;
  path.setAttribute('d',`M 160 106.5 Q ${jointX.toFixed(1)} 106.5 ${jointX.toFixed(1)} ${(106.5+targetY)/2} T ${targetX.toFixed(1)} ${targetY.toFixed(1)}`);
  path.setAttribute('fill','none');
  path.setAttribute('stroke',data.completed?'#86c79a':'#efbd77');
  path.setAttribute('stroke-width','1.6');
  path.setAttribute('stroke-dasharray','3 4');
  path.setAttribute('stroke-linecap','round');
  svg.append(path);
  q('.exploration-map__map').append(svg);
 }
 function updateMarkers(){
  markers.replaceChildren();
  for(const site of EXPLORATION_SITES.filter(item=>item.zone===zone)){
   const data=getSiteState(site.id);
   if(data.visibility==='unknown')continue; // Future stages have no visible marker.
   const button=document.createElement('button');
   button.type='button';button.className='exploration-map__marker';
   button.dataset.visibility=data.visibility;button.dataset.selected=String(selected===site.id);
   button.dataset.goal=String(latestGuide?.kind==='site'&&latestGuide.targetId===site.id);
   button.setAttribute('aria-pressed',String(selected===site.id));
   const pin=explorationPinPosition(zone,site.id)||site;
   button.style.left=(pin.x*100)+'%';button.style.top=(pin.y*100)+'%';
   button.disabled=data.visibility==='unknown';
   button.title=data.visibility==='unknown'?'미발견 지역':site.label+' · '+(LABELS[data.visibility]||'탐사');
   button.setAttribute('aria-label',button.title);
   const icon=document.createElement('img');
   icon.src=ASSET+'markers/'+(data.visibility==='unknown'?'state_unknown':site.id)+'.svg';
   icon.alt='';
   const stateMark=document.createElement('span');
   stateMark.textContent=data.completed?'✓':data.visibility==='visited'?'•':data.visibility==='unknown'?'?':'!';
   button.append(icon,stateMark);
   button.addEventListener('click',()=>{
    selected=site.id;hidePreparation();render();
    markers.querySelector('.exploration-map__marker[data-selected="true"]')?.focus({preventScroll:true});
   });
   markers.appendChild(button);
  }
 }
 function makeButton(text,handler,{disabled=false,cls=''}={}){
  const b=document.createElement('button');
  b.classList.add('exploration-map__control');
  b.type='button';b.textContent=text;b.disabled=disabled;
  if(cls)b.classList.add(...cls.split(/\s+/).filter(Boolean));
  b.addEventListener('click',handler);return b;
 }

 function storyAction(text,handler){
  return makeButton(text,()=>{
   const result=handler();
   if(!result.good){q('#exploration-map-stage').textContent=result.msg;return;}
   onStory?.(result);
   save();
   render();
  });
 }
 function renderTowerStory(s){
  const tower=q('#exploration-tower'),container=q('#exploration-tower-actions');
  const phase=s.explorationMap?.tower?.phase||'unknown';
  tower.hidden=phase==='unknown';
  if(tower.hidden)return;
  const stages={
   discovered:'통신실의 17번 채널 기록을 확보했습니다. 고장 난 통신탑을 먼저 조사해야 합니다.',
   surveyed:'파손 부위를 확인했습니다. 수리 부품 4개를 확보하면 전원과 배선을 복구할 수 있습니다.',
   parts_ready:'수리 부품 4개를 확보했습니다. 통신탑의 연결 회로를 복구하세요.',
   restored:'통신탑을 복구했습니다. 단파 무전기로 17번 채널을 연결하면 원거리 구역을 찾을 수 있습니다.',
   channel17:'17번 채널 연결 완료 · 첫 원거리 지역만 열렸습니다. 각 지역을 조사 완료하면 다음 한 곳이 열립니다.'
  };
  q('#exploration-tower-story').textContent=(stages[phase]||'')+
   (s.explorationMap?.tower?.lastStory?' 지난 작업 기록: '+s.explorationMap.tower.lastStory:'');
  container.replaceChildren();
  const current={
   discovered:['고장 난 통신탑 조사','survey'],
   surveyed:['수리 부품 4개 확보','prepare'],
   parts_ready:['통신탑 배선 복구','restore'],
   restored:['무전기로 17번 채널 연결','connect']
  }[phase];
  if(current){
   const btn=storyAction(current[0],()=>advanceTowerStory(getState(),current[1]));
   if(s.explorationMap?.mission)btn.disabled=true;
   container.append(btn);
  }
 }
 function renderFinale(s,now){
  const section=q('#exploration-finale'),container=q('#exploration-finale-actions');
  const ending=s.explorationMap?.ending?.type||'none';
  const available=mapFinaleAvailability(s);
  section.hidden=ending==='none'&&s.explorationMap?.tower?.phase!=='channel17';
  if(section.hidden)return;
  container.replaceChildren();
  q('#exploration-finale-story').textContent=ending==='settle'?
   '정착 기록 완료 · 옥상 캠프를 유지하며 계속 살아갑니다.':
   ending==='signal'?'구조 신호 기록 완료 · 응답을 기다리며 생존을 이어갑니다.':
    available.reason;
  if(!available.ready||s.explorationMap?.mission)return;
  container.append(
   storyAction('이 옥상에 정착한다',()=>resolveMapFinale(getState(),'settle',getNow())),
   storyAction('17번 채널에 구조 신호를 남긴다',()=>resolveMapFinale(getState(),'signal',getNow()))
  );
 }

 function renderGuide(s,now){
  const guide=latestGuide||buildBlackMapGuide(s);
  q('#exploration-map-guide-chapter').textContent='CHAPTER '+guide.chapter+' · '+guide.chapterName;
  q('#exploration-map-guide-progress').textContent=guide.total+' / 12 조사 완료';
  q('#exploration-map-guide-title').textContent=guide.title;
  q('#exploration-map-guide-description').textContent=guide.description;
  q('#exploration-map-guide-meter').style.width=guide.progress+'%';
  q('.exploration-map__mission-meter').setAttribute('aria-valuenow',String(guide.total));
  const button=q('#exploration-map-guide-action'),hint=q('#exploration-map-guide-hint');
  const passive=q('#exploration-map-guide-status');
  let action='none',label='진행 상태 확인',reason='',disabled=false;
  if(guide.kind==='mission'){
   const phase=s.explorationMap.mission?.phase;
   if(phase==='encounter'){
    action='encounter';label='현장 선택으로 이동';reason='위험을 확인한 후 수색·정찰·회수·복귀 중 선택하세요.';
   }else{
    disabled=true;label=phase==='returning'?'귀환 중 · 결과 대기':'목표 장소로 이동 중';
    reason='게임 시간이 흐르면 다음 단계가 열립니다.';
   }
  }else if(guide.kind==='site'){
   if(zone!==guide.zone||selected!==guide.targetId){
    action='focus';label='다음 목표 · '+(siteById(guide.targetId)?.label||'목표 장소')+' 보기';
    reason='지도에서 목표 위치를 자동으로 선택합니다.';
   }else{
    const ready=mapExpeditionAvailability(s,guide.targetId,now);
    action=ready.ready?'depart':'none';disabled=!ready.ready;
    label=ready.ready?'탐사 출발 · '+(siteById(guide.targetId)?.label||'목표 장소'):'출발 대기 · 조건 확인';
    reason=ready.ready?'하루 1회 탐사를 사용합니다. 현장에서 방법과 위험을 선택합니다.':ready.reason;
   }
  }else if(guide.kind==='tower'){
   action='tower';label='통신탑 복구 단계 보기';
   const phase=s.explorationMap?.tower?.phase;
   const missingParts=phase==='surveyed'&&(s.supply?.parts||0)<4;
   const missingRadio=phase==='restored'&&!s.kit?.radio;
   reason=missingParts?
    '수리 부품 '+Math.max(0,4-(s.supply?.parts||0))+'개가 더 필요합니다. 보급 탐색에서 자원을 확보하세요.':
    missingRadio?'연결하려면 단파 무전기가 필요합니다. 보급 탐색을 확인하세요.':
    '아래에서 실제 통신탑 작업을 단계별로 진행합니다.';
   if(missingParts||missingRadio){
    if(s.scavenge?.pending){action='daily';label='오늘의 보급 탐색 열기';}
    else {action='emergency';label='긴급 보급 탐색 보기';}
   }
  }else if(guide.kind==='finale'){
   action='finale';label='마지막 생존 기록 선택하기';
   reason='정착 또는 구조 신호 송신 중 하나를 선택합니다.';
  }else{
   if(s.scavenge?.pending){action='daily';label='오늘의 생존 탐색 열기';}
   else {action='emergency';label='긴급 보급 탐색 보기';}
   reason='12곳 조사는 끝났지만 생존은 계속됩니다. 기존 보급 탐색을 이어가세요.';
  }
  button.dataset.action=action;button.textContent=label;button.disabled=disabled;
  // Never render a wait/blocked condition as a large gold button.
  // Only an actionable command receives the metal button artwork and hit area.
  button.hidden=disabled;
  passive.hidden=!disabled;
  if(disabled)passive.textContent=(guide.kind==='mission'?'진행 상태 · ':'출발 상태 · ')+label;
  hint.textContent=reason;
 }
 function renderDailyOperations(s,now){
  const data=getDailyOperations(s,now),btn=q('#exploration-map-daily-shortcut');
  q('#exploration-map-daily-status').textContent=
   'DAY '+data.day+' · '+data.status+(data.ended?' · 완료 후 생존 루틴':'');
  q('#exploration-map-daily-title').textContent=data.title;
  q('#exploration-map-daily-detail').textContent=data.detail;
  btn.dataset.action=data.action;btn.textContent=data.actionLabel;
  btn.disabled=Boolean(s.explorationMap?.mission)||s.survivalStatus==='dead';
 }
 function renderReturnReport(){
  const panel=q('#exploration-map-return-report');
  panel.hidden=!lastReturnReport;
  if(!lastReturnReport)return;
  panel.dataset.success=String(lastReturnReport.success);
  q('#exploration-map-return-title').textContent=lastReturnReport.title;
  q('#exploration-map-return-detail').textContent=lastReturnReport.detail;
  q('#exploration-map-return-next').textContent=lastReturnReport.next;
 }
 function render(){
  if(!visible())return;
  const s=getState(),now=getNow(),mission=s.explorationMap?.mission;
  if(mission){
   selected=mission.siteId;
   zone=siteById(selected)?.zone||zone;
   hidePreparation();
  }
  q('#exploration-area-near').setAttribute('aria-pressed',String(zone==='near'));
  q('#exploration-area-far').setAttribute('aria-pressed',String(zone==='far'));
  q('#exploration-area-near').disabled=Boolean(mission)&&zone!=='near';
  q('#exploration-area-far').disabled=Boolean(mission)&&zone!=='far';
  const region=EXPLORATION_REGIONS[zone];
  const mapNode=q('.exploration-map__map');
  mapNode.dataset.zone=zone;
  mapNode.setAttribute('aria-label',region.title+' · '+region.scope);
  const cityImage=q('.exploration-map__city');
  const regionImage=ASSET+region.map;
  if(cityImage.getAttribute('src')!==regionImage)cityImage.setAttribute('src',regionImage);
  cityImage.alt=region.alt;
  const zoneProgress=explorationZoneProgress(s.explorationMap,zone,EXPLORATION_SITES);
  const fogProgress=explorationFogStage(s.explorationMap,zone,EXPLORATION_SITES);
  mapNode.dataset.fogStage=String(fogProgress.stage);
  q('#exploration-map-fog-stage').textContent=
   'STAGE '+fogProgress.stage+'/6 · '+fogProgress.name;
  for(const [i,step] of [...q('#exploration-map-fog-bars').children].entries())
   step.dataset.revealed=String(i<fogProgress.stage);
  const nextPlace=EXPLORATION_SITES.find(entry=>entry.zone===zone&&
   !getSiteState(entry.id).completed&&getSiteState(entry.id).visibility!=='unknown');
  q('#exploration-map-zone-brief').textContent=region.title+' · '+region.scope+
   ' · 조사 '+zoneProgress.completed+'/'+zoneProgress.total+
   (nextPlace?' · 다음: '+nextPlace.label:'');
  q('#exploration-area-near').textContent='근거리 · '+explorationZoneProgress(s.explorationMap,'near',EXPLORATION_SITES).completed+'/6';
  q('#exploration-area-far').textContent='원거리 · '+explorationZoneProgress(s.explorationMap,'far',EXPLORATION_SITES).completed+'/6';
  const completed=EXPLORATION_SITES.filter(site=>getSiteState(site.id).completed).length;
  const visited=EXPLORATION_SITES.filter(site=>getSiteState(site.id).visits>0).length;
  q('#exploration-map-count').textContent=`방문 ${visited}/${EXPLORATION_SITES.length} · 완료 ${completed}/${EXPLORATION_SITES.length}`;
  latestGuide=buildBlackMapGuide(s);
  renderFog();updateMarkers();updateRoute();choices.replaceChildren();mapCard.replaceChildren();
  renderTowerStory(s);
  renderFinale(s,now);
  const site=mission?siteById(mission.siteId):siteById(selected);
  const stateInfo=getSiteState(site.id);
  const locked=stateInfo.visibility==='unknown';
  mapCard.classList.toggle('is-locked',locked);
  const image=document.createElement('img');
  image.src=locked?ASSET+'markers/state_unknown.svg':ASSET+'photos/'+site.id+'.webp';
  image.alt='';image.className='exploration-map__site-image';image.decoding='async';
  const title=document.createElement('strong');title.textContent=locked?'미발견 장소':site.label;
  const status=document.createElement('small');
  // A place's old low/medium/high art label did NOT affect actual rolls.
  // Do not misrepresent it as a site-specific gameplay probability.
  status.textContent=(LABELS[stateInfo.visibility]||'미발견')+
    (stateInfo.visits?' · 방문 '+stateInfo.visits+'회':'')+
    (locked?'':' · 사고 위험은 현장에서 확인');
  const description=document.createElement('p');description.textContent=locked?
   (site.zone==='far'?(s.explorationMap?.tower?.phase==='channel17'?'이전 원거리 장소를 조사 완료해야 다음 위치가 하나씩 열립니다.':'17번 채널을 연결하면 원거리 첫 장소가 열립니다.'):'앞선 근거리 장소를 조사 완료하면 다음 위치가 열립니다.'):
   site.description;
  const rewards=document.createElement('p');
  rewards.textContent='예상 발견: '+(locked?'확인 전':site.reward);
  mapCard.append(image,title,status,description,rewards);
  // The quest status is derived from the same persisted visit/completion flags
  // as the actual encounter; no extra rewards or completion shortcuts.
  const quest=explorationQuestProgress(s.explorationMap,site.id);
  if(quest){
   const questNode=document.createElement('section');
   questNode.className='exploration-map__quest';
   questNode.dataset.status=quest.status;
   if(!locked&&quest.district){
    const sectorImage=document.createElement('img');
    sectorImage.className='exploration-map__district-photo';
    sectorImage.src=ASSET+quest.district.photo;
    sectorImage.alt=quest.district.title+' 전경';
    sectorImage.loading='lazy';
    sectorImage.decoding='async';
    questNode.append(sectorImage);
   }
   const questCopy=document.createElement('div');
   questCopy.className='exploration-map__quest-copy';
   const questStatus=document.createElement('small');
   questStatus.className='exploration-map__quest-status';
   questStatus.textContent='지역 퀘스트 · '+quest.statusLabel+
    (!locked&&quest.district?' · '+quest.district.title:'');
   const questTitle=document.createElement('strong');
   questTitle.textContent=locked?'발견되지 않은 지역 퀘스트':quest.title;
   const questObjective=document.createElement('p');
   questObjective.textContent=locked?
    (zone==='far'?(s.explorationMap?.tower?.phase==='channel17'?'바로 이전 원거리 장소를 조사 완료하면 목표가 열립니다.':'17번 채널 연결 후 첫 원거리 퀘스트가 열립니다.'):
     '앞선 근거리 장소를 조사 완료해야 다음 퀘스트가 열립니다.'):
    quest.status==='done'?'조사 기록 완료 · '+quest.lead:
    quest.status==='retry'?'이전 탐사에서 목표를 끝내지 못했습니다. '+quest.objective:
    quest.objective;
   questCopy.append(questStatus,questTitle,questObjective);
   questNode.append(questCopy);
   mapCard.append(questNode);
  }
  if(!locked&&(stateInfo.lastStory||stateInfo.lastTrail)){
   const journal=document.createElement('details');
   journal.className='exploration-map__journal';
   const summary=document.createElement('summary');
   summary.textContent='지난 탐사 기록 보기 · '+(stateInfo.lastDay?'DAY '+stateInfo.lastDay:'단서 확인');
   journal.append(summary);
   if(stateInfo.lastStory){
    const memory=document.createElement('p');
    memory.className='exploration-map__last-story';
    memory.textContent='최근 탐사 기록 · DAY '+(stateInfo.lastDay||'?')+' · '+stateInfo.lastStory;
    journal.append(memory);
   }
   if(stateInfo.lastTrail){
    const trail=document.createElement('p');
    trail.className='exploration-map__last-trail';
    trail.textContent='확인한 단서 · '+stateInfo.lastTrail;
    journal.append(trail);
   }
   mapCard.append(journal);
  }
  if(mission){
   stage.textContent=mission.phase==='outbound'?'옥상 계단실을 내려가고 있습니다. '+site.scene:
    mission.phase==='returning'?'귀환 중 · '+(mission.story||'탐험 결과를 기록했습니다.'):
    (explorationScene(site.id)?.arrival||site.scene)+' 선택과 날씨에 따라 부상·감염 확률이 달라집니다.';
   if(mission.phase==='encounter'){
    const sceneActions=SCENARIO_ACTIONS[site.id]||[];
    const riskText=decision=>{
     const odds=scavengeOdds(decision,s.weather);
     return odds?' · 부상 '+Math.round(odds.injury*100)+'% / 감염 '+Math.round(odds.sickness*100)+'%':'';
    };
    const actions=[
     ['go',(sceneActions[0]||'깊이 수색')+riskText('go')],
     ['scout',(sceneActions[1]||'안전 정찰')+' · 식수 -1'+riskText('scout')],
     ['salvage',(sceneActions[2]||'자재 회수')+riskText('salvage')],
     ['stay','위험을 피하고 즉시 복귀 · 방문 기록 없음']
    ];
    for(const [decision,caption] of actions){
     const missingWater=decision==='scout'&&(s.supply?.water??0)<1;
     choices.appendChild(makeButton(
      missingWater?caption+' · 식수 부족 (1개 필요)':caption,()=>{
       const result=resolveMapExpedition(getState(),decision,getNow(),Date.now());
       if(!result.good){stage.textContent=result.msg;return;}
       onChoice?.(result);
       save();render();
      },{disabled:missingWater}
     ));
     choices.lastElementChild.dataset.choice=decision;
     if(decision==='salvage'&&(s.supply?.parts||0)>=REPAIR_PARTS_RESERVE){
      choices.lastElementChild.disabled=true;
      choices.lastElementChild.title='부품 비축이 충분합니다. 다른 탐사 행동을 선택하세요.';
     }
    }
   }
  }else{
   const can=mapExpeditionAvailability(s,site.id,now);
   if(locked&&site.zone==='far'){
    const phase=s.explorationMap?.tower?.phase||'unknown';
    stage.textContent=phase==='unknown'?
     '원거리 미개방 · 근거리 통신실 조사를 완료해 통신탑 단서를 찾으세요.':
     phase==='channel17'?
      '다음 원거리 단계는 바로 이전 장소의 조사 완료 후 한 곳씩 열립니다.':
      '원거리 미개방 · 통신탑을 복구하고 단파 무전기로 17번 채널을 연결하세요.';
   }else if(locked){
    stage.textContent='미발견 지역 · 지금 열린 장소를 조사 완료하면 다음 하나가 열립니다.';
   }else if(stateInfo.completed){
    const next=EXPLORATION_SITES.find(entry=>entry.zone===zone&&entry.id!==site.id&&
     getSiteState(entry.id).visibility!=='unknown'&&!getSiteState(entry.id).completed);
    stage.textContent=next?'조사 완료 · 다음 장소: '+next.label+' · 탐사 단계를 계속하세요.':
     '이 구역의 발견된 장소 조사를 마쳤습니다. 다른 구역 또는 통신탑 기록을 확인하세요.';
    if(next)choices.appendChild(makeButton('다음 지역 · '+next.label+' 보기',()=>{
     selected=next.id;
     render();
     markers.querySelector('.exploration-map__marker[data-selected="true"]')?.focus({preventScroll:true});
    },{cls:'exploration-map__primary'}));
    if(!next&&zone==='near'){
     const tower=q('#exploration-tower');
     if(s.explorationMap?.tower?.phase==='channel17'){
      stage.textContent='근거리 조사 완료 · 17번 채널 연결 완료. 원거리 첫 지역으로 이동하세요.';
      choices.appendChild(makeButton('원거리 첫 지역 보기',()=>setZone('far'),
       {cls:'exploration-map__primary'}));
     }else if(!tower.hidden){
      stage.textContent='근거리 조사 완료 · 다음 목표는 통신탑 복구와 17번 채널 연결입니다.';
      choices.appendChild(makeButton('통신탑 복구 단계 보기',()=>{
       const action=tower.querySelector('button:not(:disabled)');
       (action||tower).scrollIntoView({block:'center'});
       action?.focus({preventScroll:true});
      },{cls:'exploration-map__primary'}));
     }
    }
    if(!next&&zone==='far'&&!q('#exploration-finale').hidden){
     const endingRecorded=s.explorationMap?.ending?.type!=='none';
     stage.textContent=endingRecorded?
      '원거리 조사 완료 · 마지막 생존 기록을 남겼습니다. 기록을 확인하세요.':
      '원거리 조사 완료 · 모든 지역을 확인했습니다. 마지막 생존 기록을 선택하세요.';
     choices.appendChild(makeButton(endingRecorded?'완료된 기록 확인':'마지막 기록 선택하기',()=>{
      const finale=q('#exploration-finale');
      const action=finale.querySelector('button:not(:disabled)');
      (action||finale).scrollIntoView({block:'center'});
      action?.focus({preventScroll:true});
     },{cls:'exploration-map__primary'}));
    }
   }else{
    stage.textContent=can.ready?
     '출발하면 오늘의 동네 탐사 1회를 사용합니다. 현장에서 탐사 방법과 사고 확률을 선택할 수 있습니다.':
     can.reason;
   }
   if(!stateInfo.completed&&stateInfo.visibility!=='unknown')
    choices.appendChild(makeButton('탐험 출발',()=>{
     if(prepConfirmedFor!==site.id){showPreparation(site.id);return;}
     if(hasBlockingChoice?.()){stage.textContent='진행 중인 생존자 선택을 먼저 처리하세요.';return;}
     const result=beginMapExpedition(getState(),site.id,getNow(),Date.now());
     if(!result.good){stage.textContent=result.msg;return;}
     lastReturnReport=null;
     onDepart?.(result);
     save();close();
    },{disabled:!can.ready,cls:'exploration-map__primary'}));
  }
  renderGuide(s,now);
  renderDailyOperations(s,now);
  renderReturnReport();
  q('#exploration-map-daily').disabled=Boolean(mission)||!s.scavenge?.pending;
  q('#exploration-map-emergency').disabled=Boolean(mission)||s.survivalStatus==='dead';
 }
 const openControl=document.getElementById('exploration-open');
 if(openControl)openControl.addEventListener('click',()=>open(openControl));
 q('#exploration-map-guide-action').addEventListener('click',()=>{
  const guide=latestGuide,action=q('#exploration-map-guide-action').dataset.action;
  if(!guide)return;
  if(action==='focus'&&guide.targetId){
   zone=guide.zone;selected=guide.targetId;render();
   markers.querySelector('.exploration-map__marker[data-selected="true"]')?.focus({preventScroll:true});
  }else if(action==='depart'){
   const departure=[...choices.querySelectorAll('button')].find(button=>
    button.textContent==='탐험 출발'&&!button.disabled);
   if(departure)departure.click();
  }else if(action==='encounter'){
   const option=choices.querySelector('button:not(:disabled)');
   (option||choices).scrollIntoView({block:'center'});
   option?.focus({preventScroll:true});
  }else if(action==='tower'||action==='finale'){
   const panel=q(action==='tower'?'#exploration-tower':'#exploration-finale');
   const button=panel.querySelector('button:not(:disabled)');
   (button||panel).scrollIntoView({block:'center'});
   button?.focus({preventScroll:true});
  }else if(action==='daily'||action==='emergency'){
   const button=q(action==='daily'?'#exploration-map-daily':'#exploration-map-emergency');
   if(!button.disabled)button.click();
  }
 });
 q('#exploration-map-daily-shortcut').addEventListener('click',()=>{
  const type=q('#exploration-map-daily-shortcut').dataset.action;
  const target=q(type==='daily'?'#exploration-map-daily':'#exploration-map-emergency');
  if(!target.disabled)target.click();
 });
 q('#exploration-map-prep-cancel').addEventListener('click',()=>{
  hidePreparation();q('#exploration-map-guide-action').focus({preventScroll:true});
 });
 q('#exploration-map-prep-confirm').addEventListener('click',()=>{
  const siteId=preparedSite;
  if(!siteId||siteId!==selected){hidePreparation();return;}
  const can=mapExpeditionAvailability(getState(),siteId,getNow());
  if(!can.ready){stage.textContent=can.reason;hidePreparation();render();return;}
  prepConfirmedFor=siteId;
  try{
   const button=[...choices.querySelectorAll('button')].find(b=>b.textContent==='탐험 출발'&&!b.disabled);
   button?.click();
  }finally{
   prepConfirmedFor=null;hidePreparation();
  }
 });
 q('#exploration-map-return-dismiss').addEventListener('click',()=>{
  lastReturnReport=null;render();q('#exploration-map-guide-action').focus({preventScroll:true});
 });
 q('#exploration-map-close').addEventListener('click',close);
 q('#exploration-map-daily').addEventListener('click',()=>{close();onDaily?.()});
 q('#exploration-map-emergency').addEventListener('click',()=>{close();onEmergency?.()});
 root.addEventListener('pointerdown',event=>{if(event.target===root)close()});
 document.addEventListener('keydown',event=>{
  if(!visible())return;
  if(event.key==='Escape'){event.preventDefault();close();}
 });
 function tick(now=getNow(),realNow=Date.now()){
  const priorOutcome=getState().explorationMap?.mission?.result||'';
  const progress=advanceMapExpedition(getState(),now,realNow);
  if(progress.changed){
   selected=progress.siteId||selected;
   save();
   if(progress.kind==='arrived'){
    if(!isAutoEnabled?.()&&!hasBlockingChoice?.())open();
   }else if(progress.kind==='returned'){
    lastReturnReport=getReturnReport(getState(),{...progress,outcome:priorOutcome});
    onReturn?.(progress);
    if(!isAutoEnabled?.()&&!hasBlockingChoice?.())open();
   }
  }
  if(visible()){
   if(hasBlockingChoice?.()){close();return progress;}
   const mission=getState().explorationMap?.mission;
   const identity=mission?mission.siteId+':'+mission.phase+
    (mission.phase==='encounter'?':scout-'+String((getState().supply?.water??0)>=1):'')+
    ':weather-'+getState().weather:
    'idle:'+currentExplorationDay(getState(),now)+':'+getState().weather+
    ':health-'+String(getState().health<35)+':sick-'+String(getState().sickness>=35)+
    ':water-'+Math.min(3,getState().supply?.water??0)+':food-'+Math.min(3,getState().supply?.food??0)+
    ':parts-'+Math.min(12,getState().supply?.parts??0)+
    ':pending-'+String(getState().scavenge?.pending?.id||'')+
    ':resolved-'+String(getState().scavenge?.lastResolvedDay||0)+
    ':radio-'+String(Boolean(getState().kit?.radio));
   if(identity!==lastMissionKey){lastMissionKey=identity;render();}
  }else if(getState().explorationMap?.mission?.phase==='encounter'&&
     !isAutoEnabled?.()&&realNow>=snoozeUntil&&!hasBlockingChoice?.()){
   open();
  }
  return progress;
 }
 /** Run the same location actions as player buttons, without opening
  * a modal every 1.25 seconds or awarding any extra resources. */
 function autoStep(plan,realNow=Date.now()){
  if(!plan||hasBlockingChoice?.())return {good:false,msg:'다른 필수 알림이 진행 중입니다.'};
  if(plan.kind==='depart'){
   const result=beginMapExpedition(getState(),plan.siteId,getNow(),realNow);
   if(!result.good)return result;
   lastReturnReport=null;
   onDepart?.(result);
   save();
   if(visible())render();
   return result;
  }
  if(plan.kind==='choice'){
   const result=resolveMapExpedition(getState(),plan.choice,getNow(),realNow);
   if(!result.good)return result;
   onChoice?.(result);
   save();
   if(visible())render();
   return result;
  }
  return {good:false,msg:'실행할 자동 탐험이 없습니다.'};
 }
 return {open,close,tick,render,autoStep,isOpen:visible,
  needsChoice:()=>getState().explorationMap?.mission?.phase==='encounter'};
}