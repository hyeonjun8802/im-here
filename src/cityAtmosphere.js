import * as THREE from 'three';
import {depthAtmosphere} from './spatialLayout.js';
import {INFILL_LAYERS} from './cityInfillPlanV150.js';

const hash=n=>{const a=Math.sin(n*91.719+12.9)*43758.5453;return a-Math.floor(a)};

function rainCurtainTexture(){
 const c=document.createElement('canvas');c.width=256;c.height=512;const ctx=c.getContext('2d');
 for(let i=0;i<430;i++){
  const x=hash(i*17+7)*256,y=hash(i*29+8)*512,len=10+hash(i*9+17)*45;
  ctx.strokeStyle=`rgba(191,214,229,${(.02+hash(i*5+12)*.075).toFixed(3)})`;
  ctx.lineWidth=.35+hash(i*33+1)*.75;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+1+hash(i+6)*5,y+len);ctx.stroke();
 }
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,2);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function fogPointMaterial(){
 return new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,depthTest:true,fog:false,
  uniforms:{uTime:{value:0},uOpacity:{value:.22},uColor:{value:new THREE.Color('#b6c0bd')},uWind:{value:.2}},
  vertexShader:`
   attribute float aSize;attribute float aPhase;attribute float aDrift;attribute float aSpeed;attribute float aDepthFade;
   varying float vPhase;varying float vDepthFade;
   uniform float uTime,uWind;
   void main(){
    vec3 p=position;float t=uTime*aSpeed+aPhase;
    float drift=aDrift*(.55+uWind*1.8);
    p.x+=sin(t)*drift+sin(t*.37+aPhase*1.7)*drift*.38;
    p.z+=cos(t*.83+aPhase)*drift*.72;
    p.y+=sin(t*.23+aPhase)*1.8;
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp(aSize*(285.0/max(80.0,-mv.z)),3.0,52.0);
    vPhase=aPhase;vDepthFade=aDepthFade;
   }`,
  fragmentShader:`
   precision mediump float;varying float vPhase;varying float vDepthFade;uniform float uTime,uOpacity;uniform vec3 uColor;
   float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
   void main(){
    vec2 uv=gl_PointCoord*2.0-1.0;float d=length(uv);
    if(d>=1.0)discard;
    float feather=1.0-smoothstep(.22,1.0,d);
    float lobes=.78+.22*sin((uv.x*2.7+uv.y*1.9+vPhase)*3.1+uTime*.035);
    float grain=.88+.12*h(gl_PointCoord*7.0+vPhase);
    float alpha=uOpacity*feather*lobes*grain*vDepthFade;
    gl_FragColor=vec4(uColor,alpha);
   }`
 });
}

export class CityAtmosphere{
 constructor(scene,isMobile){
  this.scene=scene;this.time=0;this.rainCurtains=[];
  const specs=[
   {clusters:isMobile?20:34,min:90,max:300,y:-9,size:[32,55],drift:[9,18],fade:.72},
   {clusters:isMobile?28:48,min:220,max:590,y:1,size:[42,72],drift:[14,28],fade:.88},
   {clusters:isMobile?30:54,min:420,max:920,y:12,size:[52,88],drift:[18,36],fade:1.0}
  ];
  const pos=[],sizes=[],phases=[],drifts=[],speeds=[],fades=[];
  for(let tier=0;tier<specs.length;tier++){
   const spec=specs[tier],legacyLayer=INFILL_LAYERS[tier];
   for(let i=0;i<spec.clusters;i++){
    const theta=((i*.61803398+hash(i*17+tier*31)*.13)%1)*Math.PI*2,r=spec.min+(spec.max-spec.min)*(.05+hash(i*29+tier*71)*.90);
    const level=spec.y;const legacyBandY=level+hash(i+91)*8;
    const cx=Math.cos(theta)*r,cz=Math.sin(theta)*r,cy=legacyBandY-4;
    const puffCount=isMobile?3:4;
    for(let p=0;p<puffCount;p++){
     const n=(tier+1)*10000+i*37+p*113,ang=hash(n+1)*Math.PI*2,spread=6+hash(n+2)*(10+tier*7);
     pos.push(cx+Math.cos(ang)*spread,cy+(hash(n+3)-.5)*(5+tier*2),cz+Math.sin(ang)*spread);
     sizes.push(spec.size[0]+hash(n+4)*(spec.size[1]-spec.size[0]));
     phases.push(hash(n+5)*Math.PI*2);drifts.push(spec.drift[0]+hash(n+6)*(spec.drift[1]-spec.drift[0]));
     speeds.push(.028+hash(n+7)*.038);fades.push(spec.fade*(.70+hash(n+8)*.30));
    }
   }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));
  g.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));g.setAttribute('aDrift',new THREE.Float32BufferAttribute(drifts,1));g.setAttribute('aSpeed',new THREE.Float32BufferAttribute(speeds,1));g.setAttribute('aDepthFade',new THREE.Float32BufferAttribute(fades,1));
  const m=fogPointMaterial();this.fog=new THREE.Points(g,m);this.fog.name='Soft GPU city-canyon drifting fog';this.fog.frustumCulled=false;this.fog.renderOrder=8;scene.add(this.fog);
  // Compatibility with earlier physical-cloud tests; these transforms are not rendered.
  this.dummy=new THREE.Object3D();const cloud=this.dummy;cloud.position.set(0,-12,0);cloud.rotation.x=-Math.PI/2;
  const rainTexture=rainCurtainTexture();this.rainTexture=rainTexture;
  for(let i=0;i<(isMobile?8:16);i++){
   const a=i*2.39996,r=260+hash(i*37+2)*470;
   const curtain=new THREE.Mesh(new THREE.PlaneGeometry(100,160),new THREE.MeshBasicMaterial({map:rainTexture,transparent:true,opacity:0,depthWrite:false,depthTest:true,color:'#9db8c8',side:THREE.DoubleSide}));
   curtain.position.set(Math.cos(a)*r,42+hash(i+13)*25,Math.sin(a)*r);curtain.rotation.y=a+Math.PI/2;curtain.renderOrder=6;scene.add(curtain);this.rainCurtains.push(curtain);
  }
 }
 update(dt,weatherValues,night,skyColor){
  this.time+=dt;this.rainTexture.offset.y=(this.rainTexture.offset.y-dt*(.45+weatherValues.wind*.35))%1;
  for(let i=0;i<this.rainCurtains.length;i++)this.rainCurtains[i].material.opacity=THREE.MathUtils.damp(this.rainCurtains[i].material.opacity,weatherValues.rain*(.09+hash(i*11)*.07),.7,dt);
  const atmosphere=depthAtmosphere(weatherValues.mist,night),u=this.fog.material.uniforms;
  u.uTime.value=this.time;u.uWind.value=weatherValues.wind;
  u.uColor.value.lerp(new THREE.Color(skyColor).lerp(new THREE.Color('#c1c6c0'),.42),1-Math.exp(-dt*.75));
  const target=(.18+weatherValues.mist*.23+weatherValues.rain*.055)*Math.max(.68,atmosphere.cloudBankOpacity*1.75);
  u.uOpacity.value=THREE.MathUtils.damp(u.uOpacity.value,Math.min(.48,target),.55,dt);
 }
 dispose(){
  this.fog?.parent?.remove(this.fog);this.fog?.geometry.dispose();this.fog?.material.dispose();
  for(const c of this.rainCurtains){c.parent?.remove(c);c.geometry.dispose();c.material.dispose();}
  this.rainTexture?.dispose();
 }
}
