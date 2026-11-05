import {SAVE_KEY,defaults} from './simulation.js';

export function createFreshRestartState(now=Date.now()){
  const fresh=defaults(now);
  fresh.gameClockOffsetMs=0;
  fresh.gameClockSavedRealAtMs=now;
  fresh.clockSchema=3;
  fresh.survivalStatus='alive';
  fresh.diedAt=0;
  fresh.deathCause='';
  return fresh;
}

export function persistFreshRestart(storage,now=Date.now()){
  const fresh=createFreshRestartState(now);
  storage.setItem(SAVE_KEY,JSON.stringify(fresh));
  return fresh;
}
