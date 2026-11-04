import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CITY_COMPOSITION} from './cityComposition.js';

/**
 * AFTERDAY v7.2 — persistent destruction aftermath.
 *
 * All saved tornado + autonomous-collapse IDs are rebuilt into a small number
 * of global GPU batches: rubble apron, twisted steel, torn panels, impact scars,
 * dangling service lines and a single lingering dust field. This keeps a long
 * play session visually accumulated without one draw call per fragment.
 *
 * Visual-only: no save fields, health/resources, collapse timing or city lots
 * are changed here.
 */
const GROUND=CITY_COMPOSITION.groundY;
const TAU=Math.PI*2;
const hash=n=>{const x=Math.sin(n*239.17+113.71)*43758.5453123;return x-Math.floor(x);};
const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));

function mats(){
  return {
    concrete:new THREE.MeshPhysicalMaterial({
      color:'#575c58',roughness:.97,metalness:.01,envMapIntensity:.34
    }),
    steel:new THREE.MeshPhysicalMaterial({
      color:'#626a67',roughness:.57,metalness:.64,envMapIntensity:.96,
      clearcoat:.025,clearcoatRoughness:.48
    }),
    rust:new THREE.MeshPhysicalMaterial({
      color:'#65483e',roughness:.80,metalness:.39,envMapIntensity:.63
    }),
    panel:new THREE.MeshPhysicalMaterial({
      color:'#4e5552',roughness:.73,metalness:.25,envMapIntensity:.70
    })
  };
}
function xf(g,p=[0,0,0],r=[0,0,0],s=[1,1,1]){
  const c=g.clone(),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...r));
  c.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),q,new THREE.Vector3(...s)));
  return c;
}
const boxGeo=(size,p,r=[0,0,0])=>xf(new THREE.BoxGeometry(...size),p,r);
function beamGeo(a,b,r=.04,seg=7){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);
  const g=new THREE.CylinderGeometry(r,r,d.length(),seg);
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),q,new THREE.Vector3(1,1,1)));
  return g;
}
function merge(list,material,name){
  if(!list.length)return null;
  const indexed=list.every(g=>Boolean(g.index)===Boolean(list[0].index));
  const src=indexed?list:list.map(g=>g.index?g.toNonIndexed():g);
  const out=mergeGeometries(src,false);
  if(src!==list)for(const g of src)if(!list.includes(g))g.dispose();
  for(const g of list)g.dispose();
  if(!out)return null;
  out.computeBoundingBox();out.computeBoundingSphere();
  const m=new THREE.Mesh(out,material);m.name=name;m.castShadow=false;m.receiveShadow=true;return m;
}

function scarTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
  const g=x.createRadialGradient(128,128,8,128,128,124);
  g.addColorStop(0,'rgba(19,22,20,.78)');
  g.addColorStop(.25,'rgba(27,29,26,.52)');
  g.addColorStop(.58,'rgba(35,34,30,.22)');
  g.addColorStop(1,'rgba(30,28,25,0)');
  x.fillStyle=g;x.fillRect(0,0,256,256);
  for(let i=0;i<42;i++){
    const a=hash(i*17)*TAU,r=18+hash(i*19+3)*100,len=8+hash(i*23+4)*44;
    x.strokeStyle='rgba(15,17,16,'+(0.05+hash(i*31)*.12).toFixed(3)+')';
    x.lineWidth=.5+hash(i*29)*1.5;
    x.beginPath();x.moveTo(128+Math.cos(a)*r,128+Math.sin(a)*r);
    x.lineTo(128+Math.cos(a)*(r+len),128+Math.sin(a)*(r+len));x.stroke();
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
function scarMaterial(texture){
  return new THREE.MeshBasicMaterial({
    map:texture,color:'#52514a',transparent:true,opacity:.58,
    depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4
  });
}
function dustMaterial(mobile){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:true,fog:true,
    blending:THREE.NormalBlending,toneMapped:true,
    uniforms:{
      uTime:{value:0},uWind:{value:0},uRain:{value:0},uStorm:{value:0},
      uNight:{value:0},uPixel:{value:mobile?1.0:1.55}
    },
    vertexShader:`
      attribute float aPhase,aSize,aRise,aDrift,aFade;
      varying float vLife,vFade;
      uniform float uTime,uWind,uPixel;
      void main(){
        vec3 p=position;
        float life=fract(aPhase+uTime*aRise);
        float lift=life*(3.0+7.0*aFade);
        p.y+=lift;
        p.x+=sin(aPhase*31.0+uTime*.17)*aDrift+uWind*life*(1.0+3.0*aFade);
        p.z+=cos(aPhase*23.0+uTime*.13)*aDrift*.65;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(aSize*(1.0+life*1.8)*(235.0/max(40.0,-mv.z))*uPixel,1.0,24.0);
        vLife=smoothstep(.0,.10,life)*(1.0-smoothstep(.68,1.0,life));
        vFade=aFade;
      }`,
    fragmentShader:`
      precision highp float;
      varying float vLife,vFade;
      uniform float uRain,uStorm,uNight;
      void main(){
        vec2 q=gl_PointCoord-.5;float r=length(q);
        float soft=1.0-smoothstep(.12,.49,r);
        float alpha=soft*vLife*(.055+.08*vFade+.025*uStorm)*(1.0-uRain*.82);
        vec3 day=vec3(.40,.40,.37),night=vec3(.27,.31,.32);
        gl_FragColor=vec4(mix(day,night,uNight*.75),alpha);
      }`
  });
}

function addSiteGeometry(slot,index,store,mobile){
  const w=slot.width||11,d=w*.82,h=slot.height||32;
  const seed=index*919+(slot.modelIndex||0)*71+slot.x*.37+slot.z*.53;
  const rot=slot.rotation||0,c=Math.cos(rot),s=Math.sin(rot);
  const world=(x,y,z)=>{
    const wx=slot.x+x*c+z*s,wz=slot.z-x*s+z*c;
    return [wx,GROUND+y,wz];
  };

  const rubble=mobile?9:17;
  for(let i=0;i<rubble;i++){
    const a=hash(seed+i*13)*TAU,rr=(.50+hash(seed+i*17)*.72)*Math.max(w,d)*.72;
    const x=Math.cos(a)*rr,z=Math.sin(a)*rr;
    const sx=.22+hash(seed+i*19)*1.2,sy=.10+hash(seed+i*23)*.50,sz=.25+hash(seed+i*29)*1.35;
    store.concrete.push(boxGeo([sx,sy,sz],world(x,sy*.5,z),[
      hash(seed+i*31)*TAU,rot+hash(seed+i*37)*TAU,hash(seed+i*41)*TAU
    ]));
  }

  const rods=mobile?4:8;
  for(let i=0;i<rods;i++){
    const a=hash(seed+i*43)*TAU,rr=(.25+hash(seed+i*47)*.65)*w*.58;
    const x=Math.cos(a)*rr,z=Math.sin(a)*rr,len=.9+hash(seed+i*53)*2.6;
    const A=world(x,.18,z),B=world(x+(hash(seed+i*59)-.5)*1.3,.18+len,z+(hash(seed+i*61)-.5)*1.3);
    store.steel.push(beamGeo(A,B,.035+hash(seed+i*67)*.025,6));
  }

  const panels=mobile?2:5;
  for(let i=0;i<panels;i++){
    const a=hash(seed+i*71)*TAU,rr=(.45+hash(seed+i*73)*.55)*w*.72;
    const p=world(Math.cos(a)*rr,.10+hash(seed+i*79)*.25,Math.sin(a)*rr);
    store.panel.push(boxGeo([
      .45+hash(seed+i*83)*1.2,.045,.35+hash(seed+i*89)*1.0
    ],p,[hash(seed+i*97)*.35,rot+hash(seed+i*101)*TAU,hash(seed+i*103)*.35]));
  }

  // One or two torn service lines remain hanging from the failed upper structure.
  const lines=mobile?1:2;
  for(let i=0;i<lines;i++){
    const x=(hash(seed+i*107)-.5)*w*.5,z=(hash(seed+i*109)-.5)*d*.5;
    const y0=h*(.38+hash(seed+i*113)*.25),drop=3+hash(seed+i*127)*5;
    const A=world(x,y0,z),M=world(x+(hash(seed+i*131)-.5)*1.2,y0-drop*.45,z+(hash(seed+i*137)-.5)*1.1);
    const B=world(x+(hash(seed+i*139)-.5)*2.0,y0-drop,z+(hash(seed+i*149)-.5)*1.5);
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(...A),new THREE.Vector3(...M),new THREE.Vector3(...B)]);
    store.rust.push(new THREE.TubeGeometry(curve,14,.035+hash(seed+i*151)*.02,6,false));
  }

  store.scars.push({p:[slot.x,GROUND+.13,slot.z],r:[-Math.PI/2,0,rot],s:[
    w*(1.4+hash(seed+157)*.35),d*(1.5+hash(seed+163)*.35),1
  ]});

  const dust=mobile?12:28;
  for(let i=0;i<dust;i++){
    const a=hash(seed+i*167)*TAU,rr=hash(seed+i*173)*w*.72;
    const p=world(Math.cos(a)*rr,.4+hash(seed+i*179)*3.2,Math.sin(a)*rr);
    store.dust.push({
      p,phase:hash(seed+i*181),size:2.2+hash(seed+i*191)*5.8,
      rise:.007+hash(seed+i*193)*.014,drift:.25+hash(seed+i*197)*1.0,
      fade:.35+hash(seed+i*199)*.65
    });
  }
}

function makeScarInstances(records,material){
  if(!records.length)return null;
  const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),material,records.length);
  mesh.name='v7.2 persistent impact-ground scars';
  const d=new THREE.Object3D();
  records.forEach((r,i)=>{
    d.position.set(...r.p);d.rotation.set(...r.r);d.scale.set(...r.s);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.renderOrder=4;return mesh;
}
function makeDust(records,mobile){
  if(!records.length)return null;
  const p=new Float32Array(records.length*3),phase=new Float32Array(records.length),
    size=new Float32Array(records.length),rise=new Float32Array(records.length),
    drift=new Float32Array(records.length),fade=new Float32Array(records.length);
  records.forEach((r,i)=>{
    p.set(r.p,i*3);phase[i]=r.phase;size[i]=r.size;rise[i]=r.rise;drift[i]=r.drift;fade[i]=r.fade;
  });
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(p,3));
  g.setAttribute('aPhase',new THREE.BufferAttribute(phase,1));
  g.setAttribute('aSize',new THREE.BufferAttribute(size,1));
  g.setAttribute('aRise',new THREE.BufferAttribute(rise,1));
  g.setAttribute('aDrift',new THREE.BufferAttribute(drift,1));
  g.setAttribute('aFade',new THREE.BufferAttribute(fade,1));
  g.computeBoundingSphere();
  const mat=dustMaterial(mobile),points=new THREE.Points(g,mat);
  points.name='v7.2 single-batch lingering collapse dust';points.frustumCulled=false;points.renderOrder=8;
  return points;
}

export class PremiumCollapseAftermathV720{
  constructor(world){
    this.world=world;this.mobile=Boolean(world.isMobile);this.time=0;this.signature='';
    this.root=new THREE.Group();this.root.name='AFTERDAY v7.2 persistent destruction aftermath';
    world.scene.add(this.root);
    this.materials=mats();
    this.scarTexture=scarTexture();this.scarMaterial=scarMaterial(this.scarTexture);
    this.materials.scar=this.scarMaterial;
    this.staticMeshes=[];this.dust=null;
  }

  rebuild(game){
    const ids=[...new Set([...(game?.ambientCollapseIds||[]),...(game?.tornadoDamagedIds||[])])].sort();
    const sig=ids.join('|');if(sig===this.signature)return;
    this.signature=sig;

    for(const m of this.staticMeshes){m.geometry?.dispose?.();m.parent?.remove(m);}
    this.staticMeshes.length=0;
    if(this.dust){this.dust.geometry.dispose();this.dust.material.dispose();this.dust.parent?.remove(this.dust);this.dust=null;}

    const store={concrete:[],steel:[],rust:[],panel:[],scars:[],dust:[]};
    let index=0;
    for(const id of ids){
      const slot=this.world.distantCityPlan?.find(s=>s.id===id);if(!slot)continue;
      addSiteGeometry(slot,index++,store,this.mobile);
    }
    const layers=[
      merge(store.concrete,this.materials.concrete,'v7.2 merged collapse rubble apron'),
      merge(store.steel,this.materials.steel,'v7.2 merged exposed aftermath steel'),
      merge(store.rust,this.materials.rust,'v7.2 merged dangling service lines'),
      merge(store.panel,this.materials.panel,'v7.2 merged torn facade panels'),
      makeScarInstances(store.scars,this.scarMaterial)
    ].filter(Boolean);
    for(const m of layers){this.root.add(m);this.staticMeshes.push(m);}
    this.dust=makeDust(store.dust,this.mobile);if(this.dust)this.root.add(this.dust);
    this.stats={sites:index,staticLayers:layers.length,dustParticles:store.dust.length};
  }

  update(dt,weather={},night=0,game=null){
    this.rebuild(game);
    this.time+=Math.min(.10,Math.max(0,Number(dt)||0));
    const wet=clamp01(weather.wet),rain=clamp01(weather.rain),storm=clamp01(weather.storm),
      wind=clamp01(weather.wind),n=clamp01(night);
    this.scarMaterial.opacity=.44+wet*.18+n*.05;
    this.materials.concrete.roughness=.97-wet*.12;
    this.materials.steel.roughness=.58-wet*.10;
    if(this.dust){
      const u=this.dust.material.uniforms;
      u.uTime.value=this.time;u.uWind.value=wind;u.uRain.value=rain;
      u.uStorm.value=storm;u.uNight.value=n;
      this.dust.visible=this.stats?.sites>0&&(rain<.96||storm>.25);
    }
  }

  dispose(){
    for(const m of this.staticMeshes)m.geometry?.dispose?.();
    if(this.dust){this.dust.geometry.dispose();this.dust.material.dispose();}
    for(const m of Object.values(this.materials))m?.dispose?.();
    this.scarTexture.dispose();
    this.root.parent?.remove(this.root);
    this.staticMeshes.length=0;
  }
}
