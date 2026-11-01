/** Browser-only QA: real GPU screenshots. Hard failure if third-party VRM is not loaded. */
import fs from 'node:fs';
import path from 'node:path';
let chromium;
try{({chromium}=await import('playwright'))}catch{console.error('Install Playwright: npm install -D playwright && npx playwright install chromium');process.exit(2)}
const OUT=path.resolve('docs/qa/official_avatar_v170');fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto((process.env.AFTERDAY_URL||'http://localhost:5173')+'/?showcase=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.afterday?.world?.officialAvatar?.status==='ready',{timeout:45000});
 await page.evaluate(()=>{const w=window.afterday.world;w.life.nextAt=1e9;w.life.stage='idle';w.setWeather('clear');w.setHour(16.6);});
 const output=[];
 for(const {name,yaw,action} of [{name:'front',yaw:0},{name:'three_quarter',yaw:.78},{name:'side',yaw:1.56},{name:'seated',yaw:.43,action:'guitar'}]){
  await page.evaluate(({yaw,action})=>{const w=window.afterday.world;w.setCameraView('portrait');w.yaw=yaw;w.survivor.rotation.y=0;if(action){w.life.request(action,true);w.life.stage='perform';w.life.stageTime=0;}else w.life.stage='idle';},{yaw,action});
  await page.waitForTimeout(900);
  const status=await page.evaluate(()=>{const w=window.afterday.world,a=w.officialAvatar,c=w.renderer.domElement;return {provider:a.status,legacyVisible:a.legacy.filter(x=>x.visible).length,meshes:w.survivorAppearanceStatus?.meshCount,drawCalls:w.renderer.info.render.calls,width:c.width,height:c.height};});
  if(status.provider!=='ready'||status.legacyVisible!==0||status.meshes<1||status.drawCalls<1||status.width<1)throw Error(`${name}: ${JSON.stringify(status)}`);
  await page.screenshot({path:path.join(OUT,`${name}.png`)});output.push({name,...status});
 }
 if(errors.length)throw Error('Browser JavaScript errors: '+errors.join(' | '));
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({status:'PASS',output,errors},null,2));
 console.log('Actual WebGL VRM screenshots PASS:',OUT);
}catch(err){console.error('Actual VRM browser QA failed:',err);process.exitCode=1}
finally{await browser.close()}
