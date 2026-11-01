/** Seasonal solar position, Seoul 37.5665N / 126.9780E, time zone Asia/Seoul.
 * NOAA approximation. Visual lighting only; it NEVER mutates saved game time.
 */
const DEG=Math.PI/180;
const KST_MS=9*60*60*1000;
export const SEOUL_LAT=37.5665;
export const SEOUL_LON=126.9780;

export function solarPositionForSeoul(epochMs,previewHour=null){
 if(!Number.isFinite(epochMs))throw new Error('Invalid epoch');
 const at=new Date(epochMs+KST_MS);
 const year=at.getUTCFullYear();
 const start=Date.UTC(year,0,1);
 const ordinal=Math.floor((Date.UTC(year,at.getUTCMonth(),at.getUTCDate())-start)/86400000)+1;
 const hour=previewHour===null
  ?at.getUTCHours()+at.getUTCMinutes()/60+at.getUTCSeconds()/3600
  :previewHour;
 const gamma=2*Math.PI/365*(ordinal-1+(hour-12)/24);
 const eq=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
 const decl=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
 const solarMin=hour*60+eq+4*SEOUL_LON-60*9;
 const ha=(solarMin/4-180)*DEG;
 const lat=SEOUL_LAT*DEG;
 const altitude=Math.asin(Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(ha));
 const azimuth=(Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat))+Math.PI+2*Math.PI)%(2*Math.PI);
 return {altitude,azimuth,declination:decl,hour,ordinal,sunUp:altitude>0};
}
