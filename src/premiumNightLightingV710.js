import * as THREE from 'three';
import {CITY_COMPOSITION} from './cityComposition.js';

/**
 * AFTERDAY v7.1 — motivated night-light hierarchy.
 *
 * Night is no longer just a darker daytime frame. A restrained cool moon fill,
 * sparse real emergency/fire lights, wet-ground light pools, and a couple of
 * physically rooted haze beams establish readable foreground/midground depth.
 *
 * Lights are deliberately few and non-shadow-casting to protect frame time.
 * Mobile uses half the local-light count and one haze beam.
 */
const GROUND=CITY_COMPOSITION.groundY;
const hash=n=>{const x=Math.sin(n*227.17+97.31)*43758.5453123;return x-Math.floor(x);};
const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));

function radialTexture(){
  const c=document.createElement('canvas');c.width=c.height=192;
  const x=c.getContext('2d'),g=x.createRadialGradient(96,96,2,96,96,92);
  g.addColorStop(0,'rgba(255,190,112,.72)');
  g.addColorStop(.28,'rgba(234,139,71,.33)');
  g.addColorStop(.66,'rgba(192,104,57,.10)');
  g.addColorStop(1,'rgba(120,72,47,0)');
  x.fillStyle=g;x.fillRect(0,0,192,192);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function poolMaterial(tex){
  return new THREE.MeshBasicMaterial({
    map:tex,color:'#ffc17c',transparent:true,opacity:0,
    blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,
    polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,toneMapped:true
  });
}
function beamMaterial(){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,
    blending:THREE.AdditiveBlending,toneMapped:true,
    uniforms:{uStrength:{value:0},uTime:{value:0},uStorm:{value:0},uFlash:{value:0}},
    vertexShader:`
      varying vec3 vLocal;varying vec2 vUv;
      void main(){vLocal=position;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
    `,
    fragmentShader:`
      precision highp float;
      varying vec3 vLocal;varying vec2 vUv;
      uniform float uStrength,uTime,uStorm,uFlash;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        float radial=1.0-smoothstep(.12,.50,length(vUv-vec2(.5)));
        float bands=.76+.24*sin(vLocal.y*.75+uTime*.19+h(floor(vUv*18.))*3.2);
        float vertical=smoothstep(.03,.16,vUv.y)*(1.0-smoothstep(.73,1.0,vUv.y));
        float a=radial*vertical*bands*uStrength*(1.0-uStorm*.45);
        vec3 c=mix(vec3(.50,.66,.78),vec3(.88,.77,.61),uFlash*.32);
        gl_FragColor=vec4(c,a*.16);
      }`
  });
}
function orientBetween(mesh,start,end){
  const delta=end.clone().sub(start);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
  mesh.scale.y=delta.length();
}

function selectLocalLightSites(world,mobile){
  const near=(world.distantCityPlan||[])
    .filter(s=>s.tier==='near'||s.tier==='mid')
    .sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));
  const max=mobile?2:4,out=[];
  for(const s of near){
    if(out.every(o=>Math.hypot(o.x-s.x,o.z-s.z)>42)){
      out.push(s);
      if(out.length>=max)break;
    }
  }
  return out;
}

export class PremiumNightLightingV710{
  constructor(world){
    this.world=world;this.mobile=Boolean(world.isMobile);this.time=0;
    this.group=new THREE.Group();this.group.name='AFTERDAY v7.1 motivated night-light hierarchy';
    world.scene.add(this.group);

    this.moon=new THREE.DirectionalLight('#9bb8d0',0);
    this.moon.name='v7.1 cool lunar directional fill';this.moon.castShadow=false;
    this.moon.position.set(-70,85,45);this.moon.target.position.set(0,world.ROOF_Y,0);
    this.group.add(this.moon,this.moon.target);

    this.poolTexture=radialTexture();this.locals=[];
    const sites=selectLocalLightSites(world,this.mobile);
    for(let i=0;i<sites.length;i++){
      const s=sites[i],seed=s.x*.13+s.z*.19+i*17;
      const warm=i%3===2?'#d77849':'#ffad68';
      const light=new THREE.PointLight(warm,0,18+hash(seed)*8,2);
      light.name='v7.1 sparse real city emergency light';light.castShadow=false;
      // Put the source outside the ruin footprint, toward its street-facing side.
      const outward=new THREE.Vector2(s.x,s.z);
      if(outward.lengthSq()<.001)outward.set(1,0);else outward.normalize();
      const tangent=new THREE.Vector2(-outward.y,outward.x);
      const edge=(s.width||11)*.68+3.4;
      const jitter=(hash(seed+2)-.5)*4.0;
      light.position.set(
        s.x+outward.x*edge+tangent.x*jitter,
        GROUND+2.0+hash(seed+4)*2.0,
        s.z+outward.y*edge+tangent.y*jitter
      );
      this.group.add(light);

      const mat=poolMaterial(this.poolTexture);
      const pool=new THREE.Mesh(new THREE.PlaneGeometry(1,1),mat);
      pool.name='v7.1 wet-ground emergency light pool';
      pool.rotation.x=-Math.PI/2;pool.position.set(light.position.x,GROUND+.19,light.position.z);
      const radius=8+hash(seed+9)*6;pool.scale.set(radius,radius,1);pool.renderOrder=6;this.group.add(pool);
      this.locals.push({light,pool,mat,phase:hash(seed+11)*TAU,base:1.15+hash(seed+13)*.75});
    }

    this.beams=[];this.beamMaterials=[];
    const beamSites=sites.slice(0,this.mobile?1:2);
    for(let i=0;i<beamSites.length;i++){
      const s=beamSites[i],seed=s.x*.21+s.z*.17+i*29;
      const start=new THREE.Vector3(s.x,GROUND+Math.min(s.height||36,60)*.80,s.z);
      const inward=new THREE.Vector3(-s.x,0,-s.z).normalize();
      const end=start.clone().addScaledVector(inward,18+hash(seed+2)*10);
      end.y=GROUND+3+hash(seed+5)*4;
      const mat=beamMaterial(),cone=new THREE.Mesh(new THREE.CylinderGeometry(.12,3.8,1,18,1,true),mat);
      cone.name='v7.1 world-space haze light beam';orientBetween(cone,start,end);cone.renderOrder=10;
      this.group.add(cone);this.beams.push(cone);this.beamMaterials.push(mat);

      const spot=new THREE.SpotLight('#b7cfe0',0,42,Math.PI*.12,.55,1.6);
      spot.name='v7.1 restrained ruined-city floodlight';spot.castShadow=false;
      spot.position.copy(start);spot.target.position.copy(end);this.group.add(spot,spot.target);
      cone.userData.spot=spot;cone.userData.phase=hash(seed+9)*TAU;
    }
  }

  update(dt,weather={},night=0,twilight=0,flash=0,lunar=null){
    this.time+=Math.min(.10,Math.max(0,Number(dt)||0));
    const n=clamp01(night),cloud=clamp01(weather.cloud),storm=clamp01(weather.storm),
      wet=clamp01(weather.wet),f=clamp01(flash),tw=clamp01(twilight);

    // Use the real lunar azimuth/altitude already calculated by the world.
    const alt=Number(lunar?.altitude);
    const azi=Number(lunar?.azimuth);
    if(Number.isFinite(alt)&&Number.isFinite(azi)){
      const r=100,up=Math.sin(alt),flat=Math.cos(alt);
      this.moon.position.set(Math.sin(azi)*flat*r,Math.max(5,up*r),-Math.cos(azi)*flat*r);
    }
    const moonAbove=Number.isFinite(alt)?clamp01(Math.sin(alt)*2.5):n;
    this.moon.intensity=(.04+n*.34*moonAbove)*(1-cloud*.56)*(1-storm*.38)+f*.12;
    this.moon.color.set(storm?'#879dad':'#9bb8d0');

    for(let i=0;i<this.locals.length;i++){
      const o=this.locals[i],flicker=.94+.06*Math.sin(this.time*(3.1+i*.37)+o.phase)*Math.sin(this.time*7.3+o.phase);
      const intensity=o.base*(n*.92+tw*.24+storm*.08)*flicker;
      o.light.intensity=intensity+f*1.6;
      o.light.distance=18+wet*5;
      o.mat.opacity=(n*.20+tw*.06)*(.75+wet*.62)*(1+f*.40);
      o.pool.scale.multiplyScalar(1); // keep authored radius; explicit no per-frame growth.
    }

    for(let i=0;i<this.beams.length;i++){
      const beam=this.beams[i],m=this.beamMaterials[i],spot=beam.userData.spot;
      const strength=(n*.44+tw*.09)*(1-cloud*.28)*(1-storm*.42);
      m.uniforms.uStrength.value=strength;
      m.uniforms.uTime.value=this.time+beam.userData.phase;
      m.uniforms.uStorm.value=storm;m.uniforms.uFlash.value=f;
      beam.visible=strength>.025;
      spot.intensity=(this.mobile?.32:.52)*strength+f*.18;
    }
  }

  dispose(){
    this.group.parent?.remove(this.group);
    for(const o of this.locals){o.pool.geometry.dispose();o.mat.dispose();o.light.dispose?.();}
    for(const b of this.beams){b.geometry.dispose();b.userData.spot?.dispose?.();}
    for(const m of this.beamMaterials)m.dispose();
    this.poolTexture.dispose();this.moon.dispose?.();
  }
}
