import * as THREE from 'three';
/** Premium plant pass on the EXISTING three wooden garden beds. No new roof props
 * or game economy. A shared alpha-cut botanical atlas and InstancedMesh let
 * leaves keep a rounded silhouette without hundreds of separate draw calls. */
const rand=n=>{const t=Math.sin(n*127.17+37.81)*43758.5453;return t-Math.floor(t)};
function leafGeometry(){
 const positions=[],uv=[],indices=[];const segments=8;
 for(let i=0;i<=segments;i++){
  const v=i/segments,w=Math.pow(Math.sin(Math.PI*v),.76);
  for(const side of [-1,1]){
   positions.push(side*w*.46, v, Math.sin(v*Math.PI)*.13 - Math.abs(side)*.04);
   uv.push(side===-1?0:1,v);
  }
 }
 for(let i=0;i<segments;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
function pack(parent,geo,mat,data,name,shadows=false){
 const im=new THREE.InstancedMesh(geo,mat,data.length);im.name=name;im.castShadow=shadows;im.receiveShadow=true;
 const dummy=new THREE.Object3D();for(let i=0;i<data.length;i++){
  const d=data[i];dummy.position.set(...d.pos);dummy.rotation.set(...(d.rot||[0,0,0]));dummy.scale.set(...d.scale);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);
  if(d.color)im.setColorAt(i,new THREE.Color(d.color));
 }
 im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
 im.computeBoundingSphere();parent.add(im);return im;
}
export class RooftopBotany {
 constructor(world){
  this.world=world;this.root=new THREE.Group();this.root.name='V290 · actual edible crops, rounded alpha foliage and fruit';world.scene.add(this.root);
  const Y=world.ROOF_Y+.25;
  const atlas=new THREE.TextureLoader().load('./assets/materials/botany/leaf_veined.png');atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=4;
  const leafMat=new THREE.MeshStandardMaterial({color:'#ffffff',map:atlas,alphaTest:.25,side:THREE.DoubleSide,metalness:0,roughness:.88});
  const stemMat=new THREE.MeshStandardMaterial({color:'#52643b',roughness:.97,metalness:0});
  const berryMat=new THREE.MeshStandardMaterial({color:'#df7956',roughness:.43,metalness:0});
  const leaves=[],cropLeaves=[],stems=[],fruit=[];
  // Each physical crop remains INSIDE its registered, collision-enabled planter.
  for(let bed=0;bed<3;bed++)for(let plant=0;plant<9;plant++){
    const index=bed*9+plant;
    const x=-17.1+plant*1.02+.13*(rand(index+54)-.5);
    const z=11+bed*3.2+(rand(index+32)-.5)*.65;
    const isTomato=bed===1&&plant%2===0;
    const isHerb=bed===2&&plant%3===1;
    const height=isTomato?1.5:isHerb?.95:.65;
    // Real stems in the flower bed, with many leaf whorls and no blocky caps.
    if(isTomato){stems.push({pos:[x,Y+1.03+height*.34,z],scale:[.55,height,.55],rot:[0,0,0],color:'#5d7046'});}
    const count=isTomato?22:isHerb?17:14;
    for(let j=0;j<count;j++){
      const a=j*2.399+rand(index)*2.1;
      const ring=j%4, baseY=isTomato?.28+ring*.28:isHerb?.09+ring*.13:.12+ring*.085;
      const len=(isTomato?.66:isHerb?.46:.54)*(.83+rand(j*77+index)*.45);
      const radial=isTomato?.12+ring*.15:isHerb?.08+.17*rand(j+index):.05+.14*rand(j*3+index);
      const color=new THREE.Color().setHSL(.245+rand(j*5+index)*.047,.27+rand(j*17+index)*.20,.20+rand(j*23+index)*.18);
      cropLeaves.push({pos:[x+Math.sin(a)*radial,Y+1.01+baseY,z+Math.cos(a)*radial],rot:[Math.sin(a)*.18,a,.43+rand(index*53+j)*.85],scale:[.50+rand(j+index)*.25,len,.75],color});
    }
    if(isTomato){for(let t=0;t<3;t++){
      const a=(t*2.09+index)*1.3;
      fruit.push({pos:[x+.28*Math.cos(a),Y+1.70+.22*t,z+.28*Math.sin(a)],scale:[.108,.119,.105],rot:[0,0,0],color:t===0?'#d26c38':'#b95b3d'});
    }}
  }
  // Wild growth near parapet, not in the walking aisles or the garden approach.
  const tufts=world.isMobile?9:18;
  for(let i=0;i<tufts;i++){
   const side=i%4,x=side===0?-20.45:side===1?20.4:-18+rand(i*57)*36;
   const z=side===2?-20.3:side===3?20.3:-18+rand(i*71)*36;
   const n=world.isMobile?9:16;
   for(let j=0;j<n;j++){
    const a=j*2.4,iRand=rand(i*73+j*13),L=.45+iRand*.9;
    leaves.push({pos:[x+Math.cos(a)*.19,Y+.05,z+Math.sin(a)*.19],rot:[0,a,1.05+iRand*.48],scale:[.24+iRand*.30,L,.78],color:new THREE.Color().setHSL(.22+rand(j+i)*.09,.25,.23+rand(j*7+i)*.13)});
   }
  }
  // Replace the formerly faceted SimCity tree-pot, tree-old, shrubs and
  // little trees with actual branch hierarchies and veined foliage geometry.
  const trees=[[-19,2,4.7],[19,-8,4.1],[-19,-17,4.6],[18,-19,3.7],[-19,-7,3.6],[19,4,3.9]];
  const barkMat=new THREE.MeshStandardMaterial({color:'#625a46',roughness:.99,metalness:0});
  const barkGeom=new THREE.CylinderGeometry(.14,.22,1,9);
  const bark=[];
  for(let ti=0;ti<trees.length;ti++){
   const [tx,tz,H]=trees[ti];
   bark.push({pos:[tx,Y+H*.43,tz],scale:[1,H*.86,1],rot:[0,0,.025*ti]});
   for(let b=0;b<13;b++){
    const a=b*2.399+ti*.62,len=1.0+rand(ti*29+b)*1.25;
    const py=Y+H*(.54+.34*rand(b+ti*73));
    bark.push({pos:[tx+Math.cos(a)*len*.40,py+.22,tz+Math.sin(a)*len*.40],scale:[.27,.72,.27],rot:[Math.cos(a)*.52,a,Math.sin(a)*.52]});
   }
   const count=world.isMobile?100:170;
   for(let j=0;j<count;j++){
    const a=j*2.399,polar=Math.acos(2*rand(j*17+ti*303)-1),rad=(.5+rand(j*13+ti*112)*1.75)*Math.sin(polar);
    const x=tx+Math.cos(a)*rad,z=tz+Math.sin(a)*rad;
    const y=Y+H*.76+Math.cos(polar)*1.25;
    const leafSize=.48+rand(ti*11+j*73)*.64;
    leaves.push({pos:[x,y,z],rot:[rand(j*19+ti)*2.4,a,rand(j*17+ti)*1.8],scale:[leafSize*.68,leafSize,.7],color:new THREE.Color().setHSL(.225+rand(j*7+ti)*.065,.28+rand(j*37+ti)*.19,.21+rand(j*19+ti)*.17)});
   }
  }
  this.barkMesh=pack(this.root,barkGeom,barkMat,bark,'Batched mature trunks and secondary branches',true);
  this.leafMesh=pack(this.root,leafGeometry(),leafMat,leaves,'Instanced organic botanical leaves · rounded silhouettes');
  // Only cultivated crops depend on discovered seeds; wild overgrowth remains.
  this.cropLeafMesh=pack(this.root,leafGeometry(),leafMat,cropLeaves,'Cultivated food crops · acquired seeds');
  this.stemMesh=pack(this.root,new THREE.CylinderGeometry(.045,.075,1,6),stemMat,stems,'Vegetable woody stems');
  this.fruitMesh=pack(this.root,new THREE.IcosahedronGeometry(1,1),berryMat,fruit,'Small ripening greenhouse fruit');
  this.atlas=atlas;
 }
 dispose(){this.root.parent?.remove(this.root);this.root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});this.atlas.dispose();}
}
