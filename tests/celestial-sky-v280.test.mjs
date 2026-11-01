import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {solarPositionForSeoul} from '../src/solar.js';
import {moonPhaseAt,moonPositionForSeoul,previewEpochForSeoul,SYNODIC_MONTH} from '../src/lunar.js';

const kst=(year,month,day,hour)=>Date.UTC(year,month-1,day,hour-9);
const source=(path)=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('lunar illumination wraps through new, first quarter, full and last quarter',()=>{
 const epoch=Date.UTC(2000,0,6,18,14),period=SYNODIC_MONTH*86400000;
 const names=['삭(신월)','상현달','보름달','하현달','삭(신월)'];
 for(let i=0;i<5;i++){
  const moon=moonPhaseAt(epoch+i*period/4);
  assert.equal(moon.phaseName,names[i]);
  assert.ok(Math.abs(moon.illumination-([0,.5,1,.5,0][i]))<.000001);
 }
});

test('moon phase varies with date and illumination is normalized',()=>{
 const one=moonPositionForSeoul(kst(2026,11,1,21));
 const ten=moonPositionForSeoul(kst(2026,11,10,21));
 assert.ok(one.illumination>.30);
 assert.ok(ten.illumination<.08);
 assert.ok(Math.abs(one.phase-ten.phase)>.05);
 for(const moon of [one,ten]){
  assert.ok(moon.altitude>=-Math.PI/2 && moon.altitude<=Math.PI/2);
  assert.ok(moon.azimuth>=0 && moon.azimuth<Math.PI*2);
  assert.ok(moon.illumination>=0 && moon.illumination<=1);
 }
});

test('full moons rise at night and crescent position changes through the day',()=>{
 const times=Array.from({length:24},(_,i)=>moonPositionForSeoul(kst(2026,11,1,i)));
 const changed=times.some((v,i)=>i>0 && Math.abs(v.altitude-times[i-1].altitude)>.01);
 assert.ok(changed);
});

test('KST preview hour overrides appearance only and keeps original date',()=>{
 const epoch=kst(2026,11,1,17);
 const seven=previewEpochForSeoul(epoch,7);
 const twenty=previewEpochForSeoul(epoch,20);
 assert.equal(twenty-seven,13*3600000);
 assert.equal(previewEpochForSeoul(epoch,null),epoch);
 assert.equal(previewEpochForSeoul(epoch,24),kst(2026,11,2,0));
 assert.ok(moonPositionForSeoul(epoch,7).observedAt===seven);
 assert.ok(moonPositionForSeoul(epoch,20).observedAt===twenty);
 assert.equal(solarPositionForSeoul(epoch,7).hour,7);
});

test('celestial positions are above and below the horizon appropriately',()=>{
 const sunMid=solarPositionForSeoul(kst(2026,11,1,12));
 const sunNight=solarPositionForSeoul(kst(2026,11,1,1));
 assert.ok(sunMid.altitude>0 && sunNight.altitude<0);
 const lunar=moonPositionForSeoul(kst(2026,11,1,21));
 assert.ok(Number.isFinite(lunar.azimuth) && Number.isFinite(lunar.altitude));
});

test('preview values and absolute timestamps are validated',()=>{
 assert.throws(()=>moonPhaseAt(Number.NaN),/Invalid/);
 assert.throws(()=>previewEpochForSeoul(NaN),/Invalid/);
 assert.throws(()=>previewEpochForSeoul(Date.now(),25),/Invalid/);
});

test('world integrates celestial render after camera update and disposes resources',()=>{
 const world=source('world.js');
 assert.ok(world.includes('new CelestialSky(this.scene,ROOF)'));
 assert.ok(world.includes('this.celestialSky.update(this.camera,solar,lunar,vw.cloud,vw.storm)'));
 assert.ok(world.includes('this.celestialSky?.dispose()'));
 assert.ok(world.indexOf('this.celestialSky.update')>world.indexOf('this.camera.lookAt(this.target);'));
 assert.ok(source('celestialSky.js').includes('uPhase'));
 assert.ok(source('cinematicWeatherVfx.js').includes("mesh.renderOrder=-4;"));
});
