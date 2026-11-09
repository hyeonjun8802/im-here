/* AFTERDAY mobile 3D quality budget.
 * Clarity-first correction: original 1.35 DPR auto was too soft on retina phones.
 * Keep mobile 30fps GPU pacing and quality-specific pixel budgets; do not
 * change any desktop WebGL settings or the emergency context-loss safe mode.
 * Keep MSAA and readable shadows enabled. Vary render resolution gently only
 * after sustained slow frames; preserve original desktop settings/3D world. */
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function mobile3DQualityProfile({
 quality='auto',devicePixelRatio=1,width=390,height=844,
 gpuSafeMode=false,adaptiveFactor=1
}={}){
 if(gpuSafeMode){
  return {pixelRatio:Math.min(Math.max(1,devicePixelRatio),1),
   shadowSize:256,shadowsEnabled:false,antialias:false,lowEffects:true};
 }
 const high=quality==='high',low=quality==='low';
 const desired=high?2.15:low?1.45:1.85;
 const shadowSize=high?1024:low?768:1024;
 const budget=high?3300000:low?1700000:2550000;
 const pixelCap=Math.sqrt(budget/(Math.max(1,width)*Math.max(1,height)));
 const base=Math.min(Math.max(1,Number(devicePixelRatio)||1),desired,Math.max(1,pixelCap));
 const adapted=quality==='auto'?base*clamp(adaptiveFactor,.92,1):base;
 // Do not punish older phones by scaling below 1.0; reserve GPU-safe mode
 // for genuine WebGL context loss rather than using it as quality policy.
 // Round DOWN: a rounded-up DPR can exceed the pixel budget on tall phones.
 const pixelRatio=Math.floor(clamp(adapted,1,2.15)*100+1e-8)/100;
 return {pixelRatio,shadowSize,shadowsEnabled:true,antialias:true,
  lowEffects:low,desired,pixelBudget:budget};
}

/** Pure state transition, one evaluation per 3s+ observation window.
 * Slow recovery avoids thrashing GPU buffers on iOS. */
export function nextMobile3DAutoFactor(factor,{fps=30,frames=0,elapsedMs=0}={}){
 const now=clamp(factor,.92,1);
 if(frames<24||elapsedMs<3000||!Number.isFinite(fps))return now;
 // A 30fps mobile render budget means the old >36fps recovery rule can
 // never fire. A stable 29-30fps restores sharpness without repeated toggles.
 if(fps<23)return Math.round(clamp(now-.04,.92,1)*100)/100;
 if(fps>=29)return Math.round(clamp(now+.02,.92,1)*100)/100;
 return now;
}

/** Render cadence is independent of gameplay simulation and the save clock.
 * On a 60Hz phone, auto/low spend the GPU budget at 30 visible frames/s;
 * explicit high quality can use the device's native refresh cadence.
 */
export function shouldRenderMobile3DFrame({
 isMobile=false,quality='auto',now=0,lastRenderAt=0
}={}){
 if(!isMobile||quality==='high'||!lastRenderAt)return true;
 if(!Number.isFinite(now)||now<lastRenderAt)return true;
 // 2ms tolerance avoids accidental 20fps cadence from vsync timing jitter.
 return now-lastRenderAt>=1000/30-2;
}
