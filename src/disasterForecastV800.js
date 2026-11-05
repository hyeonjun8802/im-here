import {DAY_MS,MAJOR_DISASTER_LEAD_MS,WEATHER_KO} from './simulation.js';

const ICON_ROOT='/assets/ui/disasters';
const DISASTER_ICON={
  clear:'clear',
  cloud:'cloud',
  rain:'rain',
  storm:'storm',
  tornado:'tornado',
  heat:'heat',
  cold:'cold',
  dust:'dust',
  wildfire:'wildfire'
};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);

function iconSrc(type,stage){return `${ICON_ROOT}/${type}-${stage}.svg`;}

export const FORECAST_CHECKPOINT_HOURS=Object.freeze([6,12,18,24]);
const FORECAST_POINTS=Object.freeze([
  {hours:24,x:88.33},
  {hours:18,x:79.17},
  {hours:12,x:69.17},
  {hours:6,x:57.50},
  {hours:0,x:37.67}
]);

function movingForecastX(hoursLeft){
  if(hoursLeft>=24)return FORECAST_POINTS[0].x;
  if(hoursLeft<=0)return FORECAST_POINTS.at(-1).x;
  for(let i=0;i<FORECAST_POINTS.length-1;i++){
    const a=FORECAST_POINTS[i],b=FORECAST_POINTS[i+1];
    if(hoursLeft<=a.hours&&hoursLeft>=b.hours){
      const t=clamp((a.hours-hoursLeft)/(a.hours-b.hours));
      const eased=smooth(t);
      return a.x+(b.x-a.x)*eased;
    }
  }
  return FORECAST_POINTS[0].x;
}

export function forecastPresentation(state,now){
  const currentType=DISASTER_ICON[state.weather]||null;
  const futureType=DISASTER_ICON[state.majorDisasterType]||null;
  const at=Number(state.majorDisasterAt);
  const left=Number.isFinite(at)?Math.max(0,at-now):MAJOR_DISASTER_LEAD_MS;
  const hoursLeft=left/3600000;
  const daysLeft=left/DAY_MS;

  // v8.8: render ONE future medallion. It becomes visible at T-24h and then
  // physically travels through the 24h -> 18h -> 12h -> 6h sockets toward
  // the current medallion. The resource changes as urgency increases.
  const visible=Boolean(futureType)&&hoursLeft>0&&hoursLeft<=24;
  const stage=hoursLeft<=12?'eve':'far';
  const x=movingForecastX(hoursLeft);
  const proximity=clamp((24-hoursLeft)/24);
  const scale=.88+.18*proximity;
  const opacity=.72+.28*proximity;
  const activeLeadHours=
    hoursLeft<=0?0:
    hoursLeft<=6?6:
    hoursLeft<=12?12:
    hoursLeft<=18?18:24;

  return {
    currentType,futureType,daysLeft,hoursLeft,activeLeadHours,
    visible,stage,x,scale,opacity
  };
}

export function currentWeatherProgress(state,now){
  const start=Number(state.weatherSinceAt);
  const end=Number(state.nextWeatherAt);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return 0;
  return clamp((Number(now)-start)/(end-start));
}

function weatherRingProfile(type,progress){
  const quiet=type==='clear'||type==='cloud';
  const severe=['storm','tornado','dust','wildfire'].includes(type);
  const ending=progress>=.9;
  return {
    quiet,severe,ending,
    opacity:quiet?.34:severe?.92:.72,
    glow:quiet?.10:severe?.58:.32,
    urgency:ending?(quiet?.12:severe?.90:.58):0
  };
}

class CrossfadeIcon{
  constructor(shell){
    this.shell=shell;
    this.layers=[...shell.querySelectorAll('.disaster-forecast__icon-layer')];
    this.index=0;
    this.key='';
    this.pendingKey='';
  }
  set(type,stage,visible=true){
    const key=visible?`${type}:${stage}`:'';
    if(key===this.key){
      this.shell.classList.toggle('is-visible',visible);
      return;
    }
    this.key=key;
    if(!visible){
      this.shell.classList.remove('is-visible');
      return;
    }
    const next=1-this.index;
    const incoming=this.layers[next],outgoing=this.layers[this.index];
    const src=iconSrc(type,stage);
    this.pendingKey=key;
    const reveal=()=>{
      if(this.pendingKey!==key)return;
      incoming.classList.add('is-active');
      outgoing.classList.remove('is-active');
      this.index=next;
      this.shell.classList.add('is-visible');
    };
    incoming.onload=reveal;
    incoming.onerror=()=>{ if(this.pendingKey===key)this.shell.classList.remove('is-visible'); };
    incoming.src=src;
    incoming.alt='';
    if(incoming.complete&&incoming.naturalWidth>0)reveal();
  }
}

export class DisasterForecastHUD{
  constructor(root){
    this.root=root;
    if(!root)return;
    this.current=new CrossfadeIcon(root.querySelector('.disaster-forecast__current'));
    this.future=new CrossfadeIcon(root.querySelector('.disaster-forecast__future'));
    this.progressCircle=root.querySelector('.disaster-forecast__weather-arc');
    this.progressHalo=root.querySelector('.disaster-forecast__weather-halo');
    // Preload all vector medallions so stage swaps never flash blank.
    for(const type of Object.values(DISASTER_ICON)){
      const stages=(type==='clear'||type==='cloud')?['current']:['far','eve','current'];
      for(const stage of stages){
        const img=new Image();img.decoding='async';img.src=iconSrc(type,stage);
      }
    }
  }

  syncProgress(state,now){
    if(!this.root)return;
    const weather=DISASTER_ICON[state.weather]||state.weather||'clear';

    // v8.5: the simulation is the single source of truth. No HUD-side timer
    // reset, smoothing window or cached endpoint is allowed to drift from it.
    let progress=currentWeatherProgress(state,now);
    if(!Number.isFinite(progress))progress=0;
    const profile=weatherRingProfile(weather,progress);
    const offset=100-progress*100;

    this.root.style.setProperty('--weather-progress-offset',offset.toFixed(3));
    this.root.style.setProperty('--weather-ring-opacity',profile.opacity.toFixed(3));
    this.root.style.setProperty('--weather-ring-glow',profile.glow.toFixed(3));
    this.root.style.setProperty('--weather-ring-urgency',profile.urgency.toFixed(3));
    this.root.dataset.weatherProgress=progress.toFixed(3);
    this.root.dataset.weatherEnding=profile.ending?'true':'false';
    this.root.dataset.weatherRing=profile.quiet?'quiet':profile.severe?'severe':'normal';
  }

  sync(state,now){
    if(!this.root)return;
    this.syncProgress(state,now);
    const p=forecastPresentation(state,now);
    this.current.set(p.currentType,'current',Boolean(p.currentType));

    this.root.style.setProperty('--forecast-x',p.x.toFixed(2)+'%');
    this.root.style.setProperty('--forecast-scale',p.scale.toFixed(3));
    this.root.style.setProperty('--forecast-opacity',p.opacity.toFixed(3));
    this.root.dataset.forecastActiveLead=String(p.activeLeadHours||0);
    this.root.dataset.forecastStage=p.stage;
    this.root.dataset.currentDisaster=p.currentType||'none';

    this.future.set(p.futureType,p.stage,p.visible);
    const currentLabel=p.currentType?WEATHER_KO[state.weather]:'현재 대형 재난 없음';
    const futureLabel=p.futureType?WEATHER_KO[state.majorDisasterType]:'예보 없음';
    this.root.setAttribute(
      'aria-label',
      `현재: ${currentLabel}. 다음 재난: ${futureLabel}, ${Math.max(0,p.hoursLeft).toFixed(1)}시간 후. 예보 단계 24시간, 18시간, 12시간, 6시간.`
    );
  }
}
