/**
 * User-activated Web Audio ambience. No downloaded/paid audio clips.
 * Thunder uses broadband noise and layered low-frequency tails rather than
 * the previous single audible sine beep. The sound arrives after the flash.
 */
export class WeatherAudio {
 constructor(){this.context=null;this.enabled=false;this.parts={};this.lastThunder=0;}
 async toggle(){
  if(this.enabled){this.enabled=false;this.parts.master?.gain.setTargetAtTime(0,this.context.currentTime,.12);return false;}
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)throw new Error('이 브라우저는 WebAudio를 지원하지 않습니다.');
  if(!this.context){this.context=new Ctx();this.setup();}
  await this.context.resume();this.enabled=true;this.parts.master.gain.setTargetAtTime(.63,this.context.currentTime,.15);return true;
 }
 setup(){
  const ctx=this.context;const master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);this.parts.master=master;
  const noise=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);const dst=noise.getChannelData(0);let seed=7331;
  for(let i=0;i<dst.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;dst[i]=((seed/4294967296)*2-1)*.5;}
  this.parts.noiseBuffer=noise;
  const add=(type,frequency,q)=>{const source=ctx.createBufferSource();source.buffer=noise;source.loop=true;
   const filter=ctx.createBiquadFilter();filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;
   const amp=ctx.createGain();amp.gain.value=.0;source.connect(filter).connect(amp).connect(master);source.start();return amp;};
  this.parts.rain=add('highpass',1050,.32);
  this.parts.wind=add('lowpass',480,.25);
  this.parts.hiss=add('bandpass',2500,.5);
 }
 update(w,flash){if(!this.context||!this.enabled)return;
  const now=this.context.currentTime;
  this.parts.rain.gain.setTargetAtTime(w.rain*.27,now,.35);
  this.parts.hiss.gain.setTargetAtTime(w.rain*.12,now,.18);
  this.parts.wind.gain.setTargetAtTime(Math.min(.26,.018+w.wind*.17),now,.55);
  if(flash&&now-this.lastThunder>2.5){this.lastThunder=now;this.thunder();}
 }
 thunder(){
  const c=this.context;
  // Visual lightning is distant: delay the sound instead of playing it at the flash.
  const delay=1.0+Math.random()*2.2;
  const t=c.currentTime+delay;
  const noise=c.createBufferSource();noise.buffer=this.parts.noiseBuffer;noise.loop=true;
  const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(870,t);
  filter.frequency.exponentialRampToValueAtTime(125,t+2.7);
  const rumble=c.createGain();rumble.gain.setValueAtTime(.0001,t);
  rumble.gain.exponentialRampToValueAtTime(.27,t+.10);
  rumble.gain.exponentialRampToValueAtTime(.10,t+.68);
  rumble.gain.exponentialRampToValueAtTime(.19,t+1.2);
  rumble.gain.exponentialRampToValueAtTime(.0001,t+3.35);
  noise.connect(filter).connect(rumble).connect(this.parts.master);
  noise.start(t);noise.stop(t+3.4);
  // Sub-bass body follows the noisy roll and fades naturally.
  const bass=c.createOscillator();bass.type='triangle';
  bass.frequency.setValueAtTime(64,t);bass.frequency.exponentialRampToValueAtTime(27,t+2.3);
  const amp=c.createGain();amp.gain.setValueAtTime(.0001,t);
  amp.gain.exponentialRampToValueAtTime(.075,t+.17);
  amp.gain.exponentialRampToValueAtTime(.0001,t+2.4);
  bass.connect(amp).connect(this.parts.master);bass.start(t);bass.stop(t+2.45);
 }
}
