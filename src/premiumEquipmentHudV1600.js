/* AFTERDAY premium equipment: one baked action well, optional controls in a popover. */
/** v119: keep the 9th-slot menu clear of the mobile emergency action tray. */
export function morePopupPlacement({triggerTop,triggerRight,viewportHeight,viewportWidth,
 forecastBottom=0,urgentTop=null,isMobile=false}={}){
 const anchorTop=Number.isFinite(urgentTop)?Math.min(triggerTop,urgentTop):triggerTop;
 const upperClearance=isMobile?Math.max(12,forecastBottom+8):12;
 return {
  bottom:Math.round(Math.max(0,viewportHeight-anchorTop+10)),
  right:Math.round(Math.max(12,viewportWidth-triggerRight)),
  maxHeight:Math.max(80,Math.floor(anchorTop-upperClearance-10))
 };
}

export function installPremiumEquipmentHudV1600(root=document){
 const kit=root.querySelector('#survival-kit');
 const actions=kit?.querySelector('.survival-kit-controls');
 if(!kit||!actions||kit.dataset.premiumEquipmentHud==='v16')return;
 kit.dataset.premiumEquipmentHud='v16';
 const toggle=root.createElement('button');
 toggle.id='equipment-actions-toggle';
 toggle.type='button';
 toggle.className='premium-equipment-disclosure';
 toggle.setAttribute('aria-controls','equipment-actions-menu');
 toggle.setAttribute('aria-expanded','false');
 toggle.setAttribute('aria-label','더보기 메뉴 열기');
 toggle.hidden=true;
 toggle.tabIndex=-1;
 toggle.setAttribute('aria-hidden','true');
 actions.id='equipment-actions-menu';
 actions.setAttribute('role','region');
 actions.setAttribute('aria-labelledby','equipment-actions-title');
 actions.setAttribute('aria-label','더보기 · 일상생활, 카메라, 음향과 설정');
 // Keep IDs and listeners, replace informal emoji captions with art-consistent
 // Korean UI copy; the original full label remains in aria-label and title.
 const compactActionNames={
  'radio-contact':'무전 교신 · 구조 요청',
  'expedition-toggle':'탐색 계획 확인',
  'companion-toggle':'생존자 구조 선택'
 };
 for(const button of actions.querySelectorAll('button')){
  if(!compactActionNames[button.id])continue;
  const full=button.textContent.trim();
  if(!button.getAttribute('aria-label'))button.setAttribute('aria-label',full);
  button.textContent=compactActionNames[button.id];
 }
 const menuHeading=root.createElement('strong');
 menuHeading.className='premium-equipment-menu-title';
 menuHeading.id='equipment-actions-title';
 menuHeading.textContent='더보기 · 생활과 설정';
 actions.prepend(menuHeading);
 const menuClose=root.createElement('button');
 menuClose.id='equipment-actions-close';
 menuClose.type='button';
 menuClose.textContent='✕';
 menuClose.setAttribute('aria-label','더보기 메뉴 닫기');
 actions.insertBefore(menuClose,menuHeading.nextSibling);
 kit.insertBefore(toggle,actions);
 const moreButton=root.querySelector('#functions-toggle');
 // Keep the floating menu inside the usable viewport without moving the
 // original equipment bitmap or its baked-in action well.
 const updatePopoverSpace=()=>{
  if(typeof window==='undefined')return;
  const trigger=moreButton?.getBoundingClientRect();
  if(!trigger)return;
  const forecastBottom=root.querySelector('#disaster-forecast')?.getBoundingClientRect().bottom||0;
  // Rain, storm and tornado controls are REAL playable actions, not toasts.
  // Anchor the menu above the tray whenever at least one action is visible.
  const urgent=root.querySelector('.afterday-v3-urgent-actions.has-urgent');
  const urgentRect=urgent?.getBoundingClientRect();
  const urgentVisible=Boolean(urgentRect?.height&&urgent?.querySelector('button:not([hidden])'));
  const place=morePopupPlacement({
   triggerTop:trigger.top,triggerRight:trigger.right,
   viewportHeight:window.innerHeight,viewportWidth:window.innerWidth,
   forecastBottom,urgentTop:urgentVisible?urgentRect.top:null,
   isMobile:window.matchMedia('(max-width:720px)').matches
  });
  actions.style.setProperty('--afterday-equipment-menu-space',place.maxHeight+'px');
  actions.style.setProperty('--afterday-more-menu-bottom',place.bottom+'px');
  actions.style.setProperty('--afterday-more-menu-right',place.right+'px');
 };
 const urgentObserver=new MutationObserver(()=>{
  if(kit.classList.contains('premium-equipment-open'))updatePopoverSpace();
 });
 let observedUrgent=null;
 const observeUrgentTray=()=>{
  const tray=root.querySelector('.afterday-v3-urgent-actions');
  if(!tray||tray===observedUrgent)return;
  urgentObserver.disconnect();
  urgentObserver.observe(tray,{subtree:true,attributes:true,attributeFilter:['class','hidden']});
  observedUrgent=tray;
 };
 const close=()=>{
  kit.classList.remove('premium-equipment-open');
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-label','더보기 메뉴 열기');
 };
 const sync=()=>{
  const active=[...actions.querySelectorAll('button')].filter(b=>!b.hidden&&b!==menuClose);
  toggle.hidden=true; // Only the existing ninth actionbar slot opens this menu.
  if(!active.length)close();
 };
 toggle.addEventListener('click',event=>{
  event.stopPropagation();
  const isOpen=kit.classList.toggle('premium-equipment-open');
  if(isOpen){observeUrgentTray();updatePopoverSpace();}
  toggle.setAttribute('aria-expanded',String(isOpen));
  toggle.setAttribute('aria-label',isOpen?'더보기 메뉴 닫기':'더보기 메뉴 열기');
 });
 actions.addEventListener('click',event=>{if(event.target.closest('button'))close()});
 menuClose.addEventListener('click',()=>moreButton?.focus?.({preventScroll:true}));
 // The last actionbar cell is OUTSIDE kit. Do not close on its
 // pointerdown or a second tap would close then instantly reopen More.
 root.addEventListener('pointerdown',event=>{
  if(!kit.contains(event.target)&&!moreButton?.contains(event.target))close();
 },true);
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&kit.classList.contains('premium-equipment-open')){
   close();toggle.focus();
  }
 });
 new MutationObserver(sync).observe(actions,{subtree:true,attributes:true,attributeFilter:['hidden']});
 if(typeof window!=='undefined'){
  window.addEventListener('resize',()=>{
   if(kit.classList.contains('premium-equipment-open'))updatePopoverSpace();
  });
  document.addEventListener('afterday:common-ui-ready',()=>{
   observeUrgentTray();
   if(kit.classList.contains('premium-equipment-open'))updatePopoverSpace();
  });
  window.visualViewport?.addEventListener('resize',()=>{
   if(kit.classList.contains('premium-equipment-open'))updatePopoverSpace();
  },{passive:true});
 }
 sync();
}
