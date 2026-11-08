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
 toggle.setAttribute('aria-label','생존 장비 기능 열기');
 toggle.hidden=true;
 actions.id='equipment-actions-menu';
 actions.setAttribute('aria-label','추가 장비 기능');
 kit.insertBefore(toggle,actions);
 const close=()=>{
  kit.classList.remove('premium-equipment-open');
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-label','생존 장비 기능 열기');
 };
 const sync=()=>{
  const active=[...actions.querySelectorAll('button')].filter(b=>!b.hidden);
  toggle.hidden=active.length===0;
  toggle.textContent='기능 '+active.length;
  if(!active.length)close();
 };
 toggle.addEventListener('click',event=>{
  event.stopPropagation();
  const isOpen=kit.classList.toggle('premium-equipment-open');
  toggle.setAttribute('aria-expanded',String(isOpen));
  toggle.setAttribute('aria-label',isOpen?'생존 장비 기능 닫기':'생존 장비 기능 열기');
 });
 actions.addEventListener('click',event=>{if(event.target.closest('button'))close()});
 root.addEventListener('pointerdown',event=>{if(!kit.contains(event.target))close()},true);
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&kit.classList.contains('premium-equipment-open')){
   close();toggle.focus();
  }
 });
 new MutationObserver(sync).observe(actions,{subtree:true,attributes:true,attributeFilter:['hidden']});
 sync();
}
