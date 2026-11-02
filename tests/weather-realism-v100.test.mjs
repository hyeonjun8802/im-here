import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {clamp01,rainVelocity,rainSlant,precipitationOpacity,wetSurfaceRoughness,lightningEnvelope,rainLayers,accumulatedSnow} from '../src/weatherVisualMath.js';
import {SPATIAL_LAYOUT,planDistantCity} from '../src/spatialLayout.js';
const source=path=>fs.readFileSync(path,'utf8');

test('rain gradually accelerates as storm intensity grows',()=>{
 const a=rainVelocity(0,0),b=rainVelocity(.5,.4),c=rainVelocity(1,1);
 assert.ok(18<a && a<b && b<c && c<45);
 assert.ok(rainSlant(.1)<rainSlant(.6) && rainSlant(.6)<rainSlant(1));
});
test('near rain stays discernible while distant precipitation fades with depth',()=>{
 for(const strength of [.1,.3,.7,1]){
  const near=precipitationOpacity(strength,8),mid=precipitationOpacity(strength,40),far=precipitationOpacity(strength,120);
  assert.ok(near>mid && mid>far && far>=0);
 }
});
test('wet concrete changes from coarse to smooth but remains non-metallic',()=>{
 assert.ok(wetSurfaceRoughness(0)>.8);
 assert.ok(wetSurfaceRoughness(1)<.25);
 for(let i=0;i<10;i++)assert.ok(wetSurfaceRoughness(i/10)>wetSurfaceRoughness((i+1)/10));
});
test('lightning produces two distinct strokes rather than a constant flash',()=>{
 const times=Array.from({length:320},(_,i)=>i/1000);
 const peaks=times.filter((t,i)=>i>0&&i<times.length-1&&lightningEnvelope(t)>lightningEnvelope(times[i-1])&&lightningEnvelope(t)>lightningEnvelope(times[i+1]));
 assert.ok(peaks.length>=2,JSON.stringify(peaks));
 assert.ok(lightningEnvelope(.033)>lightningEnvelope(.07));
 assert.ok(lightningEnvelope(.33)<.02);
});
test('wind/snow are bounded and snow can melt after weather changes',()=>{
 assert.equal(clamp01(-3),0);assert.equal(clamp01(Infinity),0);
 assert.ok(accumulatedSnow(.2,1,30)>.2);
 assert.ok(accumulatedSnow(.2,0,30)<.2);
 assert.equal(rainLayers(true).near<rainLayers(false).near,true);
});
test('new rain and snow are real depth-tested 3D instanced shader meshes',()=>{
 const s=source('src/cinematicWeatherVfx.js');
 for(const token of ['InstancedBufferGeometry','InstancedBufferAttribute','cameraPosition','depthTest:true','roofRipples','dynamicCloudSky','fbm','sunDirection']){
   assert.ok(s.includes(token)||token==='sunDirection'&&s.includes('uSunDirection'),token);
 }
 assert.match(s,/this\.elapsed\+=/);
 assert.match(s,/mesh\.visible=rain>/);
 assert.match(s,/this\.snow\.visible=snow>/);
});
test('original one-rooftop 3D city and game time remain unchanged',()=>{
 const world=source('src/world.js');
 assert.match(world,/this\.weatherVfx=new CinematicWeatherVfx/);
 assert.match(world,/this\.rain\.visible=false/);
 assert.match(world,/this\.weatherVfx\.update\(dt,vw,night/);
 assert.equal(SPATIAL_LAYOUT.heroRoofCount,1);
 const hash=n=>{let x=Math.sin(n*127.1+46.4)*43758.5453;return x-Math.floor(x)};
 assert.deepEqual(planDistantCity(false,hash),planDistantCity(false,hash));
 assert.match(source('src/simulation.js'),/Asia\/Seoul/);
});
test('weather audio remains user-opt-in and keeps procedural fallback for failed recordings',()=>{
 const s=source('src/weatherAudio.js');
 assert.match(s,/this\.enabled=false/);
 assert.match(s,/fetch\(url/);
 assert.match(s,/decodeAudioData/);
 assert.match(s,/makeSeamlessLoopBuffer\(ctx,decoded\)/);
 assert.match(s,/createBufferSource/);
 assert.doesNotMatch(s,/createMediaElementSource/);
 assert.match(s,/this\.parts\.noiseBuffer/);
 assert.match(s,/syntheticThunder/);
 assert.match(s,/lowpass/);
});
