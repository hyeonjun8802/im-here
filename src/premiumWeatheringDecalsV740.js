import * as THREE from 'three';

/**
 * AFTERDAY v7.4 — procedural weathering/decal pass.
 *
 * Near/mid ruined buildings receive sparse streaks, soot blooms and repair scars
 * as actual world-space decal planes attached to their existing holders.
 * Streets receive instanced oil/grime/impact patches. Authored GLB materials are
 * not touched. Collapsed hosts naturally hide their attached facade decals.
 */
const TAU=Math.PI*2;
const hash=n=>{const x=Math.sin(n*251.73+121.17)*43758.5453123;return x-Math.floor(x);};
const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));

function canvasTexture(kind,seed=1){
  const size=256,c=document.createElement('canvas');c.width=c.height=size;
  const x=c.getContext('2d');x.clearRect(0,0,size,size);
  if(kind==='rust'){
    for(let i=0;i<34;i++){
      const px=40+hash(seed+i*13)*176,top=18+hash(seed+i*17)*70;
      const len=40+hash(seed+i*19)*160,w=2+hash(seed+i*23)*9;
      const g=x.createLinearGradient(px,top,px,Math.min(250,top+len));
      g.addColorStop(0,'rgba(124,69,42,0)');
      g.addColorStop(.12,'rgba(139,75,43,.45)');
      g.addColorStop(.62,'rgba(105,55,34,.28)');
      g.addColorStop(1,'rgba(75,43,31,0)');
      x.strokeStyle=g;x.lineWidth=w;x.beginPath();x.moveTo(px,top);
      x.bezierCurveTo(px+(hash(i+31)-.5)*12,top+len*.3,px+(hash(i+37)-.5)*16,top+len*.7,px+(hash(i+41)-.5)*18,top+len);x.stroke();
    }
  }else if(kind==='soot'){
    for(let i=0;i<18;i++){
      const px=hash(seed+i*31)*size,py=hash(seed+i*37)*size,r=18+hash(seed+i*43)*55;
      const g=x.createRadialGradient(px,py,2,px,py,r);
      g.addColorStop(0,'rgba(14,17,16,.58)');
      g.addColorStop(.55,'rgba(23,26,24,.22)');
      g.addColorStop(1,'rgba(25,27,24,0)');
      x.fillStyle=g;x.beginPath();x.arc(px,py,r,0,TAU);x.fill();
    }
  }else if(kind==='water'){
    for(let i=0;i<46;i++){
      const px=hash(seed+i*47)*size,top=hash(seed+i*53)*90;
      const len=25+hash(seed+i*59)*150;
      x.strokeStyle='rgba(38,52,51,'+(0.05+hash(seed+i*61)*.15).toFixed(3)+')';
      x.lineWidth=.8+hash(seed+i*67)*3.5;
      x.beginPath();x.moveTo(px,top);x.lineTo(px+(hash(seed+i*71)-.5)*5,Math.min(255,top+len));x.stroke();
    }
  }else{
    for(let i=0;i<30;i++){
      const px=hash(seed+i*73)*size,py=hash(seed+i*79)*size,rx=8+hash(seed+i*83)*48,ry=5+hash(seed+i*89)*28;
      x.fillStyle=i%3?'rgba(31,37,35,.14)':'rgba(72,61,48,.12)';
      x.save();x.translate(px,py);x.rotate(hash(seed+i*97)*TAU);x.scale(rx,ry);
      x.beginPath();x.arc(0,0,1,0,TAU);x.fill();x.restore();
    }
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;
  t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=true;t.anisotropy=8;
  return t;
}
function mat(texture,color,opacity){
  return new THREE.MeshBasicMaterial({
    map:texture,color,transparent:true,opacity,depthWrite:false,depthTest:true,
    polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,
    blending:THREE.NormalBlending,toneMapped:true,side:THREE.DoubleSide
  });
}
function addPlane(parent,material,size,pos,rot=[0,0,0],name=''){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(...size),material);
  m.position.set(...pos);m.rotation.set(...rot);m.name=name;m.renderOrder=4;parent.add(m);return m;
}
function roadRecords(mobile){
  const records=[],count=mobile?38:76;
  for(let i=0;i<count;i++){
    const vertical=i%2===0,side=i%4<2?-1:1,lane=side*(187+hash(i+7)*5),along=(hash(i*17+9)-.5)*350;
    records.push({
      p:[vertical?lane:along,-23.32,vertical?along:lane],
      r:[-Math.PI/2,0,hash(i*23)*TAU],
      s:[1.3+hash(i*29)*5.2,.7+hash(i*31)*2.8,1]
    });
  }
  return records;
}
function makeRoadInstanced(parent,material,records){
  const m=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),material,records.length);
  m.name='v7.4 instanced road grime and oil patches';const d=new THREE.Object3D();
  records.forEach((r,i)=>{d.position.set(...r.p);d.rotation.set(...r.r);d.scale.set(...r.s);d.updateMatrix();m.setMatrixAt(i,d.matrix);});
  m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();m.renderOrder=3;parent.add(m);return m;
}

export class PremiumWeatheringDecalsV740{
  constructor(world){
    this.world=world;this.mobile=Boolean(world.isMobile);this.groups=[];this.time=0;
    this.textures={
      rust:canvasTexture('rust',741),soot:canvasTexture('soot',1741),
      water:canvasTexture('water',2741),road:canvasTexture('road',3741)
    };
    this.materials={
      rust:mat(this.textures.rust,'#9a6443',.32),
      soot:mat(this.textures.soot,'#353a36',.30),
      water:mat(this.textures.water,'#5c6d6b',.18),
      road:mat(this.textures.road,'#343932',.26)
    };
    this.makeFacadeDecals();
    this.root=new THREE.Group();this.root.name='AFTERDAY v7.4 street weathering decals';world.scene.add(this.root);
    this.road=makeRoadInstanced(this.root,this.materials.road,roadRecords(this.mobile));
  }
  makeFacadeDecals(){
    const slots=(this.world.distantCityPlan||[]).filter(s=>s.tier==='near'||s.tier==='mid');
    const budget=this.mobile?Math.min(12,slots.length):Math.min(28,slots.length);
    const step=Math.max(1,Math.floor(slots.length/Math.max(1,budget)));
    for(let i=0;i<slots.length&&this.groups.length<budget;i+=step){
      const s=slots[i],host=this.world.cityBuildings?.get(s.id);if(!host)continue;
      const w=s.width||11,d=w*.82,h=s.height||30,seed=i*101+s.x*.17+s.z*.23;
      const g=new THREE.Group();g.name='v7.4 facade weathering · '+s.id;
      const front=hash(seed+1)>.35;
      const layers=this.mobile?2:4;
      for(let k=0;k<layers;k++){
        const y=3+hash(seed+k*11)*Math.max(4,h*.60);
        const span=(hash(seed+k*13)-.5)*(front?w:d)*.58;
        const sw=.8+hash(seed+k*17)*2.2,sh=1.8+hash(seed+k*19)*5.5;
        if(front){
          addPlane(g,k%3===0?this.materials.soot:k%3===1?this.materials.rust:this.materials.water,
            [sw,sh],[span,y,d*.505+.055],[0,0,(hash(seed+k*23)-.5)*.05],'v7.4 facade weathering decal');
        }else{
          addPlane(g,k%3===0?this.materials.soot:k%3===1?this.materials.rust:this.materials.water,
            [sw,sh],[w*.505+.055,y,span],[0,Math.PI/2,(hash(seed+k*23)-.5)*.05],'v7.4 side weathering decal');
        }
      }
      host.add(g);this.groups.push(g);
    }
  }
  update(dt,weather={},night=0){
    this.time+=Math.max(0,Number(dt)||0);
    const wet=clamp01(weather.wet),storm=clamp01(weather.storm),n=clamp01(night);
    this.materials.rust.opacity=.24+wet*.12;
    this.materials.soot.opacity=.24+storm*.08+n*.03;
    this.materials.water.opacity=.05+wet*.22;
    this.materials.road.opacity=.16+wet*.15+n*.03;
  }
  dispose(){
    for(const g of this.groups){g.traverse(o=>{if(o.isMesh)o.geometry?.dispose?.();});g.parent?.remove(g);}
    this.road?.geometry?.dispose?.();this.root?.parent?.remove(this.root);
    for(const m of Object.values(this.materials))m.dispose();
    for(const t of Object.values(this.textures))t.dispose();
    this.groups.length=0;
  }
}
