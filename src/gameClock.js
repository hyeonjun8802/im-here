/** AFTERDAY accelerated gameplay clock.
 * Foreground 1x: 24 game hours per 10 real minutes. Opt-in background time:
 * one game hour per real hour, capped at 8 real hours between visits.
 */
export const GAME_DAY_REAL_MS=10*60*1000;
export const GAME_CLOCK_RATE=24*60*60*1000/GAME_DAY_REAL_MS; // 144 game ms per active real ms
export const GAME_CLOCK_SCHEMA=3;
export const MAX_BACKGROUND_REAL_MS=8*60*60*1000;
export const offlineElapsedMs=(savedAt,realNow)=>{
 const elapsed=Number(realNow)-Number(savedAt);
 return Number.isFinite(elapsed)?Math.min(MAX_BACKGROUND_REAL_MS,Math.max(0,elapsed)):0;
};
export const GAME_SPEEDS=Object.freeze([1,2,4,8,16,32,50]);
export const clampGameSpeed=value=>GAME_SPEEDS.includes(Number(value))?Number(value):1;
export class GameClock{
  constructor(realNow,offsetMs=0,lastSavedRealAtMs=null,{progressWhileAway=false}={}){
    const n=Number(realNow)||0;
    const anchor=Number(lastSavedRealAtMs);
    const saved=Number(offsetMs);
    const hasAnchor=lastSavedRealAtMs!==null&&Number.isFinite(anchor)&&anchor>0;
    // Legacy callers keep paused semantics unless explicitly enabled.
    this.progressWhileAway=Boolean(progressWhileAway);
    this.virtualNow=(hasAnchor?anchor:n)+(Number.isFinite(saved)?saved:0)
      +(this.progressWhileAway&&hasAnchor?offlineElapsedMs(anchor,n):0);
    this.lastRealNow=n;
    this.speed=1;
  }
  setSpeed(value){this.speed=clampGameSpeed(value);return this.speed;}
  cycleSpeed(){const i=GAME_SPEEDS.indexOf(this.speed);return this.setSpeed(GAME_SPEEDS[(i+1)%GAME_SPEEDS.length]);}
  tick(realNow,foreground=true){
    const now=Number(realNow)||this.lastRealNow;
    const elapsed=Math.max(0,now-this.lastRealNow);
    // A closed or suspended browser cannot execute a game loop. On return,
    // advance only by real elapsed time, never by the active 2x/50x speed.
    if(foreground)this.virtualNow+=Math.min(elapsed,1000)*GAME_CLOCK_RATE*this.speed;
    else if(this.progressWhileAway)this.virtualNow+=Math.min(elapsed,MAX_BACKGROUND_REAL_MS);
    this.lastRealNow=Math.max(this.lastRealNow,now);
    return this.virtualNow;
  }
  offset(realNow=this.lastRealNow){
    // Signed offset is intentional: after a paused background session the
    // virtual timeline may be earlier than the wall-clock timestamp.
    return Math.round(this.virtualNow-(Number(realNow)||0));
  }
}
