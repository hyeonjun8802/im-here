import {DAY_MS,MAJOR_DISASTER_LEAD_MS,WEATHER_KO} from './simulation.js';

const SPRITE='/assets/ui/disaster_forecast_icons.svg';
const DISASTER_ICON={
  rain:'rain',
  storm:'storm',
  tornado:'tornado',
  heat:'heat',
  cold:'cold'
};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);

function setUse(use,type,stage){
  const href=`${SPRITE}#${type}-${stage}`;
  use.setAttribute('href',href);
  // Older iOS WebKit still benefits from the legacy namespace on external SVG use.
  use.setAttributeNS('http://www.w3.org/1999/xlink','href',href);
}

export function forecastPresentation(state,now){
  const currentType=DISASTER_ICON[state.weather]||null;
  const futureType=DISASTER_ICON[state.majorDisasterType]||null;
  const at=Number(state.majorDisasterAt);
  const left=Number.isFinite(at)?Math.max(0,at-now):MAJOR_DISASTER_LEAD_MS;
  const daysLeft=left/DAY_MS;
  const stage=daysLeft<=1?'eve':'far';
  // The physical rail has sockets at roughly x=88%, 75% and 60%.
  // Movement is continuous between them: no snapping, bouncing or scale-pop.
  const approach=clamp((MAJOR_DISASTER_LEAD_MS-left)/(6*DAY_MS));
  const eased=smooth(approach);
  return {
    currentType,futureType,stage,daysLeft,
    x:88.4+(60.0-88.4)*eased,
    scale:.72+.22*eased,
    opacity:.48+.50*eased,
    focus:.18+.82*eased
  };
}

class CrossfadeIcon{
  constructor(shell){
    this.shell=shell;
    this.layers=[...shell.querySelectorAll('.disaster-forecast__icon-layer')];
    this.uses=this.layers.map(layer=>layer.querySelector('use'));
    this.index=0;
    this.key='';
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
    setUse(this.uses[next],type,stage);
    this.layers[next].classList.add('is-active');
    this.layers[this.index].classList.remove('is-active');
    this.index=next;
    this.shell.classList.add('is-visible');
  }
}

export class DisasterForecastHUD{
  constructor(root){
    this.root=root;
    if(!root)return;
    this.current=new CrossfadeIcon(root.querySelector('.disaster-forecast__current'));
    this.future=new CrossfadeIcon(root.querySelector('.disaster-forecast__future'));
  }

  sync(state,now){
    if(!this.root)return;
    const p=forecastPresentation(state,now);
    this.current.set(p.currentType,'current',Boolean(p.currentType));

    this.root.style.setProperty('--forecast-x',p.x.toFixed(2)+'%');
    this.root.style.setProperty('--forecast-scale',p.scale.toFixed(3));
    this.root.style.setProperty('--forecast-opacity',p.opacity.toFixed(3));
    this.root.style.setProperty('--forecast-focus',p.focus.toFixed(3));
    this.root.dataset.forecastStage=p.stage;
    this.root.dataset.currentDisaster=p.currentType||'none';

    this.future.set(p.futureType,p.stage,Boolean(p.futureType));
    const currentLabel=p.currentType?WEATHER_KO[state.weather]:'현재 대형 재난 없음';
    const futureLabel=p.futureType?WEATHER_KO[state.majorDisasterType]:'예보 없음';
    this.root.setAttribute(
      'aria-label',
      `현재: ${currentLabel}. 다음 재난: ${futureLabel}, ${Math.max(0,p.daysLeft).toFixed(1)}일 후.`
    );
  }
}
