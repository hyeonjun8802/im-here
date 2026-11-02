import * as THREE from 'three';
import {CITY_COMPOSITION} from './cityComposition.js';

const GROUND=CITY_COMPOSITION.groundY;
const TAU=Math.PI*2;
const hash=n=>{const v=Math.sin(n*127.17+31.71)*43758.5453;return v-Math.floor(v);};
const color=v=>new THREE.Color(v);

function addInstances(parent,name,geometry,material,records){
  const mesh=new THREE.InstancedMesh(geometry,material,records.length);
  mesh.name=name;
  const d=new THREE.Object3D();
  records.forEach((r,i)=>{
    d.position.set(...r.p);d.rotation.set(...(r.r||[0,0,0]));d.scale.set(...(r.s||[1,1,1]));d.updateMatrix();
    mesh.setMatrixAt(i,d.matrix);if(r.c)mesh.setColorAt(i,r.c);
  });
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  mesh.castShadow=false;mesh.receiveShadow=false;mesh.computeBoundingSphere();parent.add(mesh);return mesh;
}

function mountainGeometry(seed=1){
  const g=new THREE.ConeGeometry(1,1,11,5,false);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const angle=Math.atan2(z,x),level=y+.5;
    const rough=1+(hash(seed*311+i*17)-.5)*.22*(1-level*.45)+Math.sin(angle*3+seed)*.035;
    p.setXYZ(i,x*rough,y,z*rough);
  }
  p.needsUpdate=true;g.computeVertexNormals();return g;
}

function riverGeometry(){
  const segments=44,pos=[],uv=[],idx=[];
  const center=t=>{
    const x=-930+t*780;
    const z=-565-Math.sin(t*Math.PI)*92+Math.sin(t*TAU*2.1)*28;
    return new THREE.Vector3(x,GROUND+.24,z);
  };
  for(let i=0;i<=segments;i++){
    const t=i/segments,p=center(t),p0=center(Math.max(0,t-.012)),p1=center(Math.min(1,t+.012));
    const tangent=p1.clone().sub(p0).normalize();
    const side=new THREE.Vector3(-tangent.z,0,tangent.x);
    const width=58+Math.sin(t*Math.PI)*25+hash(i+12)*10;
    const left=p.clone().addScaledVector(side,width),right=p.clone().addScaledVector(side,-width);
    pos.push(left.x,left.y,left.z,right.x,right.y,right.z);uv.push(0,t,1,t);
    if(i<segments){const k=i*2;idx.push(k,k+1,k+2,k+2,k+1,k+3);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

function line(parent,points,material,name){
  const g=new THREE.BufferGeometry().setFromPoints(points);const l=new THREE.Line(g,material);l.name=name;parent.add(l);return l;
}

export class HorizonWorldExpansionV210{
  constructor(world){
    this.world=world;this.group=new THREE.Group();this.group.name='AFTERDAY v2.10 horizon world expansion';
    world.scene.add(this.group);this.meshes=[];this.materials=[];this.time=0;
    this.makeFarCity();this.makeRiver();this.makeBridge();this.makeMountainMass();this.makeDistantInfrastructure();
  }

  makeFarCity(){
    const mobile=this.world.isMobile;
    const records=[[],[],[]],roofTanks=[],masts=[];
    const count=mobile?86:150;
    const palette=['#59615f','#63655e','#505a5b','#6b655c','#4d5754','#69645b'];
    for(let i=0;i<count;i++){
      const vista=i<count*.78;
      const a=vista?5*Math.PI/4+(hash(i*41+3)-.5)*1.72:hash(i*53+8)*TAU;
      const radius=vista?520+hash(i*29+4)*470:560+hash(i*31+7)*360;
      const x=Math.sin(a)*radius,z=Math.cos(a)*radius;
      // Keep a broad river corridor readable from the default cinematic view.
      const t=THREE.MathUtils.clamp((x+930)/780,0,1);
      const riverZ=-565-Math.sin(t*Math.PI)*92+Math.sin(t*TAU*2.1)*28;
      if(Math.abs(z-riverZ)<105)continue;
      const w=12+hash(i*17+5)*20,d=11+hash(i*23+2)*19;
      const h=24+Math.pow(hash(i*37+9),.58)*(mobile?78:105);
      const tier=i%3;
      records[tier].push({p:[x,GROUND+h*.5,z],r:[0,Math.round(hash(i+80)*3)*Math.PI/2,0],s:[w,h,d],c:color(palette[i%palette.length]).multiplyScalar(.78+.18*hash(i+12))});
      if(i%5===0)roofTanks.push({p:[x,GROUND+h+2.3,z],s:[2.2+hash(i)*1.8,4.6,2.2+hash(i+3)*1.8],c:color('#555c58')});
      if(i%7===0)masts.push({p:[x,GROUND+h+7,z],s:[.13,13+hash(i+4)*11,.13],c:color('#4d5554')});
    }
    const geom=new THREE.BoxGeometry(1,1,1);
    for(let t=0;t<3;t++){
      const mat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.96,metalness:.025,vertexColors:true});
      this.materials.push(mat);this.meshes.push(addInstances(this.group,`Far urban depth band ${t+1}`,geom,mat,records[t]));
    }
    this.meshes.push(addInstances(this.group,'Far rooftop water tanks',new THREE.CylinderGeometry(.5,.5,1,8),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.92,metalness:.12,vertexColors:true}),roofTanks));
    this.meshes.push(addInstances(this.group,'Far skyline antenna masts',new THREE.CylinderGeometry(.5,.5,1,6),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.8,metalness:.5,vertexColors:true}),masts));
  }

  makeRiver(){
    const material=new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0},uStorm:{value:0},uNight:{value:0},uWet:{value:0}},
      transparent:false,depthWrite:true,depthTest:true,side:THREE.DoubleSide,
      vertexShader:`varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader:`precision highp float;varying vec2 vUv;varying vec3 vWorld;uniform float uTime,uStorm,uNight,uWet;
        float wave(vec2 p){return sin(p.x*.11+uTime*.65)*.5+sin(p.y*.17-uTime*.42)*.31+sin((p.x+p.y)*.055+uTime*.31)*.19;}
        void main(){float w=wave(vWorld.xz);float glint=.5+.5*sin(vUv.y*165.+w*2.7+uTime*.7);
          vec3 base=mix(vec3(.11,.19,.20),vec3(.18,.29,.31),glint*.16);
          base=mix(base,vec3(.08,.12,.16),uNight*.58+uStorm*.28);
          gl_FragColor=vec4(base,1.);}`
    });
    const river=new THREE.Mesh(riverGeometry(),material);river.name='Visible winding river through distant city';river.renderOrder=0;this.group.add(river);
    this.river=river;this.materials.push(material);this.meshes.push(river);
    const bankMat=new THREE.MeshStandardMaterial({color:'#34443d',roughness:1});
    const banks=[];
    for(let i=0;i<36;i++){
      const t=i/35,x=-930+t*780,z=-565-Math.sin(t*Math.PI)*92+Math.sin(t*TAU*2.1)*28;
      const w=69+Math.sin(t*Math.PI)*26;
      banks.push({p:[x,GROUND+.52,z+w+9],r:[0,hash(i)*.25,0],s:[16,.75,9+hash(i+4)*13]});
      banks.push({p:[x,GROUND+.52,z-w-9],r:[0,hash(i+9)*.25,0],s:[16,.75,9+hash(i+7)*13]});
    }
    this.meshes.push(addInstances(this.group,'Broken green river embankments',new THREE.BoxGeometry(1,1,1),bankMat,banks));
  }

  makeBridge(){
    const bridge=new THREE.Group();bridge.name='Ruined suspension bridge over river';this.group.add(bridge);
    const cx=-548,cz=-648,deckY=GROUND+8.2;
    const concrete=new THREE.MeshStandardMaterial({color:'#555d59',roughness:.93,metalness:.04});
    const steel=new THREE.MeshStandardMaterial({color:'#596362',roughness:.76,metalness:.46});
    const rust=new THREE.MeshStandardMaterial({color:'#705648',roughness:.84,metalness:.35});
    this.materials.push(concrete,steel,rust);
    const deck=new THREE.Mesh(new THREE.BoxGeometry(13,1.3,226),concrete);deck.position.set(cx,deckY,cz);deck.rotation.y=.06;bridge.add(deck);this.meshes.push(deck);
    const broken=new THREE.Mesh(new THREE.BoxGeometry(13.4,1.8,27),new THREE.MeshStandardMaterial({color:'#323936',roughness:1}));
    broken.position.set(cx,deckY+.15,cz+32);broken.rotation.set(.05,.06,.045);bridge.add(broken);this.meshes.push(broken);
    const pylons=[];
    for(const z of [cz-62,cz+62])for(const x of [cx-8,cx+8])pylons.push({p:[x,deckY+24,z],s:[2.7,48,2.7],c:color('#5a605d')});
    this.meshes.push(addInstances(bridge,'Suspension bridge towers',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.88,metalness:.22,vertexColors:true}),pylons));
    const topBeams=[];for(const z of [cz-62,cz+62])topBeams.push({p:[cx,deckY+46,z],s:[19,2.2,2.2]});
    this.meshes.push(addInstances(bridge,'Suspension bridge tower crossbeams',new THREE.BoxGeometry(1,1,1),steel,topBeams));
    const cableMat=new THREE.LineBasicMaterial({color:'#707c7c',transparent:true,opacity:.72});
    this.materials.push(cableMat);
    for(const side of [-1,1]){
      const x=cx+side*7.2;
      const points=[];for(let i=0;i<=32;i++){const q=i/32,z=cz-111+222*q;const arch=deckY+14+32*Math.pow(Math.abs(q-.5)*2,1.75);points.push(new THREE.Vector3(x,arch,z));}
      line(bridge,points,cableMat,`Bridge main suspension cable ${side}`);
      for(let i=2;i<31;i+=3){const q=i/32,z=cz-111+222*q,arch=deckY+14+32*Math.pow(Math.abs(q-.5)*2,1.75);line(bridge,[new THREE.Vector3(x,deckY+1,z),new THREE.Vector3(x,arch,z)],cableMat,'Bridge vertical hanger');}
    }
  }

  makeMountainMass(){
    const mobile=this.world.isMobile,records=[[],[],[]];
    const count=mobile?22:34;
    // Deliberately bias the most dramatic peaks toward the default SW vista.
    for(let i=0;i<count;i++){
      const a=5*Math.PI/4+(i/(count-1)-.5)*1.48+(hash(i*17)-.5)*.08;
      const radius=1040+hash(i*31+4)*250;
      const h=120+Math.pow(hash(i*43+8),.65)*190;
      const w=135+hash(i*13+3)*175;
      const x=Math.sin(a)*radius,z=Math.cos(a)*radius;
      records[i%3].push({p:[x,GROUND-8+h*.5,z],r:[0,hash(i+77)*TAU,0],s:[w,h,w*(.72+hash(i+5)*.31)],c:color(['#46534e','#3d4c49','#52605a'][i%3]).multiplyScalar(.72+.18*hash(i+21))});
    }
    for(let v=0;v<3;v++){
      const mat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:false,vertexColors:true});
      this.materials.push(mat);this.meshes.push(addInstances(this.group,`Layered distant mountain peaks ${v+1}`,mountainGeometry(v+11),mat,records[v]));
    }
  }

  makeDistantInfrastructure(){
    const cranes=[],stacks=[],towers=[];
    const count=this.world.isMobile?12:22;
    for(let i=0;i<count;i++){
      const a=5*Math.PI/4+(hash(i*31)-.5)*1.35,r=560+hash(i*19+3)*340,x=Math.sin(a)*r,z=Math.cos(a)*r;
      if(i%3===0)stacks.push({p:[x,GROUND+31,z],s:[3.5,62,3.5],c:color('#4d5451')});
      else if(i%3===1)towers.push({p:[x,GROUND+42,z],s:[1.2,84,1.2],c:color('#555f5c')});
      else cranes.push({p:[x,GROUND+40,z],s:[1,80,1],c:color('#5d625e')});
    }
    this.meshes.push(addInstances(this.group,'Far industrial smokestacks',new THREE.CylinderGeometry(.5,.7,1,10),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.94,vertexColors:true}),stacks));
    this.meshes.push(addInstances(this.group,'Far utility towers',new THREE.CylinderGeometry(.5,.5,1,6),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.82,metalness:.38,vertexColors:true}),towers));
    this.meshes.push(addInstances(this.group,'Far construction crane masts',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.82,metalness:.34,vertexColors:true}),cranes));
  }

  update(dt,weather,night){
    this.time+=dt;
    if(this.river){
      const u=this.river.material.uniforms;u.uTime.value=this.time;u.uStorm.value=weather?.storm||0;u.uWet.value=weather?.wet||0;u.uNight.value=night||0;
    }
  }

  dispose(){
    this.group.parent?.remove(this.group);
    for(const m of this.meshes){m.geometry?.dispose?.();if(Array.isArray(m.material))m.material.forEach(x=>x.dispose?.());else m.material?.dispose?.();}
    for(const m of this.materials)m?.dispose?.();
  }
}
