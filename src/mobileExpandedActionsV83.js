/* AFTERDAY v83 | Optional mobile enlarged controls.
 * All choices forward to the SINGLE authoritative game button. Never mutate
 * survival state, duplicate listeners, or change the nine-cell bottom artwork.
 */
import {completeHudGlyph} from './hudActionGlyphsV1400.js';

export const TOUCH_MAIN_ACTIONS=Object.freeze([
 ['drink','식수'],['eat','식사'],['repair','수리'],
 ['rest','휴식'],['medicine','치료'],['explore','긴급 탐색'],
 ['repair-tank','물탱크 수리'],['life-panel-toggle','일상 행동'],
 ['functions-toggle','장비 기능']
]);
export const TOUCH_URGENT_ACTIONS=Object.freeze([
 ['take-cover','즉시 대피'],['secure-supplies','물자 고정'],
 ['collect-water','빗물 회수']
]);

export function canForwardTouchAction(source){
 return Boolean(source&&source.isConnected&&!source.hidden&&!source.disabled&&
  source.getAttribute('aria-disabled')!=='true');
}

export function installMobileExpandedActions(root=document){
 const trigger=root.getElementById('touch-actions-toggle');
 const panel=root.getElementById('touch-actions-panel');
 const mainGrid=root.getElementById('touch-actions-grid');
 const urgentGrid=root.getElementById('touch-actions-urgent');
 const urgentGroup=root.getElementById('touch-actions-urgent-group');
 const closeButton=root.getElementById('touch-actions-close');
 const bar=root.querySelector('#hud .actionbar');
 if(!trigger||!panel||!mainGrid||!urgentGrid||!urgentGroup||!closeButton||!bar)return null;
 if(trigger.dataset.expandedActionsReady==='true')return null;
 trigger.dataset.expandedActionsReady='true';

 const proxies=[];
 const close=(restoreFocus=true)=>{
  if(panel.classList.contains('hidden'))return;
  panel.classList.add('hidden');
  panel.setAttribute('aria-hidden','true');
  trigger.setAttribute('aria-expanded','false');
  trigger.setAttribute('aria-label','큰 버튼 조작 열기');
  if(restoreFocus)trigger.focus({preventScroll:true});
 };
 const addProxy=(id,label,grid,urgent=false)=>{
  const button=root.createElement('button');
  button.type='button';
  button.className='afterday-touch-actions__action'+(urgent?' is-urgent':'');
  button.dataset.sourceAction=id;
  button.setAttribute('aria-label',label);
  const icon=root.createElement('img');
  icon.src=completeHudGlyph(id);
  icon.alt='';
  icon.setAttribute('aria-hidden','true');
  icon.width=42;
  icon.height=42;
  const caption=root.createElement('span');
  caption.textContent=label;
  button.append(icon,caption);
  button.addEventListener('click',()=>{
   const original=root.getElementById(id);
   if(!canForwardTouchAction(original))return;
   close(false);
   original.click(); // Real action listener controls cost, gating and outcomes.
  });
  grid.appendChild(button);
  proxies.push({id,button,urgent});
 };
 TOUCH_URGENT_ACTIONS.forEach(([id,label])=>addProxy(id,label,urgentGrid,true));
 TOUCH_MAIN_ACTIONS.forEach(([id,label])=>addProxy(id,label,mainGrid));

 const sync=()=>{
  let urgentCount=0;
  for(const {id,button,urgent} of proxies){
   const original=root.getElementById(id);
   const available=canForwardTouchAction(original);
   button.hidden=!available;
   if(available&&urgent)urgentCount++;
  }
  urgentGroup.hidden=urgentCount===0;
 };
 const open=()=>{
  // Never let the optional sheet cover a mandatory in-game decision.
  if(root.querySelector('#hud > .afterday-board.is-choice:not([hidden])')||
     root.querySelector('.exploration-map-v78:not([hidden])'))return;
  const admin=root.getElementById('admin-toggle');
  if(admin?.getAttribute('aria-expanded')==='true')admin.click();
  const equipment=root.getElementById('equipment-actions-toggle');
  if(equipment?.getAttribute('aria-expanded')==='true')equipment.click();
  root.getElementById('weather-panel')?.classList.add('hidden');
  root.getElementById('life-panel')?.classList.add('hidden');
  sync();
  panel.classList.remove('hidden');
  panel.setAttribute('aria-hidden','false');
  trigger.setAttribute('aria-expanded','true');
  trigger.setAttribute('aria-label','큰 버튼 조작 닫기');
  closeButton.focus({preventScroll:true});
 };
 trigger.addEventListener('click',()=>{
  if(panel.classList.contains('hidden'))open();
  else close();
 });
 closeButton.addEventListener('click',()=>close());
 panel.addEventListener('pointerdown',event=>{
  if(event.target===panel)close();
 });
 root.addEventListener('keydown',event=>{
  if(panel.classList.contains('hidden'))return;
  if(event.key==='Escape'){
   event.preventDefault();
   close();
  }else if(event.key==='Tab'){
   const focusable=[...panel.querySelectorAll('button:not([hidden]):not([disabled])')]
    .filter(button=>button.offsetParent!==null);
   if(!focusable.length)return;
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&root.activeElement===first){
    event.preventDefault();
    last.focus();
   }else if(!event.shiftKey&&root.activeElement===last){
    event.preventDefault();
    first.focus();
   }
  }
 });
 const observer=new MutationObserver(()=>{
  if(!panel.classList.contains('hidden'))sync();
 });
 const options={subtree:true,attributes:true,attributeFilter:['hidden','disabled','aria-disabled']};
 observer.observe(bar,options);
 const watchTray=()=>{
  const tray=root.querySelector('#hud > .afterday-v3-urgent-actions');
  if(tray)observer.observe(tray,options);
 };
 watchTray();
 root.addEventListener('afterday:common-ui-ready',watchTray,{once:true});
 window.addEventListener('resize',()=>{
  if(window.innerWidth>720)close(false);
 });
 sync();
 return {open,close,sync};
}
