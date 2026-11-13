/** AFTERDAY v76 | Display-only survival story coordinator.
 * One lower message slot, no additional game state, timers, loot or saves.
 * A visible event/choice/equipment popup pauses its READ time instead of
 * discarding a chapter before the player can see it. */
export const NARRATIVE_QUEUE_LIMIT=3;
export const NARRATIVE_GAP_MS=400;
export class NarrativeQueueV76 {
 constructor(){
  this.queue=[];this.active=null;this.lastNow=null;this.nextAt=0;this.serial=0;
 }
 enqueue({text,key,kind='story',priority=1,durationMs=6500}={}){
  const value=String(text||'').trim();
  if(!value)return false;
  const id=String(key||`message:${++this.serial}`);
  if(this.active?.key===id||this.queue.some(item=>item.key===id))return false;
  const message={text:value,key:id,kind,priority,
    remainingMs:Math.max(3200,Math.min(9500,Number(durationMs)||6500)),
    order:++this.serial};
  // At 32–50× speed only the newest daily chapter is useful.
  if(kind==='daily'){
   this.queue=this.queue.filter(item=>item.kind!=='daily');
   if(this.active?.kind==='daily')this.active=null;
  }else if(this.active&&priority>this.active.priority){
   // A cinematic can interrupt ambience. Resume the interrupted text
   // later, unless a newer daily chapter supersedes it at high speed.
   if(this.active.remainingMs>250)this.queue.unshift(this.active);
   this.active=null;
  }
  this.queue.push(message);
  this.queue.sort((a,b)=>b.priority-a.priority||a.order-b.order);
  if(this.queue.length>NARRATIVE_QUEUE_LIMIT){
   // Drop the oldest lowest-priority waiting item; NEVER an urgent popup,
   // which is managed by the existing actionable notice board.
   const worst=Math.min(...this.queue.map(item=>item.priority));
   const drop=this.queue.findIndex(item=>item.priority===worst);
   const removed=this.queue.splice(drop,1)[0];
   return removed!==message;
  }
  return true;
 }
 tick(now,blocked=false){
  const t=Number(now);
  if(!Number.isFinite(t))return this.active&&!blocked?this.active:null;
  const delta=this.lastNow===null?0:Math.max(0,Math.min(t-this.lastNow,30000));
  this.lastNow=t;
  if(blocked)return null;
  if(this.active){
   this.active.remainingMs-=delta;
   if(this.active.remainingMs<=0){
    this.active=null;
    this.nextAt=t+NARRATIVE_GAP_MS;
   }
  }
  if(!this.active&&t>=this.nextAt){
   this.active=this.queue.shift()||null;
  }
  return this.active;
 }
 clear(){this.queue.length=0;this.active=null;this.lastNow=null;this.nextAt=0;}
}