/** HUD-only REAL Chromium visual checks. The game HTML, CSS and actual SVG
 * resources are loaded verbatim; 3D city GLBs intentionally excluded because
 * they are unrelated to the reusable UI resources under test. */
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=path.resolve('docs/qa/unified-hud-v950');
fs.mkdirSync(out,{recursive:true});
const index=fs.readFileSync('index.html','utf8');
const start=index.indexOf('<header class="topbar">');
const end=index.indexOf('</header>',start);
if(start<0||end<0)throw Error('Original topbar markup missing');
const original=index.slice(start,end+9);
const base='http://127.0.0.1:5173/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const failed=[];const metrics=[];
try{
 for(const [screen,viewport] of [['mobile-small',{width:360,height:780}],['mobile',{width:390,height:844}],['mobile-wide',{width:430,height:932}],['desktop',{width:1440,height:900}]]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  await page.setContent(`<!doctype html><html lang="ko"><head><base href="${base}">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="${base}src/style.css">
    <style>html,body{margin:0;background:linear-gradient(#161b20,#343b39);min-height:100%}
    #hud{position:fixed;inset:0}</style></head><body><div id="hud">${original}</div></body></html>`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.disaster-forecast__frame');
  await page.evaluate(async()=>{
   const root=document.querySelector('#disaster-forecast');
   const icon=root.querySelector('.disaster-forecast__current');
   icon.classList.add('is-visible');
   for(const image of icon.querySelectorAll('img')){image.src='/assets/ui/weather-premium/clear.svg';image.classList.add('is-active');}
   const future=root.querySelector('.disaster-forecast__future');
   future.classList.add('is-visible');
   for(const image of future.querySelectorAll('img')){image.src='/assets/ui/weather-premium/dust.svg';image.classList.add('is-active');}
   root.dataset.currentDisaster='clear';
   document.getElementById('hud-disaster-name').textContent='모래폭풍';
   document.getElementById('hud-health-fill').style.width='82%';
   document.getElementById('hud-food-fill').style.width='71%';
   document.getElementById('hud-water-fill').style.width='64%';
   await document.fonts.ready;
  });
  await page.waitForFunction(()=>[...document.querySelectorAll('.disaster-forecast__frame,.disaster-forecast__current img,.disaster-forecast__future img')].every(im=>im.complete&&im.naturalWidth>0),{timeout:20000});
  for(const [step,x,progress,hours] of [['distant',90.40,0,24],['approaching',80,.5,12],['imminent',69.8,.96,1]]){
   await page.evaluate(({x,progress,hours})=>{
    const root=document.querySelector('#disaster-forecast');
    root.style.setProperty('--forecast-x',x+'%');
    root.querySelector('.disaster-forecast__bar').style.setProperty('--weather-bar-progress',Math.round(progress*100)+'%');
    root.dataset.weatherBarMode='forecast';
    document.getElementById('hud-disaster-eta').textContent=hours+'시간 후';
   },{x,progress,hours});
   await page.waitForTimeout(1050);
   const data=await page.evaluate(()=>{
    const rect=x=>{const r=document.querySelector(x).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
    const r=rect('#disaster-forecast'),icon=rect('.disaster-forecast__future'),center=rect('.disaster-forecast__current');
    const speed=rect('#speed-toggle'),frame=rect('.disaster-forecast__frame');
    const bar=rect('.disaster-forecast__bar'),fill=rect('.disaster-forecast__bar-fill');
    const stock=rect('.survival-hud-stock'),date=rect('.survival-hud-date'),vitals=rect('.survival-hud-vitals');
    const frameSource=document.querySelector('.disaster-forecast__frame').currentSrc;
    return {frame,icon,center,speed,bar,fill,stock,date,vitals,frameSource,aspect:frame.h/frame.w,centerGap:center.x-stock.right,
      barRatio:fill.w/bar.w,centerOffset:Math.abs(center.x+center.w/2-(r.x+r.w/2)),
      statsVisible:document.querySelectorAll('.survival-hud-stat').length===3,
      inventoryCells:document.querySelectorAll('.survival-hud-stock>div').length,
      oldBrand:Boolean(document.querySelector('.brand')),
      iconReady:document.querySelector('.disaster-forecast__future .is-active').naturalWidth>0};
   });
   metrics.push({screen,step,...data});
   if(!(data.iconReady&&data.statsVisible&&data.inventoryCells===4&&
       data.centerOffset<3&&Math.abs(data.aspect-(screen.startsWith('mobile')?.22:175/1600))<.005&&data.speed.y>=data.frame.bottom-1&&
       data.date.y>=data.frame.y+2&&data.stock.bottom<=data.frame.bottom-6&&data.centerGap>-3&&
       (screen.startsWith('mobile')?data.frameSource.includes('forecast_hud_mobile_v970.svg'):!data.frameSource.includes('forecast_hud_mobile_v970.svg'))&&
       Math.abs(data.barRatio-progress)<.04&&data.icon.w>0&&data.frame.w>screen.length)){
      failed.push({screen,step,data});
   }
   const filename=screen+'-'+step+'.png';
   await page.screenshot({path:path.join(out,filename),animations:'disabled',timeout:45000});
   console.log('UNIFIED HUD SCREENSHOT',filename,'future x',data.icon.x.toFixed(1),'width',data.icon.w.toFixed(1),'bar',data.barRatio.toFixed(2),'speed below',data.speed.y>=data.frame.bottom-1);
  }
  await page.close();
 }
 for(const screen of ['mobile-small','mobile','mobile-wide','desktop']){
  const seq=metrics.filter(x=>x.screen===screen).map(x=>x.icon);
  if(!(seq[0].x>seq[1].x&&seq[1].x>seq[2].x))failed.push({reason:'approaching icon must move left',seq});
  if(!(Math.abs(seq[0].w-seq[1].w)<.2&&Math.abs(seq[1].w-seq[2].w)<.2))failed.push({reason:'icon must maintain identical width',seq});
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({metrics,failed},null,2));
 if(failed.length)throw Error('Unified HUD QA failed '+JSON.stringify(failed).slice(0,4000));
 console.log('UNIFIED HUD VISUAL QA SUCCESS, 12 screenshots, aligned date/stock and constant-size left-moving icon.');
}catch(err){console.error('UNIFIED HUD VISUAL QA ERROR:',err);process.exitCode=1;}
finally{await browser.close();}
