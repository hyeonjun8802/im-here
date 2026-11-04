import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CITY_COMPOSITION} from './cityComposition.js';

/**
 * AFTERDAY v6.6 — autonomous background-building partial collapse.
 *
 * Background ruins can now fail on their own over time. The effect is visual-only
 * for the survivor economy, but the chosen building IDs and next collapse time are
 * persisted in the existing save object so collapsed silhouettes never restore.
 *
 * The system deliberately targets background city holders (mid/far first), never
 * the playable roof. Existing tornado destruction remains independent and stronger.
 */
const GROUND=CITY_COMPOSITION.groundY;
const hash=n=>{const x=Math.sin(n*173.17+37.91)*43758.5453123;return x-Math.floor(x);};
const TAU=Math.PI*2;
const MAX_AMBIENT_COLLAPSES=18;

const makeMaterials=()=>({
  concrete:new THREE.MeshPhysicalMaterial({
    color:'#5f6460',roughness:.96,metalness:.01,envMapIntensity:.42
  }),
  concreteDark:new THREE.MeshPhysicalMaterial({
    color:'#3f4543',roughness:.99,metalness:.01,envMapIntensity:.28
  }),
  steel:new THREE.MeshPhysicalMaterial({
    color:'#626a68',roughness:.58,metalness:.62,envMapIntensity:1.02,
    clearcoat:.04,clearcoatRoughness:.44
  }),
  rust:new THREE.MeshPhysicalMaterial({
    color:'#6c4d41',roughness:.78,metalness:.40,envMapIntensity:.66
  }),
  interior:new THREE.MeshStandardMaterial({
    color:'#111716',roughness:1,metalness:0
  }),
  dust:new THREE.PointsMaterial({
    color:'#77736c',size:3.1,sizeAttenuation:true,transparent:true,
    opacity:.0,depthWrite:false,depthTest:true,fog:true
  })
});

function box(parent,size,pos,material,rot=[0,0,0],name=''){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
  mesh.position.set(...pos);mesh.rotation.set(...rot);mesh.name=name;
  mesh.castShadow=false;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function rod(parent,a,b,r,material,name=''){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),7),material);
  mesh.position.copy(A).add(B).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function mergeStaticRoot(root,label='v6.6 merged static ruin'){
  const buckets=new Map();
  for(const child of [...root.children]){
    if(!child.isMesh||!child.geometry||!child.material)continue;
    child.updateMatrix();
    const g=child.geometry.clone();
    g.applyMatrix4(child.matrix);
    const key=child.material.uuid;
    if(!buckets.has(key))buckets.set(key,{material:child.material,geometries:[]});
    buckets.get(key).geometries.push(g);
    root.remove(child);
    child.geometry.dispose();
  }
  let layer=0;
  for(const {material,geometries} of buckets.values()){
    if(!geometries.length)continue;
    const merged=mergeGeometries(geometries,false);
    for(const g of geometries)g.dispose();
    if(!merged)continue;
    merged.computeBoundingBox();merged.computeBoundingSphere();
    const mesh=new THREE.Mesh(merged,material);
    mesh.name=label+' '+(++layer);mesh.castShadow=false;mesh.receiveShadow=true;
    root.add(mesh);
  }
  return root;
}
function makeDust(mobile,material,slot){
  const n=mobile?42:88;
  const p=new Float32Array(n*3);
  const velocity=new Float32Array(n*3);
  const phase=new Float32Array(n);
  const w=slot.width||12,d=w*.82;
  for(let i=0;i<n;i++){
    const a=hash(i*31+slot.x*.3+slot.z*.7)*TAU;
    const r=.5+hash(i*17+11)*Math.max(w,d)*.62;
    p[i*3]=Math.cos(a)*r;
    p[i*3+1]=1+hash(i*13+5)*(slot.height*.55);
    p[i*3+2]=Math.sin(a)*r;
    velocity[i*3]=Math.cos(a)*(.6+hash(i+4)*2.1)+(hash(i+7)-.5)*.6;
    velocity[i*3+1]=.5+hash(i+9)*2.0;
    velocity[i*3+2]=Math.sin(a)*(.6+hash(i+12)*2.1)+(hash(i+15)-.5)*.6;
    phase[i]=hash(i+19);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(p,3).setUsage(THREE.DynamicDrawUsage));
  g.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,slot.height*.3,0),slot.height);
  const points=new THREE.Points(g,material.clone());
  points.name='v6.6 autonomous collapse dust plume';
  points.frustumCulled=false;points.renderOrder=8;
  points.userData={velocity,phase,life:0};
  return points;
}

function buildCollapsedReplacement(slot,materials,mobile){
  const root=new THREE.Group();root.name='v6.6 persistent partial-collapse replacement';
  const w=slot.width||12,d=w*.82,h=slot.height||35,seed=(slot.modelIndex||0)*97+w*11+h*3;
  const low=h*(.52+hash(seed+1)*.10);
  const leftHigh=h*(.69+hash(seed+3)*.14);
  const rightHigh=h*(.62+hash(seed+5)*.17);
  const gap=w*(.16+hash(seed+7)*.09);
  const sideW=(w-gap)*.5;

  // Lower stump and two uneven surviving shafts create a genuinely changed skyline.
  box(root,[w,low,d],[0,low*.5,0],materials.concrete,[0,0,0],'v6.6 lower structural stump');
  box(root,[sideW,leftHigh-low,d*.92],[-(gap+sideW)*.5,low+(leftHigh-low)*.5,0],
      materials.concrete,[0,0,(hash(seed+9)-.5)*.025],'v6.6 left surviving shaft');
  box(root,[sideW*.78,rightHigh-low,d*.88],[(gap+sideW)*.46,low+(rightHigh-low)*.5,-d*.04],
      materials.concreteDark,[0,0,(hash(seed+11)-.5)*.035],'v6.6 right surviving shaft');

  // Deep vertical cavity where the central bays failed.
  box(root,[gap*.90,Math.max(3,Math.min(leftHigh,rightHigh)-low),d*.94],
      [0,low+Math.max(3,Math.min(leftHigh,rightHigh)-low)*.5,d*.04],
      materials.interior,[0,0,0],'v6.6 open vertical structural cavity');

  const slabCount=mobile?3:5;
  const cavityTop=Math.min(leftHigh,rightHigh);
  for(let i=0;i<slabCount;i++){
    const y=low+(i+1)*(Math.max(2,cavityTop-low)/(slabCount+1));
    const span=gap*(.72+hash(seed+20+i)*.23);
    const slab=box(root,[span,.22,d*(.72+hash(seed+30+i)*.12)],
      [(hash(seed+40+i)-.5)*gap*.16,y,(hash(seed+50+i)-.5)*d*.10],
      materials.concrete,[0,0,(hash(seed+60+i)-.5)*.09],'v6.6 exposed broken floor slab');
    slab.castShadow=!mobile&&i<2;
  }

  // Rebar and snapped steel frames protrude into the cavity.
  const rods=mobile?7:13;
  for(let i=0;i<rods;i++){
    const x=(hash(seed+100+i)-.5)*gap*.80;
    const y=low+hash(seed+120+i)*Math.max(2,cavityTop-low);
    const z=d*.40;
    const len=.7+hash(seed+140+i)*1.8;
    rod(root,[x,y,z],[x+(hash(seed+160+i)-.5)*.35,y-len*.4,z+len],
      .045+hash(seed+180+i)*.025,i%3?materials.steel:materials.rust,'v6.6 exposed rebar');
  }

  // Jagged top chunks and roof equipment remain on the uneven silhouette.
  const topChunks=mobile?5:9;
  for(let i=0;i<topChunks;i++){
    const side=i%2?-1:1;
    const baseY=side<0?leftHigh:rightHigh;
    const x=side*(gap*.5+hash(seed+210+i)*sideW*.65);
    const z=(hash(seed+220+i)-.5)*d*.70;
    const chunk=box(root,[.45+hash(seed+230+i)*1.35,.25+hash(seed+240+i)*.85,.45+hash(seed+250+i)*1.25],
      [x,baseY+.15+hash(seed+260+i)*.45,z],i%4?materials.concrete:materials.rust,
      [(hash(seed+270+i)-.5)*.4,hash(seed+280+i)*TAU,(hash(seed+290+i)-.5)*.35],
      'v6.6 jagged roof remnant');
    chunk.castShadow=!mobile&&i<4;
  }

  // Permanent rubble mound around the footprint.
  const rubble=mobile?26:54;
  for(let i=0;i<rubble;i++){
    const a=hash(seed+310+i*3)*TAU,rr=(.35+hash(seed+320+i*5)*.65)*Math.max(w,d)*.62;
    const rw=.18+hash(seed+330+i)*1.10,rh=.12+hash(seed+340+i)*.48,rd=.22+hash(seed+350+i)*1.15;
    const m=box(root,[rw,rh,rd],[Math.cos(a)*rr,rh*.5,Math.sin(a)*rr],
      i%6?materials.concreteDark:materials.rust,
      [hash(seed+360+i)*TAU,hash(seed+370+i)*TAU,hash(seed+380+i)*TAU],
      'v6.6 permanent rubble');
    m.receiveShadow=true;
  }

  mergeStaticRoot(root,'v6.6 merged permanent collapse layer');
  root.userData={persistent:true,slotId:slot.id,collapsedTop:Math.max(leftHigh,rightHigh),originalHeight:h};
  return root;
}

function makeFallingFragments(slot,materials,mobile){
  const g=new THREE.Group();g.name='v6.6 falling structural fragments';
  const count=mobile?7:13,w=slot.width||12,d=w*.82,h=slot.height||35,seed=h*13+w*17;
  g.userData.fragments=[];
  for(let i=0;i<count;i++){
    const sx=.5+hash(seed+i*5)*1.7,sy=.35+hash(seed+i*7)*1.2,sz=.45+hash(seed+i*11)*1.55;
    const mesh=box(g,[sx,sy,sz],[
      (hash(seed+i*13)-.5)*w*.68,
      h*(.58+hash(seed+i*17)*.34),
      (hash(seed+i*19)-.5)*d*.70
    ],i%4?materials.concrete:materials.rust,
    [hash(i+3)*TAU,hash(i+7)*TAU,hash(i+9)*TAU],
    'v6.6 falling facade chunk');
    const vx=(hash(seed+i*23)-.5)*3.6,vz=(hash(seed+i*29)-.5)*3.6,vy=-1.2-hash(seed+i*31)*4.3;
    g.userData.fragments.push({mesh,v:new THREE.Vector3(vx,vy,vz),spin:new THREE.Vector3(
      (hash(i+40)-.5)*2.4,(hash(i+50)-.5)*2.4,(hash(i+60)-.5)*2.4
    ),settled:false});
  }
  return g;
}

export class AmbientCityCollapseV660{
  constructor(world){
    this.world=world;this.mobile=Boolean(world.isMobile);this.materials=makeMaterials();
    this.active=[];this.applied=new Set();this.roots=[];this.lastGame=null;
  }

  ensureState(game,now){
    if(!Array.isArray(game.ambientCollapseIds))game.ambientCollapseIds=[];
    if(!Number.isFinite(Number(game.ambientCollapseSerial)))game.ambientCollapseSerial=0;
    if(!Number.isFinite(Number(game.nextAmbientCollapseAt))||game.nextAmbientCollapseAt<=0){
      game.nextAmbientCollapseAt=now+18*60000;
      this.world.onAmbientCollapseStateChange?.();
    }
  }

  applyPersisted(game){
    const ids=game.ambientCollapseIds||[];
    for(const id of ids){
      if(this.applied.has(id))continue;
      const slot=this.world.distantCityPlan?.find(s=>s.id===id);
      const host=this.world.cityBuildings?.get(id);
      if(slot&&host)this.begin(slot,host,true);
    }
  }

  chooseTarget(game){
    const blocked=new Set([...(game.ambientCollapseIds||[]),...(game.tornadoDamagedIds||[])]);
    const plan=(this.world.distantCityPlan||[]).filter(s=>!blocked.has(s.id));
    if(!plan.length)return null;
    // Mid/far buildings are preferred so the playable roof remains visually stable.
    const preferred=plan.filter(s=>s.tier==='mid'||s.tier==='far');
    const candidates=preferred.length?preferred:plan;
    const serial=Number(game.ambientCollapseSerial)||0;
    const seed=serial*7919+(Number(game.startedAt)||1)*.000001;
    candidates.sort((a,b)=>{
      const sa=hash(seed+a.x*.019+a.z*.031+(a.modelIndex||0)*3.1);
      const sb=hash(seed+b.x*.019+b.z*.031+(b.modelIndex||0)*3.1);
      return sb-sa;
    });
    return candidates[0]||null;
  }

  begin(slot,host,immediate=false){
    if(this.applied.has(slot.id))return;
    this.applied.add(slot.id);

    // Keep the host transform and city lot. Only replace its visual children.
    const previous=[...host.children];

    const replacement=buildCollapsedReplacement(slot,this.materials,this.mobile);
    host.add(replacement);this.roots.push(replacement);

    if(immediate){
      for(const child of previous)child.visible=false;
      replacement.userData.final=true;
      return;
    }

    // Stage 1: keep the intact ruin visible for a brief structural-warning beat.
    // Dust begins leaking before the facade finally gives way.
    replacement.visible=false;
    const falling=makeFallingFragments(slot,this.materials,this.mobile);
    falling.visible=false;host.add(falling);
    const dust=makeDust(this.mobile,this.materials.dust,slot);
    host.add(dust);dust.material.opacity=.065;

    replacement.scale.y=.985;replacement.position.y=.08;
    this.active.push({
      id:slot.id,slot,host,replacement,falling,dust,elapsed:0,
      previous,switched:false
    });
  }

  trigger(game,now){
    if((game.ambientCollapseIds||[]).length>=MAX_AMBIENT_COLLAPSES)return false;
    if(game.survivalStatus==='dead'||game.tornadoEncounterActive||game.weather==='tornado'){
      game.nextAmbientCollapseAt=now+12*60000;
      this.world.onAmbientCollapseStateChange?.();
      return false;
    }
    const slot=this.chooseTarget(game);
    if(!slot)return false;
    const host=this.world.cityBuildings?.get(slot.id);
    if(!host)return false;

    game.ambientCollapseIds=[...new Set([...(game.ambientCollapseIds||[]),slot.id])].slice(0,MAX_AMBIENT_COLLAPSES);
    game.ambientCollapseSerial=(Number(game.ambientCollapseSerial)||0)+1;
    // 32–76 in-game minutes => occasional but visible at the accelerated clock.
    const gap=32+Math.floor(hash(game.ambientCollapseSerial*17+slot.x*.03+slot.z*.05)*45);
    game.nextAmbientCollapseAt=now+gap*60000;
    this.begin(slot,host,false);
    this.world.onAmbientCollapse?.(slot.id,game.ambientCollapseSerial);
    this.world.onAmbientCollapseStateChange?.();
    return true;
  }

  updateActive(dt,weather={}){
    const storm=clamp01(weather.storm),wind=clamp01(weather.wind);
    for(let i=this.active.length-1;i>=0;i--){
      const c=this.active[i];c.elapsed+=dt;
      const t=c.elapsed;

      // Three-stage failure: dust precursor -> structural break -> settling.
      if(!c.switched&&t>=.58){
        for(const child of c.previous)child.visible=false;
        c.replacement.visible=true;c.falling.visible=true;c.switched=true;
      }
      if(c.switched){
        c.replacement.scale.y=THREE.MathUtils.damp(c.replacement.scale.y,1,3.8,dt);
        c.replacement.position.y=THREE.MathUtils.damp(c.replacement.position.y,0,4.2,dt);
      }

      for(const f of c.falling.userData.fragments){
        if(f.settled)continue;
        f.v.y-=9.5*dt;
        f.mesh.position.addScaledVector(f.v,dt);
        f.mesh.rotation.x+=f.spin.x*dt;f.mesh.rotation.y+=f.spin.y*dt;f.mesh.rotation.z+=f.spin.z*dt;
        if(f.mesh.position.y<=.18){
          f.mesh.position.y=.18;f.v.set(0,0,0);f.settled=true;
        }
      }

      const p=c.dust.geometry.attributes.position.array,vel=c.dust.userData.velocity;
      for(let j=0;j<p.length;j+=3){
        p[j]+=vel[j]*dt*(1+wind*.8);
        p[j+1]+=vel[j+1]*dt;
        p[j+2]+=vel[j+2]*dt;
        vel[j]*=.987;vel[j+1]=vel[j+1]*.975-.28*dt;vel[j+2]*=.987;
      }
      c.dust.geometry.attributes.position.needsUpdate=true;
      const dustPeak=c.switched?(.38+storm*.08):(.065+storm*.025);
      c.dust.material.opacity=Math.max(0,dustPeak*(1-Math.max(0,t-.4)/4.8));

      if(t>5.1){
        c.dust.parent?.remove(c.dust);c.dust.geometry.dispose();c.dust.material.dispose();
        // Settled dynamic fragments become two or fewer static material layers.
        // This preserves the physical aftermath without leaving 7–13 draw calls
        // per collapse alive for the rest of a long-running session.
        mergeStaticRoot(c.falling,'v6.6 merged settled falling debris');
        this.active.splice(i,1);
      }
    }
  }

  update(dt,now,game,weather={}){
    if(!game)return;
    this.lastGame=game;
    this.ensureState(game,now);
    this.applyPersisted(game);
    if(now>=game.nextAmbientCollapseAt)this.trigger(game,now);
    this.updateActive(Math.min(.08,Math.max(0,dt||0)),weather);
  }

  dispose(){
    for(const c of this.active){
      c.dust?.geometry?.dispose?.();c.dust?.material?.dispose?.();
    }
    for(const root of this.roots){
      root.traverse(o=>{if(o.isMesh)o.geometry?.dispose?.();});
      root.parent?.remove(root);
    }
    for(const m of Object.values(this.materials))m?.dispose?.();
    this.active.length=0;this.roots.length=0;this.applied.clear();
  }
}
