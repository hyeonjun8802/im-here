import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {CINEMATIC_MOMENTS,cinematicEase,cinematicBlend,cinematicTarget,
  CinematicMomentV510} from '../src/cinematicMomentV510.js';
import {defaults,applyAction} from '../src/simulation.js';

const makeWorld=()=>{
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(48,1.7,.15,1650);
 camera.position.set(62,88,71);camera.lookAt(0,53,0);
 const surv=new THREE.Group();surv.position.set(0,50,0);scene.add(surv);
 const companion=new THREE.Group();companion.position.set(-6.5,50,14.6);scene.add(companion);
 return {scene,camera,ROOF_Y:50,canvas:{parentElement:null},survivor:surv,
   supportSurvivor:{group:companion}};
};

test('ten authored story shots are meaningful and remain under ten seconds',()=>{
 const wanted=['tent','purifier','seeds','radio','helicopter','companion',
   'tornadoNear','tornadoDirect','injury','sickness'];
 assert.deepEqual(Object.keys(CINEMATIC_MOMENTS),wanted);
 for(const id of wanted){
  const p=CINEMATIC_MOMENTS[id];
  assert.ok(p.title.length>=10);
  assert.ok(p.detail.length>8);
  assert.ok(p.duration>=4&&p.duration<10);
  assert.ok(p.light>=0&&p.light<15);
 }
});

test('cinematic easing is bounded and zero at start/end without hard cuts',()=>{
 for(const t of [-1,0,.01,.25,.5,.75,.99,1,2]){
  const v=cinematicEase(t);
  assert.ok(v>=0&&v<=1);
 }
 assert.equal(cinematicEase(-1),0);
 assert.equal(cinematicEase(2),1);
 assert.equal(cinematicBlend(0,7),0);
 assert.equal(cinematicBlend(7,7),0);
 assert.ok(cinematicBlend(3,7)>.9);
 assert.ok(cinematicBlend(.2,7)<.2);
 assert.ok(cinematicBlend(6.9,7)<.2);
});

test('real 3D targets are tied to the existing rooftop and companion, not new levels',()=>{
 const w=makeWorld();
 assert.deepEqual(cinematicTarget(w,'tent').toArray(),[-8,53,-6]);
 assert.deepEqual(cinematicTarget(w,'radio').toArray(),[-2.7,52.5,-1.8]);
 assert.deepEqual(cinematicTarget(w,'companion').toArray(),[-6.5,52.2,14.6]);
 assert.deepEqual(cinematicTarget(w,'tornadoDirect').toArray(),[0,62,0]);
});

test('a cinematic changes only camera rendering and temporary scene light, never game resources',()=>{
 const w=makeWorld(),m=new CinematicMomentV510(w,{ui:false});
 const before=defaults(Date.UTC(2026,10,4));
 const state=JSON.stringify(before);
 const prevPos=w.camera.position.clone(),prevYaw=w.camera.quaternion.clone();
 assert.equal(m.play('tent'),true);
 for(let frame=0;frame<24;frame++){
  // Camera is reset by the world camera controller on each real 3D frame.
  w.camera.position.copy(prevPos);w.camera.quaternion.copy(prevYaw);
  m.update(.05,w.camera,new THREE.Vector3(0,53,0),false);
 }
 assert.notDeepEqual(w.camera.position.toArray(),prevPos.toArray());
 assert.ok(m.light.intensity>0);
 assert.equal(JSON.stringify(before),state);
 m.cancel();assert.equal(m.active,null);assert.equal(m.light.intensity,0);
 m.dispose();assert.equal(w.scene.children.includes(m.light),false);
});

test('reduced motion never moves the camera or induces cinematic shake',()=>{
 const w=makeWorld(),m=new CinematicMomentV510(w,{ui:false});
 const p=w.camera.position.clone(),q=w.camera.quaternion.clone();
 assert.equal(m.play('tornadoDirect'),true);
 for(let i=0;i<26;i++){
  m.update(.08,w.camera,new THREE.Vector3(0,53,0),true);
  assert.ok(w.camera.position.distanceTo(p)<1e-7);
  assert.ok(w.camera.quaternion.angleTo(q)<1e-7);
 }
 assert.ok(m.light.intensity>=0);
 m.dispose();
});

test('player can cancel an intense scene instantly and it never loops after finishing',()=>{
 const w=makeWorld(),m=new CinematicMomentV510(w,{ui:false});
 assert.equal(m.play('tornadoDirect'),true);
 assert.equal(m.play('helicopter'),false,'life-and-death shot is prioritized');
 m.cancel();
 assert.equal(m.active,null);
 assert.equal(m.play('helicopter'),true);
 let frames=0;
 for(;frames<100;frames++)m.update(.12,w.camera,new THREE.Vector3(0,53,0),false);
 assert.equal(m.active,null);
 assert.equal(m.light.intensity,0);
 assert.equal(m.update(.1,w.camera,new THREE.Vector3(),false),false);
 assert.equal(m.play('made-up-event'),false);
 m.dispose();
});

test('camera manual controls cancel shot; captions never capture input or replay notices',()=>{
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(world,/pointerdown',e=>\{this\.cinematicMoment\?\.cancel\(\)/);
 assert.match(world,/wheel',e=>\{e\.preventDefault\(\);this\.cinematicMoment\?\.cancel\(\)/);
 assert.match(world,/this\.cinematicMoment\?\.update\(cinematicDt,this\.camera,this\.target,this\.reducedMotion\)/);
 assert.match(world,/this\.cinematicMoment\?\.dispose\(\)/);
 assert.match(css,/\.afterday-cinema\{[^}]*pointer-events:none/s);
 assert.match(css,/\.afterday-cinema\[hidden\]\{display:none!important\}/);
 assert.match(main,/action==='scavenge_go'/);
 assert.match(main,/action==='companion_invite'/);
 assert.match(main,/action==='radio_contact'&&result\.kind==='drop'/);
 assert.match(main,/world\.update\(Math\.min\(\.12,realDt\*gameClock\.speed\),gameNow,state,realDt\)/);
});

test('tornado cinematic only begins on real applied rooftop damage, never in weather preview',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 assert.match(main,/if\(world\.previewWeather\|\|state\.weather!=='tornado'\)return/);
 assert.match(main,/if\(outcome\.applied\)\{/);
 assert.match(main,/outcome\.approach==='direct'\?'tornadoDirect':'tornadoNear'/);
 assert.match(world,/this\.previewWeather==='tornado'/);
});

test('one-time rewards remain owned by simulation and cinematic director cannot reroll them',()=>{
 const src=readFileSync(new URL('../src/cinematicMomentV510.js',import.meta.url),'utf8');
 for(const forbidden of ['applyAction(','localStorage','save(','resolveScavengeChoice','requestRadioContact(']){
  assert.equal(src.includes(forbidden),false,forbidden+' must not appear inside presentation code');
 }
 const s=defaults(Date.UTC(2026,10,4)),parts=s.supply.parts;
 assert.equal(applyAction(s,'scavenge_go',s.startedAt).good,false);
 assert.equal(s.supply.parts,parts);
});
