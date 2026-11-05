/** Screenshot the live HUD markup/CSS at 0%, 50%, 95% progress.
 * This intentionally does not wait for optional city GLBs; the HUD must render
 * even on low-end mobile before the 3D city finishes loading. */
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const output=path.resolve('docs/qa/forecast-v940');
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--no-sandbox']});
const failures=[];
try{
 for(const [screen,viewport] of [['mobile',{width:390,height:844}],['desktop',{width:1440,height:900}]]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:5173/?visualqa=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector('#disaster-forecast .disaster-forecast__bar',{timeout:25000});
  await page.evaluate(()=>document.fonts?.ready);
  for(const [stage,progress] of [['early',.08],['middle',.5],['urgent',.95]]){
   const meta=await page.evaluate(progress=>{
    const root=document.querySelector('#disaster-forecast');
    root.style.setProperty('--weather-bar-progress',Math.round(progress*100)+'%');
    root.dataset.weatherBarMode='forecast';
    // Use existing 3D scene and actual HTML/CSS. Do not swap artwork.
    const bar=root.querySelector('.disaster-forecast__bar');
    const rect=bar.getBoundingClientRect();
    const frame=root.querySelector('img.disaster-forecast__frame');
    return {rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},
     hasBar:rect.width>20&&rect.height>2,
     hasFrame:frame.complete&&frame.naturalWidth>0,
     hasLegacyRings:Boolean(root.querySelector('circle.disaster-forecast__weather-arc'))};
   },progress);
   if(!meta.hasBar||!meta.hasFrame||meta.hasLegacyRings)failures.push(screen+'/'+stage+': '+JSON.stringify(meta));
   await page.waitForTimeout(950);
   const file=screen+'-'+stage+'.png';
   await page.screenshot({path:path.join(output,file),animations:'disabled',timeout:60000});
   console.log('HUD SCREENSHOT',file,JSON.stringify(meta));
  }
  await page.close();
 }
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({screenshots:6,failures},null,2));
 if(failures.length)throw Error(failures.join('\n'));
}catch(e){console.error('HUD SCREENSHOT ERROR',e);process.exitCode=1;}
finally{await browser.close();}
