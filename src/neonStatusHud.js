/** AFTERDAY | Three major neon status icons. Display-only.
 * Time-limited collaboration slowdown blinks as its REAL in-game expiry
 * approaches; infection and tornado cover never pretend to have a timer. */
import {DAY_MS} from './simulation.js';
import {companionBuffView} from './supportCompanion.js';

const ASSETS=Object.freeze({
  infection:'/assets/ui/neon-status/infection.svg',
  companion:'/assets/ui/neon-status/companion.svg',
  cover:'/assets/ui/neon-status/cover.svg'
});
const ORDER=['infection','cover','companion'];
const IDLE_DETAILS=Object.freeze({
  infection:'감염 없음 · 질병 위험이 높아지면 붉은 네온으로 켜집니다.',
  cover:'대피 보호 없음 · 토네이도 발생 중 실제 대피할 때 노란 네온으로 켜집니다.',
  companion:'동료 협업 없음 · 건강한 동료와 작동 중인 정수기 또는 텃밭이 있으면 녹색 네온으로 켜집니다.'
});

export function majorNeonEffects(s,virtualNow,day){
  if(!s||s.survivalStatus==='dead')return [];
  const effects=[];
  const illness=Number(s.sickness)||0;
  // A significant infection alert only; mild sickness stays in the existing
  // character health panel. This is NOT a timed debuff.
  if(illness>=35){
    const critical=illness>50;
    effects.push({
      id:'infection',kind:'debuff',phase:critical?'critical':'steady',
      label:critical?'중증 감염':'감염 주의',
      detail:`질병 위험 ${Math.round(illness)}/100 · ${critical?'건강이 지속 감소합니다. 치료제를 사용하거나 안전한 환경에서 회복하세요.':'질병 위험이 높습니다. 치료제와 대피소 상태를 확인하세요.'} 종료 시간은 정해져 있지 않습니다.`
    });
  }
  // Protection is real only until this precise tornado encounter is resolved.
  // No invented cooldown, protection duration, or finish-time countdown.
  if(s.weather==='tornado'&&s.tornadoEncounterActive&&!s.tornadoPreview&&
      s.tornadoCoverActive&&Number(s.tornadoEncounter)>0&&
      s.tornadoRoofImpactEncounter!==s.tornadoEncounter){
    effects.push({
      id:'cover',kind:'buff',phase:'steady',label:'토네이도 대피 보호',
      detail:'대피 완료 · 이번 토네이도의 건강·대피소 피해가 감소합니다. 옥상 충격이 끝나면 효과가 해제됩니다.'
    });
  }
  const cooperation=companionBuffView(s,day);
  if(cooperation.state==='boosted'||cooperation.state==='strained'){
    let phase='steady';
    if(cooperation.state==='strained'&&Number.isFinite(virtualNow)&&Number.isFinite(s.startedAt)){
      const endDay=Number(s.companion?.strainedUntilDay)||0;
      const endAt=Number(s.startedAt)+(endDay-1)*DAY_MS;
      const remaining=Math.max(0,endAt-virtualNow);
      if(remaining>0){
        // 3 in-game days; foreground speed merely advances virtualNow faster.
        if(remaining<=.08*3*DAY_MS)phase='imminent';
        else if(remaining<=.22*3*DAY_MS)phase='near';
      }
    }
    effects.push({
      id:'companion',kind:cooperation.state==='strained'?'strained':'buff',
      phase,label:cooperation.state==='strained'?'동료 협업 +10%':'동료 협업 +30%',detail:cooperation.description
    });
  }
  return ORDER.map(id=>effects.find(effect=>effect.id===id)).filter(Boolean);
}

function createNeonStatusHud(host){
  let hud=host.querySelector(':scope > .neon-status-hud');
  if(hud)return hud;
  hud=document.createElement('div');
  hud.className='neon-status-hud';
  hud.setAttribute('role','group');
  hud.setAttribute('aria-label','현재 주요 생존 버프 및 디버프');
  for(const id of ORDER){
    const button=document.createElement('button');
    button.type='button';
    button.className='neon-status__item';
    button.dataset.effect=id;
    button.dataset.active='false';
    button.setAttribute('aria-expanded','false');
    button.tabIndex=0;
    const img=document.createElement('img');
    img.className='neon-status__image';
    img.src=ASSETS[id];
    img.alt='';
    img.setAttribute('aria-hidden','true');
    const tip=document.createElement('span');
    tip.className='neon-status__tooltip';
    button.append(img,tip);
    button.addEventListener('click',()=>{
      const next=!button.classList.contains('is-open');
      for(const other of hud.querySelectorAll('button.is-open')){
        other.classList.remove('is-open');
        other.setAttribute('aria-expanded','false');
      }
      button.classList.toggle('is-open',next);
      button.setAttribute('aria-expanded',String(next));
    });
    hud.appendChild(button);
  }
  document.addEventListener('pointerdown',event=>{
    if(!hud.contains(event.target)){
      for(const button of hud.querySelectorAll('button.is-open')){
        button.classList.remove('is-open');
        button.setAttribute('aria-expanded','false');
      }
    }
  });
  host.appendChild(hud);
  return hud;
}

export function syncNeonStatusHud(host,state,virtualNow,day){
  if(!host)return;
  const hud=createNeonStatusHud(host);
  const effects=new Map(majorNeonEffects(state,virtualNow,day).map(effect=>[effect.id,effect]));
  for(const button of hud.querySelectorAll('button[data-effect]')){
    const effect=effects.get(button.dataset.effect);
    const active=Boolean(effect);
    button.dataset.active=String(active);
    button.dataset.phase=effect?.phase||'steady';
    button.dataset.kind=effect?.kind||'buff';
    // Dim standby signals always remain visible and explain their conditions.
    // They do not claim a buff or debuff is active.
    const caption=active?`${effect.label} · ${effect.detail}`:
      `비활성 · ${IDLE_DETAILS[button.dataset.effect]}`;
    if(button.getAttribute('aria-label')!==caption){
      button.setAttribute('aria-label',caption);
      button.title=caption;
      button.querySelector('.neon-status__tooltip').textContent=caption;
    }
  }
}