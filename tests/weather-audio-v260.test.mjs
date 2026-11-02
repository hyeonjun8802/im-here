import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WEATHER_AUDIO_ASSETS,WEATHER_LOOP_CROSSFADE_SECONDS,loopCrossfadeFrames,makeSeamlessLoopBuffer,weatherAudioMix} from '../src/weatherAudio.js';

test('v2.60 supplied weather recordings are bundled as lightweight game assets',()=>{
 const expected=['rainMedium','rainHeavy','downpour','stormRain','thunder'];
 assert.deepEqual(Object.keys(WEATHER_AUDIO_ASSETS),expected);
 for(const path of Object.values(WEATHER_AUDIO_ASSETS)){
  assert.match(path,/^\.\/assets\/audio\/weather\/.+\.mp3$/);
  const disk='public/'+path.replace(/^\.\//,'');
  const stat=fs.statSync(disk);
  assert.ok(stat.size>20000,disk+' is unexpectedly small');
  assert.ok(stat.size<60000,disk+' should stay optimized for web loading');
 }
});

test('v2.60 clear cloud heat cold never leak rain recordings',()=>{
 for(const weather of ['clear','cloud','heat','cold']){
  const m=weatherAudioMix(weather,{rain:1,wind:.5,storm:1});
  assert.equal(m.rainMedium,0,weather);
  assert.equal(m.rainHeavy,0,weather);
  assert.equal(m.downpour,0,weather);
  assert.equal(m.stormRain,0,weather);
  assert.equal(m.thunderArmed,false,weather);
 }
});

test('v2.60 downpour progresses from medium rain to heavy no-thunder rain',()=>{
 const low=weatherAudioMix('rain',{rain:.24,wind:.3});
 const mid=weatherAudioMix('rain',{rain:.56,wind:.45});
 const high=weatherAudioMix('rain',{rain:.85,wind:.53});
 assert.ok(low.rainMedium>low.downpour);
 assert.ok(mid.rainHeavy>0);
 assert.ok(high.downpour>high.rainMedium);
 assert.equal(high.stormRain,0);
 assert.equal(high.thunderArmed,false);
});

test('v2.60 lightning uses continuous storm rain and arms recorded thunder',()=>{
 const m=weatherAudioMix('storm',{rain:1,wind:.88,storm:1});
 assert.ok(m.stormRain>.6);
 assert.ok(m.downpour>0);
 assert.equal(m.rainMedium,0);
 assert.equal(m.thunderArmed,true);
 assert.ok(m.thunderGain>.75);
});

test('v2.60 tornado layers strongest supplied rain with stronger wind',()=>{
 const t=weatherAudioMix('tornado',{rain:.68,wind:1,storm:1});
 const s=weatherAudioMix('storm',{rain:1,wind:.88,storm:1});
 assert.ok(t.stormRain>0&&t.rainHeavy>0&&t.downpour>0);
 assert.ok(t.wind>s.wind);
 assert.equal(t.thunderArmed,true);
});

test('v2.60 world passes the exact weather title to audio so visual and sound modes match',()=>{
 const world=fs.readFileSync('src/world.js','utf8');
 assert.match(world,/weatherAudio\.update\(vw,this\.advancedWeather\.flashTime>0 && this\.advancedWeather\.flashTime>=\.105,preset\)/);
});


test('v2.60 loop seam uses a bounded PCM tail-head equal-power crossfade',()=>{
 assert.equal(WEATHER_LOOP_CROSSFADE_SECONDS,.65);
 assert.equal(loopCrossfadeFrames(480000,48000),31200);
 assert.equal(loopCrossfadeFrames(1000,10000),180,'short clips cap crossfade at 18%');
 const input=Float32Array.from({length:1000},(_,i)=>i/1000);
 const fakeBuffer={length:1000,sampleRate:100,numberOfChannels:1,getChannelData:()=>input};
 const fakeCtx={createBuffer:(channels,length,sampleRate)=>{
  const data=Array.from({length:channels},()=>new Float32Array(length));
  return {length,sampleRate,numberOfChannels:channels,getChannelData:i=>data[i],_data:data};
 }};
 const out=makeSeamlessLoopBuffer(fakeCtx,fakeBuffer,.65);
 const fade=65,coreLength=1000-fade*2,d=out.getChannelData(0);
 assert.equal(out.length,935);
 assert.ok(Math.abs(d[0]-input[fade])<1e-7,'loop starts after the consumed head overlap');
 assert.ok(Math.abs(d[coreLength-1]-input[1000-fade-1])<1e-7);
 assert.ok(Math.abs(d[coreLength]-input[1000-fade])<1e-7,'seam starts continuously at original tail');
 assert.ok(Math.abs(d[d.length-1]-input[fade-1])<1e-6,'seam ends at original head, ready for next loop');
 assert.ok(Math.abs(d[d.length-1]-d[0])<.003,'next loop boundary is sample-close rather than a hard jump');
});

test('v2.60 recorded beds decode to AudioBuffers instead of HTML media looping',()=>{
 const src=fs.readFileSync('src/weatherAudio.js','utf8');
 assert.match(src,/decodeAudioData/);
 assert.match(src,/makeSeamlessLoopBuffer\(ctx,decoded\)/);
 assert.match(src,/source\.loop=true/);
 assert.doesNotMatch(src,/createMediaElementSource/);
 assert.match(src,/linearRampToValueAtTime\(clamp\(gain\),now\+\.08\)/);
 assert.match(src,/duration-\.72/);
});
