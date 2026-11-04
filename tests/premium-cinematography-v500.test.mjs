import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {PremiumAtmosphereV500} from '../src/premiumAtmosphereV500.js';
import {calcPostGrade} from '../src/presentationPlanV140.js';

const makeWorld=mobile=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(47,1.7,.15,1650);
 camera.position.set(45,68,52);camera.lookAt(0,50,0);
 return {scene,camera,ROOF_Y:50,isMobile:mobile};
};
const weather=(patch={})=>({storm:0,rain:0,wind:.18,...patch});

test('premium rooftop air is actual camera-aware 3D with minimal draw calls',()=>{
 const w=makeWorld(false),a=new PremiumAtmosphereV500(w);
 assert.equal(a.shafts.length,2);
 assert.equal(a.particles.geometry.getAttribute('position').count,310);
 assert.ok(w.scene.children.includes(a.root));
 assert.ok(w.scene.children.includes(a.particles));
 assert.equal(a.shafts.every(m=>m.material.depthWrite===false&&m.material.depthTest===true),true);
 assert.equal(a.particles.material.depthWrite,false);
 assert.ok(a.particles.geometry.boundingSphere.radius<100);
 a.update(.016,weather(),.7,0);
 assert.equal(a.shafts[0].visible,true);
 assert.equal(a.particles.visible,true);
 assert.equal(a.shafts[0].material.uniforms.uTime.value>0,true);
 assert.ok(a.shafts[0].position.distanceTo(new THREE.Vector3(2,59.2,3))<.2,'ray source is campfire');
 a.dispose();
 assert.equal(w.scene.children.includes(a.root),false);
 assert.equal(w.scene.children.includes(a.particles),false);
});
test('night increases illuminated air while rain binds dust and storm reduces warm shafts',()=>{
 const w=makeWorld(false),a=new PremiumAtmosphereV500(w);
 a.update(.016,weather(),0,0);
 const day=a.shafts[0].material.uniforms.uStrength.value;
 a.update(.016,weather(),1,0);
 const night=a.shafts[0].material.uniforms.uStrength.value;
 assert.ok(night>day,'actual firelight must read stronger against night');
 const dry=a.particles.material.uniforms.uIntensity.value;
 a.update(.016,weather({rain:1,storm:1,wind:1}),1,.6);
 const rain=a.particles.material.uniforms.uIntensity.value;
 assert.ok(rain<dry,'rain cuts airborne dust');
 assert.equal(a.shafts[0].material.uniforms.uStorm.value,1);
 assert.equal(a.shafts[0].material.uniforms.uFlash.value,.6);
 assert.equal(a.particles.material.uniforms.uWind.value,1);
 a.dispose();
});
test('mobile uses fewer GPU particles and beams than desktop without changing gameplay',()=>{
 const w=makeWorld(true),a=new PremiumAtmosphereV500(w);
 assert.equal(a.shafts.length,1);
 assert.equal(a.particles.geometry.getAttribute('position').count,110);
 a.update(0,weather({storm:.3}),.6,.4);
 assert.ok(a.shafts[0].material.uniforms.uStrength.value>=0);
 a.dispose();
});
test('filmic grade stays coherent across light and storm with bounded saturation and contrast',()=>{
 const day=calcPostGrade({night:0,storm:0,wetness:0,twilight:0});
 const night=calcPostGrade({night:1,storm:1,wetness:1,twilight:0});
 assert.ok(day.saturation<1&&day.saturation>.8);
 assert.ok(night.saturation<day.saturation&&night.saturation>.7);
 assert.ok(night.contrast>day.contrast&&night.contrast<1.2);
 assert.ok(night.shadowBlue>day.shadowBlue&&night.shadowBlue<.4);
 assert.ok(night.bloomStrength<.5&&night.filmGrain<.01);
});
test('real world—not canvas overlay—owns cinematic air, color and reduced-motion safety',()=>{
 const src=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
 const post=readFileSync(new URL('../src/cinematicPostV130.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(src,/new PremiumAtmosphereV500\(this\)/);
 assert.match(src,/this\.premiumAtmosphere\?\.update\(dt,vw,night,lightningStrength\)/);
 assert.match(src,/this\.premiumAtmosphere\?\.dispose\(\)/);
 assert.match(src,/if\(!this\.reducedMotion\)/);
 assert.match(post,/uContrast/);
 assert.match(post,/uSaturation/);
 assert.match(post,/this\.composer\.addPass\(new OutputPass\(\)\)/);
 assert.match(css,/--v5-steel/);
});
