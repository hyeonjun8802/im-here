import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobile3DQualityProfile,nextMobile3DAutoFactor,shouldRenderMobile3DFrame} from '../src/mobile3DQuality.js';

const profile=(quality='auto',rest={})=>mobile3DQualityProfile({
 quality,devicePixelRatio:3,width:390,height:844,...rest
});

test('normal mobile 3D always requests antialiasing, crisp shadows and >1 DPR',()=>{
 for(const quality of ['auto','high','low']){
  const p=profile(quality);
  assert.equal(p.antialias,true,quality);
  assert.equal(p.shadowsEnabled,true,quality);
  assert.ok(p.pixelRatio>=1.4,JSON.stringify(p));
  assert.ok(p.shadowSize>=768,JSON.stringify(p));
 }
 assert.equal(profile('auto').shadowSize,1024);
 assert.equal(profile('auto').pixelRatio,3);
 assert.equal(profile('high').pixelRatio,3);
});

test('render pixels stay bounded on large mobile screen and low DPR screens',()=>{
 const big=profile('high',{width:820,height:1180});
 const pixels=Math.ceil(820*big.pixelRatio)*Math.ceil(1180*big.pixelRatio);
 assert.ok(pixels<big.pixelBudget+4000,JSON.stringify(big));
 assert.equal(profile('high',{devicePixelRatio:1}).pixelRatio,1);
 assert.equal(profile('auto',{width:430,height:932}).pixelRatio,3);
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
 assert.equal(nextMobile3DAutoFactor(.90,{fps:5,frames:70,elapsedMs:3500}),.90);
 assert.equal(nextMobile3DAutoFactor(.90,{fps:55,frames:70,elapsedMs:3500}),.92);
 assert.equal(nextMobile3DAutoFactor(.96,{fps:29,frames:70,elapsedMs:3500}),.98);
 assert.equal(profile('auto',{adaptiveFactor:.88}).pixelRatio,2.7);
});

test('mobile world preserves 3D scene, safe mode, daily logic and quality API',()=>{
 const s=readFileSync('src/world.js','utf8');
 assert.match(s,/new THREE\.WebGLRenderer/);
 assert.match(s,/antialias:!this\.gpuSafeMode/);
 assert.match(s,/this\.sun\.shadow\.mapSize\.set\(mobile\?mobileProfile\.shadowSize/);
 assert.match(s,/this\.trackMobilePerformance\(\)/);
 assert.match(s,/shouldRenderMobile3DFrame\(\{/);
 assert.doesNotMatch(s,/_lastMobileRenderedAt/);
 assert.match(s,/this\.life\.update\(dt,now,game,preset\)/);
 assert.match(s,/this\.gpuSafeMode=mobile&&gpuSafeMode/);
 assert.match(s,/this\.premiumAssetFinish\?\.setQuality\(low\)/);
 assert.match(s,/this\.life\.update\(dt,now,game,preset\)/);
 assert.match(s,/const normalBucket=Math\.floor\(t\*10\/8\)/);
 assert.match(s,/const normalBucket=Math\.floor\(t\*8\/5\)/);
 assert.doesNotMatch(s,/Math\.floor\(t\*10\)%8===0/);
 assert.doesNotMatch(s,/Math\.floor\(t\*8\)%5===0/);
});

test('mobile 30fps cadence keeps gameplay updates separate from GPU rendering',()=>{
 assert.equal(shouldRenderMobile3DFrame({isMobile:true,now:101,lastRenderAt:0}),true);
 assert.equal(shouldRenderMobile3DFrame({isMobile:true,now:116,lastRenderAt:101}),false);
 assert.equal(shouldRenderMobile3DFrame({isMobile:true,now:135,lastRenderAt:101}),true);
 assert.equal(shouldRenderMobile3DFrame({isMobile:true,quality:'high',now:116,lastRenderAt:101}),true);
 assert.equal(shouldRenderMobile3DFrame({isMobile:false,now:116,lastRenderAt:101}),true);
});

test('mobile city and lighting cache persisted damage while hiding invisible daytime lights',()=>{
 const urban=readFileSync('src/premiumUrbanSilhouetteV680.js','utf8');
 const night=readFileSync('src/premiumNightLightingV710.js','utf8');
 assert.match(urban,/if\(this\.mobile\)\{/);
 assert.match(urban,/this\._damageVisibilityKey/);
 assert.match(night,/this\._blockedLightIds/);
 assert.match(night,/o\.pool\.visible=alive&&\(!this\.mobile\|\|o\.mat\.opacity>\.008\)/);
 assert.match(night,/if\(this\.mobile\)o\.light\.visible=/);
});

test('retina iPhone canvas uses native DPR 3 by default, with bounded adaptive floor',()=>{
 const phone={devicePixelRatio:3,width:390,height:844};
 const normal=mobile3DQualityProfile({...phone,quality:'auto'});
 const adaptive=mobile3DQualityProfile({...phone,quality:'auto',adaptiveFactor:.75});
 const high=mobile3DQualityProfile({...phone,quality:'high'});
 assert.equal(normal.pixelRatio,3);
 assert.equal(adaptive.pixelRatio,2.7);
 assert.equal(high.pixelRatio,normal.pixelRatio);
 assert.equal(high.pixelRatio,phone.devicePixelRatio);
 assert.equal(normal.pixelRatio*normal.pixelRatio,9);
});

test('DPR scale is conservative for large mobile screens but native on iPhone',()=>{
 for(const [width,height] of [[390,844],[430,932],[844,390]]){
  const result=mobile3DQualityProfile({devicePixelRatio:3,width,height,quality:'auto'});
  assert.equal(result.pixelRatio,3,JSON.stringify({width,height,result}));
  assert.ok(Math.ceil(width*result.pixelRatio)*Math.ceil(height*result.pixelRatio)<=result.pixelBudget+10000);
 }
 const large=mobile3DQualityProfile({devicePixelRatio:3,width:820,height:1180,quality:'auto'});
 assert.ok(large.pixelRatio<3);
 assert.ok(large.pixelRatio>1.9);
 const poorDevice=mobile3DQualityProfile({devicePixelRatio:1.5,width:390,height:844,quality:'auto'});
 assert.ok(poorDevice.pixelRatio<=1.5);
});
