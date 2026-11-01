/** Palm sockets for the Pixal3D humanoid's dedicated hand bones.
 * The old nine-joint TripoSR asset estimated the wrist from UpperArm.  The
 * current asset has ForeArm and Hand bones, so props follow the actual palm.
 */
import * as THREE from 'three';
export const HAND_SOCKETS=Object.freeze({
 L:Object.freeze({x:0,y:.13,z:.025}),
 R:Object.freeze({x:0,y:.13,z:.025}),
});
/** Cancel the hand's authored bind rotation while retaining animated deltas. */
export function makePalmSocket(bone,side){
 const pos=HAND_SOCKETS[side];if(!bone||!pos)throw Error('Missing GLB arm for '+side);
 const g=new THREE.Group();g.name=`Pixal3D ${side} hand palm socket`;
 g.position.set(pos.x,pos.y,pos.z);
 g.quaternion.copy(bone.quaternion).invert();
 bone.add(g);return g;
}
export const PALM_TARGET_WORLD_Y=1.27;
