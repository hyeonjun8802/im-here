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
      'small_button_01','equipment_action_button','square_slot_selected','alert_amber'
    ].forEach(name=>setAsset(name,crop));

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
      icon.src=crop(sprite);
      icon.alt='';icon.setAttribute('aria-hidden','true');
      icon.width=30;icon.height=30;icon.decoding='async';
      button.prepend(icon);
      button.dataset.v3Sprite=sprite;
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
