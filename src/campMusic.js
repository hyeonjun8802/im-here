/** One original, royalty-free procedural camp melody. No external recording and no autoplay.
 * Gentle guitar-like plucks + humanlike humming via layered oscillators.
 */
export const ORIGINAL_MELODY=[220,261.63,293.66,329.63,293.66,261.63,220,196];
const AudioCtx=()=>window.AudioContext||window.webkitAudioContext;
export class CampMusic{
 constructor(){this.ctx=null;this.active=false;this.enabled=false;this.nextBeat=0;this.beat=0;this.voiceEnd=0;this.master=null;}
 async enable(){const C=AudioCtx();if(!C)throw new Error('Web Audio 미지원');if(!this.ctx){this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=.115;this.master.connect(this.ctx.destination)}await this.ctx.resume();this.enabled=true;return true;}
 disable(){this.enabled=false;this.active=false;if(this.master&&this.ctx)this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.09);}
 get playing(){return Boolean(this.enabled&&this.active)}
 setGuitarActive(active){const wanted=Boolean(active);if(wanted===this.active)return;this.active=wanted;if(this.master&&this.ctx)this.master.gain.setTargetAtTime(wanted?.115:0,this.ctx.currentTime,.1);if(wanted&&this.ctx)this.nextBeat=this.ctx.currentTime+.08;}
 tone(freq,at,duration=.7,hum=false){if(!this.ctx||!this.master)return;
   const ctx=this.ctx,output=ctx.createGain(),lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=hum?620:1400;
   output.connect(lp);lp.connect(this.master);output.gain.setValueAtTime(.0001,at);
   if(hum){output.gain.exponentialRampToValueAtTime(.13,at+.13);output.gain.exponentialRampToValueAtTime(.0001,at+duration);
    for(const [n,level] of [[1,1],[2,.16],[3,.06]]){const osc=ctx.createOscillator();osc.type='sine';osc.frequency.setValueAtTime(freq*n,at);osc.frequency.linearRampToValueAtTime(freq*n*1.002,at+duration*.6);const g=ctx.createGain();g.gain.value=level;osc.connect(g);g.connect(output);osc.start(at);osc.stop(at+duration+.02)}
   }else{output.gain.exponentialRampToValueAtTime(.25,at+.018);output.gain.exponentialRampToValueAtTime(.0001,at+duration);
    for(const [n,level] of [[1,1],[2,.35],[3,.1]]){const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=freq*n;g.gain.value=level;o.connect(g);g.connect(output);o.start(at);o.stop(at+duration+.02)}
   }
 }
 update(){if(!this.playing||!this.ctx)return;let count=0;while(this.nextBeat<this.ctx.currentTime+.16&&count++<4){const f=ORIGINAL_MELODY[this.beat%ORIGINAL_MELODY.length];this.tone(f,this.nextBeat,.72,false);if(this.beat%2===0)this.tone(f/2,this.nextBeat+.09,1.25,true);this.nextBeat+=.82;this.beat++;}}
 radioPing(){if(!this.enabled||!this.ctx||!this.master)return;
  const now=this.ctx.currentTime+.04;
  for(const [i,f] of [480,650,540].entries()){
   const osc=this.ctx.createOscillator(),g=this.ctx.createGain(),t=now+i*.18;
   osc.type='sine';osc.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.070,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.14);
   osc.connect(g);g.connect(this.master);osc.start(t);osc.stop(t+.16);
  }
 }
 dispose(){this.disable();this.ctx?.close?.();}
}
