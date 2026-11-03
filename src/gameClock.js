/** AFTERDAY accelerated in-game clock.
 * Real elapsed time always counts once, including while a page was inactive.
 * The extra acceleration applies only to active foreground frames, so a tab
 * returning from sleep cannot suddenly consume days of food or cause hazards.
 */
export const GAME_SPEEDS=Object.freeze([1,2,4]);
export const clampGameSpeed=value=>GAME_SPEEDS.includes(Number(value))?Number(value):1;
export class GameClock{
  constructor(realNow,offsetMs=0){
    const n=Number(realNow)||0;
    const saved=Number(offsetMs);
    this.virtualNow=n+(Number.isFinite(saved)?Math.max(0,saved):0);
    this.lastRealNow=n;
    this.speed=1;
  }
  setSpeed(value){this.speed=clampGameSpeed(value);return this.speed;}
  cycleSpeed(){const i=GAME_SPEEDS.indexOf(this.speed);return this.setSpeed(GAME_SPEEDS[(i+1)%GAME_SPEEDS.length]);}
  tick(realNow,foreground=true){
    const now=Number(realNow)||this.lastRealNow;
    const elapsed=Math.max(0,now-this.lastRealNow);
    // The first 250ms of a visible frame can be sped up. Large browser gaps
    // (background/sleep) are only charged at 1x.
    const extra=foreground?Math.min(elapsed,250)*(this.speed-1):0;
    this.virtualNow+=elapsed+extra;
    this.lastRealNow=Math.max(this.lastRealNow,now);
    return this.virtualNow;
  }
  offset(realNow=this.lastRealNow){return Math.max(0,Math.round(this.virtualNow-(Number(realNow)||0)));}
}
