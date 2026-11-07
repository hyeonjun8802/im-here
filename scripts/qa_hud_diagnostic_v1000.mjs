import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out='docs/qa/premium-hud-diagnostic-v1000';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const errors=[];let report={};
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push('JS: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,160))});
 page.on('requestfailed',r=>errors.push('request: '+r.url().slice(0,120)));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:25000});
 await page.waitForTimeout(9000);
 report=await Promise.race([
  page.evaluate(()=>{
   const h=document.querySelector('#disaster-forecast'),world=document.querySelector('#world'),frame=document.querySelector('.premium-hud__frame');
   const r=h?.getBoundingClientRect();
   return {ready:!!window.afterday?.world,loadingHidden:document.querySelector('#loading')?.classList.contains('hidden'),
    hudClass:h?.className,hudBounds:r?{x:r.x,y:r.y,width:r.width,height:r.height}:null,
    frameNaturalWidth:frame?.naturalWidth,frameComplete:frame?.complete,
    webgl:!!world?.getContext('webgl2'),forecast:document.querySelector('.premium-hud__forecast-title')?.textContent,
    weather:document.querySelector('.premium-hud__weather-name')?.textContent,
    documentReady:document.readyState};
  }),
  new Promise((_,rej)=>setTimeout(()=>rej(Error('Page evaluate stalled')),9000))
 ]);
 console.log('HUD_DIAGNOSTIC_METRICS',JSON.stringify(report));
 try{
  const cdp=await page.context().newCDPSession(page);
  const data=await Promise.race([
   cdp.send('Page.captureScreenshot',{format:'jpeg',quality:72,captureBeyondViewport:false,fromSurface:true}),
   new Promise((_,rej)=>setTimeout(()=>rej(Error('CDP capture stalled')),9000))
  ]);
  fs.writeFileSync(path.join(out,'mobile-390.jpg'),Buffer.from(data.data,'base64'));
  report.screenshot=true;
 }catch(e){errors.push(e.message);report.screenshot=false}
}catch(e){errors.push('Fatal: '+e.message)}
finally{
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({report,errors},null,2));
 console.log('HUD_DIAGNOSTIC_ERRORS',JSON.stringify(errors));
 await Promise.race([browser.close().catch(()=>{}),new Promise(r=>setTimeout(r,3000))]);
}
if(errors.length||!report.ready||!report.webgl||!report.screenshot)process.exitCode=1;
