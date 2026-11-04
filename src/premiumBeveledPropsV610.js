import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * AFTERDAY v6.1 close-up geometry finishing.
 * Only selected hero-prop surfaces receive actual bevels; not every city box.
 * No collider, inventory, pathfinding, layout or saved object is altered.
 */
export const BEVEL_SEGMENTS=3;
export function beveledProp(parent,dimensions,position,material,radius=.12){
 const size=dimensions.map(Number);
 if(size.length!==3||size.some(x=>!Number.isFinite(x)||x<=0))
  throw new Error('Close-range bevel requires positive box dimensions');
 const r=Math.min(Math.max(0,Number(radius)||0),Math.min(...size)*.23);
 const geometry=r>.001?
  new RoundedBoxGeometry(...size,BEVEL_SEGMENTS,r):
  new THREE.BoxGeometry(...size);
 const mesh=new THREE.Mesh(geometry,material);
 mesh.position.set(...position);
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.name='Softened PBR edge · existing rooftop prop';
 parent.add(mesh);return mesh;
}
