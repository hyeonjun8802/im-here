import * as THREE from 'three';
import {CITY_COMPOSITION} from './cityComposition.js';

/**
 * AFTERDAY v6.5 — cinematic city-depth pass.
 *
 * Purpose:
 * - turn the existing ruined skyline into layered atmosphere instead of a flat wall
 * - create motivated cold-vs-amber light hierarchy without changing the game's concept
 * - add sparse lived-in/emergency light pockets, industrial smoke, depth veils and fire glow
 * - keep every effect attached to real world-space city positions
 *
 * This is an original visual system. It does not copy external game assets, UI,
 * architecture or layouts and never modifies survival/save/tornado state.
 */
const GROUND=CITY_COMPOSITION.groundY;
const TAU=Math.PI*2;
const hash=n=>{const x=Math.sin(n*137.13+41.71)*43758.5453123;return x-Math.floor(x);};
const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));

function fogVeilMaterial(){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,
    blending:THREE.NormalBlending,toneMapped:true,fog:false,
    uniforms:{
      uTime:{value:0},uOpacity:{value:.08},uStorm:{value:0},
      uNight:{value:0},uWind:{value:0},
      uCold:{value:new THREE.Color('#8ca2aa')},
      uWarm:{value:new THREE.Color('#9a7358')}
    },
    vertexShader:`
      varying vec2 vUv;varying vec3 vWorld;
      void main(){
        vUv=uv;
        vec4 w=modelMatrix*vec4(position,1.0);
        vWorld=w.xyz;
        gl_Position=projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader:`
      precision highp float;
      varying vec2 vUv;varying vec3 vWorld;
      uniform float uTime,uOpacity,uStorm,uNight,uWind;
      uniform vec3 uCold,uWarm;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
      float n(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        float a=h(i),b=h(i+vec2(1.,0.)),c=h(i+vec2(0.,1.)),d=h(i+vec2(1.,1.));
        return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
      }
      float fbm(vec2 p){
        float v=0.,a=.55;
        for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+17.17;a*=.48;}
        return v;
      }
      void main(){
        vec2 p=vec2(vWorld.x*.010+uTime*.010*uWind,vWorld.y*.030-uTime*.006);
        float cloud=fbm(p);
        float vertical=smoothstep(.03,.26,vUv.y)*(1.0-smoothstep(.74,1.0,vUv.y));
        float edge=smoothstep(.02,.18,vUv.x)*(1.0-smoothstep(.82,.98,vUv.x));
        float broken=smoothstep(.34,.72,cloud);
        float warmPocket=smoothstep(.70,.94,fbm(p*1.7+23.));
        vec3 c=mix(uCold,uWarm,warmPocket*(.12+.18*uNight));
        float a=uOpacity*vertical*edge*(.28+.72*broken)*(1.0+uStorm*.35);
        gl_FragColor=vec4(c,a);
      }`
  });
}

function smokeMaterial(mobile=false){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:true,fog:false,
    blending:THREE.NormalBlending,toneMapped:true,
    uniforms:{
      uTime:{value:0},uWind:{value:.15},uStorm:{value:0},uNight:{value:0},
      uOpacity:{value:.26},uPixelRatio:{value:mobile?1.0:1.55}
    },
    vertexShader:`
      attribute float aPhase,aSize,aRise,aDrift,aHeat;
      varying float vAlpha,vHeat,vNoise;
      uniform float uTime,uWind,uStorm,uPixelRatio;
      void main(){
        vec3 p=position;
        float travel=mod(aPhase+uTime*aRise,1.0);
        float spread=(2.0+travel*9.0)*aDrift;
        p.y+=travel*(18.0+26.0*aRise);
        p.x+=sin(aPhase*31.0+uTime*.11)*spread+uWind*travel*18.0;
        p.z+=cos(aPhase*23.0+uTime*.08)*spread*.72;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mv;
        float perspective=260.0/max(45.0,-mv.z);
        gl_PointSize=clamp(aSize*(1.0+travel*2.8)*perspective*uPixelRatio,2.0,58.0);
        vAlpha=smoothstep(.0,.10,travel)*(1.0-smoothstep(.70,1.0,travel));
        vHeat=aHeat*(1.0-travel)*(.6+.4*uNight);
        vNoise=fract(sin(aPhase*991.7)*43758.5453);
      }`,
    fragmentShader:`
      precision highp float;
      varying float vAlpha,vHeat,vNoise;
      uniform float uStorm,uOpacity;
      void main(){
        vec2 q=gl_PointCoord-.5;
        float r=length(q);
        float soft=1.0-smoothstep(.18,.50,r);
        float lobe=.78+.22*sin((q.x+q.y+vNoise)*13.0);
        vec3 cold=mix(vec3(.22,.27,.28),vec3(.38,.43,.43),vNoise*.35);
        vec3 warm=vec3(.46,.31,.22);
        vec3 c=mix(cold,warm,vHeat*.42);
        float a=soft*lobe*vAlpha*uOpacity*(.86+uStorm*.20);
        gl_FragColor=vec4(c,a);
      }`
  });
}

function windowMaterial(){
  return new THREE.MeshStandardMaterial({
    color:'#d6a367',emissive:'#ff9c45',emissiveIntensity:.32,
    roughness:.52,metalness:.02,toneMapped:true
  });
}
function fireMaterial(){
  return new THREE.MeshStandardMaterial({
    color:'#f0a35e',emissive:'#ff7b2f',emissiveIntensity:2.0,
    roughness:.42,metalness:0,toneMapped:true
  });
}

function instanced(parent,name,geometry,material,records,{cast=false,receive=false}={}){
  if(!records.length)return null;
  const mesh=new THREE.InstancedMesh(geometry,material,records.length);
  mesh.name=name;mesh.castShadow=cast;mesh.receiveShadow=receive;
  const d=new THREE.Object3D();
  for(let i=0;i<records.length;i++){
    const r=records[i];
    d.position.set(...r.p);d.rotation.set(...(r.r||[0,0,0]));d.scale.set(...(r.s||[1,1,1]));
    d.updateMatrix();mesh.setMatrixAt(i,d.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();parent.add(mesh);return mesh;
}

export class PremiumCinematicCityV650{
  constructor(world){
    this.world=world;this.time=0;this.mobile=Boolean(world.isMobile);
    this.group=new THREE.Group();this.group.name='AFTERDAY v6.5 cinematic city depth';
    world.scene.add(this.group);
    this.materials=[];this.meshes=[];

    this.makeDepthVeils();
    this.makeIndustrialSmoke();
    this.makeSparseWindowLife();
    this.makeDistantFirePockets();
    this.makeColdRimLight();

    this.stats={
      depthVeils:this.veils?.length||0,
      smokePoints:this.smokeCount||0,
      windowPockets:this.windowRecords?.length||0,
      firePockets:this.fireRecords?.length||0,
      gameplayUntouched:true
    };
  }

  makeDepthVeils(){
    const mat=fogVeilMaterial();this.materials.push(mat);this.veilMaterial=mat;
    const records=[],rings=this.mobile?[360,560]:[300,430,590,760];
    let id=0;
    for(let rIndex=0;rIndex<rings.length;rIndex++){
      const radius=rings[rIndex],count=this.mobile?5:7;
      for(let i=0;i<count;i++){
        const a=5*Math.PI/4+(i/(count-1)-.5)*1.65+(hash(id+7)-.5)*.11;
        const w=110+hash(id+9)*95,h=70+hash(id+11)*70;
        const x=Math.sin(a)*radius,z=Math.cos(a)*radius;
        records.push({p:[x,GROUND+20+h*.5,z],r:[0,a,0],s:[w,h,1]});
        id++;
      }
    }
    this.veils=[];
    const geom=new THREE.PlaneGeometry(1,1,1,1);
    // One draw per ring would allow independent opacity, but a single instanced draw
    // gives better frame consistency and the same large-scale depth breakup.
    const veil=instanced(this.group,'v6.5 volumetric city-canyon depth veils',geom,mat,records);
    if(veil){veil.renderOrder=7;this.veils.push(veil);this.meshes.push(veil);}
  }

  makeIndustrialSmoke(){
    const slots=(this.world.distantCityPlan||[])
      .filter(s=>s.tier!=='near')
      .sort((a,b)=>hash(a.x+a.z*3)-hash(b.x+b.z*3))
      .slice(0,this.mobile?5:10);
    const particlesPer=this.mobile?13:25,total=Math.max(1,slots.length*particlesPer);
    const pos=new Float32Array(total*3),phase=new Float32Array(total),size=new Float32Array(total),
      rise=new Float32Array(total),drift=new Float32Array(total),heat=new Float32Array(total);
    let k=0;
    for(let s=0;s<slots.length;s++){
      const slot=slots[s],top=GROUND+Math.min(slot.height||35,95);
      for(let i=0;i<particlesPer;i++,k++){
        const n=s*1000+i*23+17;
        pos[k*3]=slot.x+(hash(n)-.5)*2.5;
        pos[k*3+1]=top+2+hash(n+2)*2;
        pos[k*3+2]=slot.z+(hash(n+4)-.5)*2.5;
        phase[k]=hash(n+6);size[k]=10+hash(n+8)*16;
        rise[k]=.035+hash(n+10)*.045;drift[k]=.35+hash(n+12)*.70;
        heat[k]=hash(n+14)>.72?hash(n+16):0;
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geo.setAttribute('aPhase',new THREE.BufferAttribute(phase,1));
    geo.setAttribute('aSize',new THREE.BufferAttribute(size,1));
    geo.setAttribute('aRise',new THREE.BufferAttribute(rise,1));
    geo.setAttribute('aDrift',new THREE.BufferAttribute(drift,1));
    geo.setAttribute('aHeat',new THREE.BufferAttribute(heat,1));
    geo.computeBoundingSphere();
    const mat=smokeMaterial(this.mobile);this.materials.push(mat);this.smokeMaterial=mat;
    const smoke=new THREE.Points(geo,mat);smoke.name='v6.5 layered industrial smoke plumes';
    smoke.frustumCulled=false;smoke.renderOrder=9;this.group.add(smoke);
    this.smoke=smoke;this.smokeCount=total;this.meshes.push(smoke);
  }

  makeSparseWindowLife(){
    const candidates=(this.world.distantCityPlan||[])
      .filter(s=>s.tier==='near'||s.tier==='mid')
      .filter((s,i)=>hash(i*19+s.x*.11+s.z*.07)>.48)
      .slice(0,this.mobile?14:34);
    const records=[];
    for(let i=0;i<candidates.length;i++){
      const s=candidates[i],count=this.mobile?1:2+Math.floor(hash(i+7)*3);
      for(let j=0;j<count;j++){
        const face=hash(i*31+j*17)>.5?0:1;
        const y=GROUND+3+hash(i*41+j*23)*Math.max(5,(s.height||30)*.66);
        const offset=(hash(i*53+j*29)-.5)*(s.width||10)*.62;
        if(face===0){
          records.push({p:[s.x+offset,y,s.z+(s.width||10)*.415+.08],r:[0,0,0],s:[.85,.42,.025]});
        }else{
          records.push({p:[s.x+(s.width||10)*.505,y,s.z+offset],r:[0,Math.PI/2,0],s:[.85,.42,.025]});
        }
      }
    }
    const mat=windowMaterial();this.materials.push(mat);this.windowMaterial=mat;this.windowRecords=records;
    const mesh=instanced(this.group,'v6.5 sparse amber emergency windows',new THREE.BoxGeometry(1,1,1),mat,records);
    if(mesh){this.windowMesh=mesh;this.meshes.push(mesh);}
  }

  makeDistantFirePockets(){
    const records=[],count=this.mobile?7:15;
    for(let i=0;i<count;i++){
      const a=5*Math.PI/4+(hash(i*17+3)-.5)*1.55,r=170+hash(i*29+8)*430;
      records.push({p:[Math.sin(a)*r,GROUND+.75+hash(i+3)*1.8,Math.cos(a)*r],
        s:[.45+hash(i+4)*.65,.45+hash(i+5)*1.0,.45+hash(i+7)*.65]});
    }
    const mat=fireMaterial();this.materials.push(mat);this.fireMaterial=mat;this.fireRecords=records;
    const mesh=instanced(this.group,'v6.5 distant emergency fire glow pockets',
      new THREE.IcosahedronGeometry(1,1),mat,records);
    if(mesh){mesh.renderOrder=5;this.fireMesh=mesh;this.meshes.push(mesh);}
  }

  makeColdRimLight(){
    this.rim=new THREE.DirectionalLight('#86a3b8',this.mobile?.08:.18);
    this.rim.position.set(-95,80,120);this.rim.target.position.set(-80,GROUND+16,-120);
    this.group.add(this.rim,this.rim.target);
  }

  update(dt,weather={},night=0,twilight=0){
    const delta=Math.min(.10,Math.max(0,Number(dt)||0));this.time+=delta;
    const n=clamp01(night),storm=clamp01(weather.storm),mist=clamp01(weather.mist),
      wet=clamp01(weather.wet),wind=clamp01(weather.wind),rain=clamp01(weather.rain);

    if(this.veilMaterial){
      const u=this.veilMaterial.uniforms;
      u.uTime.value=this.time;u.uStorm.value=storm;u.uNight.value=n;u.uWind.value=wind;
      u.uOpacity.value=.035+mist*.105+storm*.055+n*.022;
      u.uCold.value.set(storm?'#7f9098':n?'#718b9a':'#9aa8aa');
      u.uWarm.value.set('#9a7154');
    }
    if(this.smokeMaterial){
      const u=this.smokeMaterial.uniforms;
      u.uTime.value=this.time;u.uWind.value=.12+wind*.88;u.uStorm.value=storm;u.uNight.value=n;
      u.uOpacity.value=(.17+storm*.11+n*.045)*(1-rain*.20);
    }
    if(this.windowMaterial){
      this.windowMaterial.emissiveIntensity=.03+n*.82+storm*.16+clamp01(twilight)*.18;
      this.windowMaterial.opacity=1;
    }
    if(this.fireMaterial){
      this.fireMaterial.emissiveIntensity=(1.25+n*2.3+storm*.45)*(1-rain*.32)*
        (.92+.08*Math.sin(this.time*7.1));
    }
    this.rim.intensity=(this.mobile?.06:.14)+n*.08+storm*.09;
    this.rim.color.set(storm?'#7f99aa':'#8eaabe');

    // Add visual depth without fighting the existing weather simulation:
    // slightly cooler, denser far-air only through the scene's already-owned fog.
    const baseFog=.0010+mist*.00055+storm*.00028+n*.00008;
    if(this.world.scene.fog?.isFogExp2){
      this.world.scene.fog.density=THREE.MathUtils.damp(
        this.world.scene.fog.density,
        Math.max(this.world.scene.fog.density,baseFog),
        .20,delta
      );
    }
    if(this.world.scene.environment){
      this.world.scene.environmentIntensity=Math.max(.40,
        (this.world.scene.environmentIntensity||.55)-wet*.015);
    }
  }

  dispose(){
    this.group.parent?.remove(this.group);
    for(const m of this.meshes)m.geometry?.dispose?.();
    for(const mat of this.materials)mat?.dispose?.();
    this.rim?.dispose?.();
  }
}
