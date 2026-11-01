import * as THREE from 'three';

/**
 * AFTERDAY art direction, not a new level: one survivor roof; all detail remains within roof bounds.
 * Weather interaction is visual only. Game state/time remains in simulation.js.
 */
const T=Math.PI*2;
const fract=x=>x-Math.floor(x);
const rand=x=>fract(Math.sin(x*128.138+39.14)*43758.5453);
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const material=(c,rough=.82,metal=.06)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:metal});

function box(g,s,pos,mat){const o=new THREE.Mesh(new THREE.BoxGeometry(...s),mat);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function join(g,a,b,r,mat,seg=9){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dif=B.clone().sub(A);const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dif.length(),seg),mat);o.position.copy(A.add(B).multiplyScalar(.5));o.quaternion.setFromUnitVectors(v(0,1,0),dif.normalize());o.castShadow=r>.06;g.add(o);return o;}
function blobShape(rx,rz,seed){
 const shape=new THREE.Shape();const count=36;
 for(let i=0;i<=count;i++){
  const a=i/count*T;
  const irregular=1+.12*Math.sin(a*3+seed)+.11*Math.cos(a*5+seed*2)+.055*Math.sin(a*11+seed);
  const xx=Math.cos(a)*rx*irregular,yy=Math.sin(a)*rz*irregular;
  if(i===0)shape.moveTo(xx,yy);else shape.lineTo(xx,yy);
 }
 return shape;
}
function alphaCircle(){
 const s=128,c=document.createElement('canvas');c.width=c.height=s;const ctx=c.getContext('2d');
 const grad=ctx.createRadialGradient(64,64,0,64,64,64);
 grad.addColorStop(0,'rgba(18,20,19,.50)');grad.addColorStop(.35,'rgba(18,20,19,.28)');grad.addColorStop(1,'rgba(18,20,19,0)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,s,s);return new THREE.CanvasTexture(c);
}
function transparentFireTexture(){
 const c=document.createElement('canvas');c.width=128;c.height=256;const x=c.getContext('2d');
 const grad=x.createRadialGradient(64,194,4,64,154,105);
 grad.addColorStop(0,'rgba(255,246,169,1)');grad.addColorStop(.19,'rgba(255,191,77,.98)');
 grad.addColorStop(.46,'rgba(254,111,31,.84)');grad.addColorStop(.72,'rgba(228,61,15,.43)');grad.addColorStop(1,'rgba(255,104,13,0)');
 x.fillStyle=grad;x.beginPath();x.moveTo(64,3);x.bezierCurveTo(35,64,95,91,29,164);x.bezierCurveTo(9,227,49,251,70,252);x.bezierCurveTo(107,250,125,198,95,149);x.bezierCurveTo(85,120,88,94,64,3);x.fill();
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export class CinematicStage {
 constructor(world){
  this.world=world;this.scene=world.scene;this.y=world.ROOF_Y;this.time=0;this.windTargets=[];
  this.group=new THREE.Group();this.group.name='AFTERDAY v0.8 authored rooftop details (single roof only)';this.scene.add(this.group);
  this.dark=material('#3b3832',.94,.08);this.rust=material('#76503b',.8,.30);this.copper=material('#a47d55',.55,.32);
  this.moss=material('#3e5635',1,0);this.leaf=material('#596e44',.89,0);this.wood=material('#534b3c',.95,.02);
  this.fabric=material('#555947',.96,0);this.fabric.side=THREE.DoubleSide;
  this.concrete=material('#797970',.98,0);
  this.shadowTexture=alphaCircle();
  this.buildRoofAtmosphere();this.buildReflectiveWetSurfaces();this.buildSnowAccumulation();this.detailShelter();this.addGrimeAndGrowth();this.fireAndSmoke();this.addAtmosphericLighting();
 }
 addShadow(x,z,sx,sz,strength=1){
  const geom=new THREE.PlaneGeometry(sx,sz),mat=new THREE.MeshBasicMaterial({map:this.shadowTexture,color:'#121616',transparent:true,opacity:.34*strength,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const mesh=new THREE.Mesh(geom,mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,this.y+.218,z);mesh.renderOrder=2;this.group.add(mesh);
 }
 buildRoofAtmosphere(){
  // Physically positioned translucent 3D surface areas; one large blue flat circle is forbidden.
  this.wetPatches=[];
  const patchMap=new THREE.TextureLoader().load('./assets/materials/cinematic/roof_wetmask.png');
  patchMap.colorSpace=THREE.NoColorSpace;
  const maskMat=new THREE.MeshPhysicalMaterial({color:'#3e4d4b',alphaMap:patchMap,transparent:true,opacity:0,roughness:.18,metalness:.035,clearcoat:.94,clearcoatRoughness:.10,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide});
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(45.42,45.42),maskMat);plane.rotation.x=-Math.PI/2;plane.position.y=this.y+.181;plane.receiveShadow=true;plane.renderOrder=1;this.group.add(plane);
  this.wetOverlay=plane;
  const waterMat=new THREE.MeshPhysicalMaterial({color:'#485c61',transparent:true,opacity:0,roughness:.075,metalness:0,clearcoat:1,clearcoatRoughness:.04,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide});
  // Irregular 3D meshes with feathered edge border, varied aspect ratio and alignment.
  for(let i=0;i<23;i++){
   const seed=i+51;let x=(rand(seed*9)-.5)*40,z=(rand(seed*11)-.5)*39;
   if(x>-18&&x<-1&&z>-14&&z<0){x+=9;} // keep fabric shelter mostly dry
   const r=(.45+rand(seed*7)*1.0),geom=new THREE.ShapeGeometry(blobShape(r,r*(.31+rand(seed)*.44),i));
   const p=new THREE.Mesh(geom,waterMat.clone());p.rotation.x=-Math.PI/2;p.rotation.z=rand(i*17)*T;
   p.position.set(x,this.y+.206+i*.00003,z);p.renderOrder=3;this.group.add(p);this.wetPatches.push(p);
  }
  // Weighted ground contact shading: no visual floating facilities.
  [[-8,-6,17,12,.9],[16,-13,8,7,1],[12,10,8,6,.8],[-13,11,11,12,.65],[5,-13,10,5,.65],[2,3,5,5,.8],[12,0,8,8,.8]].forEach(q=>this.addShadow(...q));
  // Small cracks and scattered chipped aggregates, not straight black chalkboard grid.
  const stones=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.21,0),this.concrete,180);
  stones.name='broken concrete aggregate';stones.castShadow=false;
  const dummy=new THREE.Object3D();for(let i=0;i<180;i++){
   let x=(rand(i*13+87)-.5)*42,z=(rand(i*23+61)-.5)*42;
   if(Math.abs(x)<6&&Math.abs(z)<5){x+=9;}
   dummy.position.set(x,this.y+.21,z);dummy.rotation.set(rand(i)*T,rand(i+3)*T,rand(i+9)*T);dummy.scale.set(.25+rand(i+4)*1.2,.12+rand(i+6)*.38,.28+rand(i+10)*1.3);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);
   stones.setColorAt(i,new THREE.Color().setHSL(.11,.045,.27+rand(i+5)*.18));
  }this.group.add(stones);
  this.addStormDrain(-17,21);this.addStormDrain(1,21);this.addStormDrain(17,21);
 }
 buildReflectiveWetSurfaces(){
  // One cheap view-dependent, world-space puddle highlight field over the single
  // roof. The underlying concrete stays the actual 2K PBR material, while the
  // reflective parts respond to campfire, warm lamps, sky and lightning.
  const uniforms={
    uWet:{value:0},uTime:{value:0},uNight:{value:0},uStorm:{value:0},
    uView:{value:new THREE.Vector3(55,60,55)},uFlash:{value:0},
    uSunColor:{value:new THREE.Color('#ffb777')}
  };
  const mat=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    polygonOffset:true,polygonOffsetFactor:-3,
    vertexShader:`varying vec3 vWorld;void main(){vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`precision highp float;
      varying vec3 vWorld;
      uniform float uWet,uTime,uNight,uStorm,uFlash;
      uniform vec3 uView,uSunColor;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float valueNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      void main(){
       vec2 p=vWorld.xz;
       // No hard geometric-blue disks. Multi-scale rainwater retains irregular
       // micro-pools, broken concrete absorbs unevenly, drier spots stay matte.
       float n=valueNoise(p*.34)*.59+valueNoise(p*.85)*.29+valueNoise(p*1.8)*.12;
       float pool=smoothstep(.43,.68,n);
       vec2 cameraDir=normalize(uView.xz-p+vec2(.001));
       vec2 fireOffset=vec2(2.,3.)+cameraDir*2.5;
       float dx=(p.x-fireOffset.x),dz=(p.y-fireOffset.y);
       float fire=exp(-dx*dx*.070-dz*dz*.17)*(.36+.64*valueNoise(p*.8+uTime*.008));
       float lamp=exp(-pow(length(p-vec2(-9.,-6.))*.20,2.))*.44+
                  exp(-pow(length(p-vec2(13.,-5.))*.19,2.))*.34;
       float sun=pow(max(0.,dot(normalize(vec3(p.x*.025,.85,p.y*.025)),normalize(uSunColor))),5.);
       vec3 cold=vec3(.34,.48,.54)*(0.19+valueNoise(p*.43+uTime*.006)*.22);
       vec3 warm=vec3(1.0,.45,.16)*(fire*.84+lamp*.45);
       vec3 flash=vec3(.71,.86,1.0)*uFlash*.48;
       vec3 result=mix(cold,warm,.46+.3*uNight)+flash;
       float wave=.90+.10*sin(p.x*6.0+p.y*3.0+uTime*1.5);
       float amount=uWet*(.032+pool*.54)*(1.0+.22*uStorm)*wave;
       result+=(warm*.32+vec3(.2,.34,.4)*.07)*pool;
       gl_FragColor=vec4(result,min(.58,amount));
      }`
  });
  const reflection=new THREE.Mesh(new THREE.PlaneGeometry(45.34,45.34),mat);
  reflection.rotation.x=-Math.PI/2;
  reflection.position.y=this.y+.228;
  reflection.renderOrder=4;
  this.group.add(reflection);
  this.wetReflections=reflection;
 }
 buildSnowAccumulation(){
  // Snow collects at the parapet and on the exposed floor, never spawning
  // a second rooftop. The white volumes stay in world 3D during camera orbit.
  const n=this.world.isMobile?180:340;
  const geo=new THREE.IcosahedronGeometry(1,1);
  const material=new THREE.MeshStandardMaterial({color:'#ced8d8',transparent:true,opacity:0,roughness:.93,metalness:0,depthWrite:false});
  const snow=new THREE.InstancedMesh(geo,material,n);
  snow.name='Snow piled on hero roof only';snow.castShadow=false;snow.receiveShadow=false;
  const dummy=new THREE.Object3D();
  for(let i=0;i<n;i++){
   let x=(rand(i*17+4)-.5)*44,z=(rand(i*71+5)-.5)*44;
   const edge=i<n*.56;
   if(edge){const side=i%4,q=(rand(i*13)-.5)*43;
     x=side===0?q:side===1?22:side===2?q:-22;
     z=side===0?22:side===1?q:side===2?-22:q;
   }
   dummy.position.set(x,this.y+.23,z);
   dummy.rotation.set(0,rand(i*81)*T,0);
   dummy.scale.set(.13+rand(i+90)*.51,.02+rand(i+26)*.09,.14+rand(i+57)*.56);
   dummy.updateMatrix();snow.setMatrixAt(i,dummy.matrix);
  }
  snow.instanceMatrix.needsUpdate=true;this.group.add(snow);this.snowCover=snow;
 }
 addStormDrain(x,z){
  const frame=box(this.group,[2.3,.13,1.2],[x,this.y+.28,z],this.rust);
  const inner=box(this.group,[1.95,.025,.93],[x,this.y+.36,z],this.dark);inner.castShadow=false;
  for(let j=-4;j<=4;j++){const o=box(this.group,[.08,.058,.90],[x+j*.205,this.y+.39,z],this.copper);o.castShadow=false;}
  const waterPipe=join(this.group,[x,this.y+.22,z+1.0],[x,this.y-1.25,z+1.8],.22,this.dark);
  this.windTargets.push(waterPipe);
 }
 detailShelter(){
  // Alteration to the actual 3D shelter, NOT a 2D photo applied over the mesh.
  const tent=this.world.shelter;
  // Cloth has a skirt, gravity folds and distinct damaged stitching near the entrance.
  for(let side of [-1,1]){
   const x=side*5.8;
   const geo=new THREE.PlaneGeometry(9.5,3.4,28,12);geo.rotateY(side===1?Math.PI/2:-Math.PI/2);
   const a=geo.attributes.position;
   for(let i=0;i<a.count;i++){
    const py=a.getY(i),pz=a.getZ(i);
    const drape=.08*Math.sin(pz*1.9+side)+.09*Math.sin(pz*5.6+py*2);
    a.setX(i,a.getX(i)+drape);a.setY(i,py+(py<0?.10*Math.sin(pz*1.1):0));
   }
   geo.computeVertexNormals();
   const mesh=new THREE.Mesh(geo,this.fabric);mesh.position.set(x,2.78,0);mesh.receiveShadow=true;mesh.castShadow=true;
   mesh.name='tensioned canvas sidewall';tent.add(mesh);
   // Wind tears visible on edges at small scale.
   for(let i=0;i<8;i++){
    let z=-4.5+i*1.25;join(tent,[x,4.55,z],[x+side*.08,1.55,z+.1],.024,this.rust,6);
   }
  }
  // The shelter uses the existing cot from sceneDetails at (-12.4,-2).
  // Prior versions created a second mattress here, offset from the actor.
  // Wardrobe, shelving and salvaged bedside items.
  for(const ix of [-4.5,-1.0])for(let k=0;k<3;k++)box(tent,[.15,1.9,.1],[ix,1.45,k*1.25-3],this.wood);
  for(let k=0;k<3;k++)box(tent,[3.5,.12,1.0],[-2.8,1.0+k*.66,-2.5],this.wood);
  for(let k=0;k<12;k++){
   const x=-4.4+rand(k+76)*3.3,z=-2.7+rand(k+10)*.75;
   box(tent,[.23+rand(k)*.35,.12+rand(k+6)*.5,.21],[x,1.45+(k%3)*.55,z],k%3?this.rust:this.concrete);
  }
  // Cables & eyelets around the roof and bed, physically attached to one tent.
  for(let i=0;i<11;i++){
    const x=-5.7+i*1.14;
    join(tent,[x,5.04,-4.8],[x,4.92,-5.02],.025,this.rust,6);
  }
  // Darken fabric in rain and illuminate interior naturally with warm area-equivalent light.
  this.tentCanvas=this.fabric;
  this.addShadow(-8,-6,14,13,.64);
 }
 addGrimeAndGrowth(){
  // Leaves are organic curved planes; instanced, multiple shades and angular scatter.
  const leafGeometry=new THREE.BufferGeometry();
  leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
   0,0,0,-.17,.18,.045,-.12,.44,.03,0,.62,0,.12,.44,.03,.17,.18,.045,0,.28,.12
  ],3));leafGeometry.setIndex([6,0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0]);leafGeometry.computeVertexNormals();
  const leafMaterial=new THREE.MeshStandardMaterial({color:'#658155',roughness:.88,side:THREE.DoubleSide});
  const clumps=this.world.isMobile?240:530;this.vegetation=new THREE.InstancedMesh(leafGeometry,leafMaterial,clumps);
  const dummy=new THREE.Object3D();for(let i=0;i<clumps;i++){
   let a=rand(i*73)*T,side=i%4,s=(rand(i*14)-.5)*41;
   let x=side===0?s:side===1?22.1:side===2?s:-22.1;
   let z=side===0?22.1:side===1?s:side===2?-22.1:s;
   if(i>clumps*.65){x=-18+rand(i*7)*10;z=8+rand(i*17)*12;}
   dummy.position.set(x,this.y+.34+rand(i+6)*.23,z);
   dummy.rotation.set((rand(i+4)-.5)*1.5,a,(rand(i+30)-.5)*1.3);
   dummy.scale.set(.65+rand(i)*1.35,.6+rand(i+91)*1.4,.60+rand(i+2));dummy.updateMatrix();this.vegetation.setMatrixAt(i,dummy.matrix);
   this.vegetation.setColorAt(i,new THREE.Color().setHSL(.23+rand(i+7)*.08,.26+rand(i+3)*.18,.27+rand(i)*.18));
  }
  this.vegetation.instanceMatrix.needsUpdate=true;this.vegetation.instanceColor.needsUpdate=true;
  this.vegetation.frustumCulled=false;this.group.add(this.vegetation);
  // Moss at boundary is 3D; original empty roof stays fully walkable.
  for(let i=0;i<31;i++){
    const a=rand(i*11)*T,x=(rand(i*29)-.5)*42,z=(rand(i*17)-.5)*42;
    if(x*x+z*z<150)continue;
    const g=new THREE.Mesh(new THREE.IcosahedronGeometry(.25+rand(i)*.3,1),i%3?this.moss:this.leaf);
    g.scale.set(1.35,.25,1.9);g.position.set(x,this.y+.25,z);g.rotation.y=a;this.group.add(g);
  }
  // Real cable droop over the single roof camp, bounded low to avoid other roofing.
  for(const [x1,z1,x2,z2] of [[-18,-15,0,-16],[0,-16,16,-16],[16,-16,18,13],[-17,14,13,15]]){
   const pts=[];for(let i=0;i<=14;i++){const f=i/14;pts.push(new THREE.Vector3(x1+(x2-x1)*f,this.y+5.5-.65*Math.sin(f*Math.PI),z1+(z2-z1)*f))}
   const curve=new THREE.CatmullRomCurve3(pts),tube=new THREE.Mesh(new THREE.TubeGeometry(curve,26,.026,5,false),this.dark);this.group.add(tube);
  }
 }
 fireAndSmoke(){
  // Replace geometric orange fire cones with additive sprite flames. Firelight remains a real 3D point light.
  if(this.world.flames)for(const f of this.world.flames)f.visible=false;
  const fireMat=new THREE.SpriteMaterial({map:transparentFireTexture(),color:'#fff4ce',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
  this.fireFlames=[];
  for(let i=0;i<8;i++){
   const sprite=new THREE.Sprite(fireMat.clone());sprite.position.set(2+(rand(i+4)-.5)*1.05,this.y+1.05,3+(rand(i+8)-.5)*.87);
   sprite.scale.set(.72+rand(i+11)*.45,2.3+rand(i+7)*.75,1);sprite.material.rotation=(rand(i+3)-.5)*.18;this.scene.add(sprite);this.fireFlames.push(sprite);
  }
  const smokeMaterial=new THREE.SpriteMaterial({map:new THREE.TextureLoader().load('./assets/materials/cinematic/cloudbank_alpha.png'),color:'#9c978c',transparent:true,opacity:.11,depthWrite:false,fog:false});
  this.smoke=[];
  for(let i=0;i<15;i++){
   const sprite=new THREE.Sprite(smokeMaterial.clone());sprite.position.set(2,this.y+1,3);sprite.scale.set(1.1,1.0,1);sprite.visible=true;this.scene.add(sprite);this.smoke.push(sprite);
  }
 }
 addAtmosphericLighting(){
  const s=this.scene,y=this.y;
  // Low-intensity, warm interior lighting, physically attached to roof lighting rigs.
  this.localLights=[];
  [[-9,y+3.2,-6,3.2,14],[5,y+2.5,-13,2.4,11],[13,y+3.2,-5,1.5,11],[-18,y+4.1,11,1.2,11]].forEach(([x,yy,z,base,range])=>{
   const l=new THREE.PointLight('#ffb76a',base,range,2);l.position.set(x,yy,z);l.castShadow=false;s.add(l);l.userData.baseIntensity=base;this.localLights.push(l);
  });
 }
 update(dt,w,night){
  this.time+=dt;const t=this.time;
  if(this.wetOverlay)this.wetOverlay.material.opacity=Math.min(.46,w.wet*.38+w.rain*.09);
  if(this.wetReflections){
    const un=this.wetReflections.material.uniforms;
    un.uWet.value=w.wet;un.uTime.value=t;un.uNight.value=night;
    un.uStorm.value=w.storm;
    un.uView.value.copy(this.world.camera.position);
    un.uFlash.value=Math.min(1,this.world.advancedWeather?.farFlash?.intensity/5||0);
  }
  if(this.snowCover)this.snowCover.material.opacity=Math.min(.94,w.snow*.93);

  for(let i=0;i<this.wetPatches.length;i++){
    const p=this.wetPatches[i];p.material.opacity=Math.min(.33,w.wet*(.20+rand(i)*.15));
    p.material.color.set(w.rain>.2?'#526770':'#596669');
    p.rotation.z=Math.sin(t*.13+i)*.015;
  }
  for(let i=0;i<this.fireFlames.length;i++){
    const f=this.fireFlames[i],speed=7+rand(i+1)*4;
    f.scale.y=(2+rand(i)*.8)*(.8+Math.sin(t*speed+i)*.18);
    f.material.opacity=(.71+Math.sin(t*(speed*.6)+i)*.18)*(1-w.rain*.35);
    f.position.y=this.y+1.01+Math.sin(t*5+i)*.045;
  }
  for(let i=0;i<this.smoke.length;i++){
    const s=this.smoke[i],p=(t*.19+rand(i*6))%1;
    s.position.set(2+Math.sin(i+t*.32)*p*(.6+w.wind*2.5),this.y+1.65+p*7.4,3+Math.cos(i*2+t*.3)*p);
    const sc=(.7+p*2.3);s.scale.set(sc,sc*.72,1);s.material.opacity=(.10+p*.08)*(1-p)*(.72+w.rain*.3);
  }
  this.tentCanvas.color.set('#555947').multiplyScalar(1-w.wet*.17);
  for(const l of this.localLights)l.intensity=l.userData.baseIntensity*(.65+night*.6+w.storm*.12);
 }
}
