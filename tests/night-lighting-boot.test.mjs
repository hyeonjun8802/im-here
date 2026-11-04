import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PremiumNightLightingV710} from '../src/premiumNightLightingV710.js';

for(const mobile of [true,false]) test(`night-light initialization and update execute with real city sites (${mobile?'mobile':'desktop'})`,()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
 try{
  const world={scene:new THREE.Scene(),isMobile:mobile,ROOF_Y:80,distantCityPlan:Array.from({length:5},(_,i)=>({id:`site-${i}`,tier:'near',x:180+i*60,z:180,width:15,height:40}))};
  const system=new PremiumNightLightingV710(world);
  assert.equal(system.locals.length,mobile?2:4);
  assert.equal(system.beams.length,mobile?1:2);
  for(const local of system.locals) assert.ok(Number.isFinite(local.phase));
  for(const beam of system.beams) assert.ok(Number.isFinite(beam.userData.phase));
  system.update(.016,{cloud:.5,storm:.4,wet:1},1,.2,.5,{altitude:.7,azimuth:1},{});
  for(const local of system.locals) assert.ok(Number.isFinite(local.light.intensity)&&local.light.intensity>0);
  const ids=world.distantCityPlan.map(s=>s.id);
  system.update(.016,{},1,0,0,null,{ambientCollapseIds:ids});
  assert.ok(system.locals.every(o=>o.light.intensity===0));
  assert.ok(system.beams.every(o=>!o.visible));
  system.dispose();assert.equal(world.scene.children.length,0);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
