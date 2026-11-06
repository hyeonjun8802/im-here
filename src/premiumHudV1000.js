/* AFTERDAY v10.0 — Art-locked premium HUD. Read-only view of simulation state.
   The current weather and scheduled major disaster are the only known forecasts;
   intermediate weather is deliberately not fabricated. */
import './premiumHudV1000.css';

const BASE='/assets/ui/afterday-premium-v1000';
const TYPES=new Set(['clear','cloud','rain','storm','tornado','heat','cold','dust','wildfire']);
const LABEL={clear:'맑음',cloud:'흐림',rain:'폭우',storm:'낙뢰',tornado:'토네이도',heat:'폭염',cold:'한파',dust:'모래폭풍',wildfire:'산불'};
const CRITICAL=new Set(['rain','storm','tornado','heat','cold','dust','wildfire']);
export const CHECKPOINTS=Object.freeze([24,18,12,6,3,0]);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function premiumForecastTimelineX(hours){
 if(!Number.isFinite(hours))return 8.333333;
 const h=clamp(hours,0,24);
 for(let i=0;i<CHECKPOINTS.length-1;i++){
   const high=CHECKPOINTS[i],low=CHECKPOINTS[i+1];
   if(h<=high&&h>=low){
     return (i+.5+(high-h)/(high-low))*100/6;
   }
 }
 return 91.666667;
}
const url=(section,name)=>`${BASE}/${section}/${name}.png`;
const el=(tag,cls,parent)=>{const x=document.createElement(tag);x.className=cls;parent.appendChild(x);return x;};
function picture(host,cls,basename){
 const p=el('picture',cls,host);
 const mobile=document.createElement('source');mobile.media='(max-width:720px)';mobile.srcset=url('mobile',basename);
 p.appendChild(mobile);
 const img=el('img','premium-hud__art',p);img.src=url('desktop',basename);
 img.alt='';img.decoding='async';img.setAttribute('aria-hidden','true');
 return p;
}
/** No mutation of game state, save keys, resource values, or simulation time. */
export function installPremiumHud(root){
 if(!root)return {sync(){},syncProgress(){}};
 if(root.dataset.premiumHudVersion==='1000')return {sync(){},syncProgress(){}};
 root.dataset.premiumHudVersion='1000';
 root.classList.add('premium-hud-v1000');
 const frame=el('div','premium-hud__frame',root);
 picture(frame,'premium-hud__left-wing','left_wing');
 picture(frame,'premium-hud__right-wing','right_wing');
 picture(frame,'premium-hud__center-medallion','center_medallion');
 const current=el('img','premium-hud__current-art',root);
 current.alt='';current.decoding='async';current.setAttribute('aria-hidden','true');
 const caption=el('span','premium-hud__current-caption',root);
 const info=el('span','premium-hud__info',root);info.textContent='i';info.setAttribute('aria-hidden','true');
 const forecast=el('div','premium-hud__timeline',root);
 const title=el('span','premium-hud__timeline-title',forecast);title.textContent='⊕ 기상 예측 (24h)';
 el('span','premium-hud__timeline-track',forecast);
 const marks=el('div','premium-hud__timeline-marks',forecast);
 for(const hours of CHECKPOINTS){
   const mark=el('span','premium-hud__timeline-mark',marks);
   const dot=el('i','premium-hud__timeline-dot',mark);dot.setAttribute('aria-hidden','true');
   const label=el('b','premium-hud__timeline-hour',mark);label.textContent=hours?`+${String(hours).padStart(2,'0')}h`:'현재';
 }
 const present=el('img','premium-hud__present-art',forecast);present.alt='';present.decoding='async';present.setAttribute('aria-hidden','true');
 const target=el('img','premium-hud__future-art',forecast);target.alt='';target.decoding='async';target.setAttribute('aria-hidden','true');
 const focus=el('span','premium-hud__forecast-focus',forecast);focus.setAttribute('aria-hidden','true');
 const eta=el('span','premium-hud__eta',forecast);
 let prevCurrent='',prevFuture='';
 const sync=(state,now)=>{
   if(!state)return;
   const weather=TYPES.has(state.weather)?state.weather:'clear';
   if(weather!==prevCurrent){prevCurrent=weather;current.src=url('weather',weather+'_medallion_art');present.src=url('weather',weather+'_forecast_icon');}
   caption.textContent=(LABEL[weather]||'기상')+(CRITICAL.has(weather)?' 경보':'');
   root.dataset.premiumWeather=weather;
   const disaster=TYPES.has(state.majorDisasterType)?state.majorDisasterType:'';
   const at=Number(state.majorDisasterAt);
   const hours=Number.isFinite(at)?(at-now)/3600000:Infinity;
   const active=!!disaster && hours>0&&hours<=24;
   const x=premiumForecastTimelineX(hours);
   forecast.style.setProperty('--premium-event-x',`${x.toFixed(5)}%`);
   const nearest=CHECKPOINTS.reduce((best,h,i)=>Math.abs(hours-h)<Math.abs(hours-CHECKPOINTS[best])?i:best,0);
   for(let i=0;i<marks.children.length;i++)marks.children[i].classList.toggle('is-checkpoint',active&&i===nearest);
   forecast.classList.toggle('has-future',active);
   if(active&&disaster!==prevFuture){prevFuture=disaster;target.src=url('weather',disaster+'_forecast_icon');}
   if(!active){prevFuture='';target.removeAttribute('src');}
   eta.textContent=active?`${LABEL[disaster]} ${hours<1?hours.toFixed(1):Math.ceil(hours)}h`:'예보 대기';
   // The timeline itself is visual. Current and future are authoritative simulation fields.
   root.setAttribute('aria-label',`생존 현황, 현재 ${LABEL[weather]}. ${active?`다음 재난 ${LABEL[disaster]} ${hours.toFixed(1)}시간 후`:'24시간 이내 확정된 재난 예보 없음'}.`);
 };
 return {sync,syncProgress:sync};
}