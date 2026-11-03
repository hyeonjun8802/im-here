import * as THREE from 'three';

/**
 * AFTERDAY tornado set piece: physically placed, camera-orbit-safe 3D storm.
 * Reference direction: a charcoal wall cloud, broad violent funnel, turquoise-white
 * electrical branching and an actual 3D half-collapsed background building.
 * No flat tornado billboard or heroic-roof demolition. Preview never changes saves.
 */
const TAU=Math.PI*2;
const hash=n=>{const t=Math.sin(n*127.13+17.11)*43758.5453123;return t-Math.floor(t);};
const smooth=(a,b,x)=>{const k=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return k*k*(3-2*k);};

export function selectStormBuilding(slots=[]){
  const candidates=slots.filter(s=>s.tier==='mid' || s.tier==='near');
  // Behind the hero roof for the default +X/+Z camera, but visible while orbiting.
  return candidates.reduce((best,s)=>{
    const score=Math.hypot(s.x+91,s.z+96)+Math.abs(s.height-31)*.32;
    return score<(best?.score??Infinity)?{slot:s,score}:best;
  },null)?.slot||null;
}

function addBox(group,size,position,material){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
  mesh.position.set(...position);mesh.castShadow=false;mesh.receiveShadow=true;
  group.add(mesh);return mesh;
}
function makeLightning(seed){
  const group=new THREE.Group();
  const light=new THREE.MeshBasicMaterial({color:'#e7f9ff',toneMapped:false,depthWrite:false});
  const halo=new THREE.MeshBasicMaterial({color:'#5995d6',transparent:true,opacity:.25,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  const path=[];
  let x=(hash(seed*11)-.5)*30,z=(hash(seed*21)-.5)*25;
  for(let i=0;i<=20;i++){
    const y=152-i*7.25;
    x+=(hash(seed+i*13)-.52)*11;
    z+=(hash(seed+i*19)-.5)*9;
    path.push(new THREE.Vector3(x,y,z));
  }
  function branch(points,radius){
    const curve=new THREE.CatmullRomCurve3(points);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*3),radius*3.1,4,false),halo));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*3),radius,5,false),light));
  }
  branch(path,.28);
  for(let b=0;b<5;b++){
    const start=2+b*3,points=[path[start].clone()];
    for(let j=0;j<4;j++){
      const last=points[points.length-1],k=start*29+b*37+j+seed;
      points.push(last.clone().add(new THREE.Vector3((hash(k)-.38)*14,-4.4,(hash(k+3)-.5)*11)));
    }
    branch(points,.12);
  }
  group.userData.materials=[light,halo];
  return group;
}
function funnelMaterial(shell){
  const vertex=[
    'varying vec2 vUV;',
    'varying float vBillow;',
    'uniform float uTime;',
    'void main(){',
    ' vUV=uv;',
    ' float h=uv.y;',
    ' float turn=atan(position.z,position.x)+uTime*(.47+float('+shell+')*.13)+h*10.5;',
    ' float curl=sin(h*42.0-turn*5.1+uTime*1.3)*.05+sin(h*73.0+turn*3.4)*.026;',
    ' float radius=mix(8.0,49.0,pow(h,1.30))*(1.0+curl);',
    ' radius*=1.0+float('+shell+')*.085;',
    ' float wobble=sin(h*8.8+uTime*.34)*3.5*h;',
    ' vec3 p=vec3(cos(turn)*radius+wobble,h*166.0,sin(turn)*radius+sin(h*9.4+uTime*.23)*3.0*h);',
    ' vBillow=sin(turn*12.0-h*68.0+uTime*1.5);',
    ' gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);',
    '}'
  ].join('\n');
  const fragment=[
    'precision highp float;',
    'uniform float uTime,uStrength,uFlash;',
    'varying vec2 vUV;',
    'varying float vBillow;',
    'float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);',
    'return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+vec2(1.,1.)),f.x),f.y);}',
    'void main(){',
    ' vec2 p=vec2(vUV.x*23.0-uTime*.025,vUV.y*8.0+uTime*.10);',
    ' float broad=noise2(p*.71)*.65+noise2(p*2.1)*.35;',
    ' float veins=sin(vUV.y*94.0-vUV.x*49.0-uTime*3.7)*.5+.5;',
    ' float swirl=pow(.5+.5*vBillow,2.0);',
    ' float mass=smoothstep(.22,.72,broad*.61+veins*.15+swirl*.30);',
    ' float low=smoothstep(.0,.09,vUV.y);',
    ' float top=1.0-smoothstep(.91,1.0,vUV.y)*.28;',
    ' float a=mass*low*top*uStrength*'+(shell===0?'.63':shell===1?'.35':'.22')+';',
    ' if(a<.015)discard;',
    ' vec3 graphite=mix(vec3(.052,.073,.085),vec3(.24,.28,.30),broad*.79+swirl*.10);',
    ' vec3 electrical=vec3(.48,.68,.79)*(uFlash*.13);',
    ' gl_FragColor=vec4(graphite+electrical,a);',
    '}'
  ].join('\n');
  return new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},uStrength:{value:0},uFlash:{value:0}},
    vertexShader:vertex,fragmentShader:fragment,
    side:THREE.DoubleSide,transparent:true,depthWrite:false,depthTest:true,
    fog:false
  });
}

export class NearTornadoVfx {
  constructor(world){
    this.world=world;this.scene=world.scene;this.mobile=world.isMobile;
    this.slot=selectStormBuilding(world.distantCityPlan);
    this.host=this.slot?world.cityBuildings?.get(this.slot.id):null;
    this.clock=0;this.exposure=0;this.previewImpact=0;
    this.damageProgress=0;this.persistedDamage=false;this.strength=0;
    const x=this.slot?this.slot.x-22:-110,z=this.slot?this.slot.z-24:-116;
    // Never enter the only playable roof: keep the 3D vortex center outside 118 units.
    const radius=Math.hypot(x,z),factor=Math.max(1,128/Math.max(1,radius));
    this.anchor=new THREE.Vector3(x*factor,-23.4,z*factor);
    this.root=new THREE.Group();this.root.name='AFTERDAY cinematic close 3D tornado';
    this.root.position.copy(this.anchor);this.root.visible=false;this.scene.add(this.root);
    const cone=new THREE.CylinderGeometry(1,1,1,this.mobile?42:76,this.mobile?30:55,true);
    this.shells=[];
    for(let i=0;i<(this.mobile?2:3);i++){
      const mesh=new THREE.Mesh(cone.clone(),funnelMaterial(i));
      mesh.renderOrder=i+1;mesh.frustumCulled=false;
      this.root.add(mesh);this.shells.push(mesh);
    }
    // Instanced irregular cloud masses: shading variation, actual depth and parallax.
    this.dummy=new THREE.Object3D();
    const smokeGeo=new THREE.IcosahedronGeometry(1,1);
    this.smokeMat=new THREE.MeshStandardMaterial({color:'#3a444b',roughness:1,transparent:true,opacity:.48,depthWrite:false,flatShading:true});
    this.smoke=new THREE.InstancedMesh(smokeGeo,this.smokeMat,this.mobile?90:170);
    this.smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.smoke.frustumCulled=false;this.root.add(this.smoke);
    for(let i=0;i<this.smoke.count;i++){
      const shade=.55+hash(i*13)*.62;
      this.smoke.setColorAt(i,new THREE.Color().setRGB(shade,shade*1.04,shade*1.09));
    }
    this.smoke.instanceColor.needsUpdate=true;
    this.dustMat=new THREE.MeshStandardMaterial({color:'#6c6762',transparent:true,opacity:.66,roughness:1,depthWrite:false});
    this.dust=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),this.dustMat,this.mobile?54:106);
    this.dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.dust.frustumCulled=false;this.root.add(this.dust);
    const shards=this.mobile?110:250;
    this.shardMat=new THREE.MeshStandardMaterial({color:'#666b6b',metalness:.15,roughness:.9,transparent:true,opacity:.9,depthWrite:false});
    this.shards=new THREE.InstancedMesh(new THREE.BoxGeometry(.62,1.6,.21),this.shardMat,shards);
    this.shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.shards.frustumCulled=false;this.root.add(this.shards);
    this.lightning=Array.from({length:3},(_,i)=>makeLightning(i+7));
    for(const bolt of this.lightning){bolt.visible=false;this.root.add(bolt);}
    this.flashLight=new THREE.PointLight('#b0d8ff',0,270,1.1);
    this.flashLight.position.set(0,107,0);this.root.add(this.flashLight);
    this.boltAge=100;this.nextBolt=1.65;this.boltIndex=0;
    this.setupDestruction();
  }
  setupDestruction(){
    this.destroyed=new THREE.Group();
    this.destroyed.name='AFTERDAY one 3D mid-distance building fractured to half height';
    this.destroyed.visible=false;this.scene.add(this.destroyed);
    this.fragments=[];this.impactSmoke=null;
    if(!this.slot||!this.host)return;
    const s=this.slot,w=s.width,d=s.width*.82,h=s.height;
    this.destroyed.position.copy(this.host.position);
    this.destroyed.rotation.copy(this.host.rotation);
    const facade=new THREE.MeshStandardMaterial({color:'#757f7e',roughness:.95,metalness:.05});
    const concrete=new THREE.MeshStandardMaterial({color:'#454b4b',roughness:1});
    const rust=new THREE.MeshStandardMaterial({color:'#756259',metalness:.5,roughness:.82});
    const lower=h*.55;
    addBox(this.destroyed,[w,lower,d],[0,lower*.5,0],facade);
    // Irregular remaining half-height rim, exposed floors and bent steel.
    for(let i=0;i<13;i++){
      const theta=i*TAU/13,rx=Math.cos(theta)*(w*.47),rz=Math.sin(theta)*(d*.47);
      const top=(.05+.18*hash(i*13+2))*h;
      const piece=addBox(this.destroyed,[w*.09,top,d*.075],[rx,lower+top*.5,rz],i%4?facade:concrete);
      piece.rotation.y=theta;
    }
    for(let i=0;i<4;i++){
      const y=lower+(i+.4)*h*.045;
      addBox(this.destroyed,[w*.68,h*.013,d*.8],[0,y,0],concrete);
    }
    for(let i=0;i<9;i++){
      const x=(hash(i*3)-.5)*w*.75,z=(hash(i*5+7)-.5)*d*.72;
      const rod=new THREE.Mesh(new THREE.CylinderGeometry(.045,.052,h*.11,5),rust);
      rod.position.set(x,lower+h*.052,z);rod.rotation.z=(hash(i+22)-.5)*.52;this.destroyed.add(rod);
    }
    // The missing upper 45% breaks into sections that physically rotate/fall.
    for(let i=0;i<22;i++){
      const col=i%5,row=Math.floor(i/5);
      const bw=w/5*.92,bh=h*.45/5*.94,bd=d*.64;
      const ox=(col-2)*w/5,oy=lower+(row+.5)*h*.45/5,oz=(hash(i*31)-.5)*d*.25;
      const chunk=addBox(this.destroyed,[bw,bh,bd],[ox,oy,oz],i%3?facade:concrete);
      const outward=new THREE.Vector3(ox+hash(i*5)*4,0,oz+(hash(i*7)-.5)*7).normalize();
      this.fragments.push({mesh:chunk,start:new THREE.Vector3(ox,oy,oz),outward,seed:hash(i*17+9)});
    }
    const geo=new THREE.IcosahedronGeometry(1,1);
    const mat=new THREE.MeshBasicMaterial({color:'#8b8580',transparent:true,opacity:0,depthWrite:false});
    this.impactSmoke=new THREE.InstancedMesh(geo,mat,this.mobile?24:48);
    this.impactSmoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.impactSmoke.frustumCulled=false;this.destroyed.add(this.impactSmoke);
  }
  updateDestruction(dt,active,persisted,previewMode){
    if(!this.host)return;
    this.persistedDamage=Boolean(persisted);
    // Visual demonstrations are reversible and never write to simulation saves.
    const shouldBreak=this.persistedDamage||(active&&previewMode&&this.exposure>8);
    if(this.persistedDamage&&!active)this.damageProgress=1; // Restore existing scar immediately on reload.
    else if(shouldBreak)this.damageProgress=Math.min(1,this.damageProgress+dt*.28);
    else if(!this.persistedDamage)this.damageProgress=Math.max(0,this.damageProgress-dt*.34);
    const p=this.damageProgress;
    this.host.visible=p<=.002;
    this.destroyed.visible=p>.002;
    if(!this.destroyed.visible)return;
    for(const frag of this.fragments){
      const q=smooth(0,1,p);
      frag.mesh.position.copy(frag.start).addScaledVector(frag.outward,q*(11+frag.seed*14));
      frag.mesh.position.y=frag.start.y-(q*q)*(20+frag.seed*18);
      frag.mesh.rotation.set(q*frag.seed*2.1,q*1.5,q*(frag.seed-.5)*3.2);
      frag.mesh.visible=p<.96;
    }
    if(this.impactSmoke){
      this.impactSmoke.material.opacity=(1-p)*.36;
      for(let i=0;i<this.impactSmoke.count;i++){
        const angle=hash(i*7)*TAU,r=(3+hash(i*21)*12)*p;
        this.dummy.position.set(Math.cos(angle)*r,this.slot.height*.52+(hash(i*13)*16)*p,Math.sin(angle)*r);
        const size=(.3+p*7)*(1+hash(i*47));this.dummy.scale.set(size,size*.55,size);this.dummy.rotation.set(0,0,0);
        this.dummy.updateMatrix();this.impactSmoke.setMatrixAt(i,this.dummy.matrix);
      }
      this.impactSmoke.instanceMatrix.needsUpdate=true;
    }
  }
  update(dt,weather,{persisted=false,preview=false,night=0,reduceMotion=false}={}){
    dt=Math.min(Math.max(dt,0),.05);
    const target=Math.max(0,Math.min(1,Number(weather)||0));
    this.clock+=dt;this.strength=THREE.MathUtils.damp(this.strength,target,1.5,dt);
    this.exposure=target>.5?this.exposure+dt:0;
    this.root.visible=this.strength>.015;
    this.updateDestruction(dt,target>.5,persisted,preview);
    if(!this.root.visible){this.flashLight.intensity=0;return 0;}
    const t=this.clock,s=this.strength;
    this.root.position.x=this.anchor.x+Math.sin(t*.17)*2.6*s;
    this.root.position.z=this.anchor.z+Math.cos(t*.13)*2.4*s;
    for(const sh of this.shells){sh.material.uniforms.uTime.value=t;sh.material.uniforms.uStrength.value=s;}
    this.smokeMat.opacity=.41*s;this.dustMat.opacity=.62*s;this.shardMat.opacity=.88*s;
    const spinRate=reduceMotion?.29:.66;
    for(let i=0;i<this.smoke.count;i++){
      const q=hash(i*17+1),h=5+Math.pow(q,.74)*158;
      const angle=i*2.4+t*(spinRate+q*.52)+h*.065;
      const radius=8+Math.pow(h/166,1.4)*48;
      this.dummy.position.set(Math.cos(angle)*radius,h,Math.sin(angle)*radius);
      const size=(2.8+hash(i*39)*5)*(1+h/180);
      this.dummy.scale.set(size*1.55,size*.77,size*1.3);
      this.dummy.rotation.set(t*.07,i*.31+t*.13,t*.04);
      this.dummy.updateMatrix();this.smoke.setMatrixAt(i,this.dummy.matrix);
    }
    this.smoke.instanceMatrix.needsUpdate=true;
    for(let i=0;i<this.dust.count;i++){
      const a=i*2.39996+t*(reduceMotion?.36:1.5),r=17+hash(i*13+3)*36;
      this.dummy.position.set(Math.cos(a)*r,1+hash(i*11)*10,Math.sin(a)*r);
      const k=2.4+hash(i*21)*5.8;
      this.dummy.scale.set(k*1.75,k*.5,k*1.36);this.dummy.rotation.set(0,a*.2,0);
      this.dummy.updateMatrix();this.dust.setMatrixAt(i,this.dummy.matrix);
    }
    this.dust.instanceMatrix.needsUpdate=true;
    for(let i=0;i<this.shards.count;i++){
      const h=(hash(i*37)*145+t*(reduceMotion?1.1:11)*(1+hash(i*3)))%145;
      const a=i*2.3+t*(reduceMotion?.55:1.6)+h*.055;
      const r=8+Math.pow(h/166,1.1)*39+hash(i*5)*6;
      this.dummy.position.set(Math.cos(a)*r,h,Math.sin(a)*r);
      const k=.35+hash(i*9)*2.7;
      this.dummy.scale.set(k,k*.48,k*.63);
      this.dummy.rotation.set(a*1.7,t*.7+i*.1,t*.9+i*.08);
      this.dummy.updateMatrix();this.shards.setMatrixAt(i,this.dummy.matrix);
    }
    this.shards.instanceMatrix.needsUpdate=true;
    this.boltAge+=dt;this.nextBolt-=dt;
    if(this.nextBolt<=0&&s>.55){
      this.boltAge=0;this.boltIndex=(this.boltIndex+1)%this.lightning.length;
      this.nextBolt=(reduceMotion?5.8:3.3)+hash(Math.floor(t))*1.8;
    }
    const flash=reduceMotion?0:Math.max(0,1-this.boltAge/.22)*Math.exp(-this.boltAge*7)*s;
    this.lightning.forEach((g,i)=>g.visible=i===this.boltIndex&&flash>.08);
    this.flashLight.intensity=flash*(reduceMotion?0:95);
    for(const sh of this.shells)sh.material.uniforms.uFlash.value=flash;
    return flash;
  }
  dispose(){
    if(this.host)this.host.visible=true;
    for(const root of [this.root,this.destroyed]){
      root.traverse(obj=>{
        if(obj.geometry)obj.geometry.dispose();
        if(obj.material){
          for(const m of (Array.isArray(obj.material)?obj.material:[obj.material]))m.dispose();
        }
      });
      root.parent?.remove(root);
    }
  }
}
