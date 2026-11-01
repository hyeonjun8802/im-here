/**
 * VISUAL RELEASE GATE — runs on the user's own machine with the actual VRM.
 * Requires live Vite server and Playwright (not a unit-test substitute).
 * Fails on missing avatar, browser error, pelvis floating or feet penetrating.
 */
import fs from 'node:fs';
import path from 'node:path';
let chromium;
try{({chromium}=await import('playwright'))}catch{
 console.error('Playwright missing. Install: npm install -D playwright && npx playwright install chromium');process.exit(2);
}
const dir=path.resolve('docs/qa/release_v180_actual_browser');fs.mkdirSync(dir,{recursive:true});
const base=process.env.AFTERDAY_URL||'http://localhost:5173';
let browser;
const results={status:'FAIL',startedAt:new Date().toISOString(),steps:[],errors:[]};
async function record(page,name,action=null){
 const payload=await page.evaluate(()=>{
   const w=window.afterday?.world,a=w?.officialAvatar,life=w?.life;
   return {
    vrm:a?.status,model:w?.survivorAppearanceStatus?.model,
    bodyPartsVisible:a?.legacy?.filter(x=>x.visible).length,
    activity:life?.current,stage:life?.stage,
    avatarRootY:a?.container?.position?.y,
    seat:typeof a?.measureSeat==='function'?a.measureSeat():null,
    renderer:{width:w?.renderer?.domElement?.width,height:w?.renderer?.domElement?.height,drawCalls:w?.renderer?.info?.render?.calls},
   };
 });
 const filename=path.join(dir,`${name}.png`);
 await page.screenshot({path:filename,fullPage:true});
 const entry={name,action,filename:path.relative(process.cwd(),filename),...payload};results.steps.push(entry);
 if(payload.vrm!=='ready'||payload.bodyPartsVisible!==0||!(payload.renderer.drawCalls>0))throw Error(`${name}: avatar not rendered: ${JSON.stringify(entry)}`);
 if(['sit','guitar','eat'].includes(action) && (!payload.seat || !payload.seat.valid))throw Error(`${name}: hip/feet not physically aligned: ${JSON.stringify(entry)}`);
 return entry;
}
try{
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1365,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>results.errors.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error')results.errors.push('console: '+m.text())});
 await page.goto(base+'/?showcase=1&characterqa=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.afterday?.world?.officialAvatar?.status==='ready',{timeout:65000});
 await page.evaluate(()=>{const w=window.afterday.world;w.life.nextAt=1e9;w.setWeather('clear');w.setHour(16.8);w.setCameraView('portrait');w.life.stage='idle';w.yaw=.5;});
 await page.waitForTimeout(1100);
 await record(page,'00_idle');
 for(const activity of ['sit','eat','guitar','radio','rest','repair','stretch','watch']){
  const accepted=await page.evaluate(action=>window.afterday.world.life.request(action,true),activity);
  if(!accepted)throw Error('Action rejected: '+activity);
  await page.waitForFunction(action=>{
   const life=window.afterday?.world?.life;
   return life?.current===action && life?.stage==='perform';
  },activity,{timeout:65000});
  await page.waitForTimeout(1350);
  await record(page,`action_${activity}`,activity);
 }
 // Capture a genuine approach and chair-exit transition after the functional snapshots.
 await page.evaluate(()=>{const w=window.afterday.world;w.life.request('sit',true)});
 await page.waitForTimeout(700);await record(page,'motion_approach','approach');
 await page.waitForFunction(()=>window.afterday.world.life.stage==='perform',{timeout:65000});
 await page.evaluate(()=>{const l=window.afterday.world.life;l.stageTime=l.performDuration+.1});
 await page.waitForTimeout(380);await record(page,'motion_exit','exit');
 if(results.errors.length)throw Error('Browser JS errors: '+results.errors.join('; '));
 results.status='PASS';
 console.log(`Actual WebGL motion screenshots PASS (${results.steps.length} frames): ${dir}`);
}catch(e){results.errors.push(String(e?.stack||e));console.error('Actual WebGL motion QA FAILED:',e.message);process.exitCode=1}
finally{
 results.finishedAt=new Date().toISOString();
 fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(results,null,2));
 await browser?.close();
}
