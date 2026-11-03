/* AFTERDAY original 'swish — CHAAANG' alert, v3. Sound is synthesized locally;
 * no background voices, media samples or third-party recordings are embedded.
 * Single metal impact only; harmonics form one continuous decay. */
let audioURL;
export function makeHeavyClangWav(sampleRate=24000,duration=3.35){
  const count=Math.round(sampleRate*duration);
  const data=new ArrayBuffer(44+count*2),view=new DataView(data);
  const tag=(at,s)=>{for(let i=0;i<4;i++)view.setUint8(at+i,s.charCodeAt(i));};
  tag(0,'RIFF');view.setUint32(4,36+count*2,true);tag(8,'WAVE');
  tag(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);
  view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);
  view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);
  view.setUint16(34,16,true);tag(36,'data');view.setUint32(40,count*2,true);
  let seed=0xA17E2026;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed/4294967296)*2-1;};
  let low=0,mid=0,high=0;
  const strikeAt=.53;
  const raw=new Float32Array(count),sines=[
    [214.3,.56,1.26],[327.6,.44,1.48],[484.2,.51,1.75],
    [711.5,.35,1.63],[1017.1,.24,1.42],[1483.7,.19,1.04],
    [2218.5,.13,.81],[3157.2,.09,.51],[4533.2,.052,.33],
  ];
  for(let i=0;i<count;i++){
    const t=i/sampleRate,n=rand();
    low+=.06*(n-low);mid+=.24*(n-mid);high+=.85*(n-high);
    const airy=high-mid,broad=mid-low;
    const rise=Math.max(0,Math.min(1,(t-.02)/(strikeAt-.02)));
    const pre=t<strikeAt?Math.pow(Math.sin(rise*Math.PI/2),1.75):0;
    const turbulence=.58+.42*Math.sin(2*Math.PI*(12+22*rise)*t)**2;
    let x=pre*turbulence*(.38*airy+.23*(high-low)+.12*low);
    const dt=t-strikeAt;
    if(dt>=0){
      const attack=Math.exp(-17*dt);
      x+=(1.02*airy+.45*broad+.21*low)*attack;
      x+=.27*airy*Math.exp(-7*dt);
      x+=.48*Math.sin(2*Math.PI*(125*dt-36*dt*dt))*Math.exp(-22*dt);
      for(let k=0;k<sines.length;k++){
        const [freq,amp,tau]=sines[k];
        const phase=2*Math.PI*(freq*dt + .075*freq*(1-Math.exp(-29*dt))/29);
        const vib=1+.0016*Math.sin(2*Math.PI*(4.6+k*.4)*dt+k)*Math.exp(-dt*.54);
        const env=(1-Math.exp(-200*dt))*Math.exp(-dt/tau);
        const beat=.89+.11*Math.cos(2*Math.PI*(4.2+k*.38)*dt+k);
        x+=amp*env*beat*Math.sin(phase*vib+k*1.1)*.73;
      }
    }
    raw[i]=Math.tanh(x*1.16);
  }
  const echoes=[[.145,.036],[.29,.022],[.49,.014]]; // Soft room tail, no second metal strike.
  const result=new Float32Array(count);
  let peak=1e-9;
  for(let i=0;i<count;i++){
    let x=raw[i];
    for(const [delay,gain] of echoes){const k=i-Math.round(delay*sampleRate);if(k>=0)x+=gain*raw[k];}
    x*=Math.min(1,Math.max(0,(duration-i/sampleRate)/.4));
    result[i]=x;peak=Math.max(peak,Math.abs(x));
  }
  const scale=.9/peak;
  for(let i=0;i<count;i++)view.setInt16(44+i*2,Math.max(-32768,Math.min(32767,Math.round(result[i]*scale*32767))),true);
  return data;
}
export function getHeavyClangAudioURL(){
  if(!audioURL)audioURL=URL.createObjectURL(new Blob([makeHeavyClangWav()],{type:'audio/wav'}));
  return audioURL;
}
