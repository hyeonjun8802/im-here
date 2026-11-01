/** Lightweight visual lunar ephemeris for Seoul. It uses a low-precision
 * geocentric lunar orbit, not an observatory-grade moonrise forecast.
 * All timestamps are absolute; previewHour substitutes only the visual KST
 * clock, never game/survival state or localStorage.
 */
import {SEOUL_LAT,SEOUL_LON} from './solar.js';

const RAD=Math.PI/180;
const TAU=2*Math.PI;
const KST=9*3600000;
const DAY=86400000;
const J2000=Date.UTC(2000,0,1,12);
const NEW_MOON=Date.UTC(2000,0,6,18,14);
export const SYNODIC_MONTH=29.530588853;
const norm=x=>((x%TAU)+TAU)%TAU;
const unit=x=>((x%1)+1)%1;

export function previewEpochForSeoul(epochMs,previewHour=null){
 if(!Number.isFinite(epochMs))throw new Error('Invalid epoch');
 if(previewHour===null)return epochMs;
 if(!Number.isFinite(previewHour)||previewHour<0||previewHour>24)throw new Error('Invalid preview hour');
 const current=new Date(epochMs+KST);
 return Date.UTC(current.getUTCFullYear(),current.getUTCMonth(),current.getUTCDate())-KST+previewHour*3600000;
}

export function moonPhaseAt(epochMs){
 if(!Number.isFinite(epochMs))throw new Error('Invalid lunar epoch');
 const phase=unit((epochMs-NEW_MOON)/(DAY*SYNODIC_MONTH));
 const illumination=(1-Math.cos(phase*TAU))*.5;
 const types=['삭(신월)','초승달','상현달','차오르는 달','보름달','기우는 달','하현달','그믐달'];
 const index=Math.floor(unit(phase+1/16)*8);
 return {phase,illumination,phaseName:types[index],waxing:phase<.5};
}

export function moonPositionForSeoul(epochMs,previewHour=null){
 const observedAt=previewEpochForSeoul(epochMs,previewHour);
 const days=(observedAt-J2000)/DAY;
 // Low-precision lunar elements (mean longitude, anomaly, argument of latitude).
 const L=(218.316+13.176396*days)*RAD;
 const M=(134.963+13.064993*days)*RAD;
 const F=(93.272+13.229350*days)*RAD;
 const longitude=L+6.289*RAD*Math.sin(M);
 const latitude=5.128*RAD*Math.sin(F);
 const obliquity=23.4397*RAD;
 const rightAscension=Math.atan2(Math.sin(longitude)*Math.cos(obliquity)-Math.tan(latitude)*Math.sin(obliquity),Math.cos(longitude));
 const declination=Math.asin(Math.sin(latitude)*Math.cos(obliquity)+Math.cos(latitude)*Math.sin(obliquity)*Math.sin(longitude));
 const hourAngle=(280.16+360.9856235*days+SEOUL_LON)*RAD-rightAscension;
 const lat=SEOUL_LAT*RAD;
 const altitude=Math.asin(Math.sin(lat)*Math.sin(declination)+Math.cos(lat)*Math.cos(declination)*Math.cos(hourAngle));
 const azimuth=norm(Math.atan2(Math.sin(hourAngle),Math.cos(hourAngle)*Math.sin(lat)-Math.tan(declination)*Math.cos(lat))+Math.PI);
 return {observedAt,altitude,azimuth,moonUp:altitude>0,...moonPhaseAt(observedAt)};
}
