import * as THREE from 'three';

/**
 * AFTERDAY 5.1 — event cinematography is presentation ONLY.
 * Events are dispatched only AFTER a successful, persisted player decision.
 * No camera/time/supply changes are saved and no gameplay input is blocked.
 * The only temporary effects are the current 3D camera, a motivated key-light,
 * and a transparent editorial title placed over the live 3D scene.
 */
export const CINEMATIC_MOMENTS=Object.freeze({
 tent:Object.freeze({tag:'발견 · 보호',title:'오늘 밤은 콘크리트가 아니다',detail:'낡은 천막 한 장이 비를 막아 줄 것이다.',duration:6.6,azimuth:.65,radius:23,altitude:12,color:'#daa975',light:11,focus:'tent'}),
 purifier:Object.freeze({tag:'발견 · 물',title:'물을 걸러 낼 수 있다',detail:'이제 비가 오면 내일을 위한 식수를 모을 수 있다.',duration:6.0,azimuth:-.85,radius:24,altitude:12,color:'#93bbbe',light:8,focus:'tank'}),
 seeds:Object.freeze({tag:'발견 · 식량',title:'씨앗은 살아 있었다',detail:'먹을 수 있는 한 끼를 다시 길러 낼 수 있다.',duration:5.8,azimuth:.72,radius:25,altitude:13,color:'#b1ba7a',light:7,focus:'garden'}),
 radio:Object.freeze({tag:'발견 · 희망',title:'누군가는 듣고 있다',detail:'고요한 폐허 위로 새로운 주파수가 열린다.',duration:5.8,azimuth:-.90,radius:23,altitude:12,color:'#a1bdd2',light:8,focus:'radio'}),
 helicopter:Object.freeze({tag:'구조 신호 · 생존',title:'도시 위를 가르는 마지막 항로',detail:'구조는 아직 멀다. 보급품이 하루를 더 준다.',duration:9.0,azimuth:-.95,radius:79,altitude:39,color:'#d6d4bd',light:4,focus:'aircraft'}),
 companion:Object.freeze({tag:'동행 · 선택',title:'옥상에 두 번째 발소리가 들린다',detail:'물은 더 필요해진다. 혼자가 아니라는 의미도 생긴다.',duration:6.7,azimuth:.95,radius:23,altitude:12,color:'#d2b68d',light:7,focus:'companion'}),
 tornadoNear:Object.freeze({tag:'재난 · 위기',title:'도시의 바람이 옥상까지 닿았다',detail:'파편이 지나간 자리에서 다시 살아남아야 한다.',duration:7.0,azimuth:-.72,radius:86,altitude:37,color:'#8fb0c4',light:6,focus:'roof'}),
 tornadoDirect:Object.freeze({tag:'재난 · 직격',title:'옥상 바로 위의 소용돌이',detail:'하늘이 무너져도 오늘은 끝나지 않았다.',duration:7.4,azimuth:-.68,radius:76,altitude:34,color:'#98b4c3',light:11,focus:'roof'}),
 injury:Object.freeze({tag:'탐색 · 대가',title:'아무것도 공짜로 얻을 수 없다',detail:'상처를 안고 옥상으로 돌아왔다.',duration:4.6,azimuth:.8,radius:22,altitude:12,color:'#b88d83',light:4,focus:'survivor'}),
 sickness:Object.freeze({tag:'탐색 · 오염',title:'폐허의 공기는 깨끗하지 않았다',detail:'오늘의 선택이 내일의 몸을 바꾼다.',duration:4.6,azimuth:.8,radius:22,altitude:12,color:'#b3b18e',light:4,focus:'survivor'})
});
export const MOMENT_ITEM_MAP=Object.freeze({tent:'tent',purifier:'purifier',seeds:'seeds',radio:'radio'});
export const cinematicEase=t=>{const x=THREE.MathUtils.clamp(Number(t)||0,0,1);return x*x*(3-2*x);};
export function cinematicBlend(age,duration){
 const a=Math.max(0,Number(age)||0),d=Math.max(.1,Number(duration)||1);
 return Math.min(cinematicEase(a/1.0),cinematicEase((d-a)/1.35));
}
export function cinematicTarget(world,type){
 const y=Number(world.ROOF_Y)||0;
 if(type==='tent')return new THREE.Vector3(-8,y+3,-6);
 if(type==='purifier')return new THREE.Vector3(16,y+4,-13);
 if(type==='seeds')return new THREE.Vector3(-12,y+2,11);
 if(type==='radio')return new THREE.Vector3(-2.7,y+2.5,-1.8);
 if(type==='companion')return world.supportSurvivor?.group?.getWorldPosition?.(new THREE.Vector3())?.add(new THREE.Vector3(0,2.2,0))||new THREE.Vector3(-6.5,y+2.4,14.6);
 if(type==='injury'||type==='sickness')return world.survivor?.getWorldPosition?.(new THREE.Vector3())?.add(new THREE.Vector3(0,2.2,0))||new THREE.Vector3(0,y+2,0);
 if(type==='helicopter')return new THREE.Vector3(-31,y+32,-23);
 return new THREE.Vector3(0,y+12,0);
}
const foregroundLabel=(m,type)=>`${m.tag} · ${type==='tornadoDirect'?'DANGER':type==='helicopter'?'SUPPLY':type.toUpperCase()}`;

export class CinematicMomentV510 {
 constructor(world,{ui=true}={}){
  this.world=world;this.active=null;this.age=0;this.shots=0;
  this.light=new THREE.PointLight('#dcb47a',0,29,2);
  this.light.name='Event motivated focus bounce · temporary';world.scene.add(this.light);
  this.plate=null;this.tag=null;this.title=null;this.detail=null;
  const parent=world.canvas?.parentElement;
  if(ui&&parent&&typeof document!=='undefined'){
   const element=document.createElement('div');
   element.className='afterday-cinema';element.setAttribute('aria-hidden','true');
   element.innerHTML='<div class="afterday-cinema__rule"></div><div class="afterday-cinema__tag"></div><div class="afterday-cinema__title"></div><div class="afterday-cinema__detail"></div><div class="afterday-cinema__rule afterday-cinema__rule--end"></div>';
   element.hidden=true;parent.append(element);this.plate=element;
   this.tag=element.querySelector('.afterday-cinema__tag');
   this.title=element.querySelector('.afterday-cinema__title');
   this.detail=element.querySelector('.afterday-cinema__detail');
  }
 }
 play(type){
  const m=CINEMATIC_MOMENTS[type];if(!m)return false;
  // Do not replace an ongoing life-or-death shot with a harmless reward.
  if(this.active?.startsWith('tornado')&&!type.startsWith('tornado'))return false;
  this.active=type;this.age=0;this.shots++;
  this.light.color.set(m.color);this.light.intensity=0;
  if(this.plate){
   this.tag.textContent=foregroundLabel(m,type);
   this.title.textContent=m.title;this.detail.textContent=m.detail;
   this.plate.hidden=false;this.plate.classList.add('is-active');
  }
  // The shared lower story queue displays the words; this camera/light shot
  // still begins immediately and never waits for notification text.
  this.world.onCinematicNarrative?.(type,m);
  return true;
 }
 cancel(){
  this.active=null;this.age=0;this.light.intensity=0;
  if(this.plate){this.plate.classList.remove('is-active');this.plate.hidden=true;}
 }
 /** Called AFTER the original camera calculations, BEFORE scene rendering.
  * Never modifies world.yaw/pitch/radius/target or camera control settings.
  */
 update(dt,camera,baseTarget,reducedMotion=false){
  if(!this.active)return false;
  const key=this.active,m=CINEMATIC_MOMENTS[key];
  this.age+=Math.max(0,Math.min(.12,Number(dt)||0));
  if(this.age>=m.duration){this.cancel();return false;}
  const blend=cinematicBlend(this.age,m.duration);
  const focus=cinematicTarget(this.world,key);
  const azimuth=m.azimuth,desired=new THREE.Vector3(
   focus.x+Math.sin(azimuth)*m.radius,
   focus.y+m.altitude,
   focus.z+Math.cos(azimuth)*m.radius
  );
  const originalPosition=camera.position.clone();
  const originalTarget=baseTarget.clone();
  // Short, measured dolly + slow sideways truck: 3D parallax, no hard-cut.
  const drift=cinematicEase(this.age/m.duration);
  desired.x+=(drift-.5)*1.6;desired.z+=(drift-.5)*1.1;
  if(!reducedMotion){
   camera.position.lerp(desired,blend*.82);
   const look=originalTarget.lerp(focus,blend*.92);
   camera.lookAt(look);
  }else{
   // The story title remains readable without moving the camera at all.
   camera.position.copy(originalPosition);
  }
  this.light.position.copy(focus).add(new THREE.Vector3(1,3,1));
  this.light.intensity=m.light*blend*(.91+.09*Math.sin(this.age*2.1));
  this.light.distance=key.startsWith('tornado')?75:29;
  if(this.plate)this.plate.style.setProperty('--cinema-opacity',String(Math.min(1,blend*1.2)));
  return true;
 }
 dispose(){
  this.cancel();this.plate?.remove();
  this.light.parent?.remove(this.light);this.light.dispose();
 }
}
