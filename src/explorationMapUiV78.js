/** AFTERDAY | Black Map interface, phase-aware and save-aware.
 * Rendering layer only. No asynchronous reward rolls or secondary save keys.
 * Artwork is deliberately separate from labels and localized HTML. */
import {
 EXPLORATION_SITES,mapExpeditionAvailability,beginMapExpedition,
 advanceMapExpedition,resolveMapExpedition,advanceTowerStory,
 mapFinaleAvailability,resolveMapFinale
} from './explorationMapV78.js';

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
   <button id="exploration-map-close" type="button" aria-label="탐사 지도 닫기">✕</button>
  </div>
  <div class="exploration-map__columns">
   <div class="exploration-map__map-wrap">
    <div class="exploration-map__areas" role="group" aria-label="탐사 구역">
     <button id="exploration-area-near" type="button" aria-pressed="true">근거리 · 6곳</button>
     <button id="exploration-area-far" type="button" aria-pressed="false">원거리 · 6곳</button>
    </div>
    <div class="exploration-map__map" aria-label="방문하면 안개가 밝아지는 동네 지도">
     <img class="exploration-map__city" src="${ASSET}map/overview_hd.svg" alt="폐허가 된 동네의 탐사 지도"/>
     <canvas id="exploration-fog" width="320" height="213" aria-hidden="true"></canvas>
     <span class="exploration-map__home" aria-label="나의 옥상">⌂</span>
     <div id="exploration-map-markers" class="exploration-map__markers"></div>
    </div>
    <div class="exploration-map__legend"><span>● 내 옥상</span><span>◌ 위치 발견</span><span>✓ 조사 완료</span></div>
   </div>
   <div class="exploration-map__detail">
    <div id="exploration-map-card" class="exploration-map__card"></div>
    <div id="exploration-map-stage" class="exploration-map__stage" role="status" aria-live="polite"></div>
    <div id="exploration-map-choices" class="exploration-map__choices"></div>
    <section id="exploration-tower" class="exploration-map__tower" aria-label="통신탑 복구 이야기" hidden>
     <strong id="exploration-tower-title">통신탑 · 끊긴 신호</strong>
     <p id="exploration-tower-story"></p>
     <div id="exploration-tower-actions" class="exploration-map__tower-actions"></div>
    </section>
    <section id="exploration-finale" class="exploration-map__finale" aria-label="생존 이야기 결말" hidden>
     <strong>마지막 기록 · 옥상의 내일</strong>
     <p id="exploration-finale-story"></p>
     <div id="exploration-finale-actions" class="exploration-map__tower-actions"></div>
    </section>
    <div class="exploration-map__routine">
     <button id="exploration-map-daily" type="button">오늘의 기존 탐색 선택</button>
     <button id="exploration-map-emergency" type="button">긴급 보급 탐색</button>
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
 const visible=()=>!root.hidden;
 const setZone=next=>{
  if(!['near','far'].includes(next))return;
  zone=next;
  const current=siteById(selected);
  if(current?.zone!==zone){
   const available=EXPLORATION_SITES.find(site=>site.zone===zone&&getSiteState(site.id).visibility!=='unknown');
   selected=available?.id||EXPLORATION_SITES.find(site=>site.zone===zone).id;
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
  if(lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});
 };
 function open(trigger=null){
  if(getState().survivalStatus==='dead')return;
  if(hasBlockingChoice?.())return;
  lastTrigger=trigger||document.activeElement;
  root.hidden=false;
  render();
  q('#exploration-map-close').focus({preventScroll:true});
 }
 function renderFog(){
  const canvas=q('#exploration-fog'),ctx=canvas.getContext('2d');
  if(!ctx)return;
  // Match the device pixel ratio: a 320×213 fog mask looked soft on retina
  // displays even after replacing the low-resolution map image.
  const ratio=Math.min(3,Math.max(1,window.devicePixelRatio||1));
  const width=Math.round(320*ratio),height=Math.round(213*ratio);
  if(canvas.width!==width||canvas.height!==height){
   canvas.width=width;canvas.height=height;
  }
  ctx.setTransform(ratio,0,0,ratio,0,0);
  ctx.clearRect(0,0,320,213);
  ctx.fillStyle='rgba(5,9,13,.82)';ctx.fillRect(0,0,320,213);
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
  reveal(.50,.50,.22);
  for(const site of EXPLORATION_SITES.filter(entry=>entry.zone===zone)){
   const data=getSiteState(site.id);
   if(data.visibility==='unknown')continue;
   reveal(site.x,site.y,data.visits>0?.2:.11,data.visits>0?1:.72);
  }
 }
 function updateRoute(){
  const old=q('.exploration-map__route');
  old?.remove();
  const site=siteById(selected),data=getSiteState(selected);
  if(!site||site.zone!==zone||data.visibility==='unknown')return;
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 320 213');
  svg.setAttribute('aria-hidden','true');
  svg.classList.add('exploration-map__route');
  const path=document.createElementNS(ns,'path');
  const targetX=site.x*320,targetY=site.y*213;
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
   const button=document.createElement('button');
   button.type='button';button.className='exploration-map__marker';
   button.dataset.visibility=data.visibility;button.dataset.selected=String(selected===site.id);
   button.style.left=(site.x*100)+'%';button.style.top=(site.y*100)+'%';
   button.disabled=data.visibility==='unknown';
   button.title=data.visibility==='unknown'?'미발견 지역':site.label+' · '+(LABELS[data.visibility]||'탐사');
   button.setAttribute('aria-label',button.title);
   const icon=document.createElement('img');
   icon.src=ASSET+'markers/'+(data.visibility==='unknown'?'state_unknown':site.id)+'.svg';
   icon.alt='';
   const stateMark=document.createElement('span');
   stateMark.textContent=data.completed?'✓':data.visibility==='visited'?'•':data.visibility==='unknown'?'?':'!';
   button.append(icon,stateMark);
   button.addEventListener('click',()=>{selected=site.id;render()});
   markers.appendChild(button);
  }
 }
 function makeButton(text,handler,{disabled=false,cls=''}={}){
  const b=document.createElement('button');
  b.type='button';b.textContent=text;b.disabled=disabled;
  if(cls)b.className=cls;
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
   channel17:'17번 채널 연결 완료 · 원거리 탐사 구역 6곳이 열렸습니다.'
  };
  q('#exploration-tower-story').textContent=stages[phase]||'';
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

 function render(){
  if(!visible())return;
  const s=getState(),now=getNow(),mission=s.explorationMap?.mission;
  if(mission){
   selected=mission.siteId;
   zone=siteById(selected)?.zone||zone;
  }
  q('#exploration-area-near').setAttribute('aria-pressed',String(zone==='near'));
  q('#exploration-area-far').setAttribute('aria-pressed',String(zone==='far'));
  const completed=EXPLORATION_SITES.filter(site=>getSiteState(site.id).completed).length;
  const visited=EXPLORATION_SITES.filter(site=>getSiteState(site.id).visits>0).length;
  q('#exploration-map-count').textContent=`방문 ${visited}/${EXPLORATION_SITES.length} · 완료 ${completed}/${EXPLORATION_SITES.length}`;
  renderFog();updateMarkers();updateRoute();choices.replaceChildren();mapCard.replaceChildren();
  renderTowerStory(s);
  renderFinale(s,now);
  const site=mission?siteById(mission.siteId):siteById(selected);
  const stateInfo=getSiteState(site.id);
  const locked=stateInfo.visibility==='unknown';
  mapCard.classList.toggle('is-locked',locked);
  const image=document.createElement('img');
  image.src=locked?ASSET+'map/overview_hd.svg':ASSET+'locations/'+site.id+'_hd.svg';
  image.alt='';image.className='exploration-map__site-image';
  const title=document.createElement('strong');title.textContent=locked?'미발견 장소':site.label;
  const status=document.createElement('small');
  status.textContent=(LABELS[stateInfo.visibility]||'미발견')+' · 위험 '+site.risk+
    (stateInfo.visits?' · 방문 '+stateInfo.visits+'회':'');
  const description=document.createElement('p');description.textContent=locked?'탐사 단서가 더 필요합니다. 근거리 조사와 통신탑 복구를 진행하세요.':site.description;
  const rewards=document.createElement('p');
  rewards.textContent='예상 발견: '+(locked?'확인 전':site.reward);
  mapCard.append(image,title,status,description,rewards);
  if(mission){
   stage.textContent=mission.phase==='outbound'?'옥상 계단실을 내려가고 있습니다. 현장에 도착하면 선택지가 열립니다.':
    mission.phase==='returning'?'탐험 결과를 기록했습니다. 옥상으로 돌아오는 중입니다.':
    site.scene+' 행동에 따라 기존 물자·부상·감염 확률이 적용됩니다.';
   if(mission.phase==='encounter'){
    const sceneActions=SCENARIO_ACTIONS[site.id]||[];
    const actions=[
     ['go',(sceneActions[0]||'깊이 수색')+' · 위험 높음'],
     ['scout',(sceneActions[1]||'안전 정찰')+' · 식수 -1'],
     ['salvage',(sceneActions[2]||'자재 회수')+' · 부품 중심'],
     ['stay','위험을 피하고 즉시 복귀']
    ];
    for(const [decision,caption] of actions){
     choices.appendChild(makeButton(caption,()=>{
      const result=resolveMapExpedition(getState(),decision,getNow(),Date.now());
      if(!result.good){stage.textContent=result.msg;return;}
      onChoice?.(result);
      save();render();
     }));
    }
   }
  }else{
   const can=mapExpeditionAvailability(s,site.id,now);
   stage.textContent=can.reason;
   if(!stateInfo.completed&&stateInfo.visibility!=='unknown')
    choices.appendChild(makeButton('탐험 출발',()=>{
     if(hasBlockingChoice?.()){stage.textContent='진행 중인 생존자 선택을 먼저 처리하세요.';return;}
     const result=beginMapExpedition(getState(),site.id,getNow(),Date.now());
     if(!result.good){stage.textContent=result.msg;return;}
     onDepart?.(result);
     save();close();
    },{disabled:!can.ready,cls:'exploration-map__primary'}));
  }
  q('#exploration-map-daily').disabled=Boolean(mission)||!s.scavenge?.pending;
  q('#exploration-map-emergency').disabled=Boolean(mission)||s.survivalStatus==='dead';
 }
 const openControl=document.getElementById('exploration-open');
 if(openControl)openControl.addEventListener('click',()=>open(openControl));
 q('#exploration-map-close').addEventListener('click',close);
 q('#exploration-map-daily').addEventListener('click',()=>{close();onDaily?.()});
 q('#exploration-map-emergency').addEventListener('click',()=>{close();onEmergency?.()});
 root.addEventListener('pointerdown',event=>{if(event.target===root)close()});
 document.addEventListener('keydown',event=>{
  if(!visible())return;
  if(event.key==='Escape'){event.preventDefault();close();}
 });
 function tick(now=getNow(),realNow=Date.now()){
  const progress=advanceMapExpedition(getState(),now,realNow);
  if(progress.changed){
   selected=progress.siteId||selected;
   save();
   if(progress.kind==='arrived'){
    if(!isAutoEnabled?.()&&!hasBlockingChoice?.())open();
   }else if(progress.kind==='returned'){
    onReturn?.(progress);
    if(!isAutoEnabled?.()&&!hasBlockingChoice?.())open();
   }
  }
  if(visible()){
   if(hasBlockingChoice?.()){close();return progress;}
   const mission=getState().explorationMap?.mission;
   const identity=mission?mission.siteId+':'+mission.phase:'idle';
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