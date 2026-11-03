/* AFTERDAY original heavy iron warning-board clang v2. Deterministic local WAV, no borrowed recording. */
let audioURL;
function wavBuffer(sampleRate=24000,duration=3.55){
  const count=Math.round(sampleRate*duration);
  const data=new ArrayBuffer(44+count*2),view=new DataView(data);
  const tag=(offset,s)=>{for(let i=0;i<4;i++)view.setUint8(offset+i,s.charCodeAt(i));};
  tag(0,'RIFF');view.setUint32(4,36+count*2,true);tag(8,'WAVE');
  tag(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);
  view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);
  view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);
  view.setUint16(34,16,true);tag(36,'data');view.setUint32(40,count*2,true);
  let seed=0xAF7E2026;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  let nLow=0,nMid=0,nHigh=0;
  const samples=new Float32Array(count);
  const modes=[[158,.47,1.4,.012],[239,.35,2.15,.008],[353,.39,2.65,.006],
    [477,.35,2.15,.007],[676,.25,1.65,.012],[911,.15,1.3,.01],
    [1279,.07,.72,.02],[1857,.055,.65,.02],[2678,.027,.32,.025]];
  for(let i=0;i<count;i++){
    const t=i/sampleRate,r=random()*2-1;
    nLow+=.05*(r-nLow);nMid+=.19*(r-nMid);nHigh+=.62*(r-nHigh);
    const high=nHigh-nMid,mid=nMid-nLow;
    let x=high*.65*Math.exp(-39*t)+mid*.52*Math.exp(-22*t)+nLow*.7*Math.exp(-28*t);
    x+=high*.12*Math.exp(-120*t);
    for(const [lag,amp] of [[.061,.22],[.126,.13]]){
      if(t>lag)x+=amp*(mid*.65+high*.35)*Math.exp(-(t-lag)*35);
    }
    for(let k=0;k<modes.length;k++){
      const [f,g,tau,drift]=modes[k];
      const phase=2*Math.PI*(f*t*(1-drift*(1-Math.exp(-8*t)))+
        1.7*Math.sin(2*Math.PI*(1.4+k*.16)*t))+k*1.93;
      const env=(1-Math.exp(-95*t))*Math.exp(-t/tau);
      x+=g*env*(.89+.11*Math.sin(2*Math.PI*(5.2+k*.43)*t+k))*
        (Math.sin(phase)+.13*Math.sin(phase*1.018));
    }
    x+=.46*Math.sin(2*Math.PI*(92*t+7*Math.min(t,.085)**2))*Math.exp(-15*t);
    x+=.1*mid*Math.exp(-9*t)*Math.sin(2*Math.PI*12*t)**2;
    const fade=Math.min(1,t/.003)*Math.min(1,Math.max(0,(duration-t)/.33))**1.6;
    samples[i]=Math.tanh(x*1.22)*fade;
  }
  const room=[[.039,.16],[.086,.13],[.14,.10],[.23,.08],[.34,.06],[.57,.04]];
  const reflected=new Float32Array(count);let max=0;
  for(let i=0;i<count;i++){
    let x=samples[i];
    for(const [lag,gain] of room){const j=i-Math.round(lag*sampleRate);if(j>=0)x+=samples[j]*gain;}
    reflected[i]=x;max=Math.max(max,Math.abs(x));
  }
  const norm=.88/Math.max(max,1e-8);
  for(let i=0;i<count;i++)view.setInt16(44+i*2,Math.round(reflected[i]*norm*32767),true);
  return data;
}
export function getHeavyClangAudioURL(){
  if(!audioURL)audioURL=URL.createObjectURL(new Blob([wavBuffer()],{type:'audio/wav'}));
  return audioURL;
}
