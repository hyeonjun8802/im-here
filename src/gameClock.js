/** AFTERDAY game-day clock: 24 in-game hours elapse in 4 real hours.
 * The multiplier applies while the page is visible and while it is closed.
 * Foreground 2x/4x/8x/16x/32x/50x controls are additional temporary multipliers.
 */
export const GAME_DAY_REAL_MS=4*60*60*1000;
export const GAME_CLOCK_RATE=24*60*60*1000/GAME_DAY_REAL_MS; // 6x
export const GAME_CLOCK_SCHEMA=2;
export const GAME_SPEEDS=Object.freeze([1,2,4,8,16,32,50]);
export const clampGameSpeed=value=>GAME_SPEEDS.includes(Number(value))?Number(value):1;
export class GameClock{
  constructor(realNow,offsetMs=0,lastSavedRealAtMs=null){
    const n=Number(realNow)||0;
    const saved=Number(offsetMs);
    const anchor=Number(lastSavedRealAtMs);
    // Older saves have no real-time anchor. Never retroactively fast-forward
    // their full history at 6x; only accelerate from the first migrated load.
    const away=lastSavedRealAtMs!==null&&Number.isFinite(anchor)&&anchor>0?
      Math.max(0,n-anchor):0;
    this.virtualNow=n+(Number.isFinite(saved)?Math.max(0,saved):0)+
      away*(GAME_CLOCK_RATE-1);
    this.lastRealNow=n;
    this.speed=1;
  }
  setSpeed(value){this.speed=clampGameSpeed(value);return this.speed;}
  cycleSpeed(){const i=GAME_SPEEDS.indexOf(this.speed);return this.setSpeed(GAME_SPEEDS[(i+1)%GAME_SPEEDS.length]);}
  tick(realNow,foreground=true){
    const now=Number(realNow)||this.lastRealNow;
    const elapsed=Math.max(0,now-this.lastRealNow);
    // Base sixfold game calendar continues offline. The player's 2x/4x/8x/16x/32x/50x
    // button only adds acceleration during actual active foreground frames.
    const extra=foreground?Math.min(elapsed,250)*GAME_CLOCK_RATE*(this.speed-1):0;
    this.virtualNow+=elapsed*GAME_CLOCK_RATE+extra;
    this.lastRealNow=Math.max(this.lastRealNow,now);
    return this.virtualNow;
  }
  offset(realNow=this.lastRealNow){return Math.max(0,Math.round(this.virtualNow-(Number(realNow)||0)));}
}
