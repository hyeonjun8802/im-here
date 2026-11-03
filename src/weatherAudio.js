/**
 * User-activated weather ambience.
 *
 * Supplied rain/storm recordings are used for the actual weather beds.
 * Loop seams are rebuilt in PCM after decode: the tail and head are
 * equal-power crossfaded, so MP3 encoder boundaries cannot create a click/gap.
 * Procedural WebAudio noise remains only as wind/fallback.
 */
export const WEATHER_AUDIO_ASSETS=Object.freeze({
 rainMedium:'./assets/audio/weather/rain_medium.mp3',
 rainHeavy:'./assets/audio/weather/rain_heavy.mp3',
 downpour:'./assets/audio/weather/downpour_no_thunder.mp3',
 stormRain:'./assets/audio/weather/storm_heavy_rain.mp3',
 thunder:'./assets/audio/weather/storm_thunder_strong.mp3'
});

export const WEATHER_LOOP_CROSSFADE_SECONDS=.9;

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const smooth=v=>{const x=clamp(v);return x*x*(3-2*x);};

export function loopCrossfadeFrames(length,sampleRate,seconds=WEATHER_LOOP_CROSSFADE_SECONDS){
 const n=Math.max(0,Math.floor(Number(length)||0)),sr=Math.max(1,Math.floor(Number(sampleRate)||1));
 // Never consume more than ~18% of the recording, even for a very short clip.
 return Math.max(0,Math.min(Math.floor(sr*Math.max(0,seconds)),Math.floor(n*.18)));
}

function windowRms(data,start,end){
 const a=Math.max(0,Math.floor(start)),b=Math.min(data.length,Math.max(a+1,Math.floor(end)));
 let sum=0,n=0;
 const stride=Math.max(1,Math.floor((b-a)/2048));
 for(let i=a;i<b;i+=stride){const v=data[i]||0;sum+=v*v;n++;}
 return Math.sqrt(sum/Math.max(1,n));
}

export function findStableLoopBounds(buffer){
 const length=Math.max(0,Math.floor(buffer?.length||0)),sr=Math.max(1,Math.floor(buffer?.sampleRate||1));
 if(!buffer||length<sr*2)return {start:0,end:length,deltaDb:0};
 const channels=Math.max(1,buffer.numberOfChannels||1),edge=Math.floor(sr*.34),step=Math.max(32,Math.floor(sr*.035));
 const trim=Math.min(Math.floor(length*.16),Math.floor(sr*1.25));
 const minLength=Math.floor(length*.68);
 const channelData=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
 const rmsAt=(frame)=>{
  let total=0;
  for(const data of channelData)total+=windowRms(data,frame-edge*.5,frame+edge*.5);
  return total/channels;
 };
 let global=0,count=0;
 for(let p=edge;p<length-edge;p+=Math.max(step*8,edge)){global+=rmsAt(p);count++;}
 global/=Math.max(1,count);
 const floor=Math.max(1e-7,global*.34),db=v=>20*Math.log10(Math.max(1e-9,v));
 let best={start:0,end:length,deltaDb:Math.abs(db(rmsAt(edge))-db(rmsAt(length-edge))),score:Infinity};
 for(let s=0;s<=trim;s+=step){
  const rs=rmsAt(s+edge);if(rs<floor)continue;
  for(let e=length-trim;e<=length;e+=step){
   if(e-s<minLength)continue;
   const re=rmsAt(e-edge);if(re<floor)continue;
   const delta=Math.abs(db(rs)-db(re));
   const score=delta+((s+(length-e))/Math.max(1,length))*.55;
   if(score<best.score)best={start:s,end:e,deltaDb:delta,score};
  }
 }
 return best;
}

/**
 * Rebuild one loop period so:
 *   core end -> original tail is continuous,
 *   original tail -> original head is equal-power crossfaded,
 *   crossfade end -> core start is continuous on the next loop.
 *
 * This is stronger than merely fading to silence: there is no rhythmic
 * volume dip every time the weather bed repeats.
 */
export function makeSeamlessLoopBuffer(ctx,buffer,seconds=WEATHER_LOOP_CROSSFADE_SECONDS){
 if(!buffer)return buffer;
 const bounds=findStableLoopBounds(buffer),usable=Math.max(0,bounds.end-bounds.start);
 const fade=loopCrossfadeFrames(usable,buffer.sampleRate,seconds);
 if(fade<32||usable<=fade*2)return buffer;
 const coreStart=bounds.start+fade,coreEnd=bounds.end-fade,coreLength=coreEnd-coreStart;
 const out=ctx.createBuffer(buffer.numberOfChannels,usable-fade,buffer.sampleRate);
 for(let ch=0;ch<buffer.numberOfChannels;ch++){
  const src=buffer.getChannelData(ch),dst=out.getChannelData(ch);
  dst.set(src.subarray(coreStart,coreEnd),0);
  for(let i=0;i<fade;i++){
   const t=fade===1?1:i/(fade-1);
   const tailGain=Math.cos(t*Math.PI*.5),headGain=Math.sin(t*Math.PI*.5);
   dst[coreLength+i]=src[bounds.end-fade+i]*tailGain+src[bounds.start+i]*headGain;
  }
 }
 return out;
}

/**
 * Pure weather-to-audio mixer, kept separate from browser APIs so the exact
 * title mapping can be regression tested.
 */
export function weatherAudioMix(weather='clear',w={}){
 const rain=clamp(w.rain),wind=clamp(w.wind),storm=clamp(w.storm),mix={
  rainMedium:0,rainHeavy:0,downpour:0,stormRain:0,wind:.018+.08*wind,thunderArmed:false,thunderGain:0
 };
 if(weather==='rain'){
  // As the visual rain blends in: medium -> heavy -> no-thunder downpour.
  mix.rainMedium=.56*smooth((rain-.03)/.30)*(1-smooth((rain-.52)/.22));
  mix.rainHeavy=.58*smooth((rain-.22)/.36)*(1-.58*smooth((rain-.76)/.18));
  mix.downpour=.72*smooth((rain-.52)/.28);
  mix.wind=.055+.13*wind;
 }else if(weather==='storm'){
  // "낙뢰": continuous storm rain, with the thunder recording triggered by
  // the same visual lightning event.
  mix.stormRain=.68*smooth((Math.max(rain,storm)-.08)/.46);
  mix.downpour=.24*smooth((rain-.45)/.35);
  mix.wind=.09+.20*wind;
  mix.thunderArmed=true;mix.thunderGain=.82;
 }else if(weather==='tornado'){
  // No dedicated tornado recording was supplied. Layer the strongest supplied
  // storm/rain beds and let the existing procedural wind provide the vortex.
  mix.stormRain=.58*smooth((Math.max(rain,storm)-.05)/.40);
  mix.rainHeavy=.34*smooth((rain-.18)/.40);
  mix.downpour=.24*smooth((rain-.42)/.35);
  mix.wind=.16+.28*wind;
  mix.thunderArmed=true;mix.thunderGain=.62;
 }else if(weather==='cold'){
  mix.wind=.08+.19*wind;
 }else if(weather==='cloud'){
  mix.wind=.035+.11*wind;
 }else if(weather==='heat'){
  mix.wind=.018+.055*wind;
 }
 return mix;
}

export class WeatherAudio{
 constructor(){
  this.context=null;this.enabled=false;this.parts={};this.clips={};this.loopSources={};
  this.loadPromise=null;this.currentWeather='clear';this.lastThunder=-Infinity;this.pendingThunder=null;
 }
 async toggle(){
  if(this.enabled){
   this.enabled=false;
   if(this.pendingThunder){clearTimeout(this.pendingThunder);this.pendingThunder=null;}
   const ctx=this.context;
   this.parts.master?.gain.setTargetAtTime(0,ctx.currentTime,.12);
   setTimeout(()=>{if(!this.enabled&&ctx?.state==='running')ctx.suspend().catch(()=>{});},240);
   return false;
  }
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)throw new Error('이 브라우저는 WebAudio를 지원하지 않습니다.');
  if(!this.context){this.context=new Ctx();this.setup();}
  await this.context.resume();
  this.enabled=true;
  await this.startLoops();
  this.parts.master.gain.setTargetAtTime(.64,this.context.currentTime,.18);
  return true;
 }
 setup(){
  const ctx=this.context,master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);this.parts.master=master;
  const noise=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),dst=noise.getChannelData(0);let seed=7331;
  for(let i=0;i<dst.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;dst[i]=((seed/4294967296)*2-1)*.5;}
  this.parts.noiseBuffer=noise;
  const addNoise=(type,frequency,q)=>{const source=ctx.createBufferSource();source.buffer=noise;source.loop=true;
   const filter=ctx.createBiquadFilter();filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;
   const amp=ctx.createGain();amp.gain.value=0;source.connect(filter).connect(amp).connect(master);source.start();return amp;};
  this.parts.rainFallback=addNoise('highpass',1050,.32);
  this.parts.wind=addNoise('lowpass',480,.25);
  this.parts.hiss=addNoise('bandpass',2500,.5);

  for(const key of ['rainMedium','rainHeavy','downpour','stormRain']){
   const gain=ctx.createGain();gain.gain.value=0;gain.connect(master);
   this.clips[key]={gain,buffer:null,failed:false};
  }
  this.clips.thunder={buffer:null,failed:false};
  this.loadPromise=this.loadRecordedAudio();
 }
 async loadRecordedAudio(){
  const ctx=this.context;
  await Promise.all(Object.entries(WEATHER_AUDIO_ASSETS).map(async([key,url])=>{
   const entry=this.clips[key];if(!entry)return;
   try{
    const response=await fetch(url,{cache:'force-cache'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const decoded=await ctx.decodeAudioData(await response.arrayBuffer());
    entry.buffer=key==='thunder'?decoded:makeSeamlessLoopBuffer(ctx,decoded);
   }catch(error){
    entry.failed=true;console.warn('[AFTERDAY] weather audio fallback',key,error);
   }
  }));
 }
 async startLoops(){
  await this.loadPromise;
  for(const key of ['rainMedium','rainHeavy','downpour','stormRain']){
   if(this.loopSources[key]||this.clips[key]?.failed||!this.clips[key]?.buffer)continue;
   const source=this.context.createBufferSource(),buffer=this.clips[key].buffer;
   source.buffer=buffer;source.loop=true;source.connect(this.clips[key].gain);
   // Starting each ambience at a different place avoids all layers sharing the
   // same loop seam, while the reconstructed buffer keeps every seam smooth.
   source.start(0,Math.random()*Math.max(.01,buffer.duration-.02));
   this.loopSources[key]=source;
  }
 }
 setClipGain(key,value,now){
  const entry=this.clips[key];if(!entry?.gain)return;
  entry.gain.gain.setTargetAtTime(entry.failed?0:clamp(value),now,.42);
 }
 update(w,flash,weather='clear'){
  if(!this.context||!this.enabled)return;
  this.currentWeather=weather;
  const now=this.context.currentTime,m=weatherAudioMix(weather,w);
  for(const key of ['rainMedium','rainHeavy','downpour','stormRain'])this.setClipGain(key,m[key],now);
  const anyBroken=['rainMedium','rainHeavy','downpour','stormRain'].some(k=>this.clips[k]?.failed);
  this.parts.rainFallback.gain.setTargetAtTime(anyBroken?clamp(w.rain)*.14:clamp(w.rain)*.022,now,.35);
  this.parts.hiss.gain.setTargetAtTime(clamp(w.rain)*.018,now,.25);
  this.parts.wind.gain.setTargetAtTime(Math.min(.46,m.wind),now,.55);
  if(flash&&m.thunderArmed&&now-this.lastThunder>7.2&&!this.pendingThunder)this.queueThunder(m.thunderGain);
 }
 queueThunder(gain=.8){
  // Visual flash first, then the supplied strike after a natural distance delay.
  const delay=.35+Math.random()*.9;
  this.pendingThunder=setTimeout(()=>{
   this.pendingThunder=null;
   if(!this.enabled||!['storm','tornado'].includes(this.currentWeather))return;
   this.playRecordedThunder(gain);
  },delay*1000);
 }
 playRecordedThunder(gain=.8){
  const entry=this.clips.thunder,c=this.context,now=c.currentTime;
  this.lastThunder=now;
  if(!entry||entry.failed||!entry.buffer){this.syntheticThunder();return;}
  const source=c.createBufferSource(),amp=c.createGain(),duration=entry.buffer.duration;
  source.buffer=entry.buffer;
  // Short attack + longer tail fade removes the start/end cut from the
  // one-shot while preserving the supplied thunder dynamics.
  amp.gain.setValueAtTime(.0001,now);
  amp.gain.linearRampToValueAtTime(clamp(gain),now+.05);
  const fadeStart=now+Math.max(.16,duration-.85);
  amp.gain.setValueAtTime(clamp(gain),fadeStart);
  amp.gain.linearRampToValueAtTime(.0001,now+duration);
  source.connect(amp).connect(this.parts.master);source.start(now);source.stop(now+duration+.03);
 }
 syntheticThunder(){
  const c=this.context,t=c.currentTime,noise=c.createBufferSource();noise.buffer=this.parts.noiseBuffer;noise.loop=true;
  const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(870,t);
  filter.frequency.exponentialRampToValueAtTime(125,t+2.7);
  const rumble=c.createGain();rumble.gain.setValueAtTime(.0001,t);
  rumble.gain.exponentialRampToValueAtTime(.24,t+.10);rumble.gain.exponentialRampToValueAtTime(.09,t+.68);
  rumble.gain.exponentialRampToValueAtTime(.17,t+1.2);rumble.gain.exponentialRampToValueAtTime(.0001,t+3.35);
  noise.connect(filter).connect(rumble).connect(this.parts.master);noise.start(t);noise.stop(t+3.4);
 }
}