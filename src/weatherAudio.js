/**
 * User-activated weather ambience.
 *
 * The rain/storm layers are optimized loops made from the user-supplied field
 * recordings. Procedural WebAudio noise remains only as wind/fallback so a
 * missing MP3 never turns the weather completely silent.
 */
export const WEATHER_AUDIO_ASSETS=Object.freeze({
 rainMedium:'./assets/audio/weather/rain_medium.mp3',
 rainHeavy:'./assets/audio/weather/rain_heavy.mp3',
 downpour:'./assets/audio/weather/downpour_no_thunder.mp3',
 stormRain:'./assets/audio/weather/storm_heavy_rain.mp3',
 thunder:'./assets/audio/weather/storm_thunder_strong.mp3'
});

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const smooth=v=>{const x=clamp(v);return x*x*(3-2*x);};

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
  this.context=null;this.enabled=false;this.parts={};this.media={};
  this.currentWeather='clear';this.lastThunder=-Infinity;this.pendingThunder=null;
 }
 async toggle(){
  if(this.enabled){
   this.enabled=false;
   if(this.pendingThunder){clearTimeout(this.pendingThunder);this.pendingThunder=null;}
   this.parts.master?.gain.setTargetAtTime(0,this.context.currentTime,.12);
   setTimeout(()=>{if(!this.enabled)this.pauseMedia();},220);
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
  // Procedural layers are intentionally subtle: recordings carry the rain.
  this.parts.rainFallback=addNoise('highpass',1050,.32);
  this.parts.wind=addNoise('lowpass',480,.25);
  this.parts.hiss=addNoise('bandpass',2500,.5);
  const addClip=(key,url,loop=true)=>{
   const el=new Audio(url);el.preload='auto';el.loop=loop;
   const source=ctx.createMediaElementSource(el),gain=ctx.createGain();gain.gain.value=0;
   source.connect(gain).connect(master);
   const entry={el,gain,failed:false};
   el.addEventListener('error',()=>{entry.failed=true;});
   this.media[key]=entry;
  };
  addClip('rainMedium',WEATHER_AUDIO_ASSETS.rainMedium);
  addClip('rainHeavy',WEATHER_AUDIO_ASSETS.rainHeavy);
  addClip('downpour',WEATHER_AUDIO_ASSETS.downpour);
  addClip('stormRain',WEATHER_AUDIO_ASSETS.stormRain);
  addClip('thunder',WEATHER_AUDIO_ASSETS.thunder,false);
 }
 async startLoops(){
  const tasks=[];
  for(const key of ['rainMedium','rainHeavy','downpour','stormRain']){
   const entry=this.media[key];if(!entry||entry.failed)continue;
   if(entry.el.readyState>=1&&entry.el.duration>1&&entry.el.currentTime===0){
    entry.el.currentTime=Math.random()*Math.max(.1,entry.el.duration-.25);
   }
   tasks.push(entry.el.play().catch(()=>{entry.failed=true;}));
  }
  await Promise.all(tasks);
 }
 pauseMedia(){
  for(const entry of Object.values(this.media)){entry.el.pause();if(entry.el.loop)entry.el.currentTime=0;}
 }
 setClipGain(key,value,now){
  const entry=this.media[key];if(!entry)return;
  entry.gain.gain.setTargetAtTime(entry.failed?0:clamp(value),now,.42);
 }
 update(w,flash,weather='clear'){
  if(!this.context||!this.enabled)return;
  this.currentWeather=weather;
  const now=this.context.currentTime,m=weatherAudioMix(weather,w);
  for(const key of ['rainMedium','rainHeavy','downpour','stormRain'])this.setClipGain(key,m[key],now);
  // Quiet synthetic rain masks an MP3 dropout but does not compete with it.
  const anyBroken=['rainMedium','rainHeavy','downpour','stormRain'].some(k=>this.media[k]?.failed);
  this.parts.rainFallback.gain.setTargetAtTime(anyBroken?clamp(w.rain)*.14:clamp(w.rain)*.022,now,.35);
  this.parts.hiss.gain.setTargetAtTime(clamp(w.rain)*.018,now,.25);
  this.parts.wind.gain.setTargetAtTime(Math.min(.46,m.wind),now,.55);
  if(flash&&m.thunderArmed&&now-this.lastThunder>7.2&&!this.pendingThunder)this.queueThunder(m.thunderGain);
 }
 queueThunder(gain=.8){
  // Sound follows the flash by a short distance delay; repeated visual strikes
  // naturally retrigger the supplied thunder recording after its cooldown.
  const delay=.35+Math.random()*.9;
  this.pendingThunder=setTimeout(()=>{
   this.pendingThunder=null;
   if(!this.enabled||!['storm','tornado'].includes(this.currentWeather))return;
   this.playRecordedThunder(gain);
  },delay*1000);
 }
 playRecordedThunder(gain=.8){
  const entry=this.media.thunder,now=this.context.currentTime;
  this.lastThunder=now;
  if(!entry||entry.failed){this.syntheticThunder();return;}
  entry.gain.gain.cancelScheduledValues(now);
  entry.gain.gain.setValueAtTime(clamp(gain),now);
  try{entry.el.currentTime=0;}catch{}
  const p=entry.el.play();
  if(p?.catch)p.catch(()=>{entry.failed=true;this.syntheticThunder();});
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
