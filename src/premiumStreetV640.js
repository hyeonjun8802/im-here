import * as THREE from 'three';
import {CITY_COMPOSITION} from './cityComposition.js';

/**
 * AFTERDAY v6.4 — premium street-level apocalypse pass.
 *
 * Adds authored 3D destruction language to the existing city ground layer without
 * changing city lots, navigation, survival state, weather simulation or saves.
 * The goal is to remove the "flat background plane + boxes" look between the hero
 * rooftop and the ruined skyline by giving roads, vehicles and civic hardware
 * believable mass, contact, wear and material response.
 */
const GROUND=CITY_COMPOSITION.groundY;
const TAU=Math.PI*2;
const hash=n=>{const x=Math.sin(n*131.17+29.31)*43758.5453123;return x-Math.floor(x);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function pbr(color,roughness=.8,metalness=0,extra={}){
  return new THREE.MeshPhysicalMaterial({
    color,roughness,metalness,
    envMapIntensity:extra.envMapIntensity??.7,
    clearcoat:extra.clearcoat??0,
    clearcoatRoughness:extra.clearcoatRoughness??.55,
    transparent:extra.transparent??false,
    opacity:extra.opacity??1,
    depthWrite:extra.depthWrite??true
  });
}

const makeMaterials=()=>({
  asphalt:pbr('#2b302f',.98,.01,{envMapIntensity:.24}),
  asphaltWet:pbr('#343b3a',.78,.03,{envMapIntensity:.64,clearcoat:.10,clearcoatRoughness:.48}),
  curb:pbr('#686b66',.94,.01,{envMapIntensity:.36}),
  concrete:pbr('#5f625d',.96,.01,{envMapIntensity:.34}),
  steel:pbr('#626866',.56,.61,{envMapIntensity:1.03,clearcoat:.04,clearcoatRoughness:.42}),
  rust:pbr('#6b4b3e',.76,.42,{envMapIntensity:.72}),
  rubber:pbr('#171b1b',.92,.02,{envMapIntensity:.18}),
  carPaint:pbr('#545d5a',.60,.38,{envMapIntensity:1.05,clearcoat:.16,clearcoatRoughness:.40}),
  carPaint2:pbr('#665148',.66,.32,{envMapIntensity:.92,clearcoat:.10,clearcoatRoughness:.46}),
  glass:pbr('#243a43',.18,.10,{envMapIntensity:1.16,transparent:true,opacity:.56,depthWrite:false}),
  sign:pbr('#6d6c5c',.72,.28,{envMapIntensity:.82}),
  dark:new THREE.MeshStandardMaterial({color:'#151a19',roughness:1,metalness:.02}),
  lamp:new THREE.MeshStandardMaterial({color:'#e7c79a',emissive:'#e0a04e',emissiveIntensity:.12,roughness:.45}),
  dust:new THREE.MeshStandardMaterial({color:'#615d56',transparent:true,opacity:.16,roughness:1,depthWrite:false})
});

function addInstanced(parent,name,geometry,material,records,{cast=false,receive=true}={}){
  const mesh=new THREE.InstancedMesh(geometry,material,records.length);
  mesh.name=name;
  const d=new THREE.Object3D();
  for(let i=0;i<records.length;i++){
    const r=records[i];
    d.position.set(...r.p);
    d.rotation.set(...(r.r||[0,0,0]));
    d.scale.set(...(r.s||[1,1,1]));
    d.updateMatrix();
    mesh.setMatrixAt(i,d.matrix);
    if(r.c)mesh.setColorAt(i,r.c);
  }
  mesh.instanceMatrix.needsUpdate=true;
  if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  mesh.castShadow=cast;mesh.receiveShadow=receive;
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

function roadCrackGeometry(){
  const shape=new THREE.Shape();
  shape.moveTo(-.48,-.16);shape.lineTo(-.10,-.06);shape.lineTo(.02,-.24);
  shape.lineTo(.14,-.03);shape.lineTo(.48,.10);shape.lineTo(.18,.15);
  shape.lineTo(.05,.34);shape.lineTo(-.06,.09);shape.lineTo(-.42,.04);
  shape.closePath();
  const g=new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI/2);
  return g;
}

function buildWreckRecords(mobile){
  const cars=mobile?18:32;
  const bodies=[],cabins=[],glass=[],wheels=[],axles=[],doors=[];
  for(let i=0;i<cars;i++){
    const vertical=i%2===0;
    const side=i%4<2?-1:1;
    const lane=side*(183+hash(i+7)*12);
    const along=(hash(i*37+3)-.5)*285;
    const x=vertical?lane:along,z=vertical?along:lane;
    const rot=(vertical?0:Math.PI/2)+(hash(i+31)-.5)*.22;
    const sink=(hash(i+71)>.82)?.18:0;
    const pitch=(hash(i+81)-.5)*.09,roll=(hash(i+91)-.5)*.12;
    bodies.push({p:[x,GROUND+.43-sink,z],r:[pitch,rot,roll],s:[1.76,.52,3.58],c:new THREE.Color(i%3?'#525a57':'#685148')});
    cabins.push({p:[x,GROUND+.89-sink,z],r:[pitch,rot,roll],s:[1.48,.50,1.72],c:new THREE.Color(i%3?'#404947':'#51413b')});
    glass.push({p:[x,GROUND+.98-sink,z+(vertical?0:0)],r:[pitch,rot,roll],s:[1.22,.35,1.42]});
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const lx=sx*.78,lz=sz*1.18;
      const c=Math.cos(rot),s=Math.sin(rot);
      const wx=x+lx*c+lz*s,wz=z-lx*s+lz*c;
      wheels.push({p:[wx,GROUND+.29-sink,wz],r:[Math.PI/2,rot,0],s:[.33,.16,.33]});
    }
    if(hash(i+123)>.48){
      const sideSign=hash(i+125)>.5?1:-1;
      const c=Math.cos(rot),s=Math.sin(rot);
      const dx=sideSign*.92*c,dz=-sideSign*.92*s;
      doors.push({p:[x+dx,GROUND+.70-sink,z+dz],r:[pitch,rot+sideSign*(.45+.35*hash(i+129)),roll],s:[.08,.78,1.22]});
    }
    if(hash(i+141)>.64){
      axles.push({p:[x,GROUND+.19-sink,z],r:[0,rot,Math.PI/2],s:[.08,1.50,.08]});
    }
  }
  return {bodies,cabins,glass,wheels,axles,doors};
}

export class PremiumStreetV640{
  constructor(world){
    this.world=world;this.time=0;
    this.group=new THREE.Group();this.group.name='AFTERDAY v6.4 premium street-level apocalypse';
    world.scene.add(this.group);
    this.materials=makeMaterials();this.meshes=[];this.lights=[];

    this.makeRoadSurface();
    this.makeCurbsAndDrainage();
    this.makeWreckedVehicles();
    this.makeCivicHardware();
    this.makeRubbleAndContact();
    this.makeAtmosphere();

    this.stats={
      drawMeshes:this.meshes.length,
      practicalLights:this.lights.length,
      preservesGameplay:true
    };
  }

  makeRoadSurface(){
    const roadPlates=[],patches=[],cracks=[],markings=[];
    const mobile=this.world.isMobile;
    // Four broad street corridors already exist in the scene at +/-190.
    for(const axis of ['x','z']){
      for(const side of [-1,1]){
        const center=side*190;
        const count=mobile?14:24;
        for(let i=0;i<count;i++){
          const along=-300+i*(600/(count-1));
          const n=i+(axis==='x'?100:0)+(side>0?200:0);
          const p=axis==='x'?[center,GROUND+.055,along]:[along,GROUND+.055,center];
          roadPlates.push({p,s:[12.6,.10,22.5],r:[0,axis==='x'?0:Math.PI/2,(hash(n)-.5)*.006]});
          if(hash(n+13)>.42){
            patches.push({p:[p[0]+(hash(n+21)-.5)*6,GROUND+.112,p[2]+(hash(n+25)-.5)*10],
              s:[2.2+hash(n+31)*4,.035,3.0+hash(n+35)*6],r:[0,hash(n+41)*TAU,0]});
          }
          if(hash(n+51)>.24){
            cracks.push({p:[p[0]+(hash(n+53)-.5)*7,GROUND+.119,p[2]+(hash(n+59)-.5)*10],
              s:[1.7+hash(n+61)*2,1,1.6+hash(n+67)*2],r:[0,hash(n+71)*TAU,0]});
          }
          if(i%3===0&&hash(n+73)>.35){
            const lp=axis==='x'?[center+(side>0?-2.2:2.2),GROUND+.125,along]:
              [along,GROUND+.125,center+(side>0?-2.2:2.2)];
            markings.push({p:lp,s:[.18,.02,3.8],r:[0,axis==='x'?0:Math.PI/2,0]});
          }
        }
      }
    }
    this.meshes.push(addInstanced(this.group,'v6.4 fractured asphalt road plates',new THREE.BoxGeometry(1,1,1),this.materials.asphalt,roadPlates));
    this.meshes.push(addInstanced(this.group,'v6.4 resurfaced and impact patches',new THREE.BoxGeometry(1,1,1),this.materials.asphaltWet,patches));
    this.meshes.push(addInstanced(this.group,'v6.4 true road crack silhouettes',roadCrackGeometry(),this.materials.dark,cracks,{receive:false}));
    this.meshes.push(addInstanced(this.group,'v6.4 faded lane markings',new THREE.BoxGeometry(1,1,1),this.materials.sign,markings,{receive:false}));
  }

  makeCurbsAndDrainage(){
    const curbs=[],drains=[],covers=[];
    const mobile=this.world.isMobile;
    for(const axis of ['x','z']){
      for(const side of [-1,1]){
        const road=side*190;
        const segments=mobile?18:30;
        for(let i=0;i<segments;i++){
          const along=-302+i*(604/(segments-1));
          const n=i+(axis==='x'?300:0)+(side>0?100:0);
          for(const edge of [-1,1]){
            if(hash(n+edge*11)>.88)continue;
            const offset=edge*7.25;
            const p=axis==='x'?[road+offset,GROUND+.26,along]:[along,GROUND+.26,road+offset];
            curbs.push({p,s:[.48,.42,8.5],r:[0,axis==='x'?0:Math.PI/2,(hash(n+7)-.5)*.025]});
          }
          if(i%4===1){
            const p=axis==='x'?[road+5.8,GROUND+.10,along]:[along,GROUND+.10,road+5.8];
            drains.push({p,s:[.76,.05,1.55],r:[0,axis==='x'?0:Math.PI/2,0]});
          }
          if(i%7===3){
            const p=axis==='x'?[road,GROUND+.115,along]:[along,GROUND+.115,road];
            covers.push({p,r:[0,0,0],s:[.68,.055,.68]});
          }
        }
      }
    }
    this.meshes.push(addInstanced(this.group,'v6.4 chipped curb stones',new THREE.BoxGeometry(1,1,1),this.materials.curb,curbs));
    this.meshes.push(addInstanced(this.group,'v6.4 storm drains',new THREE.BoxGeometry(1,1,1),this.materials.steel,drains));
    this.meshes.push(addInstanced(this.group,'v6.4 manhole covers',new THREE.CylinderGeometry(1,1,1,20),this.materials.steel,covers));
  }

  makeWreckedVehicles(){
    const r=buildWreckRecords(this.world.isMobile);
    const bodyMat=this.materials.carPaint.clone();bodyMat.vertexColors=true;
    const cabinMat=this.materials.carPaint2.clone();cabinMat.vertexColors=true;
    this.materials.bodyMat=bodyMat;this.materials.cabinMat=cabinMat;
    this.meshes.push(addInstanced(this.group,'v6.4 wrecked vehicle bodies',new THREE.BoxGeometry(1,1,1),bodyMat,r.bodies,{cast:!this.world.isMobile}));
    this.meshes.push(addInstanced(this.group,'v6.4 crushed vehicle cabins',new THREE.BoxGeometry(1,1,1),cabinMat,r.cabins,{cast:!this.world.isMobile}));
    this.meshes.push(addInstanced(this.group,'v6.4 surviving vehicle glass',new THREE.BoxGeometry(1,1,1),this.materials.glass,r.glass,{receive:false}));
    this.meshes.push(addInstanced(this.group,'v6.4 damaged rubber wheels',new THREE.CylinderGeometry(1,1,1,14),this.materials.rubber,r.wheels));
    this.meshes.push(addInstanced(this.group,'v6.4 exposed axles',new THREE.CylinderGeometry(1,1,1,8),this.materials.steel,r.axles));
    this.meshes.push(addInstanced(this.group,'v6.4 torn vehicle doors',new THREE.BoxGeometry(1,1,1),this.materials.rust,r.doors,{cast:!this.world.isMobile}));
  }

  makeCivicHardware(){
    const poles=[],arms=[],heads=[],barriers=[],signPosts=[],signFaces=[];
    const mobile=this.world.isMobile;
    const count=mobile?18:30;
    for(let i=0;i<count;i++){
      const vertical=i%2===0,side=i%4<2?-1:1;
      const road=side*190,along=-285+hash(i*17+4)*570;
      const x=vertical?road+(side>0?10:-10):along;
      const z=vertical?along:road+(side>0?10:-10);
      const lean=(hash(i+9)-.5)*.22;
      poles.push({p:[x,GROUND+3.7,z],r:[lean,0,(hash(i+11)-.5)*.16],s:[.11,7.4,.11]});
      arms.push({p:[x+(vertical?0:1.0),GROUND+7.2,z+(vertical?1.0:0)],r:[0,vertical?0:Math.PI/2,Math.PI/2],s:[.08,2.0,.08]});
      heads.push({p:[x+(vertical?0:1.9),GROUND+7.2,z+(vertical?1.9:0)],r:[0,vertical?0:Math.PI/2,0],s:[.38,.16,.72]});
      if(hash(i+21)>.55){
        const bx=vertical?road+(side>0?-3:3):along,bz=vertical?along:road+(side>0?-3:3);
        barriers.push({p:[bx,GROUND+.48,bz],r:[0,(vertical?0:Math.PI/2)+(hash(i+23)-.5)*.18,0],s:[2.4,.82,.46]});
      }
      if(i%3===0){
        const sx=x+(vertical?2.3:0),sz=z+(vertical?0:2.3);
        signPosts.push({p:[sx,GROUND+1.65,sz],s:[.09,3.3,.09],r:[0,0,(hash(i+31)-.5)*.12]});
        signFaces.push({p:[sx,GROUND+2.75,sz],s:[1.45,.62,.06],r:[0,vertical?0:Math.PI/2,(hash(i+33)-.5)*.12]});
      }
    }
    this.meshes.push(addInstanced(this.group,'v6.4 bent streetlight poles',new THREE.CylinderGeometry(1,1,1,9),this.materials.steel,poles,{cast:!mobile}));
    this.meshes.push(addInstanced(this.group,'v6.4 streetlight arms',new THREE.CylinderGeometry(1,1,1,8),this.materials.steel,arms));
    this.meshes.push(addInstanced(this.group,'v6.4 broken streetlight heads',new THREE.BoxGeometry(1,1,1),this.materials.dark,heads));
    this.meshes.push(addInstanced(this.group,'v6.4 concrete barricades',new THREE.BoxGeometry(1,1,1),this.materials.concrete,barriers,{cast:!mobile}));
    this.meshes.push(addInstanced(this.group,'v6.4 damaged sign posts',new THREE.CylinderGeometry(1,1,1,8),this.materials.rust,signPosts));
    this.meshes.push(addInstanced(this.group,'v6.4 faded directional signs',new THREE.BoxGeometry(1,1,1),this.materials.sign,signFaces));
  }

  makeRubbleAndContact(){
    const rubble=[],beams=[],paper=[];
    const mobile=this.world.isMobile;
    const count=mobile?180:340;
    for(let i=0;i<count;i++){
      const a=hash(i*19+5)*TAU;
      const r=125+hash(i*7+9)*145;
      const x=Math.sin(a)*r,z=Math.cos(a)*r;
      const nearRoad=Math.min(Math.abs(Math.abs(x)-190),Math.abs(Math.abs(z)-190))<20;
      if(!nearRoad&&hash(i+20)>.30)continue;
      rubble.push({p:[x,GROUND+.17+hash(i)*.42,z],
        r:[hash(i+4)*TAU,hash(i+7)*TAU,hash(i+9)*TAU],
        s:[.18+hash(i+11)*1.0,.12+hash(i+13)*.48,.18+hash(i+17)*.82],
        c:new THREE.Color(i%5?'#555953':'#704f42')});
      if(i%11===0){
        beams.push({p:[x,GROUND+.34,z],r:[(hash(i+4)-.5)*.4,hash(i+7)*TAU,(hash(i+9)-.5)*.5],s:[.13,1.4+hash(i+3)*2.8,.13]});
      }
      if(!mobile&&i%17===0){
        paper.push({p:[x,GROUND+.14,z],r:[0,hash(i+40)*TAU,0],s:[.45,.012,.32]});
      }
    }
    const rubbleMat=this.materials.concrete.clone();rubbleMat.vertexColors=true;this.materials.rubbleMat=rubbleMat;
    this.meshes.push(addInstanced(this.group,'v6.4 mixed concrete and brick rubble',new THREE.TetrahedronGeometry(1,0),rubbleMat,rubble));
    this.meshes.push(addInstanced(this.group,'v6.4 fallen structural beams',new THREE.CylinderGeometry(1,1,1,6),this.materials.rust,beams));
    this.meshes.push(addInstanced(this.group,'v6.4 flattened paper and cloth debris',new THREE.BoxGeometry(1,1,1),this.materials.dark,paper,{receive:false}));
  }

  makeAtmosphere(){
    const count=this.world.isMobile?40:72;
    const positions=new Float32Array(count*3);
    const seed=new Float32Array(count);
    for(let i=0;i<count;i++){
      const a=hash(i+2)*TAU,r=150+hash(i+5)*100;
      positions[i*3]=Math.sin(a)*r;
      positions[i*3+1]=GROUND+1.2+hash(i+7)*5.0;
      positions[i*3+2]=Math.cos(a)*r;
      seed[i]=hash(i*13+8);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
    const mat=this.materials.dust;
    const points=new THREE.Points(geo,mat);points.name='v6.4 low street dust and suspended debris';
    points.frustumCulled=false;this.group.add(points);
    this.dust=points;this.dustPos=positions;this.dustSeed=seed;
  }

  update(dt,weather={},night=0){
    this.time+=Math.min(.08,Math.max(0,dt||0));
    const wet=clamp(Number(weather.wet)||0,0,1),storm=clamp(Number(weather.storm)||0,0,1),wind=Number(weather.wind)||0;
    this.materials.asphaltWet.clearcoat=.05+wet*.30;
    this.materials.asphaltWet.roughness=.82-wet*.20;
    this.materials.glass.opacity=.50+wet*.12;
    this.materials.lamp.emissiveIntensity=.08+clamp(Number(night)||0,0,1)*.35;
    if(this.dust){
      this.dust.material.opacity=.05+storm*.15+(1-wet)*.05;
      for(let i=0;i<this.dustSeed.length;i++){
        const j=i*3,phase=(this.time*.025*(1+.7*this.dustSeed[i])+this.dustSeed[i])%1;
        this.dustPos[j]+=dt*(.08+Math.abs(wind)*.20);
        this.dustPos[j+1]=GROUND+1.0+phase*5.5;
        if(this.dustPos[j]>310)this.dustPos[j]=-310;
      }
      this.dust.geometry.attributes.position.needsUpdate=true;
    }
  }

  dispose(){
    this.group.parent?.remove(this.group);
    for(const mesh of this.meshes)mesh.geometry?.dispose?.();
    this.dust?.geometry?.dispose?.();
    const unique=new Set(Object.values(this.materials));
    for(const m of unique)m?.dispose?.();
  }
}
