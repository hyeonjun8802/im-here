/** Actual Three.js GPU screenshot tests, intended to run in Codex/local Mac.
 * Required: npm install -D playwright && npx playwright install chromium
 * Start `npm run dev` first. This QA script intentionally FAILS if WebGL2 or
 * the new GLB face is unavailable; no fabricated screenshot fallback.
 */
import fs from 'node:fs';
import path from 'node:path';
let chromium;
try{({chromium}=await import('playwright'))}catch{console.error('Playwright missing. npm install -D playwright && npx playwright install chromium');process.exit(2)}
const OUT=path.resolve('docs/qa/character/actual_browser');fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1000,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto((process.env.AFTERDAY_URL||'http://localhost:5173')+'/?showcase=1&characterqa=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.afterday?.world?.referenceSurvivor?.status==='loaded',{timeout:25000});
 await page.evaluate(()=>{window.afterday.world.life.nextAt=1e9;window.afterday.world.life.manual=false;window.afterday.world.life.stage='idle';window.afterday.world.setWeather('clear');window.afterday.world.setHour(16.6)});
 const report=[];
 for(const {name,yaw,weather} of [{name:'front',yaw:0},{name:'three_quarter',yaw:.78},{name:'side',yaw:1.53},{name:'rain_front',yaw:0,weather:'rain'}]){
  await page.evaluate(({yaw,weather})=>{const w=window.afterday.world;w.setCameraView('portrait');w.yaw=yaw;w.survivor.rotation.y=0;if(weather)w.setWeather(weather)}, {yaw,weather});
  await page.waitForTimeout(2400);
  const status=await page.evaluate(()=>{
   const w=window.afterday.world;const canvas=document.querySelector('#world');const head=w.referenceSurvivor;
   return {model:head.status,suit:head.suitStatus,garmentCount:head.garments.length,faceVisible:head.loaded?.visible??false,legacyFaceVisible:head.legacy.filter(x=>x.visible).length,
     drawCalls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,
     canvasWidth:canvas.width,canvasHeight:canvas.height,gameDay:document.querySelector('#days').textContent};
  });
  if(status.model!=='loaded'||status.suit!=='disabled'||status.garmentCount!==0||!status.faceVisible||status.legacyFaceVisible!==0||status.drawCalls<1||status.canvasWidth<1)throw Error('Actual game render failed '+name+' '+JSON.stringify(status));
  await page.screenshot({path:path.join(OUT,`${name}.png`)});report.push({name,...status});
 }
 if(errors.length)throw Error('Browser JS error: '+errors.join(' | '));
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({report,errors},null,2));
 console.log('Actual browser character screenshots:',OUT);
}catch(e){console.error('ACTUAL WEBGL CHARACTER QA FAILED:',e);process.exitCode=1}
finally{await browser.close()}
