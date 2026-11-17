/* AFTERDAY premium equipment: one baked action well, optional controls in a popover. */
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
  const top=trigger?.top??kit.getBoundingClientRect().top;
  const forecast=document.getElementById('disaster-forecast');
  const forecastBottom=forecast?.getBoundingClientRect().bottom||0;
  const upperClearance=window.matchMedia('(max-width:720px)').matches
   ?Math.max(12,forecastBottom+8):12;
  const available=Math.max(80,Math.floor(top-upperClearance-10));
  actions.style.setProperty('--afterday-equipment-menu-space',available+'px');
  // Position the popup over the button that ACTUALLY opened it (right-hand
  // ninth slot), not the unrelated equipment caption at bottom left.
  if(trigger){
   const bottom=Math.max(0,window.innerHeight-trigger.top+9);
   const right=Math.max(12,window.innerWidth-trigger.right);
   actions.style.setProperty('--afterday-more-menu-bottom',Math.round(bottom)+'px');
   actions.style.setProperty('--afterday-more-menu-right',Math.round(right)+'px');
  }
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
  if(isOpen)updatePopoverSpace();
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
   if(kit.classList.contains('premium-equipment-open'))updatePopoverSpace();
  });
  window.visualViewport?.addEventListener('resize',()=>{
   if(kit.classList.contains('premium-equipment-open'))updatePopoverSpace();
  },{passive:true});
 }
 sync();
}
