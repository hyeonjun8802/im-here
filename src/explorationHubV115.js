/* AFTERDAY v115 | One concise exploration hub behind the eighth HUD slot.
 * All buttons delegate to the ORIGINAL map/scavenge handlers and saved state.
 * No new resource rolls, simulation changes, additional HUD slots or duplicates.
 */
import {EXPLORATION_SITES} from './explorationMapV78.js';

export function explorationHubSummary(state){
 const map=state?.explorationMap;
 const count=zone=>{
  const sites=EXPLORATION_SITES.filter(site=>site.zone===zone);
  return [sites.filter(site=>Boolean(map?.sites?.[site.id]?.completed)).length,sites.length];
 };
 const [near,nTotal]=count('near'),[far,fTotal]=count('far');
 const mission=map?.mission;
 return '근거리 '+near+'/'+nTotal+' · 원거리 '+far+'/'+fTotal+
  (mission?' · 탐사 진행 중':'');
}
export function explorationHubPosition(buttonRect,{width=320,viewportWidth=390,
 viewportHeight=800,hudBottom=110,gap=10}={}){
 if(!buttonRect)return null;
 const availableWidth=Math.max(220,viewportWidth-24);
 const w=Math.min(width,availableWidth);
 const left=Math.max(12,Math.min(viewportWidth-w-12,buttonRect.right-w));
 const bottom=Math.max(0,viewportHeight-buttonRect.top+gap);
 const topSafe=Math.max(10,hudBottom+gap);
 const maxHeight=Math.max(90,buttonRect.top-topSafe-gap);
 return {left:Math.round(left),bottom:Math.round(bottom),
  width:Math.round(w),maxHeight:Math.floor(maxHeight)};
}
export function installExplorationHubV115({
 root=document,win=window,getState=()=>({}),getNow=()=>0,
 onOpen=()=>{},onEmergency=()=>{}
}={}){
 const toggle=root.getElementById('exploration-hub-toggle');
 const panel=root.getElementById('exploration-hub');
 const closeButton=root.getElementById('exploration-hub-close');
 const emergency=root.getElementById('exploration-emergency');
 const progress=root.getElementById('exploration-hub-progress');
 const daily=root.getElementById('expedition-toggle');
 const supply=root.getElementById('explore');
 const forecast=root.getElementById('disaster-forecast');
 if(!toggle||!panel||!closeButton||!emergency||!progress||!daily||!supply)
  return {isOpen:()=>false,close:()=>{},sync:()=>{}};
 const isOpen=()=>!panel.hidden;
 const sync=()=>{
  const s=getState();
  progress.textContent=explorationHubSummary(s);
  const pending=Boolean(s?.scavenge?.pending);
  emergency.hidden=pending;
  emergency.disabled=s?.survivalStatus==='dead';
  emergency.textContent=supply.dataset.supplyReady==='true'?
    '긴급 보급 탐색':'긴급 보급 · 대기 중';
  emergency.setAttribute('aria-disabled',String(supply.dataset.supplyReady!=='true'));
  emergency.title=supply.title||'긴급 보급 진행 상태 확인';
  // Only the original daily button is authoritative for a pending decision.
  // Do not overwrite its .hidden state maintained by renderHUD().
 };
 const position=()=>{
  if(!isOpen())return;
  const rect=toggle.getBoundingClientRect();
  const hudBottom=forecast?.getBoundingClientRect().bottom||0;
  const placement=explorationHubPosition(rect,{
   width:Math.min(334,win.innerWidth-24),
   viewportWidth:win.innerWidth,
   viewportHeight:win.innerHeight,hudBottom
  });
  if(!placement)return;
  panel.style.left=placement.left+'px';
  panel.style.bottom=placement.bottom+'px';
  panel.style.width=placement.width+'px';
  panel.style.maxHeight=placement.maxHeight+'px';
 };
 const close=()=>{
  if(!isOpen())return;
  panel.hidden=true;
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-label','탐사 메뉴 열기');
 };
 const open=()=>{
  onOpen();
  panel.hidden=false;
  toggle.setAttribute('aria-expanded','true');
  toggle.setAttribute('aria-label','탐사 메뉴 닫기');
  sync();position();
 };
 toggle.addEventListener('click',()=>isOpen()?close():open());
 closeButton.addEventListener('click',()=>{close();toggle.focus?.();});
 emergency.addEventListener('click',()=>{if(!emergency.disabled)onEmergency();});
 panel.addEventListener('click',event=>{
  if(event.target.closest?.('button')&&event.target!==closeButton)close();
 });
 root.addEventListener('pointerdown',event=>{
  if(isOpen()&&!panel.contains(event.target)&&!toggle.contains(event.target))close();
 },true);
 root.addEventListener('keydown',event=>{
  if(isOpen()&&event.key==='Escape'){close();toggle.focus?.();}
 });
 win.addEventListener('resize',position,{passive:true});
 win.visualViewport?.addEventListener('resize',position,{passive:true});
 return {isOpen,close,sync};
}
