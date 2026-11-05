/** Real Chromium screenshots of the ACTUAL game HUD DOM, CSS and SVG assets.
 * Avoid loading the massive Three.js world: the forecast header must be readable
 * independently of the city assets. Capture 8/50/95% movement on two viewports. */
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const output=path.resolve('docs/qa/forecast-v940');
fs.mkdirSync(output,{recursive:true});
const index=fs.readFileSync('index.html','utf8');
const start=index.indexOf('<div id="disaster-forecast"');
const end=index.indexOf('</div><div class="top-right"',start);
if(start<0||end<0)throw Error('Cannot find the actual forecast HUD in index.html');
const forecastMarkup=index.slice(start,end+6);
const base='http://127.0.0.1:5173/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const failures=[];
try{
 for(const [screen,viewport] of [['mobile',{width:390,height:844}],['desktop',{width:1440,height:900}]]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  await page.setContent(`<!doctype html><html lang="ko"><head>
    <base href="${base}"><meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="${base}src/style.css">
    <style>html,body{margin:0;min-height:100%;background:linear-gradient(#101820,#28363a)}
    #hud{position:fixed;inset:0}</style></head>
    <body><div id="hud">${forecastMarkup}</div></body></html>`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#disaster-forecast .disaster-forecast__bar',{state:'attached',timeout:20000});
  await page.evaluate(async()=>{
    const root=document.querySelector('#disaster-forecast');
    for(const layer of root.querySelectorAll('.disaster-forecast__current .disaster-forecast__icon-layer')){
      layer.src='/assets/ui/disasters/clear-current.svg';layer.classList.add('is-active');
    }
    const future=root.querySelector('.disaster-forecast__future');
    future.classList.add('is-visible');
    for(const layer of future.querySelectorAll('.disaster-forecast__icon-layer')){
      layer.src='/assets/ui/disasters/dust-far.svg';layer.classList.add('is-active');
    }
    root.dataset.currentDisaster='clear';
    await document.fonts.ready;
  });
  await page.waitForFunction(()=>document.querySelector('.disaster-forecast__frame')?.naturalWidth>0,{timeout:20000});
  for(const [stage,progress] of [['early',.08],['middle',.50],['urgent',.95]]){
   const meta=await page.evaluate(progress=>{
    const root=document.querySelector('#disaster-forecast');
    const bar=root.querySelector('.disaster-forecast__bar');
    bar.style.setProperty('--weather-bar-progress',Math.round(progress*100)+'%');
    root.dataset.weatherBarMode='forecast';
    const rect=bar.getBoundingClientRect();
    const fill=bar.querySelector('.disaster-forecast__bar-fill').getBoundingClientRect();
    const frame=root.querySelector('.disaster-forecast__frame');
    return {rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},
      fillRatio:fill.width/rect.width,
      hasBar:rect.width>20&&rect.height>2,
      hasFrame:frame.complete&&frame.naturalWidth>0,
      hasLegacyRings:Boolean(root.querySelector('circle.disaster-forecast__weather-arc'))};
   },progress);
   await page.waitForTimeout(1000);
   // Inspect AFTER CSS animations settle. The screenshots reflect the real bar,
   // not an animation frame mid-transition.
   const actual=await page.evaluate(()=>{
    const bar=document.querySelector('.disaster-forecast__bar').getBoundingClientRect();
    const fill=document.querySelector('.disaster-forecast__bar-fill').getBoundingClientRect();
    return fill.width/bar.width;
   });
   if(!meta.hasBar||!meta.hasFrame||meta.hasLegacyRings||Math.abs(actual-progress)>.04){
    failures.push(screen+'/'+stage+': '+JSON.stringify({...meta,actual}));
   }
   const file=screen+'-'+stage+'.png';
   await page.screenshot({path:path.join(output,file),animations:'disabled',timeout:30000});
   console.log('HUD SCREENSHOT',file,JSON.stringify({...meta,actual}));
  }
  await page.close();
 }
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({screenshots:6,failures},null,2));
 if(failures.length)throw Error(failures.join('\n'));
}catch(e){console.error('HUD SCREENSHOT ERROR:',e);process.exitCode=1;}
finally{await browser.close();}
