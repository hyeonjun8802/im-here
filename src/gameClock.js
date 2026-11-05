/** AFTERDAY accelerated gameplay clock.
 * At 1x, 24 game hours last exactly 10 minutes of ACTIVE play.
 * Inactive tabs / closed sessions pause to prevent offline survival death.
 */
export const GAME_DAY_REAL_MS=10*60*1000;
export const GAME_CLOCK_RATE=24*60*60*1000/GAME_DAY_REAL_MS; // 144 game ms per active real ms
export const GAME_CLOCK_SCHEMA=3;
export const GAME_SPEEDS=Object.freeze([1,2,4,8,16,32,50]);
export const clampGameSpeed=value=>GAME_SPEEDS.includes(Number(value))?Number(value):1;
export class GameClock{
  constructor(realNow,offsetMs=0,lastSavedRealAtMs=null){
    const n=Number(realNow)||0;
    const anchor=Number(lastSavedRealAtMs);
    const saved=Number(offsetMs);
    const hasAnchor=lastSavedRealAtMs!==null&&Number.isFinite(anchor)&&anchor>0;
    // Recover the exact game-time snapshot from a v2/v3 save. No offline
    // fast-forward; old survivors, ruins and progress remain unchanged.
    this.virtualNow=(hasAnchor?anchor:n)+(Number.isFinite(saved)?saved:0);
    this.lastRealNow=n;
    this.speed=1;
  }
  setSpeed(value){this.speed=clampGameSpeed(value);return this.speed;}
  cycleSpeed(){const i=GAME_SPEEDS.indexOf(this.speed);return this.setSpeed(GAME_SPEEDS[(i+1)%GAME_SPEEDS.length]);}
  tick(realNow,foreground=true){
    const now=Number(realNow)||this.lastRealNow;
    const elapsed=Math.max(0,now-this.lastRealNow);
    // Ignore browser sleep / tab suspension jumps. Active time alone
    // advances the 10-minute day; speed overlays do not accumulate offline.
    if(foreground)this.virtualNow+=Math.min(elapsed,1000)*GAME_CLOCK_RATE*this.speed;
    this.lastRealNow=Math.max(this.lastRealNow,now);
    return this.virtualNow;
  }
  offset(realNow=this.lastRealNow){
    // Signed offset is intentional: after a paused background session the
    // virtual timeline may be earlier than the wall-clock timestamp.
    return Math.round(this.virtualNow-(Number(realNow)||0));
  }
}
