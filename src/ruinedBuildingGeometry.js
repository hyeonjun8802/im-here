import * as THREE from 'three';

/**
 * Shared, unit-scale low-rise fractured concrete block meshes for the distant city.
 * A building remains a real closed 3D object: its irregular roof line is
 * geometry, not a painted dark band or a screen-facing billboard.
 * Four broad, gently uneven parapets are instanced across the skyline.
 * Corners differ only slightly: no sharp triangular or needle-like peaks.
 * Material 0 = reclaimed facade, material 1 = exposed roof concrete.
 */
const profiles = [
 [.98,.95,.96,1.00],
 [.95,.98,1.00,.96],
 [1.00,.96,.98,.95],
 [.97,1.00,.95,.98]
];
export function createFracturedTowerGeometry(variant=0){
 const top=profiles[((variant%4)+4)%4];
 const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
 const pos=[],uv=[],groups=[];
 const triangle=(a,b,c,ta,tb,tc)=>{pos.push(...a,...c,...b);uv.push(...ta,...tc,...tb);};
 // Separate triangles intentionally give each concrete face hard normals.
 for(let s=0;s<4;s++){
  const n=(s+1)%4;
  const [x0,z0]=corners[s],[x1,z1]=corners[n];
  const bl=[x0,0,z0],br=[x1,0,z1],tl=[x0,top[s],z0],tr=[x1,top[n],z1];
  const start=pos.length/3;
  triangle(bl,br,tr,[0,0],[1,0],[1,top[n]]);
  triangle(bl,tr,tl,[0,0],[1,top[n]],[0,top[s]]);
  groups.push({start,count:6,materialIndex:0});
 }
 // Irregular, cracked roof plane: the upper walls do not end at one height.
 const start=pos.length/3;
 triangle([-.5,top[0],-.5],[.5,top[1],-.5],[.5,top[2],.5], [0,0],[1,0],[1,1]);
 triangle([-.5,top[0],-.5],[.5,top[2],.5],[-.5,top[3],.5],[0,0],[1,1],[0,1]);
 groups.push({start,count:6,materialIndex:1});
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.computeVertexNormals();
 for(const g of groups)geo.addGroup(g.start,g.count,g.materialIndex);
 geo.computeBoundingSphere();
 return geo;
}

/** Height fraction at a roof point, following the two actual cap triangles. */
export function fracturedRoofHeightAt(variant,x=0,z=0){
 const t=profiles[((variant%4)+4)%4];
 const u=THREE.MathUtils.clamp(x+.5,0,1),v=THREE.MathUtils.clamp(z+.5,0,1);
 return u>=v?(1-u)*t[0]+(u-v)*t[1]+v*t[2]
            :(1-v)*t[0]+u*t[2]+(v-u)*t[3];
}
