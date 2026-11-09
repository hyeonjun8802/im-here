import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobile3DQualityProfile,nextMobile3DAutoFactor} from '../src/mobile3DQuality.js';

const profile=(quality='auto',rest={})=>mobile3DQualityProfile({
 quality,devicePixelRatio:3,width:390,height:844,...rest
});

test('normal mobile 3D always requests antialiasing, crisp shadows and >1 DPR',()=>{
 for(const quality of ['auto','high','low']){
  const p=profile(quality);
  assert.equal(p.antialias,true,quality);
  assert.equal(p.shadowsEnabled,true,quality);
  assert.ok(p.pixelRatio>=1.18,JSON.stringify(p));
  assert.ok(p.shadowSize>=768,JSON.stringify(p));
 }
 assert.equal(profile('auto').shadowSize,1024);
 assert.equal(profile('auto').pixelRatio,1.35);
 assert.equal(profile('high').pixelRatio,1.55);
});

test('render pixels stay bounded on large mobile screen and low DPR screens',()=>{
 const big=profile('high',{width:820,height:1180});
 const pixels=Math.ceil(820*big.pixelRatio)*Math.ceil(1180*big.pixelRatio);
 assert.ok(pixels<big.pixelBudget+4000,JSON.stringify(big));
 assert.equal(profile('high',{devicePixelRatio:1}).pixelRatio,1);
 assert.ok(profile('auto',{width:430,height:932}).pixelRatio>1.2);
});

test('WebGL-loss safety mode remains available and does not jeopardize saves',()=>{
 const safe=profile('auto',{gpuSafeMode:true});
 assert.equal(safe.pixelRatio,1);
 assert.equal(safe.shadowsEnabled,false);
 assert.equal(safe.antialias,false);
 assert.equal(safe.shadowSize,256);
});

test('auto adaptation is limited and avoids instant resolution collapses',()=>{
 assert.equal(nextMobile3DAutoFactor(1,{fps:12,frames:5,elapsedMs:3000}),1);
 assert.equal(nextMobile3DAutoFactor(1,{fps:12,frames:40,elapsedMs:1000}),1);
 assert.equal(nextMobile3DAutoFactor(1,{fps:17,frames:70,elapsedMs:3500}),.96);
 assert.equal(nextMobile3DAutoFactor(.88,{fps:5,frames:70,elapsedMs:3500}),.88);
 assert.equal(nextMobile3DAutoFactor(.88,{fps:55,frames:70,elapsedMs:3500}),.91);
 assert.equal(nextMobile3DAutoFactor(.96,{fps:29,frames:70,elapsedMs:3500}),.96);
 assert.ok(profile('auto',{adaptiveFactor:.88}).pixelRatio>=1.18);
});

test('mobile world preserves 3D scene, safe mode, daily logic and quality API',()=>{
 const s=readFileSync('src/world.js','utf8');
 assert.match(s,/new THREE\.WebGLRenderer/);
 assert.match(s,/antialias:!this\.gpuSafeMode/);
 assert.match(s,/this\.sun\.shadow\.mapSize\.set\(mobile\?mobileProfile\.shadowSize/);
 assert.match(s,/this\.trackMobilePerformance\(\)/);
 assert.match(s,/this\.mobileQuality!=='high'/);
 assert.match(s,/renderAt-this\._lastMobileRenderedAt<1000\/30-1/);
 assert.match(s,/this\.life\.update\(dt,now,game,preset\)/);
 assert.match(s,/this\.gpuSafeMode=mobile&&gpuSafeMode/);
 assert.match(s,/this\.premiumAssetFinish\?\.setQuality\(low\)/);
 assert.match(s,/this\.life\.update\(dt,now,game,preset\)/);
 assert.match(s,/const normalBucket=Math\.floor\(t\*10\/8\)/);
 assert.match(s,/const normalBucket=Math\.floor\(t\*8\/5\)/);
 assert.doesNotMatch(s,/Math\.floor\(t\*10\)%8===0/);
 assert.doesNotMatch(s,/Math\.floor\(t\*8\)%5===0/);
});
