import * as THREE from 'three';
import {clamp01} from './weatherVisualMath.js';

const hash=n=>{const x=Math.sin(n*127.17+19.37)*43758.5453;return x-Math.floor(x);};

function billboardGeometry(count,seed,{radius=90,height=32,minSize=.5,maxSize=2.4,anchors=null}={}){
 const base=new THREE.PlaneGeometry(1,1);
 const geo=new THREE.InstancedBufferGeometry();
 geo.index=base.index;
 geo.setAttribute('position',base.getAttribute('position'));
 geo.setAttribute('uv',base.getAttribute('uv'));
 const origin=new Float32Array(count*3),phase=new Float32Array(count),size=new Float32Array(count),variation=new Float32Array(count);
 for(let i=0;i<count;i++){
  let x,z;
  if(anchors?.length){
   const a=anchors[i%anchors.length],ring=4+hash(i*19+seed)*18,ang=hash(i*31+seed)*Math.PI*2;
   x=a[0]+Math.cos(ang)*ring;z=a[1]+Math.sin(ang)*ring;
  }else{
   const ring=Math.sqrt(hash(i*17+seed))*radius,ang=hash(i*31+seed)*Math.PI*2;
   x=Math.cos(ang)*ring;z=Math.sin(ang)*ring;
  }
  origin[i*3]=x;origin[i*3+1]=height*hash(i*23+seed);origin[i*3+2]=z;
  phase[i]=hash(i*43+seed);
  size[i]=minSize+(maxSize-minSize)*hash(i*11+seed);
  variation[i]=hash(i*53+seed);
 }
 geo.setAttribute('aOrigin',new THREE.InstancedBufferAttribute(origin,3));
 geo.setAttribute('aPhase',new THREE.InstancedBufferAttribute(phase,1));
 geo.setAttribute('aSize',new THREE.InstancedBufferAttribute(size,1));
 geo.setAttribute('aVariation',new THREE.InstancedBufferAttribute(variation,1));
 geo.instanceCount=count;
 geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,16,0),Math.max(radius+45,330));
 base.dispose();
 return geo;
}

function makeDustField(scene,roofY,isMobile){
 const geo=billboardGeometry(isMobile?360:820,810,{radius:isMobile?72:110,height:34,minSize:.7,maxSize:3.8});
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:0},uWind:{value:0},uRoofY:{value:roofY},uRange:{value:34}},
  vertexShader:`attribute vec3 aOrigin;attribute float aPhase,aSize,aVariation;
   uniform float uTime,uStrength,uWind,uRoofY,uRange;
   varying vec2 vUv;varying float vFade;varying float vVariation;
   void main(){
    vUv=uv;vVariation=aVariation;
    float travel=mod(aOrigin.x+uTime*(7.5+uWind*17.0)+aPhase*210.0+105.0,210.0)-105.0;
    float lift=mod(aOrigin.y+uTime*(.25+.7*aVariation)+aPhase*uRange,uRange);
    vec3 center=vec3(travel,uRoofY+.7+lift,aOrigin.z+sin(uTime*.33+aPhase*41.0)*7.0);
    vec3 right=normalize(vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]));
    vec3 up=normalize(vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]));
    float s=aSize*(.78+uStrength*.65);
    vec3 world=center+right*position.x*s*1.8+up*position.y*s*.78;
    float d=length(cameraPosition-world);
    vFade=(1.-smoothstep(18.,145.,d))*(.45+.55*smoothstep(0.,12.,lift));
    gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
   }`,
  fragmentShader:`precision highp float;uniform float uStrength;varying vec2 vUv;varying float vFade,vVariation;
   float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   void main(){
    vec2 p=(vUv-.5)*2.;float r=dot(p,p);
    float soft=1.-smoothstep(.22,1.0,r);
    float grit=.62+.38*h(floor(vUv*9.)+vVariation);
    float alpha=soft*grit*vFade*uStrength*.15;
    if(alpha<.009)discard;
    vec3 c=mix(vec3(.43,.34,.24),vec3(.72,.56,.36),vVariation);
    gl_FragColor=vec4(c,alpha);
   }`,
  transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(geo,mat);mesh.name='AFTERDAY v8.1 world-space dust storm sheets';mesh.frustumCulled=false;mesh.renderOrder=4;scene.add(mesh);
 return mesh;
}

function makeDustDome(scene,isMobile){
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:0},uWind:{value:0}},
  vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`precision highp float;varying vec3 vDir;uniform float uTime,uStrength,uWind;
   float h(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
   void main(){
    vec3 d=normalize(vDir);if(d.y<-.05)discard;
    vec3 p=d*5.2+vec3(uTime*(.014+uWind*.028),.3,uTime*.008);
    float band=n(p)*.64+n(p*2.1+4.7)*.36;
    float horizon=(1.-smoothstep(.12,.72,d.y));
    float alpha=smoothstep(.30,.72,band)*horizon*uStrength*.12;
    if(alpha<.006)discard;
    vec3 col=mix(vec3(.38,.29,.20),vec3(.67,.49,.31),band);
    gl_FragColor=vec4(col,alpha);
   }`,
  side:THREE.BackSide,transparent:true,depthWrite:false,depthTest:true
 });
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(1120,isMobile?24:40,isMobile?14:22),mat);
 mesh.name='AFTERDAY v8.1 spherical dust haze';mesh.renderOrder=-3;mesh.frustumCulled=false;scene.add(mesh);return mesh;
}


/** v9.2: two turbulent, depth-tested haboob walls, not flat camera fog.
 * Their lower rolling edge and vertical sand columns remain readable against
 * ruined building silhouettes from any orbit angle. Low-poly mobile budget.
 */
function makeSandstormFronts(scene,roofY,isMobile){
 const fronts=[];
 const specs=isMobile?[[162,125,38,7],[285,170,40,8]]:[[162,135,64,12],[285,185,72,14]];
 for(let i=0;i<specs.length;i++){
  const [radius,height,sides,rows]=specs[i];
  const mat=new THREE.ShaderMaterial({
   uniforms:{uTime:{value:0},uStrength:{value:0},uWind:{value:0},uLayer:{value:i},uHeight:{value:height}},
   vertexShader:`precision highp float;
    uniform float uTime,uWind,uLayer,uHeight;
    varying vec3 vSand;varying float vHeight;
    void main(){
      vec3 p=position;
      float y=clamp((position.y+uHeight*.5)/uHeight,0.,1.);
      float shear=sin(p.x*.023+uTime*(.60+uWind*.5)+uLayer*3.7)
        +.53*sin(p.z*.043-p.y*.037-uTime*.46);
      p.z+=shear*(2.8+8.4*y); // turbulent rolling face, not a fog filter
      p.y+=sin(p.x*.031+p.z*.018+uTime*.58)*3.5*y;
      vSand=p;vHeight=clamp(y,0.,1.);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    }`,
   fragmentShader:`precision highp float;
    uniform float uTime,uStrength,uWind,uLayer;
    varying vec3 vSand;varying float vHeight;
    float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float noise(vec3 p){
      vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      float a=mix(hash(i),hash(i+vec3(1,0,0)),f.x);
      float b=mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x);
      float c=mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x);
      float d=mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x);
      return mix(mix(a,b,f.y),mix(c,d,f.y),f.z);
    }
    void main(){
      vec3 flow=vSand*vec3(.042,.042,.042)+vec3(uTime*(.19+uWind*.25),uTime*.027,uTime*.065);
      float billow=noise(flow)*.65+noise(flow*2.7+uLayer*13.)*.35;
      float base=1.-smoothstep(.15,.89,vHeight);
      float columns=smoothstep(.26,.72,billow+.13*base);
      float edge=1.-smoothstep(.64,.93,vHeight+(.50-billow)*.28);
      float gust=.88+.12*sin(uTime*.77+vSand.x*.035+uLayer);
      float opacity=(base*.68+columns*.43)*edge*uStrength*gust*(uLayer<.5?.88:.70);
      if(opacity<.018)discard;
      vec3 deep=vec3(.20,.115,.060),sand=vec3(.85,.57,.28);
      vec3 col=mix(deep,sand,clamp(.25+billow*.77+vHeight*.10,0.,1.));
      gl_FragColor=vec4(col,clamp(opacity,0.,.82));
    }`,
   side:THREE.DoubleSide,transparent:true,depthWrite:false,depthTest:true
  });
  // v9.3: advance broad 3D walls across the city; the old cylinders
  // encircled the camera and looked like a stationary brown fog screen.
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(radius*4,height,sides,rows),mat);
  mesh.rotation.y=Math.PI/2-.23;
  mesh.position.set(-255-i*85,roofY+height*.35,-28);
  mesh.name='AFTERDAY v9.3 rolling haboob sand wall '+i;
  mesh.frustumCulled=false;mesh.renderOrder=i?2:3;scene.add(mesh);fronts.push(mesh);
 }
 return fronts;
}

/** Ground-level sand shear. It follows a coherent lateral wind direction
 * instead of spawning generic soft dust cards across the camera view. */
function makeWindborneSand(scene,roofY,isMobile){
 const geo=billboardGeometry(isMobile?240:660,1922,{radius:58,height:2.8,minSize:.34,maxSize:1.75});
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:0},uWind:{value:0},uRoofY:{value:roofY}},
  vertexShader:`precision highp float;
    attribute vec3 aOrigin;attribute float aPhase,aSize,aVariation;
    uniform float uTime,uWind,uRoofY;
    varying vec2 vUv;varying float vVar;
    void main(){
      vUv=uv;vVar=aVariation;
      float speed=24.+uWind*38.+aVariation*19.;
      float travel=mod(aOrigin.x+uTime*speed+aPhase*170.+86.,172.)-86.;
      vec3 center=vec3(travel,uRoofY+.40+aOrigin.y*.65+
        .28*sin(uTime*4.+aPhase*25.),aOrigin.z+sin(aPhase*32.+uTime*.49)*2.);
      float len=aSize*(2.6+uWind*3.0);
      vec3 world=center+vec3(position.x*len,position.y*aSize*.12,position.x*len*.20);
      gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
    }`,
  fragmentShader:`precision highp float;
    uniform float uStrength;varying vec2 vUv;varying float vVar;
    void main(){
      float edge=smoothstep(0.,.18,vUv.x)*(1.-smoothstep(.74,1.,vUv.x));
      float feather=1.-smoothstep(.10,.50,abs(vUv.y-.5));
      float alpha=edge*feather*uStrength*(.30+.21*vVar);
      if(alpha<.012)discard;
      gl_FragColor=vec4(mix(vec3(.45,.30,.14),vec3(.91,.72,.43),vVar),alpha);
    }`,
  transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(geo,mat);
 mesh.name='AFTERDAY v9.2 sandstorm ground-shear grit';
 mesh.frustumCulled=false;mesh.renderOrder=5;scene.add(mesh);return mesh;
}

/** Narrow revolving grit columns create moving foreground scale and depth
 * without a screen-covering dust overlay or extra shadow-casting lights. */
function makeSandEddies(scene,roofY,isMobile){
 const count=isMobile?160:420;
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));
 const phase=new Float32Array(count),column=new Float32Array(count),radius=new Float32Array(count);
 for(let i=0;i<count;i++){
  phase[i]=hash(i*7+914);column[i]=Math.floor(hash(i*17+322)*3);radius[i]=hash(i*11+77);
 }
 geo.setAttribute('aPhase',new THREE.BufferAttribute(phase,1));
 geo.setAttribute('aColumn',new THREE.BufferAttribute(column,1));
 geo.setAttribute('aRadius',new THREE.BufferAttribute(radius,1));
 geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,roofY+14,0),125);
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:0},uWind:{value:0},uRoofY:{value:roofY}},
  vertexShader:`precision highp float;
   attribute float aPhase,aColumn,aRadius;
   uniform float uTime,uWind,uRoofY;
   varying float vFade,vTone;
   void main(){
    float height=mod(aPhase*27.+uTime*(2.2+uWind*3.8+aRadius*2.),27.);
    float spin=aPhase*6.283+uTime*(2.6+uWind*3.1)+height*.29;
    float spiral=(.75+height*.20)*(.55+aRadius*.95);
    vec3 center=vec3(-35.+aColumn*36.,uRoofY+height,-25.+aColumn*24.);
    vec3 world=center+vec3(cos(spin)*spiral,0.,sin(spin)*spiral);
    vec4 view=viewMatrix*vec4(world,1.);
    gl_Position=projectionMatrix*view;
    gl_PointSize=clamp((2.7+aRadius*3.8)*105./max(1.,-view.z),1.,10.);
    vFade=(1.-smoothstep(17.,27.,height))*(.45+.55*aRadius);
    vTone=aRadius;
   }`,
  fragmentShader:`precision highp float;
   uniform float uStrength;
   varying float vFade,vTone;
   void main(){
    vec2 uv=gl_PointCoord-.5;
    float core=1.-smoothstep(.08,.46,length(uv));
    float alpha=core*uStrength*vFade*.74;
    if(alpha<.028)discard;
    gl_FragColor=vec4(mix(vec3(.47,.29,.13),vec3(.93,.74,.47),vTone),alpha);
   }`,
  transparent:true,depthWrite:false,depthTest:true
 });
 const mesh=new THREE.Points(geo,mat);
 mesh.name='AFTERDAY v9.3 swirling sand eddies';
 mesh.frustumCulled=false;mesh.renderOrder=6;scene.add(mesh);return mesh;
}

const FIRE_ANCHORS=[[-215,-168],[-168,205],[232,-126],[205,182],[-286,42],[292,54]];

function makeFireFront(scene,roofY,isMobile){
 const count=isMobile?34:68;
 const geo=billboardGeometry(count,910,{height:1,minSize:4.8,maxSize:11.5,anchors:FIRE_ANCHORS});
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:0},uNight:{value:0},uRoofY:{value:roofY}},
  vertexShader:`attribute vec3 aOrigin;attribute float aPhase,aSize,aVariation;
   uniform float uTime,uStrength,uRoofY;
   varying vec2 vUv;varying float vVar,vPulse;
   void main(){
    vUv=uv;vVar=aVariation;
    float sway=sin(uTime*(2.1+aVariation*1.7)+aPhase*19.)*.18;
    vec3 center=vec3(aOrigin.x,uRoofY-27.+aVariation*9.,aOrigin.z);
    vec3 right=normalize(vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]));
    vec3 up=normalize(vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]));
    float pulse=.88+sin(uTime*(3.2+aVariation*2.1)+aPhase*31.)*.12;vPulse=pulse;
    float size=aSize*(.82+uStrength*.24);
    vec3 world=center+right*(position.x+sway*position.y)*size*.58+up*position.y*size*1.35*pulse;
    gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
   }`,
  fragmentShader:`precision highp float;uniform float uStrength,uNight;varying vec2 vUv;varying float vVar,vPulse;
   float h(vec2 p){return fract(sin(dot(p,vec2(17.13,91.77)))*43157.11);}
   void main(){
    vec2 p=vUv;float x=abs(p.x-.5)*2.;
    float taper=mix(.78,.13,p.y);float body=1.-smoothstep(taper*.65,taper,x);
    float base=smoothstep(.02,.16,p.y)*(1.-smoothstep(.82,1.,p.y));
    float lick=.78+.22*sin(p.y*19.+vVar*13.+p.x*7.);
    float a=body*base*lick*uStrength*(.58+uNight*.22);
    if(a<.012)discard;
    vec3 outer=vec3(.78,.10,.018),mid=vec3(1.,.33,.035),hot=vec3(1.,.86,.29);
    vec3 col=mix(outer,mid,smoothstep(.05,.46,p.y));
    col=mix(col,hot,(1.-x)*smoothstep(.12,.55,p.y)*.68);
    gl_FragColor=vec4(col,a);
   }`,
  transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending
 });
 const mesh=new THREE.Mesh(geo,mat);mesh.name='AFTERDAY v8.1 distant wildfire front';mesh.frustumCulled=false;mesh.renderOrder=6;scene.add(mesh);return mesh;
}

function makeWildfireSmoke(scene,roofY,isMobile){
 const count=isMobile?90:210;
 const geo=billboardGeometry(count,1008,{height:55,minSize:5.5,maxSize:19,anchors:FIRE_ANCHORS});
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:0},uWind:{value:0},uRoofY:{value:roofY}},
  vertexShader:`attribute vec3 aOrigin;attribute float aPhase,aSize,aVariation;
   uniform float uTime,uStrength,uWind,uRoofY;
   varying vec2 vUv;varying float vLife,vVar;
   void main(){
    vUv=uv;vVar=aVariation;
    float age=fract(uTime*(.025+.016*aVariation)+aPhase);
    float rise=age*(38.+aVariation*38.);
    vec3 center=vec3(aOrigin.x+age*(6.+uWind*24.),uRoofY-22.+rise,aOrigin.z+sin(age*9.+aPhase*17.)*6.);
    vec3 right=normalize(vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]));
    vec3 up=normalize(vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]));
    float size=aSize*(.55+age*1.15);
    vec3 world=center+(right*position.x+up*position.y)*size;
    vLife=smoothstep(0.,.08,age)*(1.-smoothstep(.68,1.,age));
    gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
   }`,
  fragmentShader:`precision highp float;uniform float uStrength;varying vec2 vUv;varying float vLife,vVar;
   float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   void main(){
    vec2 p=(vUv-.5)*2.;float r=dot(p,p);
    float soft=1.-smoothstep(.18,1.,r);
    float breakup=.68+.32*h(floor(vUv*8.)+vVar*9.);
    float a=soft*breakup*vLife*uStrength*.48;
    if(a<.008)discard;
    vec3 col=mix(vec3(.10,.095,.09),vec3(.24,.20,.16),vVar);
    gl_FragColor=vec4(col,a);
   }`,
  transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(geo,mat);mesh.name='AFTERDAY v8.1 rising wildfire smoke';mesh.frustumCulled=false;mesh.renderOrder=5;scene.add(mesh);return mesh;
}

function makeEmbers(scene,roofY,isMobile){
 const count=isMobile?120:300,positions=new Float32Array(count*3),phase=new Float32Array(count);
 for(let i=0;i<count;i++){
  const a=FIRE_ANCHORS[i%FIRE_ANCHORS.length],r=2+hash(i*17+1200)*24,ang=hash(i*23+1200)*Math.PI*2;
  positions[i*3]=a[0]+Math.cos(ang)*r;positions[i*3+1]=roofY-23+hash(i*19+1200)*28;positions[i*3+2]=a[1]+Math.sin(ang)*r;phase[i]=hash(i*41+1200);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('aPhase',new THREE.BufferAttribute(phase,1));
 const mat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:0}},
  vertexShader:`attribute float aPhase;uniform float uTime,uStrength;varying float vA;
    void main(){vec3 p=position;p.y+=mod(uTime*(2.5+aPhase*4.)+aPhase*34.,34.);p.x+=sin(uTime*.8+aPhase*41.)*5.;
    vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(1.4+aPhase*2.4)*uStrength*(190./max(22.,-mv.z));vA=(.38+.62*aPhase)*uStrength;}`,
  fragmentShader:`precision highp float;varying float vA;void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.25,1.,r))*vA;if(a<.01)discard;gl_FragColor=vec4(1.,.36,.055,a);}`,
  transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending
 });
 const points=new THREE.Points(geo,mat);points.name='AFTERDAY v8.1 wildfire embers';points.frustumCulled=false;points.renderOrder=7;scene.add(points);return points;
}

export function premiumDisasterBudget(isMobile=false){
 return Object.freeze({dustSheets:isMobile?360:820,sandGrit:isMobile?240:660,sandEddies:isMobile?160:420,sandFronts:2,wildfireFlames:isMobile?34:68,smokeBillboards:isMobile?90:210,embers:isMobile?120:300,shadowCastingFireLights:0});
}

export class PremiumDisasterVfxV810{
 constructor(scene,roofY,isMobile){
  this.scene=scene;this.elapsed=0;this.dust=makeDustField(scene,roofY,isMobile);this.dustDome=makeDustDome(scene,isMobile);
  this.sandWalls=makeSandstormFronts(scene,roofY,isMobile);this.sandAge=0;this.sandActive=false;
  this.sandGrit=makeWindborneSand(scene,roofY,isMobile);
  this.sandEddies=makeSandEddies(scene,roofY,isMobile);
  this.fire=makeFireFront(scene,roofY,isMobile);this.smoke=makeWildfireSmoke(scene,roofY,isMobile);this.embers=makeEmbers(scene,roofY,isMobile);
  this.glows=FIRE_ANCHORS.slice(0,isMobile?1:3).map(([x,z],i)=>{
   const light=new THREE.PointLight(i===1?'#ff8b35':'#ff6b21',0,isMobile?95:150,2.1);
   light.position.set(x,roofY-12,z);light.castShadow=false;scene.add(light);return light;
  });
  for(const o of [this.dust,this.dustDome,this.sandGrit,this.sandEddies,...this.sandWalls,this.fire,this.smoke,this.embers])o.visible=false;
 }
 update(dt,w,night=0){
  this.elapsed+=Math.max(0,Math.min(.08,dt));
  const dust=clamp01(w?.dust),fire=clamp01(w?.wildfire),wind=clamp01(w?.wind);
  const du=this.dust.material.uniforms;du.uTime.value=this.elapsed;du.uStrength.value=dust;du.uWind.value=wind;this.dust.visible=dust>.004;
  const dd=this.dustDome.material.uniforms;dd.uTime.value=this.elapsed;dd.uStrength.value=dust;dd.uWind.value=wind;this.dustDome.visible=dust>.004;
  if(dust>.08&&!this.sandActive)this.sandAge=0;
  this.sandActive=dust>.08;
  if(this.sandActive)this.sandAge+=Math.max(0,Math.min(.08,dt));
  for(let i=0;i<this.sandWalls.length;i++){
   const wall=this.sandWalls[i],u=wall.material.uniforms;
   u.uTime.value=this.sandAge;u.uStrength.value=dust;u.uWind.value=wind;
   wall.position.x=-260+((this.sandAge*(6+wind*10)+i*165)%540);
   wall.position.z=-28+Math.sin(this.sandAge*.08+i)*19;
   wall.visible=dust>.012;
  }
  const grit=this.sandGrit.material.uniforms;
  grit.uTime.value=this.elapsed;grit.uStrength.value=dust;grit.uWind.value=wind;
  this.sandGrit.visible=dust>.025;
  const ed=this.sandEddies.material.uniforms;
  ed.uTime.value=this.sandAge;ed.uStrength.value=dust;ed.uWind.value=wind;
  this.sandEddies.visible=dust>.06;
  const fu=this.fire.material.uniforms;fu.uTime.value=this.elapsed;fu.uStrength.value=fire;fu.uNight.value=clamp01(night);this.fire.visible=fire>.003;
  const su=this.smoke.material.uniforms;su.uTime.value=this.elapsed;su.uStrength.value=fire;su.uWind.value=wind;this.smoke.visible=fire>.003;
  const eu=this.embers.material.uniforms;eu.uTime.value=this.elapsed;eu.uStrength.value=fire*(.55+.45*clamp01(night));this.embers.visible=fire>.03;
  for(let i=0;i<this.glows.length;i++)this.glows[i].intensity=THREE.MathUtils.damp(this.glows[i].intensity,fire*(2.2+clamp01(night)*4.8)*(i===0?1:.72),1.8,dt);
 }
 dispose(){
  for(const o of [this.dust,this.dustDome,this.sandGrit,this.sandEddies,...this.sandWalls,this.fire,this.smoke,this.embers]){
   o.parent?.remove(o);o.geometry.dispose();o.material.dispose();
  }
  for(const l of this.glows)l.parent?.remove(l);
 }
}
