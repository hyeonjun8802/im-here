/* AFTERDAY mobile 3D quality budget.
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
 const desired=high?1.55:low?1.20:1.35;
 const shadowSize=high?1024:low?768:1024;
 const budget=high?2400000:low?1200000:1800000;
 const pixelCap=Math.sqrt(budget/(Math.max(1,width)*Math.max(1,height)));
 const base=Math.min(Math.max(1,Number(devicePixelRatio)||1),desired,Math.max(1,pixelCap));
 const adapted=quality==='auto'?base*clamp(adaptiveFactor,.88,1):base;
 // Do not punish older phones by scaling below 1.0; reserve GPU-safe mode
 // for genuine WebGL context loss rather than using it as quality policy.
 const pixelRatio=Math.round(clamp(adapted,1,1.55)*100)/100;
 return {pixelRatio,shadowSize,shadowsEnabled:true,antialias:true,
  lowEffects:low,desired,pixelBudget:budget};
}

/** Pure state transition, one evaluation per 3s+ observation window.
 * Slow recovery avoids thrashing GPU buffers on iOS. */
export function nextMobile3DAutoFactor(factor,{fps=30,frames=0,elapsedMs=0}={}){
 const now=clamp(factor,.88,1);
 if(frames<24||elapsedMs<3000||!Number.isFinite(fps))return now;
 if(fps<23)return Math.round(clamp(now-.04,.88,1)*100)/100;
 if(fps>36)return Math.round(clamp(now+.025,.88,1)*100)/100;
 return now;
}
