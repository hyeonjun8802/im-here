import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {PremiumEventPhysicsV520,TENT_BUILD_SECONDS,IMPACT_SECONDS,
  BUILD_DEBRIS_DESKTOP,BUILD_DEBRIS_MOBILE,tentAssemblyProgress,bounceHeight} from '../src/premiumEventPhysicsV520.js';
import {RescueHelicopterVfx,flightPosition,parachutePosition,
  RESCUE_DROP_START,RESCUE_DROP_END,RESCUE_EXIT} from '../src/rescueHelicopterVfx.js';
import {defaults} from '../src/simulation.js';

const stubWorld=(mobile=false)=>{
 const scene=new THREE.Scene();
 const actor=new THREE.Group();actor.position.set(-1,50.2,1);scene.add(actor);
 const shelter=new THREE.Group(),asset=new THREE.Group(),bedding=new THREE.Group();
 scene.add(shelter,asset,bedding);
 return {scene,ROOF_Y:50,isMobile:mobile,reducedMotion:false,
  activeKit:{tent:true},survivor:actor,shelter,shelterAsset:asset,
  sleepBedding:{group:bedding},cinematicTornado:{root:{position:new THREE.Vector3(43,0,-10)}}};
};

test('a newly earned tent opens a real, folded construction stage then restores original assets',()=>{
 const world=stubWorld(),vfx=new PremiumEventPhysicsV520(world);
 assert.equal(vfx.tent.visible,false);
 assert.equal(vfx.play('tent'),true);
 assert.equal(vfx.tentActive,true);
 assert.equal(world.shelter.visible,false,'do not flash the finished tent before construction');
 assert.equal(world.shelterAsset.visible,false);
 const start=vfx.fabric.geometry.attributes.position.array.slice();
 vfx.update(.07);
 const next=vfx.fabric.geometry.attributes.position.array;
 assert.notDeepEqual(Array.from(next),Array.from(start));
 assert.ok(vfx.tent.visible);
 for(let frame=0;frame<140;frame++)vfx.update(.07);
 assert.equal(vfx.tentActive,false);
 assert.equal(vfx.tent.visible,false);
 assert.equal(world.shelter.visible,true);
 assert.equal(world.shelterAsset.visible,true);
 assert.equal(world.sleepBedding.group.visible,true);
 vfx.dispose();
});
test('torn canvas construction has continuous bounded geometry and a fixed real-time deadline',()=>{
 let prev=0;
 for(let t=0;t<=TENT_BUILD_SECONDS+.1;t+=.1){
  const n=tentAssemblyProgress(t);
  assert.ok(n>=prev-1e-9&&n<=1);
  prev=n;
 }
 assert.equal(tentAssemblyProgress(-1),0);
 assert.equal(tentAssemblyProgress(TENT_BUILD_SECONDS*3),1);
 assert.ok(bounceHeight(12,24,0)===0);
 assert.ok(bounceHeight(12,24,1.5)===0);
});
test('near/direct storms throw finite, colliding fragments onto the SAME rooftop',()=>{
 const w=stubWorld(),vfx=new PremiumEventPhysicsV520(w);
 assert.equal(vfx.fragmentCount,BUILD_DEBRIS_DESKTOP);
 assert.equal(vfx.play('tornadoNear'),true);
 const state=defaults(Date.UTC(2026,10,4));
 const original=JSON.stringify(state);
 for(let frame=0;frame<42;frame++)vfx.update(.06,{weather:'storm'});
 assert.ok(vfx.debrisActive);
 assert.ok(vfx.fragments.visible);
 for(const p of vfx.fragmentsState){
  assert.ok(p.position.y>=w.ROOF_Y+.26-1e-8,'no stone may clip below the roof');
  assert.ok(p.position.x>=-22.5&&p.position.x<=22.5,'shards remain on the existing playable roof');
  assert.ok(p.position.z>=-22.5&&p.position.z<=22.5);
  assert.ok(Number.isFinite(p.velocity.x));
 }
 assert.equal(JSON.stringify(state),original,'presentation cannot mutate survival state');
 for(let i=0;i<120;i++)vfx.update(.07,{weather:'storm'});
 assert.equal(vfx.fragments.visible,false);
 assert.equal(w.survivor.rotation.x,0);assert.equal(w.survivor.rotation.z,0);
 vfx.dispose();
});
test('direct impact is more intense, but OS reduce motion disables any actor body jerk',()=>{
 const w=stubWorld(true),vfx=new PremiumEventPhysicsV520(w);
 assert.equal(vfx.fragmentCount,BUILD_DEBRIS_MOBILE);
 vfx.play('tornadoDirect');
 vfx.update(.06,{reducedMotion:true});
 assert.equal(w.survivor.rotation.x,0);
 assert.equal(w.survivor.rotation.z,0);
 assert.ok(vfx.fragmentsState.every(p=>p.scale>0));
 for(let i=0;i<115;i++)vfx.update(.07,{reducedMotion:true});
 assert.equal(vfx.debrisActive,false);
 vfx.dispose();
});
test('permanent saved tent remains visible after reload without replaying the build animation',()=>{
 const w=stubWorld(),vfx=new PremiumEventPhysicsV520(w);
 assert.equal(vfx.tentActive,false);
 assert.equal(w.shelter.visible,true);
 vfx.update(.05);
 assert.equal(w.shelter.visible,true);
 const oldSave=defaults(Date.UTC(2026,10,4));
 oldSave.kit.tent=true;
 const str=JSON.stringify(oldSave),restored=JSON.parse(str);
 assert.equal(restored.kit.tent,true);
 assert.equal(str.includes('tentAge'),false,'cosmetic phase is not written to saves');
 vfx.dispose();
});
test('aircraft and crate physically share a release point before a wind-drift descent',()=>{
 const y=50;
 const heli=flightPosition(RESCUE_DROP_START,y),crate=parachutePosition(RESCUE_DROP_START,y);
 assert.equal(crate.x,heli.x);
 assert.equal(crate.z,heli.z);
 assert.ok(heli.y-crate.y>=1&&heli.y-crate.y<6);
 const middle=parachutePosition((RESCUE_DROP_START+RESCUE_DROP_END)/2,y);
 assert.ok(middle.y>y+1&&middle.y<y+38);
 const landed=parachutePosition(RESCUE_DROP_END,y);
 assert.deepEqual(landed.toArray(),[8,y+.98,9]);
 assert.ok(Math.abs(landed.x)<22&&Math.abs(landed.z)<22);
 assert.ok(flightPosition(RESCUE_EXIT,y).x>80);
});
test('one radio delivery flies in, deploys canopy, settles on roof and ends without duplicate rewards',()=>{
 const scene=new THREE.Scene(),fx=new RescueHelicopterVfx(scene,50,{mobile:true});
 fx.update(.1,31,'drop');assert.equal(fx.active,false,'saved old radio does not replay');
 fx.update(.1,32,'drop');assert.equal(fx.active,true);
 let frames=0;
 while(fx.clock<RESCUE_DROP_START+.25&&frames++<130)fx.update(.10,32,'drop');
 assert.equal(fx.crate.visible,true);
 assert.equal(fx.rigging.visible,true);
 assert.equal(fx.shadow.visible,true);
 while(fx.clock<RESCUE_DROP_END+.1&&frames++<200)fx.update(.10,32,'drop');
 assert.equal(fx.crate.visible,true);
 assert.equal(fx.rigging.visible,false,'canopy folds at landing');
 assert.ok(fx.crate.position.distanceTo(new THREE.Vector3(8,50+.98,9))<.02);
 assert.equal(fx.dust.visible,true);
 while(fx.clock<RESCUE_EXIT+.1&&frames++<260)fx.update(.1,32,'drop');
 assert.equal(fx.active,false);
 assert.equal(fx.root.visible,false);
 assert.equal(fx.crate.visible,false);
 fx.update(.1,32,'drop');assert.equal(fx.active,false,'same radio event cannot replay');
 fx.dispose();
});
test('successful item acquisition launches existing tent installer; storms do not add gameplay damage',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 const rig=readFileSync(new URL('../src/beardedSurvivorV190.js',import.meta.url),'utf8');
 const life=readFileSync(new URL('../src/lifePlan.js',import.meta.url),'utf8');
 const lifeActor=readFileSync(new URL('../src/survivorLife.js',import.meta.url),'utf8');
 assert.match(main,/result\.item==='tent'\)world\?\.setAction\('install_tent'\)/);
 assert.doesNotMatch(life,/install_tent/,'approved autonomous schedule remains unchanged');
 assert.match(rig,/a==='repair'\|\|a==='install_tent'/);
 assert.match(lifeActor,/install_tent:\[-1\.25,-1\.34\]/);
 assert.match(lifeActor,/action==='install_tent'\?\{label:/);
 assert.match(world,/this\.eventPerformance\?\.update\(cinematicDt/);
 assert.match(world,/this\.rescueHelicopterVfx\?\.update\(cinematicDt/);
 assert.match(main,/if\(outcome\.applied\)/);
});
