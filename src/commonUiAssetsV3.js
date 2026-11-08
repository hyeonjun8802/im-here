/* AFTERDAY common UI v3: use the ORIGINAL extracted 48-piece atlas.
   Visual assets only. No mutations to game simulation, state, events or saves. */
const BASE = '/assets/ui/apocalypse-v3/';
const cache = new Map();
let pending;

function imageLoaded(src) {
  return new Promise((resolve,reject)=>{
    const image = new Image();
    image.onload = ()=>resolve(image);
    image.onerror = ()=>reject(new Error('Cannot load common UI atlas: '+src));
    image.decoding = 'async';
    image.src = src;
  });
}

/** Crop using the exact transparent atlas coordinates; no CSS approximations. */
function makeCrops(image, frames) {
  return function crop(name) {
    if(cache.has(name)) return cache.get(name);
    const f = frames[name];
    if(!f || !Number.isInteger(f.x) || !Number.isInteger(f.y) ||
       f.w < 1 || f.h < 1 || f.x < 0 || f.y < 0 ||
       f.x + f.w > image.naturalWidth || f.y + f.h > image.naturalHeight) {
      throw new Error('Invalid UI frame: '+name);
    }
    const canvas = document.createElement('canvas');
    canvas.width=f.w; canvas.height=f.h;
    const ctx=canvas.getContext('2d',{alpha:true,willReadFrequently:false});
    if(!ctx) throw new Error('UI atlas canvas context unavailable');
    ctx.clearRect(0,0,f.w,f.h);
    ctx.drawImage(image,f.x,f.y,f.w,f.h,0,0,f.w,f.h);
    const src=canvas.toDataURL('image/png');
    cache.set(name,src);
    return src;
  };
}
/* Optical centering: the atlas sprites are 64px squares but their visible
 * pixels are not centered equally. Keep the original pixel colors and shape,
 * trim transparent padding only, and add symmetrical transparent margins. */
function centeredIconFromAtlas(image,frames,name) {
  const key='optical:'+name;
  if(cache.has(key))return cache.get(key);
  const f=frames[name];
  if(!f||f.w<1||f.h<1)throw new Error('Missing original icon '+name);
  const c=document.createElement('canvas');c.width=f.w;c.height=f.h;
  const cx=c.getContext('2d',{willReadFrequently:true});
  cx.drawImage(image,f.x,f.y,f.w,f.h,0,0,f.w,f.h);
  const rgba=cx.getImageData(0,0,f.w,f.h).data;
  let minX=f.w,minY=f.h,maxX=-1,maxY=-1;
  for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){
    const a=rgba[(y*f.w+x)*4+3];
    if(a<32)continue;
    minX=Math.min(minX,x);minY=Math.min(minY,y);
    maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  }
  if(maxX<minX||maxY<minY)return image.src;
  const dst=document.createElement('canvas');dst.width=64;dst.height=64;
  const dc=dst.getContext('2d',{alpha:true});
  const bw=maxX-minX+1,bh=maxY-minY+1;
  const scale=Math.min(50/bw,50/bh);
  const sw=bw*scale,sh=bh*scale;
  dc.drawImage(c,minX,minY,bw,bh,(64-sw)/2,(64-sh)/2,sw,sh);
  const value=dst.toDataURL('image/png');cache.set(key,value);return value;
}
function setAsset(name, crop) {
  document.documentElement.style.setProperty('--afterday-v3-'+name,
    'url("'+crop(name)+'")');
}

export function installCommonUiAssetsV3() {
  if(pending) return pending;
  pending=(async()=>{
    const [response,image] = await Promise.all([
      fetch(BASE+'spritesheet.json',{cache:'force-cache'}),
      imageLoaded(BASE+'spritesheet.webp')
    ]);
    if(!response.ok) throw new Error('Common UI atlas metadata HTTP '+response.status);
    const manifest=await response.json();
    if(!manifest?.frames || Object.keys(manifest.frames).length!==48)
      throw new Error('Expected 48 original UI sprite frames');
    const crop=makeCrops(image,manifest.frames);
    const forecast=document.querySelector('#disaster-forecast');
    const mainArt=forecast?.querySelector('.premium-hud__unified-art');
    const frame=mainArt?.querySelector('img.premium-hud__frame');
    if(!frame) throw new Error('Premium HUD frame is not installed');

    // Existing live weather/time/vitals stay above the new transparent frame.
    const source=mainArt.querySelector('source');
    if(source) source.remove();
    frame.src=crop('top_hud_full');
    frame.removeAttribute('srcset');
    frame.style.objectFit='fill';
    [
      'bottom_action_bar_full','equipment_panel','center_warning_banner',
      'wide_panel_01','wide_panel_02','time_controls_panel',
      'small_button_01','equipment_action_button','square_slot_01','square_slot_selected','alert_amber'
    ].forEach(name=>setAsset(name,crop));

    // The authored bar has a glowing slot hardcoded at position 5.
    // Neutralize ONLY that slot using the original unselected source sprite.
    // A selected glow is then drawn by CSS at the actual action position.
    const sourceBar=manifest.frames.bottom_action_bar_full;
    const neutralBar=document.createElement('canvas');
    neutralBar.width=sourceBar.w;
    neutralBar.height=sourceBar.h;
    const barCtx=neutralBar.getContext('2d',{alpha:true});
    if(barCtx) {
      barCtx.drawImage(image,sourceBar.x,sourceBar.y,sourceBar.w,sourceBar.h,
        0,0,sourceBar.w,sourceBar.h);
      // Cover the pre-selected fifth tile's orange interior without touching
      // the original outer steel rail; restore its metallic neutral frame.
      // Exact metal source pixels, not a synthetic dark rectangle:
      // duplicate the adjacent undecorated slot over authored slot five.
      barCtx.drawImage(image,sourceBar.x+399,sourceBar.y+27,122,129,
        526,27,122,129);
      // iPhone reference inspection: a SECOND baked orange active outline
      // remains over the SIXTH cell, from x≈637..761 (source 1148px bar).
      // Earlier patches only neutralized cell five. Restore the sixth cell
      // from a clean neighboring metal slot, including its top/bottom edges.
      // This uses the ORIGINAL atlas pixels; it adds no CSS-painted frame.
      const sixthSlot={sourceX:399,targetX:637,width:124,height:sourceBar.h};
      barCtx.drawImage(
        image,sourceBar.x+sixthSlot.sourceX,sourceBar.y,
        sixthSlot.width,sixthSlot.height,
        sixthSlot.targetX,0,sixthSlot.width,sixthSlot.height
      );
      document.documentElement.style.setProperty(
        '--afterday-v3-bottom_action_bar_neutral',
        'url("'+neutralBar.toDataURL('image/png')+'")');
    }


    const actionIcons={
      drink:'icon_water',eat:'icon_food',repair:'icon_tools',
      medicine:'icon_medical',explore:'icon_radio',
      'take-cover':'icon_tent','secure-supplies':'icon_supply',
      'collect-water':'icon_water','repair-tank':'icon_tools',
      'weather-panel-toggle':'icon_cloud'
    };
    for(const [id,sprite] of Object.entries(actionIcons)){
      const button=document.getElementById(id);
      if(!button || button.querySelector('.afterday-v3-action-icon'))continue;
      const icon=document.createElement('img');
      icon.className='afterday-v3-action-icon';
      icon.src=centeredIconFromAtlas(image,manifest.frames,sprite);
      icon.alt='';icon.setAttribute('aria-hidden','true');
      icon.width=30;icon.height=30;icon.decoding='async';
      button.prepend(icon);
      button.dataset.v3Sprite=sprite;
    }

    // The fixed artwork has 9 slots. Ordinary play starts with 8 actions
    // because tank repair is locked. A disabled visual reserve preserves
    // alignment without triggering an unavailable game action.
    const actionbar=document.querySelector('#hud .actionbar');
    if(actionbar && !actionbar.querySelector('.afterday-v3-standby-slot')) {
      const repairTank=document.getElementById('repair-tank');
      const lifeButton=document.getElementById('life-panel-toggle');
      const reserve=document.createElement('span');
      reserve.className='afterday-v3-standby-slot';
      reserve.setAttribute('aria-hidden','true');
      const reserveIcon=document.createElement('img');
      reserveIcon.src=centeredIconFromAtlas(image,manifest.frames,'icon_tools');
      reserveIcon.alt='';
      reserveIcon.decoding='async';
      const reserveText=document.createElement('span');
      reserveText.textContent='물탱크 수리';
      reserve.append(reserveIcon,reserveText);
      actionbar.insertBefore(reserve,lifeButton||null);
      const syncSlots=()=>{
        const specialIds=['take-cover','secure-supplies','collect-water','repair-tank'];
        const specialActive=specialIds.some(id=>{
          const el=document.getElementById(id);
          return Boolean(el && !el.hidden);
        });
        if(reserve.hidden!==specialActive)reserve.hidden=specialActive;
        const visible=Array.from(actionbar.querySelectorAll(':scope > button'))
          .filter(el=>!el.hidden).length + (reserve.hidden?0:1);
        actionbar.classList.toggle('v3-has-extra-actions',visible>9);
        actionbar.dataset.visibleSlots=String(visible);
        actionbar.dataset.reserveSlot=String(!reserve.hidden);
      };
      const visibilityObserver=new MutationObserver(syncSlots);
      visibilityObserver.observe(actionbar,{
        subtree:true,attributes:true,attributeFilter:['hidden']
      });
      syncSlots();
    }

    // Keep original interaction nodes and event listeners in place.
    document.body.classList.add('afterday-real-ui-v3');
    document.documentElement.dataset.commonUiVersion='v3';
    document.dispatchEvent(new CustomEvent('afterday:common-ui-ready',{
      detail:{frameCount:48,atlasWidth:image.naturalWidth,atlasHeight:image.naturalHeight}
    }));
    return {frameCount:48,atlasWidth:image.naturalWidth,atlasHeight:image.naturalHeight};
  })().catch(error=>{
    console.warn('[AFTERDAY UI v3] Original sprites unavailable; existing HUD retained.',error);
    document.documentElement.dataset.commonUiVersion='fallback';
    return null;
  });
  return pending;
}
