import * as THREE from 'three';
import {CITY_COMPOSITION} from './cityComposition.js';
import {PuddleDetailV740} from './puddleDetailV740.js';

/**
 * AFTERDAY v7.0 — physically motivated wet-surface response.
 *
 * Rain now changes the actual material language of the scene instead of only
 * drawing rain in front of it: road glints, thin facade runoff, roof-edge water
 * ribbons and impact splashes appear progressively with wetness. Lightning
 * briefly lifts specular energy without changing gameplay lighting ownership.
 */
const GROUND=CITY_COMPOSITION.groundY;
const hash=n=>{const x=Math.sin(n*211.17+83.41)*43758.5453123;return x-Math.floor(x);};
const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));

function makeWetMat(){
  return new THREE.MeshPhysicalMaterial({
    color:'#7d8988',roughness:.16,metalness:.03,
    envMapIntensity:1.28,clearcoat:1,clearcoatRoughness:.08,
    transparent:true,opacity:0,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3
  });
}
function instanced(parent,name,geometry,material,records){
  const mesh=new THREE.InstancedMesh(geometry,material,records.length);
  mesh.name=name;const d=new THREE.Object3D();
  records.forEach((r,i)=>{
    d.position.set(...r.p);d.rotation.set(...(r.r||[0,0,0]));d.scale.set(...(r.s||[1,1,1]));d.updateMatrix();
    mesh.setMatrixAt(i,d.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.receiveShadow=false;parent.add(mesh);return mesh;
}

function runoffMaterial(){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,
    blending:THREE.NormalBlending,fog:true,
    uniforms:{uTime:{value:0},uWet:{value:0},uFlash:{value:0}},
    vertexShader:`
      varying vec2 vUv;
      void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
    `,
    fragmentShader:`
      precision highp float;
      varying vec2 vUv;uniform float uTime,uWet,uFlash;
      float h(float n){return fract(sin(n)*43758.5453123);}
      void main(){
        float lanes=.30+.70*smoothstep(.48,.88,sin(vUv.x*41.0+h(floor(vUv.x*17.))*7.0)*.5+.5);
        float flow=fract(vUv.y*2.8-uTime*(.55+vUv.x*.30));
        float bead=smoothstep(.78,.98,flow);
        float body=(.22+.78*lanes)*(.42+.58*bead);
        float edge=smoothstep(.02,.10,vUv.x)*(1.0-smoothstep(.90,.98,vUv.x));
        vec3 c=mix(vec3(.42,.50,.52),vec3(.78,.87,.90),uFlash*.6);
        gl_FragColor=vec4(c,uWet*body*edge*.18);
      }`
  });
}

function splashMaterial(mobile){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:true,fog:true,
    blending:THREE.AdditiveBlending,toneMapped:true,
    uniforms:{uTime:{value:0},uRain:{value:0},uWet:{value:0},uFlash:{value:0},uPixel:{value:mobile?1:1.55}},
    vertexShader:`
      attribute float aPhase,aSize,aZone;
      varying float vLife;uniform float uTime,uRain,uPixel;
      void main(){
        vec3 p=position;
        float life=fract(aPhase+uTime*(.60+aZone*.18));
        float active=step(1.0-uRain*.88,life);
        float local=fract(life/max(.02,uRain*.88));
        p.y+=sin(local*3.14159)*(.10+.22*aZone)*active;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=active*clamp(aSize*(180.0/max(1.0,-mv.z))*uPixel,1.0,6.0);
        vLife=active*(1.0-local);
      }`,
    fragmentShader:`
      precision highp float;varying float vLife;uniform float uWet,uFlash;
      void main(){
        vec2 q=gl_PointCoord-.5;float r=length(q);
        float ring=(1.0-smoothstep(.31,.48,r))*(1.0-smoothstep(.16,.27,r));
        vec3 c=mix(vec3(.55,.66,.70),vec3(.92,.97,1.0),uFlash);
        gl_FragColor=vec4(c,ring*vLife*uWet*.42);
      }`
  });
}

function makeSplashField(world){
  const mobile=world.isMobile,n=mobile?95:220;
  const pos=new Float32Array(n*3),phase=new Float32Array(n),size=new Float32Array(n),zone=new Float32Array(n);
  for(let i=0;i<n;i++){
    const roof=i<n*.46;
    if(roof){
      pos[i*3]=(hash(i*17)-.5)*42;
      pos[i*3+1]=world.ROOF_Y+.22;
      pos[i*3+2]=(hash(i*31)-.5)*42;
      zone[i]=.25;
    }else{
      const vertical=i%2===0,side=i%4<2?-1:1,lane=side*(186+hash(i+4)*7),along=(hash(i*41+8)-.5)*360;
      pos[i*3]=vertical?lane:along;
      pos[i*3+1]=GROUND+.19;
      pos[i*3+2]=vertical?along:lane;
      zone[i]=.72;
    }
    phase[i]=hash(i*47+2);size[i]=.65+hash(i*53+7)*1.7;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('aPhase',new THREE.BufferAttribute(phase,1));
  geo.setAttribute('aSize',new THREE.BufferAttribute(size,1));
  geo.setAttribute('aZone',new THREE.BufferAttribute(zone,1));
  geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,GROUND+30,0),430);
  const mat=splashMaterial(mobile),points=new THREE.Points(geo,mat);
  points.name='AFTERDAY v7.0 GPU rain impact splashes';points.frustumCulled=false;points.renderOrder=15;
  world.scene.add(points);return points;
}

function facadeStreakMaterial(){
  return new THREE.MeshPhysicalMaterial({
    color:'#72807f',roughness:.13,metalness:.01,envMapIntensity:1.1,
    clearcoat:1,clearcoatRoughness:.06,transparent:true,opacity:0,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4
  });
}

export class PremiumWeatherSurfacesV700{
  constructor(world){
    this.world=world;this.mobile=Boolean(world.isMobile);this.time=0;
    this.group=new THREE.Group();this.group.name='AFTERDAY v7.0 physically responsive wet surfaces';
    world.scene.add(this.group);

    this.wetMaterial=makeWetMat();this.streakMaterial=facadeStreakMaterial();
    this.puddleDetail=new PuddleDetailV740(this.wetMaterial,this.mobile);
    this.runoffMaterial=runoffMaterial();
    this.materials=[this.wetMaterial,this.streakMaterial,this.runoffMaterial];

    this.makeGroundWetPatches();
    this.makeFacadeStreaks();
    this.makeRoofRunoff();
    this.splashes=makeSplashField(world);this.materials.push(this.splashes.material);
  }

  makeGroundWetPatches(){
    const records=[],count=this.mobile?28:58;
    for(let i=0;i<count;i++){
      const roof=i<Math.floor(count*.38);
      if(roof){
        records.push({
          p:[(hash(i*11)-.5)*39,this.world.ROOF_Y+.235,(hash(i*17)-.5)*39],
          r:[-Math.PI/2,0,hash(i*19)*Math.PI],
          s:[1.0+hash(i*23)*3.8,.55+hash(i*29)*2.2,1]
        });
      }else{
        const vertical=i%2===0,side=i%4<2?-1:1,lane=side*(188+hash(i+31)*4),along=(hash(i*37)-.5)*360;
        records.push({
          p:[vertical?lane:along,GROUND+.145,vertical?along:lane],
          r:[-Math.PI/2,0,hash(i*43)*Math.PI],
          s:[1.2+hash(i*47)*4.8,.65+hash(i*49)*2.8,1]
        });
      }
    }
    const g=new THREE.CircleGeometry(1,28);
    this.wetPatches=instanced(this.group,'v7.0 irregular wet reflective patches',g,this.wetMaterial,records);
  }

  makeFacadeStreaks(){
    this.facadeMeshes=[];
    const slots=(this.world.distantCityPlan||[]).filter(s=>s.tier==='near').slice(0,this.mobile?8:16);
    for(let i=0;i<slots.length;i++){
      const s=slots[i],host=this.world.cityBuildings?.get(s.id);if(!host)continue;
      const w=s.width||11,d=w*.82,h=s.height||30;
      const g=new THREE.Group();g.name='v7.0 facade rain runoff · '+s.id;
      const count=this.mobile?2:4;
      for(let k=0;k<count;k++){
        const x=(hash(i*31+k*7)-.5)*w*.66,y=h*(.28+hash(i*37+k*11)*.40);
        const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.18+hash(k+i)*.42,2.0+hash(k+i+8)*5.0),this.streakMaterial);
        mesh.position.set(x,y,d*.505+.035);mesh.name='v7.0 thin vertical wet facade streak';mesh.receiveShadow=false;g.add(mesh);
      }
      host.add(g);this.facadeMeshes.push(g);
    }
  }

  makeRoofRunoff(){
    this.runoff=[];
    const specs=[
      {p:[-22.85,this.world.ROOF_Y-3.35,-7],r:[0,Math.PI/2,0],s:[1.0,6.6,1]},
      {p:[22.85,this.world.ROOF_Y-2.85,8],r:[0,-Math.PI/2,0],s:[1.0,5.6,1]},
      {p:[8,this.world.ROOF_Y-3.55,-22.85],r:[0,0,0],s:[1.0,7.0,1]},
      {p:[-9,this.world.ROOF_Y-3.05,22.85],r:[0,Math.PI,0],s:[1.0,6.0,1]}
    ];
    for(const spec of specs.slice(0,this.mobile?2:4)){
      const m=new THREE.Mesh(new THREE.PlaneGeometry(.55,1),this.runoffMaterial);
      m.position.set(...spec.p);m.rotation.set(...spec.r);m.scale.set(...spec.s);
      m.name='v7.0 roof-edge runoff ribbon';m.renderOrder=13;this.group.add(m);this.runoff.push(m);
    }
  }

  update(dt,weather={},night=0,flash=0){
    this.time+=Math.min(.10,Math.max(0,Number(dt)||0));
    const wet=clamp01(weather.wet),rain=clamp01(weather.rain),storm=clamp01(weather.storm),f=clamp01(flash),n=clamp01(night);
    this.wetMaterial.opacity=wet*(.14+n*.08+f*.08);
    this.wetMaterial.roughness=.20-wet*.10;
    this.wetMaterial.envMapIntensity=1.05+wet*.48+f*.55;
    this.puddleDetail.update(dt,rain,wet);
    this.wetPatches.visible=wet>.001;
    this.streakMaterial.opacity=wet*(.055+rain*.10+storm*.035);
    this.streakMaterial.roughness=.18-wet*.08;
    const u=this.runoffMaterial.uniforms;
    u.uTime.value=this.time;u.uWet.value=rain*wet*(.55+storm*.30);u.uFlash.value=f;
    const su=this.splashes.material.uniforms;
    su.uTime.value=this.time;su.uRain.value=rain;su.uWet.value=wet;su.uFlash.value=f;
    this.splashes.visible=rain>.025&&wet>.04;
  }

  dispose(){
    this.puddleDetail.dispose();
    this.group.parent?.remove(this.group);
    this.wetPatches?.geometry?.dispose?.();
    for(const g of this.facadeMeshes){
      g.traverse(o=>{if(o.isMesh)o.geometry?.dispose?.();});
      g.parent?.remove(g);
    }
    this.splashes?.parent?.remove(this.splashes);this.splashes?.geometry?.dispose?.();
    for(const m of this.materials)m?.dispose?.();
  }
}
