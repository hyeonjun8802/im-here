/* AFTERDAY v108 | HTML bubble following the ACTUAL animated GLB Head bone.
 * One DOM node; no sprite portrait, image replacement, WebGL draw call, or
 * fixed screen-center caption. The camera and gameplay remain untouched. */
import * as THREE from 'three';

const intersect=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function chooseSpeechBubblePlacement({
 anchorX,anchorY,width,height,viewWidth,viewHeight,top=8,bottom=viewHeight-8,
 obstacles=[]
}={}){
 if(![anchorX,anchorY,width,height,viewWidth,viewHeight,top,bottom].every(Number.isFinite))return null;
 if(anchorX<-12||anchorX>viewWidth+12||anchorY<top||anchorY>bottom)return null;
 if(width<=0||height<=0||bottom-top<height+12)return null;
 const gap=14,edge=10;
 const positions=[
  {x:anchorX+gap,y:anchorY-height-gap,side:'right'},
  {x:anchorX-width-gap,y:anchorY-height-gap,side:'left'},
  {x:anchorX+gap,y:anchorY+gap,side:'right-below'},
  {x:anchorX-width-gap,y:anchorY+gap,side:'left-below'},
  {x:anchorX-width/2,y:anchorY-height-22,side:'above'}
 ];
 for(const pos of positions){
  const rect={x:Math.round(pos.x),y:Math.round(pos.y),w:width,h:height};
  if(rect.x<edge||rect.x+rect.w>viewWidth-edge||rect.y<top||rect.y+rect.h>bottom)continue;
  if(obstacles.some(o=>intersect(rect,o)))continue;
  return {x:rect.x,y:rect.y,side:pos.side};
 }
 return null;
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
  this.node.hidden=true;
  this.node.dataset.tone='ambient';
  doc.body.appendChild(this.node);
  this.headPosition=new THREE.Vector3();
  this.screenPosition=new THREE.Vector3();
  this.cameraForward=new THREE.Vector3();
  this.until=0;this.text='';
 }
 show(thought,realNow=Date.now()){
  const text=String(thought?.text||'').trim();
  if(!text)return false;
  this.text=text;this.node.textContent=text;
  this.node.dataset.tone=thought.group==='danger'?'danger':'ambient';
  this.node.hidden=false;
  this.node.classList.remove('is-positioned');
  this.until=realNow+(thought.group==='danger'?4600:3900);
  return true;
 }
 hide(){
  this.node.classList.remove('is-positioned');
  this.node.hidden=true;
 }
 update(world,realNow=Date.now(),blocked=false){
  if(blocked||realNow>=this.until||!this.text){this.hide();return false;}
  const bearded=world?.beardedSurvivor;
  // Do not draw a speech bubble beside an invisible fallback or loading avatar.
  const head=bearded?.status==='ready'?bearded?.nodes?.Head:null;
  const camera=world?.camera,canvas=world?.canvas;
  if(!head||!camera||!canvas){this.hide();return false;}
  head.getWorldPosition(this.headPosition);
  this.headPosition.y+=.35;
  this.cameraForward.copy(this.headPosition).sub(camera.position);
  camera.getWorldDirection(this.screenPosition);
  if(this.cameraForward.dot(this.screenPosition)<=.01){this.hide();return false;}
  this.screenPosition.copy(this.headPosition).project(camera);
  if(!Number.isFinite(this.screenPosition.x)||!Number.isFinite(this.screenPosition.y)||
   this.screenPosition.z<-1||this.screenPosition.z>1){this.hide();return false;}
  const r=canvas.getBoundingClientRect();
  const vw=this.doc.defaultView?.innerWidth||r.width;
  const vh=this.doc.defaultView?.innerHeight||r.height;
  const x=r.left+(this.screenPosition.x+1)*r.width*.5;
  const y=r.top+(1-this.screenPosition.y)*r.height*.5;
  const selectors=[
   '#disaster-forecast','.survival-quick-info','.top-right',
   '.actionbar','.left-status','#survival-kit',
   '#survival-chapter.is-visible','#log[data-active="true"]','#warning'
  ];
  const obstacles=[];
  for(const selector of selectors){
   const rect=visibleRect(this.doc.querySelector(selector));
   if(rect)obstacles.push(rect);
  }
  const forecast=visibleRect(this.doc.querySelector('#disaster-forecast'));
  const actionbar=visibleRect(this.doc.querySelector('.actionbar'));
  const top=Math.max(10,forecast?forecast.y+forecast.h+8:10);
  const bottom=Math.min(vh-12,actionbar?actionbar.y-9:vh-12);
  const width=this.node.offsetWidth,height=this.node.offsetHeight;
  const result=chooseSpeechBubblePlacement({
   anchorX:x,anchorY:y,width,height,viewWidth:vw,viewHeight:vh,top,bottom,obstacles
  });
  if(!result){this.hide();return false;}
  this.node.style.transform='translate3d('+result.x+'px,'+result.y+'px,0)';
  this.node.dataset.side=result.side;
  this.node.hidden=false;
  this.node.classList.add('is-positioned');
  return true;
 }
 dispose(){this.node.remove();this.text='';}
}