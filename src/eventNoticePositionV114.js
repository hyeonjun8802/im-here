/* AFTERDAY v114 | Read-only DOM anchor for transient warnings.
 * The actual weather line and three HUD controls determine the notice's top,
 * not hardcoded page center/bottom values. Read/measure only; no game state. */
export const NOTICE_ANCHOR_IDS=Object.freeze([
 '#disaster-forecast','#weather-brief',
 '#speed-toggle','#auto-toggle','#admin-toggle'
]);
export function noticeTopFromBounds({hudTop=0,visibleBottoms=[],gap=10,fallback=146}={}){
 const bottoms=visibleBottoms.filter(Number.isFinite);
 const relative=bottoms.length?Math.max(...bottoms)-hudTop+gap:fallback;
 return Math.max(0,Math.ceil(Number.isFinite(relative)?relative:fallback));
}
const isVisible=(el,win)=>{
 if(!el||el.hidden)return false;
 const style=win.getComputedStyle(el);
 return style.display!=='none'&&style.visibility!=='hidden';
};
export function installNoticeVerticalAnchor({doc=document,win=window}={}){
 const hud=doc.querySelector('#hud');
 if(!hud)return ()=>{};
 const anchors=NOTICE_ANCHOR_IDS.map(selector=>doc.querySelector(selector)).filter(Boolean);
 const sync=()=>{
  const hudTop=hud.getBoundingClientRect().top;
  const visibleBottoms=anchors.filter(el=>isVisible(el,win)).map(el=>el.getBoundingClientRect())
   .filter(rect=>rect.width>0&&rect.height>0).map(rect=>rect.bottom);
  hud.style.setProperty('--afterday-notice-top',
   noticeTopFromBounds({hudTop,visibleBottoms})+'px');
 };
 sync();
 const observer=typeof win.ResizeObserver==='function'?new win.ResizeObserver(sync):null;
 if(observer){
  observer.observe(hud);
  for(const el of anchors)observer.observe(el);
 }
 win.addEventListener('resize',sync,{passive:true});
 win.visualViewport?.addEventListener('resize',sync,{passive:true});
 doc.fonts?.ready?.then(sync).catch(()=>{});
 return ()=>{
  observer?.disconnect();
  win.removeEventListener('resize',sync);
  win.visualViewport?.removeEventListener('resize',sync);
 };
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',
  ()=>installNoticeVerticalAnchor(),{once:true});
 else installNoticeVerticalAnchor();
}
