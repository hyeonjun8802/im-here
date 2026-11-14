/** AFTERDAY QA auto-player.
 * Only returns existing survival actions. Never grants loot, bypasses cooldowns,
 * changes the simulation clock, or writes a save/UI state.
 * High-stakes companion invitations and ration negotiations remain manual.
 */
import {emergencyExploreAvailability,getDay} from './simulation.js';
import {WEATHER_WATER_CAPACITY} from './weatherEconomy.js';

export const AUTO_ACTION_INTERVAL_MS=1250;

/** Autoplay may spend items immediately, but must not restart the survivor's
 * walk/sit/sleep animation for every successful action at 50× speed.
 * Actual emergencies alone may interrupt an ongoing visual activity. */
export function shouldAutoAnimateSurvivor(life,action){
  if(action==='take_cover')return true;
  return !life||life.stage==='idle'||life.stage==='done';
}

export function selectAutoScavenge(s){
  if(!s?.scavenge?.pending)return null;
  // Choose a real, existing quest outcome; never roll rewards here.
  if(s.supply?.parts<1&&Math.min(s.facilities?.tank??100,s.facilities?.shelter??100)<40)
    return 'scavenge_salvage';
  return (s.health<72&&(s.supply?.water??0)>=3)?'scavenge_scout':'scavenge_go';
}

export function planAutoSurvivalAction(s,now){
  if(!s||s.survivalStatus==='dead'||!Number.isFinite(now))return null;
  const supply=s.supply||{};
  const facilities=s.facilities||{};
  const kit=s.kit||{};
  const day=getDay(s.startedAt,now);
  const tornado=s.weather==='tornado'&&s.tornadoEncounterActive&&
    s.tornadoRoofImpactEncounter!==s.tornadoEncounter;

  // Stop imminent irreversible damage before spending resources elsewhere.
  if(tornado&&!s.tornadoCoverActive)return 'take_cover';
  if(tornado&&!s.tornadoSuppliesSecured&&(supply.parts??0)>=1)return 'secure_supplies';
  if(s.raiderAlert&&(supply.parts??0)>=1)return 'secure_storage';

  // Do not spend the last stockpile unless a real need exists.
  if(s.water<38&&(supply.water??0)>=1)return 'drink';
  if(s.food<38&&(supply.food??0)>=1)return 'eat';
  if((s.sickness>=35||s.health<48)&&(supply.medicine??0)>=1)return 'medicine';
  if((facilities.tank??100)<40&&(supply.parts??0)>=2)return 'repair_tank';

  // Treat one pending story expedition as the existing bottom supply button.
  // Do not dismiss, reroll, or postpone the underlying quest.
  const mission=selectAutoScavenge(s);
  if(mission)return mission;
  if(emergencyExploreAvailability(s,now).ready)return 'explore';

  if(['rain','storm'].includes(s.weather)&&
      (supply.water??0)<=Math.min(3,WEATHER_WATER_CAPACITY-2)&&
      (facilities.tank??0)>=40&&
      now>=(s.collectWaterCooldownAt??0)&&
      (kit.purifier||(supply.parts??0)>=3))
    return 'collect_water';

  // Existing radio limit is once per game day. A new survivor request remains
  // a human decision; the controller will defer its dialog, not choose for them.
  if(kit.radio&&s.scavenge?.radioLastDay!==day)return 'radio_contact';

  // Bare-concrete rest in storms can add sickness: avoid that false benefit.
  const unsafeSleep=['rain','storm','cold','dust','wildfire'].includes(s.weather);
  if(s.health<75&&now>=(s.restCooldownAt??0)&&(kit.tent||!unsafeSleep))
    return 'rest';

  // Normal repairs reserve two parts; the helper's own auto-repair has
  // priority at game-minute ticks and runs independently of this controller.
  const weakest=Math.min(facilities.tank??100,facilities.shelter??100,facilities.storage??100);
  if(weakest<44&&(supply.parts??0)>=4)return 'repair';
  return null;
}
