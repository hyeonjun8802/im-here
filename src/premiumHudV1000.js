/* AFTERDAY premium HUD v10.0 - HUD PRESENTATION ONLY.
 * Render uses the game's authoritative weather, majorDisasterAt and supply.
 * Does NOT modify state, save data, weather schedule, gameplay or WebGL.
 */
const BASE='/assets/ui/afterday-premium-v1000';
const TYPES=new Set(['clear','cloud','rain','storm','tornado','heat','cold','dust','wildfire','meteor']);
const LABELS={clear:'맑음',cloud:'흐림',rain:'폭우',storm:'낙뢰',tornado:'토네이도',heat:'폭염',cold:'한파',dust:'모래폭풍',wildfire:'산불',meteor:'운석'};
const HOURS=[0,3,6,12,18,24];
const image=(group,name)=>`${BASE}/${group}/${name}.png`;
const put=(parent,tag,className)=>{const el=document.createElement(tag);el.className=className;parent.appendChild(el);return el;};
const clamp=(v,low,high)=>Math.max(low,Math.min(high,v));
/** Earlier events move from the +24h RIGHT edge to the current LEFT edge. */
export function premiumForecastX(hours){
 if(!Number.isFinite(hours))return 100*11/12;
 const h=clamp(hours,0,24);
 for(let i=0;i<HOURS.length-1;i++){
  const a=HOURS[i],b=HOURS[i+1];
  if(h>=a&&h<=b)return 100/12+(i+(h-a)/(b-a))*100/6;
 }
 return 100*11/12;
}
export function installPremiumHudV1000(root){
 if(!root)return {sync(){},syncProgress(){}};
 if(root.dataset.premiumHudV1000==='true')return root.__premiumHudV1000;
 root.dataset.premiumHudV1000='true';root.classList.add('premium-hud-v1000');
 const art=put(root,'picture','premium-hud__unified-art');
 const source=put(art,'source','');source.media='(max-width:720px)';
 // v1006: approved v1004 artwork, rebuilt to the four original reference dimensions.
 // Keep the selected image in the same reference aspect ratio as the original game HUD.
 const ref='/assets/ui/hud-reference-v1006/';
 source.srcset=ref+'hud_compact_mobile_ref_v1006.png';
 source.sizes='calc(100vw - 4px)';
 const frame=put(art,'img','premium-hud__frame');
 frame.src=ref+'hud_compact_desktop_ref_v1006.png';
 frame.sizes='min(1600px, calc(100vw - 8px))';
 frame.alt='';frame.decoding='async';frame.setAttribute('aria-hidden','true');
 const currentArt=put(root,'img','premium-hud__current-art');currentArt.alt='';currentArt.decoding='async';
 const timeline=put(root,'div','premium-hud__forecast');
 const title=put(timeline,'span','premium-hud__forecast-title');title.textContent='⊕ 기상 예측 (24h)';
 const rail=put(timeline,'span','premium-hud__forecast-rail');rail.setAttribute('aria-hidden','true');
 const marks=put(timeline,'div','premium-hud__forecast-marks');
 for(const h of HOURS){
  const mark=put(marks,'span','premium-hud__mark');mark.dataset.hour=String(h);
  const dot=put(mark,'i','premium-hud__dot');dot.setAttribute('aria-hidden','true');
  const txt=put(mark,'span','premium-hud__hour');txt.textContent=h===0?'현재':`+${String(h).padStart(2,'0')}h`;
 }
 const halo=put(timeline,'span','premium-hud__future-halo');halo.setAttribute('aria-hidden','true');
 const future=put(timeline,'img','premium-hud__future-icon');future.alt='';future.decoding='async';
 const forecastStatus=put(timeline,'span','premium-hud__forecast-status');forecastStatus.setAttribute('aria-hidden','true');
 let current='',coming='',shown=null;
 function draw(state,now){
  if(!state||typeof state!=='object')return;
  const nowWeather=TYPES.has(state.weather)?state.weather:'clear';
  if(nowWeather!==current){current=nowWeather;currentArt.src=image('weather',`${current}_medallion_art`);}
  const name=LABELS[current];
  root.dataset.premiumWeather=current;
  const at=Number(state.majorDisasterAt);
  const remaining=(Number.isFinite(at)&&Number.isFinite(now))?(at-now)/3600000:Infinity;
  const comingType=TYPES.has(state.majorDisasterType)?state.majorDisasterType:null;
  const scheduled=Boolean(comingType)&&Number.isFinite(remaining)&&remaining>0;
  const active=scheduled&&remaining<=24;
  // One real scheduled event: PC can show it parked at +24h while outside
  // the 24-hour timeline; it starts traveling only after entering the window.
  timeline.classList.toggle('has-future',active);
  timeline.classList.toggle('has-scheduled',scheduled);
  timeline.style.setProperty('--premium-event-x',premiumForecastX(remaining).toFixed(4)+'%');
  if(scheduled){
   if(coming!==comingType){coming=comingType;future.src=image('weather',`${comingType}_forecast_icon`);}
   const atHour=active?HOURS.reduce((best,h)=>Math.abs(remaining-h)<Math.abs(remaining-best)?h:best,HOURS[0]):null;
   for(const m of marks.children)m.classList.toggle('is-near',active&&Number(m.dataset.hour)===atHour);
  }else{
   coming='';future.removeAttribute('src');
   for(const m of marks.children)m.classList.remove('is-near');
  }
  const status=active?`${LABELS[comingType]} ${Math.ceil(remaining*10)/10}h 후`:scheduled?`${LABELS[comingType]} 24h 이후`:'예보 대기';
  if(shown!==status){shown=status;forecastStatus.textContent=status;}
  timeline.title=active?`확정 재난: ${LABELS[comingType]}, ${remaining.toFixed(1)}시간 후`:scheduled?`다음 재난 ${LABELS[comingType]}: 24시간 예보 범위 밖`:'24시간 안에 확정된 재난 없음';
  root.setAttribute('aria-label',`생존 상태와 보유 물자, 현재 날씨 ${name}. 다음 재난 ${status}`);
 }
 // Called every animation frame. Only move the forecast cursor here;
 // full DOM repaint is intentionally throttled by the game's renderHUD cadence.
 const syncProgress=(state,now)=>{
  if(!state||!Number.isFinite(now))return;
  const remaining=(Number(state.majorDisasterAt)-now)/3600000;
  if(Number.isFinite(remaining)&&remaining>0&&remaining<=24){
   const x=premiumForecastX(remaining).toFixed(4)+'%';
   if(timeline.style.getPropertyValue('--premium-event-x')!==x)
    timeline.style.setProperty('--premium-event-x',x);
  }
 };
 const API={sync:draw,syncProgress};root.__premiumHudV1000=API;return API;
}
