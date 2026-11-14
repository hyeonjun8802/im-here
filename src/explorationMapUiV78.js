/** AFTERDAY | Black Map interface, phase-aware and save-aware.
 * Rendering layer only. No asynchronous reward rolls or secondary save keys.
 * Artwork is deliberately separate from labels and localized HTML. */
import {
 EXPLORATION_SITES,mapExpeditionAvailability,beginMapExpedition,
 advanceMapExpedition,resolveMapExpedition
} from './explorationMapV78.js';

const ASSET='/assets/exploration/';
const LABELS={unknown:'미발견',rumored:'위치 발견',visited:'방문함',completed:'조사 완료'};
const siteById=id=>EXPLORATION_SITES.find(site=>site.id===id);
export function createExplorationMapV78({getState,getNow,save,onDepart,onReturn,onChoice,onEmergency,onDaily,hasBlockingChoice}){
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
    <div class="exploration-map__map" aria-label="방문하면 안개가 밝아지는 동네 지도">
     <img class="exploration-map__city" src="${ASSET}map/overview.svg" alt="폐허가 된 동네의 탐사 지도"/>
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
 let selected='ruined_house',lastTrigger=null,lastMissionKey='',snoozeUntil=0;
 const visible=()=>!root.hidden;
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
  ctx.clearRect(0,0,320,213);
  ctx.fillStyle='rgba(5,9,13,.92)';ctx.fillRect(0,0,320,213);
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
  reveal(.56,.56,.19);
  for(const site of EXPLORATION_SITES){
   const data=getSiteState(site.id);
   if(data.visibility==='unknown')continue;
   reveal(site.x,site.y,data.visits>0?.2:.085,data.visits>0?1:.64);
  }
 }
 function updateMarkers(){
  markers.replaceChildren();
  for(const site of EXPLORATION_SITES){
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
 function render(){
  if(!visible())return;
  const s=getState(),now=getNow(),mission=s.explorationMap?.mission;
  const completed=EXPLORATION_SITES.filter(site=>getSiteState(site.id).completed).length;
  const visited=EXPLORATION_SITES.filter(site=>getSiteState(site.id).visits>0).length;
  q('#exploration-map-count').textContent=`방문 ${visited}/2 · 완료 ${completed}/2`;
  renderFog();updateMarkers();choices.replaceChildren();mapCard.replaceChildren();
  const site=mission?siteById(mission.siteId):siteById(selected);
  const stateInfo=getSiteState(site.id);
  const image=document.createElement('img');
  image.src=ASSET+'locations/'+site.id+'.svg';
  image.alt='';image.className='exploration-map__site-image';
  const title=document.createElement('strong');title.textContent=site.label;
  const status=document.createElement('small');
  status.textContent=(LABELS[stateInfo.visibility]||'미발견')+' · 위험 '+site.risk+
    (stateInfo.visits?' · 방문 '+stateInfo.visits+'회':'');
  const description=document.createElement('p');description.textContent=site.description;
  const rewards=document.createElement('p');
  rewards.textContent='예상 발견: '+site.reward;
  mapCard.append(image,title,status,description,rewards);
  if(mission){
   stage.textContent=mission.phase==='outbound'?'옥상 계단실을 내려가고 있습니다. 현장에 도착하면 선택지가 열립니다.':
    mission.phase==='returning'?'탐험 결과를 기록했습니다. 옥상으로 돌아오는 중입니다.':
    '현장에 도착했습니다. 위험을 감수할 행동을 선택하세요.';
   if(mission.phase==='encounter'){
    const actions=[
     ['go','깊이 수색 · 높은 보상과 위험'],
     ['scout','조용히 정찰 · 식수 1개 사용'],
     ['salvage','폐자재 회수 · 부품 중심'],
     ['stay','즉시 복귀 · 보상 없음']
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
    if(!hasBlockingChoice?.())open();
   }else if(progress.kind==='returned'){
    onReturn?.(progress);
    if(!hasBlockingChoice?.())open();
   }
  }
  if(visible()){
   if(hasBlockingChoice?.()){close();return progress;}
   const mission=getState().explorationMap?.mission;
   const identity=mission?mission.siteId+':'+mission.phase:'idle';
   if(identity!==lastMissionKey){lastMissionKey=identity;render();}
  }else if(getState().explorationMap?.mission?.phase==='encounter'&&
     realNow>=snoozeUntil&&!hasBlockingChoice?.()){
   open();
  }
  return progress;
 }
 return {open,close,tick,render,isOpen:visible,
  needsChoice:()=>getState().explorationMap?.mission?.phase==='encounter'};
}