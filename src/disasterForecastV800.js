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

export function forecastPresentation(state,now){
  const currentType=DISASTER_ICON[state.weather]||null;
  const futureType=DISASTER_ICON[state.majorDisasterType]||null;
  const at=Number(state.majorDisasterAt);
  const left=Number.isFinite(at)?Math.max(0,at-now):MAJOR_DISASTER_LEAD_MS;
  const daysLeft=left/DAY_MS;
  const stage=daysLeft<=1?'eve':'far';
  // v8.2: the warning icon physically travels for the full seven-day lead.
  // It starts at the far-right socket and keeps moving until it reaches the
  // lip of the current-disaster medallion immediately before impact.
  const approach=clamp((MAJOR_DISASTER_LEAD_MS-left)/MAJOR_DISASTER_LEAD_MS);
  const eased=smooth(approach);
  return {
    currentType,futureType,stage,daysLeft,
    x:88.4+(50.2-88.4)*eased,
    scale:.82+.28*eased,
    opacity:.78+.22*eased,
    focus:.28+.72*eased,
    approach
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
    this.trail=[...root.querySelectorAll('.disaster-forecast__trail-icon')];
    this.trailKey='';
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
    this.root.style.setProperty('--forecast-focus',p.focus.toFixed(3));
    this.root.style.setProperty('--forecast-approach',p.approach.toFixed(3));
    this.root.dataset.forecastStage=p.stage;
    this.root.dataset.currentDisaster=p.currentType||'none';

    const trailKey=p.futureType||'';
    if(trailKey!==this.trailKey){
      this.trailKey=trailKey;
      const stages=['eve','far','far']; // near → mid → far
      for(const [index,img] of this.trail.entries()){
        img.src=trailKey?iconSrc(trailKey,stages[index]||'far'):'';
      }
    }
    for(const img of this.trail)img.classList.toggle('is-visible',Boolean(p.futureType));
    this.future.set(p.futureType,p.stage,Boolean(p.futureType));
    const currentLabel=p.currentType?WEATHER_KO[state.weather]:'현재 대형 재난 없음';
    const futureLabel=p.futureType?WEATHER_KO[state.majorDisasterType]:'예보 없음';
    this.root.setAttribute(
      'aria-label',
      `현재: ${currentLabel}. 다음 재난: ${futureLabel}, ${Math.max(0,p.daysLeft).toFixed(1)}일 후.`
    );
  }
}
