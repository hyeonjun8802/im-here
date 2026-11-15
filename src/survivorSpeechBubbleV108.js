/* AFTERDAY v110 | Frame-synchronous speech anchored to animated GLB Head.
 * One HTML node. No 3D image, new render pass, mutations of game state,
 * and no fixed HUD captions. All placement is viewport-relative CSS pixels. */
import * as THREE from 'three';

const intersect=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function chooseSpeechBubblePlacement({
 anchorX,anchorY,width,height,viewWidth,viewHeight,top=8,bottom=viewHeight-8,
 obstacles=[],preferredSide=null
}={}){
 if(![anchorX,anchorY,width,height,viewWidth,viewHeight,top,bottom].every(Number.isFinite))return null;
 // A genuine on-screen head can graze the HUD by a few pixels. Never move
 // a far-off character's thought into the middle of the viewport.
 if(anchorX<-12||anchorX>viewWidth+12||
    anchorY<Math.max(-12,top-40)||anchorY>Math.min(viewHeight+12,bottom+40))return null;
 if(width<=0||height<=0||bottom-top<height+12)return null;
 const gap=7,edge=10;
 // Prefer centered over the head. Old behavior used the first right-hand
 // candidate (anchorX+14), leaving a long horizontal disconnect.
 const positions=[
  {x:anchorX-width*.5,y:anchorY-height-gap,side:'above'},
  {x:anchorX-width*.5,y:Math.max(anchorY+gap,top+4),side:'below'},
  {x:anchorX-width*.68,y:anchorY-height-gap,side:'above-left'},
  {x:anchorX-width*.32,y:anchorY-height-gap,side:'above-right'},
  {x:anchorX+gap,y:anchorY-height*.60,side:'right'},
  {x:anchorX-width-gap,y:anchorY-height*.60,side:'left'},
  {x:anchorX-width*.5,y:Math.max(anchorY+gap,bottom-height-4),side:'below'}
 ];
 const valid=positions.filter(pos=>{
  const rect={x:pos.x,y:pos.y,w:width,h:height};
  return rect.x>=edge&&rect.x+rect.w<=viewWidth-edge&&
   rect.y>=top&&rect.y+rect.h<=bottom&&
   !obstacles.some(o=>intersect(rect,o));
 });
 if(!valid.length)return null;
 // Keep an already valid orientation to avoid frame-to-frame flipping when
 // the head brushes the edge of a HUD region.
 return valid.find(pos=>pos.side===preferredSide)||valid[0];
}
const visibleRect=el=>{
 if(!el||el.hidden)return null;
 const style=globalThis.getComputedStyle?.(el);
 if(style?.display==='none'||style?.visibility==='hidden'||Number(style?.opacity)===0)return null;
 const r=el.getBoundingClientRect();
 return r.width>0&&r.height>0?{x:r.left,y:r.top,w:r.width,h:r.height}:null;
};
export class SurvivorSpeechBubbleV108{
 constructor({doc=document}={}){
  this.doc=doc;this.node=doc.createElement('div');
  this.node.id='survivor-speech-bubble';
  this.node.className='survivor-speech-bubble';
  this.node.setAttribute('role','presentation');
  this.node.setAttribute('aria-hidden','true');
  this.node.hidden=true;this.node.dataset.tone='ambient';
  doc.body.appendChild(this.node);
  this.headPosition=new THREE.Vector3();
  this.screenPosition=new THREE.Vector3();
  this.cameraForward=new THREE.Vector3();
  this.until=0;this.text='';this.lastHideReason='waiting';
  this.followX=null;this.followY=null;this.lastFollowAt=null;this.lastSide=null;
  this.layoutExpiresAt=0;this.cachedLayout=null;
 }
 show(thought,realNow=Date.now()){
  const text=String(thought?.text||'').trim();
  if(!text)return false;
  this.text=text;this.node.textContent=text;
  this.node.dataset.tone=thought.group==='danger'?'danger':'ambient';
  this.node.hidden=false;
  this.node.classList.remove('is-positioned');
  const durationMs=Number(thought?.durationMs);
  this.until=realNow+(Number.isFinite(durationMs)&&durationMs>0?
   Math.min(8000,Math.max(1400,durationMs)):(thought.group==='danger'?4600:3900));
  this.followX=null;this.followY=null;this.lastFollowAt=null;this.lastSide=null;
  this.layoutExpiresAt=0;
  return true;
 }
 hide(reason='blocked'){
  this.lastHideReason=reason;
  this.node.classList.remove('is-positioned');
  this.node.hidden=true;
 }
 getLayout(realNow,vw,vh){
  if(this.cachedLayout&&realNow<this.layoutExpiresAt&&
    this.cachedLayout.viewWidth===vw&&this.cachedLayout.viewHeight===vh)return this.cachedLayout;
  const selectors=[
   '#disaster-forecast','.survival-quick-info','.top-right',
   '.actionbar','.left-status','#survival-kit',
   '#survival-chapter.is-visible','#log[data-active="true"]','#warning',
   '.afterday-board:not(.is-choice)'
  ];
  const obstacles=[];
  for(const selector of selectors){
   const rect=visibleRect(this.doc.querySelector(selector));
   if(rect)obstacles.push(rect);
  }
  const forecast=visibleRect(this.doc.querySelector('#disaster-forecast'));
  const actionbar=visibleRect(this.doc.querySelector('.actionbar'));
  this.cachedLayout={
   viewWidth:vw,viewHeight:vh,
   width:this.node.offsetWidth,height:this.node.offsetHeight,
   top:Math.max(10,forecast?forecast.y+forecast.h+8:10),
   bottom:Math.min(vh-12,actionbar?actionbar.y-9:vh-12),
   obstacles
  };
  // Head tracking runs each render frame; DOM layout/HUD queries do not.
  this.layoutExpiresAt=realNow+180;
  return this.cachedLayout;
 }
 update(world,realNow=Date.now(),blocked=false){
  if(blocked){this.hide('modal');return false;}
  if(realNow>=this.until||!this.text){this.hide('expired');return false;}
  const bearded=world?.beardedSurvivor;
  const head=bearded?.status==='ready'?bearded?.nodes?.Head:null;
  const camera=world?.camera,canvas=world?.canvas;
  if(!camera||!canvas||(!head&&!world?.survivor)){
   this.hide('no-character');return false;
  }
  if(head){
   head.updateWorldMatrix(true,false);
   head.getWorldPosition(this.headPosition);
   this.headPosition.y+=.42;
  }else{
   world.survivor.updateWorldMatrix?.(true,false);
   world.survivor.getWorldPosition(this.headPosition);
   this.headPosition.y+=3.15;
  }
  this.cameraForward.copy(this.headPosition).sub(camera.position);
  camera.getWorldDirection(this.screenPosition);
  if(this.cameraForward.dot(this.screenPosition)<=.01){
   this.hide('behind-camera');return false;
  }
  this.screenPosition.copy(this.headPosition).project(camera);
  if(!Number.isFinite(this.screenPosition.x)||!Number.isFinite(this.screenPosition.y)||
   this.screenPosition.z<-1||this.screenPosition.z>1){
   this.hide('outside-frustum');return false;
  }
  const r=canvas.getBoundingClientRect();
  const vw=this.doc.defaultView?.innerWidth||r.width;
  const vh=this.doc.defaultView?.innerHeight||r.height;
  const anchorX=r.left+(this.screenPosition.x+1)*r.width*.5;
  const anchorY=r.top+(1-this.screenPosition.y)*r.height*.5;
  // A temporarily hidden bubble must become measurable again. Otherwise
  // offsetWidth=0 traps it in the invisible state forever.
  this.node.hidden=false;
  const layout=this.getLayout(realNow,vw,vh);
  const result=chooseSpeechBubblePlacement({
   anchorX,anchorY,width:layout.width,height:layout.height,
   viewWidth:vw,viewHeight:vh,top:layout.top,bottom:layout.bottom,
   obstacles:layout.obstacles,preferredSide:this.lastSide
  });
  if(!result){this.hide('no-safe-space');return false;}
  // Damping is based on elapsed REAL time, not game speed. At 60fps it
  // smooths animation jitter without the former ~12.5fps stepping.
  const dt=this.lastFollowAt===null?0:Math.min(64,Math.max(1,realNow-this.lastFollowAt));
  const distance=this.followX===null?Infinity:
   Math.hypot(result.x-this.followX,result.y-this.followY);
  const snap=this.followX===null||this.lastSide!==result.side||distance>100;
  if(snap){
   this.followX=result.x;this.followY=result.y;
  }else{
   const alpha=1-Math.exp(-dt/38);
   this.followX+=(result.x-this.followX)*alpha;
   this.followY+=(result.y-this.followY)*alpha;
  }
  this.lastFollowAt=realNow;this.lastSide=result.side;
  this.node.style.transform='translate3d('+
   this.followX.toFixed(2)+'px,'+this.followY.toFixed(2)+'px,0)';
  // The tail points back to the actual projected head, not to a hardcoded
  // left/right padding coordinate which causes the detached comic bubble.
  const tailX=Math.min(layout.width-11,Math.max(11,anchorX-this.followX));
  this.node.style.setProperty?.('--speech-tail-x',tailX.toFixed(2)+'px');
  this.node.dataset.side=result.side;
  this.node.classList.add('is-positioned');
  this.lastHideReason=null;
  return true;
 }
 dispose(){this.node.remove();this.text='';}
}