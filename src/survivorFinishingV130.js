import * as THREE from 'three';

/**
 * Detail silhouettes which move with the existing 3D limb pivots.
 * No static portrait cards, no swapped characters or separate unrigged avatar.
 */
const material={
 fabric:new THREE.MeshStandardMaterial({color:'#626959',roughness:.98,side:THREE.DoubleSide}),
 worn:new THREE.MeshStandardMaterial({color:'#3e4541',roughness:.98,side:THREE.DoubleSide}),
 metal:new THREE.MeshStandardMaterial({color:'#86877b',roughness:.5,metalness:.5}),
 leather:new THREE.MeshStandardMaterial({color:'#64503c',roughness:.84}),
 cord:new THREE.MeshStandardMaterial({color:'#b5ab8b',roughness:1}),
 dark:new THREE.MeshStandardMaterial({color:'#292e2b',roughness:.95}),
 glass:new THREE.MeshPhysicalMaterial({color:'#9caeb3',metalness:.12,roughness:.14,transmission:0,clearcoat:.7})
};
function attach(parent,geometry,mat,x,y,z){
 const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;parent.add(m);return m;
}
function stitch(parent,A,B,r=.007,mat=material.cord){
 const a=new THREE.Vector3(...A),b=new THREE.Vector3(...B),d=b.clone().sub(a);
 const m=attach(parent,new THREE.CylinderGeometry(r,r,d.length(),6),mat,...a.clone().add(b).multiplyScalar(.5).toArray());
 m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;
}
function addCloth(parent,verts,mat){
 const geom=new THREE.BufferGeometry(),idx=[];
 geom.setAttribute('position',new THREE.Float32BufferAttribute(verts.flat(),3));
 for(let i=1;i<verts.length-1;i++)idx.push(0,i,i+1);
 geom.setIndex(idx);geom.computeVertexNormals();return attach(parent,geom,mat,0,0,0);
}
export function upgradeSurvivorFinishingV130(world){
 const torso=world.survivorTorso,head=world.survivorHead;
 if(!torso||!head)return false;
 const root=new THREE.Group();root.name='Rig-attached wearable finishing details v1.3';torso.add(root);
 // Real layered shoulder cap and rain collar that project beyond the base coat.
 for(const s of [-1,1]){
   const sleeve=addCloth(root,[[s*.25,.96,.02],[s*.52,.90,-.05],[s*.62,.73,.08],[s*.42,.62,.26],[s*.25,.75,.28]],material.fabric);
   sleeve.name='Folded waterproof shoulder cover';
   stitch(root,[s*.25,.88,.30],[s*.43,.71,.27],.011);
   for(let j=0;j<5;j++){
     const y=.69+j*.042;
     stitch(root,[s*.30,y,.295],[s*.36,y+.004,.293],.004);
   }
 }
 const stormCollar=addCloth(root,[[-.31,.90,-.16],[-.28,1.05,.06],[0,1.00,.13],[.27,1.06,.07],[.33,.88,-.18],[0,.82,-.27]],material.worn);
 stormCollar.name='Raised storm collar';
 // Layered sleeping-roll harness on back. Buckles and restrained repair details.
 for(const s of [-1,1]){
   stitch(root,[s*.35,.84,-.33],[s*.37,.04,-.40],.034,material.leather);
   for(let y of [.32,.70]){
     const buckle=attach(root,new THREE.TorusGeometry(.053,.009,5,10),material.metal,s*.37,y,-.423);
     buckle.rotation.y=.17;
   }
 }
 const compass=attach(root,new THREE.CylinderGeometry(.07,.07,.021,16),material.metal,-.19,.62,.363);
 compass.rotation.x=Math.PI/2;
 attach(root,new THREE.CylinderGeometry(.049,.049,.023,16),material.glass,-.19,.62,.382).rotation.x=Math.PI/2;
 // Wrist-length patched field gloves: details follow hand pivots instead of
 // floating beside the survivor while playing guitar or holding the radio.
 for(const hand of world.survivorHands||[]){
   attach(hand,new THREE.BoxGeometry(.24,.095,.16),material.worn,0,.13,.01);
   for(let i=-1;i<=1;i++)stitch(hand,[-.07+i*.067,.14,.095],[-.07+i*.067,.10,.096],.008);
 }
 // Carefully constrained asymmetric hood rim on the head. It is physically
 // behind the face, avoiding the overly large cartoon helmet silhouette.
 const hood=new THREE.Group();hood.position.set(0,.12,-.11);head.add(hood);
 const rim=attach(hood,new THREE.TorusGeometry(.385,.06,8,38,Math.PI*1.22),material.worn,0,.02,0);
 rim.rotation.z=Math.PI*.85;rim.rotation.x=.10;
 const stitched=attach(hood,new THREE.TorusGeometry(.388,.012,6,36,Math.PI*1.05),material.cord,0,.015,.004);
 stitched.rotation.z=Math.PI*.93;
 // Face doesn't get a pasted-on image. Small details are inset physically.
 const browRidge=addCloth(head,[[-.22,.30,.31],[-.07,.32,.39],[.06,.33,.40],[.22,.31,.32],[0,.265,.40]],material.fabric);
 browRidge.visible=false; // high-detail optional: disabled to keep expression readable
 const windTail=addCloth(root,[[.24,.82,-.14],[.38,.53,-.33],[.44,-.17,-.39],[.31,-.20,-.28],[.27,.53,-.15]],material.fabric);
 windTail.name='Scarf secondary-motion tail';
 world.v130Wearables={root,hood,windTail};
 return true;
}
export function animateSurvivorFinishingV130(world,seconds,wind=0){
 const w=world.v130Wearables;if(!w)return;
 w.windTail.rotation.z=.02*Math.sin(seconds*1.4)+wind*.11*Math.sin(seconds*2.7);
 w.windTail.rotation.x=.02*Math.sin(seconds*1.2)+wind*.085*Math.cos(seconds*2.3);
}
