/* AFTERDAY premium equipment: one baked action well; More opens a native modal. */
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
 // The same existing button nodes and listeners are moved into a native
 // top-layer dialog so no HUD stacking context can cover the menu.
 const modal=root.createElement('dialog');
 modal.id='equipment-more-dialog';
 modal.setAttribute('aria-label','더보기 · 생활과 설정');
 modal.setAttribute('aria-modal','true');
 modal.append(actions);
 (root.querySelector('#hud')||root.body).append(modal);
 const moreButton=root.querySelector('#functions-toggle');
 const close=()=>{
  if(modal.open)modal.close();
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
  if(isOpen){
   if(!modal.open)modal.showModal();
   menuClose.focus?.({preventScroll:true});
  }else if(modal.open)modal.close();
  toggle.setAttribute('aria-expanded',String(isOpen));
  toggle.setAttribute('aria-label',isOpen?'더보기 메뉴 닫기':'더보기 메뉴 열기');
 });
 actions.addEventListener('click',event=>{if(event.target.closest('button'))close()});
 menuClose.addEventListener('click',()=>moreButton?.focus?.({preventScroll:true}));
 // A backdrop click targets <dialog>; inner buttons retain their own handlers.
 modal.addEventListener('click',event=>{
  if(event.target===modal){close();moreButton?.focus?.({preventScroll:true});}
 });
 modal.addEventListener('cancel',event=>{
  event.preventDefault();close();moreButton?.focus?.({preventScroll:true});
 });
 modal.addEventListener('close',()=>{
  kit.classList.remove('premium-equipment-open');
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-label','더보기 메뉴 열기');
 });
 // The last actionbar cell is OUTSIDE kit. Do not close on its
 // pointerdown or a second tap would close then instantly reopen More.
 root.addEventListener('pointerdown',event=>{
  if(modal.open&&!modal.contains(event.target)&&!moreButton?.contains(event.target))close();
 },true);
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&kit.classList.contains('premium-equipment-open')){
   close();moreButton?.focus?.({preventScroll:true});
  }
 });
 new MutationObserver(sync).observe(actions,{subtree:true,attributes:true,attributeFilter:['hidden']});
 sync();
}
