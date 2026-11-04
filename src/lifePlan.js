/** AFTERDAY v1.1 survivor activity director's deterministic, testable scheduling policy.
 * Visual activity selection never changes food, water, health or the survival clock.
 */
export const LIFE_ACTIVITIES = Object.freeze({
  sit:    {label:'의자에 앉기', spot:'fireside', duration:18, calm:true},
  eat:    {label:'식탁에서 식사', spot:'dining', duration:12, calm:true},
  drink:  {label:'식수 마시기', spot:'tank', duration:9, calm:true},
  guitar: {label:'통기타와 허밍', spot:'fireside', duration:24, calm:true},
  cook:   {label:'모닥불 요리 준비', spot:'cooking', duration:14, calm:true},
  stretch:{label:'가벼운 스트레칭', spot:'overlook', duration:12, calm:true},
  radio:  {label:'무전기 교신', spot:'radio', duration:16, calm:true},
  rest:   {label:'천막에서 쉬기', spot:'bed', duration:16, calm:true},
  medicine:{label:'응급 처치', spot:'shelter', duration:11, calm:true},
  repair: {label:'캠프 보수', spot:'workbench', duration:14, calm:true},
  install_tent: {label:'야전 텐트 설치 · 기둥 고정과 천막 펼치기',spot:'shelter',duration:9,calm:false},
  explore:{label:'긴급 탐색', spot:'stairwell', duration:18, calm:false},
  watch:  {label:'도시 관찰', spot:'overlook', duration:15, calm:true},
  shelter:{label:'재난 대피', spot:'shelter', duration:16, calm:false}
});
export const DAILY_SCHEDULE=Object.freeze([
  {from:5,to:8,sequence:['watch','stretch','radio','drink']},
  {from:8,to:12,sequence:['repair','radio','cook','watch']},
  {from:12,to:15,sequence:['sit','cook','radio','guitar']},
  {from:15,to:19,sequence:['watch','sit','guitar','stretch']},
  {from:19,to:23,sequence:['sit','guitar','radio','watch']},
  {from:23,to:29,sequence:['rest','sit','radio']}
]);
export function unsafeToLeisure(weather){return ['storm','tornado','rain'].includes(weather)}
export function nextAutonomousActivity(hour,weather,index=0,stats={}){
 if(unsafeToLeisure(weather))return 'shelter';
 if(stats?.water!=null && stats.water<28)return 'drink';
 if(stats?.food!=null && stats.food<25)return 'rest'; // no free food consumption in visual AI
 if(stats?.health!=null && stats.health<28)return 'rest';
 const h=((Number(hour)%24)+24)%24;
 const segment=DAILY_SCHEDULE.find(s=>h>=s.from&&h<s.to) || DAILY_SCHEDULE.at(-1);
 return segment.sequence[Math.abs(Math.floor(index))%segment.sequence.length];
}
export function activityAllowed(action,weather,manual=false){
 if(!LIFE_ACTIVITIES[action])return false;
 if(unsafeToLeisure(weather)&&LIFE_ACTIVITIES[action].calm&&action!=='drink'&&action!=='medicine'&&!manual)return false;
 if((weather==='tornado'||weather==='storm')&&['sit','guitar','watch','stretch','cook'].includes(action))return false;
 if(weather==='rain'&&['sit','guitar','watch','stretch'].includes(action))return false;
 return true;
}
export function phaseForProgress(distance,elapsed,duration){
 if(distance>.20)return 'approach';
 if(elapsed<.48)return 'enter';
 if(elapsed<duration)return 'perform';
 return 'complete';
}

/** Deterministic simple waypoint planner: avoids firepit, stairwell and water tank. */
export function planRooftopPath(start,end){
 const step=2,limit=20,blocked=(x,z)=>{
  if(Math.abs(x)>limit||Math.abs(z)>limit)return true;
  return [[2,3,2.1],[12,-.6,4],[16,-13,3.65]].some(([a,b,r])=>(x-a)**2+(z-b)**2<r*r);
 };
 const nearest=(x,z)=>[Math.max(-20,Math.min(20,Math.round(x/step)*step)),Math.max(-20,Math.min(20,Math.round(z/step)*step))];
 const S=nearest(start[0],start[1]),E=nearest(end[0],end[1]),key=(x,z)=>`${x},${z}`;
 const open=[[...S,0,0]],came=new Map(),cost=new Map([[key(...S),0]]),seen=new Set();
 let loops=0;
 while(open.length&&loops++<700){open.sort((a,b)=>a[3]-b[3]);const [x,z]=open.shift(),k=key(x,z);if(seen.has(k))continue;seen.add(k);
  if(Math.abs(x-E[0])<step&&Math.abs(z-E[1])<step){const list=[];let cur=k;while(cur!==key(...S)&&cur){list.push(cur.split(',').map(Number));cur=came.get(cur)}list.reverse();return [...list,[...end]]}
  for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){const nx=x+dx,nz=z+dz,nk=key(nx,nz);if(blocked(nx,nz)&&nk!==key(...E))continue;
   const next=(cost.get(k)??0)+1;if(next<(cost.get(nk)??Infinity)){cost.set(nk,next);came.set(nk,k);open.push([nx,nz,next,next+Math.hypot(nx-E[0],nz-E[1])*.5]);}}
 }
 return [[...end]];
}
