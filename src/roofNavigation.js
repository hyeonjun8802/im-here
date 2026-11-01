/** AFTERDAY v2.9: fixed-world kinematic collisions on the single hero rooftop.
 * Coordinates share the actual furniture and garden geometry; the actor is a
 * disk in X/Z (not a ray from the camera). No physics-engine claim is made.
 */
export const ACTOR_RADIUS = .61;
export const ROOF_LIMIT = 21.45;
export const ROOF_OBSTACLES = Object.freeze([
 {id:'raised-garden-1',type:'box',x:-13,z:11,hx:5.05,hz:1.12},
 {id:'raised-garden-2',type:'box',x:-13,z:14.2,hx:5.05,hz:1.12},
 {id:'raised-garden-3',type:'box',x:-13,z:17.4,hx:5.05,hz:1.12},
 {id:'stairwell',type:'box',x:12,z:-.6,hx:3.12,hz:3.12},
 {id:'water-tank',type:'circle',x:16,z:-13,r:3.03},
 {id:'firepit',type:'circle',x:2,z:3,r:1.47},
 {id:'storage',type:'box',x:13.45,z:11.0,hx:3.8,hz:2.55},
 {id:'dining-table',type:'box',x:7.6,z:7.2,hx:1.7,hz:.89},
 {id:'radio-table',type:'box',x:-2.7,z:-1.8,hx:1.43,hz:.77},
 {id:'bed',type:'box',x:-10.2,z:-4.35,hx:1.73,hz:.86},
 {id:'workbench',type:'box',x:5,z:-13,hx:4.34,hz:1.1},
 {id:'generator',type:'box',x:15,z:9,hx:1.42,hz:.98},
 {id:'solar-panels',type:'box',x:-14,z:14,hx:3.25,hz:1.65},
]);
export function collidesRooftop(x,z,r=ACTOR_RADIUS,obstacles=ROOF_OBSTACLES){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)+r>ROOF_LIMIT||Math.abs(z)+r>ROOF_LIMIT)return true;
 return obstacles.some(o=>o.type==='circle'
  ?(x-o.x)**2+(z-o.z)**2<(o.r+r)**2
  :(Math.max(Math.abs(x-o.x)-o.hx,0)**2+Math.max(Math.abs(z-o.z)-o.hz,0)**2)<r*r);
}
/** Prevent tunneling through thin beds even if an update frame is delayed. */
export function sweepRooftop(start,end,r=ACTOR_RADIUS,obstacles=ROOF_OBSTACLES){
 const dx=end[0]-start[0],dz=end[1]-start[1],length=Math.hypot(dx,dz);
 if(length<1e-9)return [start[0],start[1]];
 const steps=Math.ceil(length/.15),vx=dx/steps,vz=dz/steps;
 let x=start[0],z=start[1];
 for(let i=0;i<steps;i++){
  const tx=x+vx,tz=z+vz;
  if(!collidesRooftop(tx,tz,r,obstacles)){x=tx;z=tz;continue;}
  // Axis sliding is permitted only if that axis ACTUALLY moves.
  if(Math.abs(vx)>.00001&&!collidesRooftop(tx,z,r,obstacles)){x=tx;continue;}
  if(Math.abs(vz)>.00001&&!collidesRooftop(x,tz,r,obstacles)){z=tz;continue;}
  break;
 }
 return [x,z];
}
export function nearestOpenRooftop(pt,r=ACTOR_RADIUS,obstacles=ROOF_OBSTACLES){
 if(!collidesRooftop(pt[0],pt[1],r,obstacles))return [...pt];
 for(let dist=.65;dist<=7.8;dist+=.5)for(let j=0;j<32;j++){
  const a=j*Math.PI*2/32,x=pt[0]+Math.cos(a)*dist,z=pt[1]+Math.sin(a)*dist;
  if(!collidesRooftop(x,z,r,obstacles))return [x,z];
 }
 return null;
}
export function planCollisionFreeRoofPath(start,end,r=ACTOR_RADIUS,obstacles=ROOF_OBSTACLES){
 const goal=nearestOpenRooftop(end,r,obstacles);if(!goal)return [];
 const origin=nearestOpenRooftop(start,r,obstacles);if(!origin)return [];
 const cell=1.15,side=Math.floor((ROOF_LIMIT-r)*2/cell)+1;
 const toIndex=pt=>[Math.max(0,Math.min(side-1,Math.round((pt[0]+ROOF_LIMIT-r)/cell))),Math.max(0,Math.min(side-1,Math.round((pt[1]+ROOF_LIMIT-r)/cell)))];
 const toPoint=(x,z)=>[-ROOF_LIMIT+r+x*cell,-ROOF_LIMIT+r+z*cell];
 let [sx,sz]=toIndex(origin);const id=(x,z)=>x*side+z;
 if(collidesRooftop(...toPoint(sx,sz),r,obstacles)){
  let best=null;for(let i=0;i<side;i++)for(let j=0;j<side;j++){
   const p=toPoint(i,j),d=Math.hypot(p[0]-origin[0],p[1]-origin[1]);
   if(d<3&&!collidesRooftop(...p,r,obstacles)&&(!best||d<best.d))best={i,j,d};
  }
  if(!best)return [];[sx,sz]=[best.i,best.j];
 }
 // A destination may be safe while its snapped grid-cell center isn't.
 // Find a reachable collision-free lattice point close enough for a safe final step.
 const destinations=[];
 for(let gx=0;gx<side;gx++)for(let gz=0;gz<side;gz++){
  const p=toPoint(gx,gz),distance=Math.hypot(p[0]-goal[0],p[1]-goal[1]);
  if(distance>3.5||collidesRooftop(...p,r,obstacles))continue;
  const linked=sweepRooftop(p,goal,r,obstacles);
  if(Math.hypot(linked[0]-goal[0],linked[1]-goal[1])<.06)destinations.push({x:gx,z:gz,distance});
 }
 destinations.sort((a,b)=>a.distance-b.distance);
 if(!destinations.length)return [];
 const {x:ex,z:ez}=destinations[0];
 const startId=id(sx,sz),endId=id(ex,ez);
 const dist=new Map([[startId,0]]),came=new Map(),open=[{x:sx,z:sz,f:0}],visited=new Set();
 let found=false;
 for(let iterations=0;open.length&&iterations<side*side*6;iterations++){
  open.sort((a,b)=>a.f-b.f);const {x,z}=open.shift(),key=id(x,z);if(visited.has(key))continue;visited.add(key);
  if(key===endId){found=true;break;}
  for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=side||nz>=side)continue;
   const p=toPoint(nx,nz);if(collidesRooftop(p[0],p[1],r,obstacles))continue;
   if(dx&&dz){const p1=toPoint(nx,z),p2=toPoint(x,nz);if(collidesRooftop(...p1,r,obstacles)||collidesRooftop(...p2,r,obstacles))continue;}
   const k=id(nx,nz),newCost=dist.get(key)+Math.hypot(dx,dz);
   if(newCost<(dist.get(k)??Infinity)){dist.set(k,newCost);came.set(k,key);open.push({x:nx,z:nz,f:newCost+Math.hypot(nx-ex,nz-ez)});}
  }
 }
 if(!found)return [];
 const path=[];let cur=endId;
 while(cur!==startId){const x=Math.floor(cur/side),z=cur%side;path.push(toPoint(x,z));cur=came.get(cur);if(cur===undefined)return [];}
 path.reverse();path.push(goal);
 // Path smoothing may only remove corners when the entire swept capsule is free.
 const smooth=[];let previous=origin,i=0;
 while(i<path.length){let best=i;for(let j=path.length-1;j>i;j--){const candidate=path[j];const moved=sweepRooftop(previous,candidate,r,obstacles);if(Math.hypot(moved[0]-candidate[0],moved[1]-candidate[1])<.09){best=j;break;}}
  smooth.push(path[best]);previous=path[best];i=best+1;
 }
 return smooth;
}
