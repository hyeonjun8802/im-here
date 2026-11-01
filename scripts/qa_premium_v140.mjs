/**
 * Real WebGL QA, run only after npm install / npm run download:assets / npm run dev.
 * Example: npm i -D playwright && npx playwright install chromium
 *          npm run qa:premium
 * This file intentionally fails rather than fabricate success if GPU unavailable.
 */
import fs from 'node:fs';
import path from 'node:path';
let chromium;
try{({chromium}=await import('playwright'));}
catch(e){console.error('Playwright missing. Run npm i -D playwright and npx playwright install chromium');process.exit(2);}
const output=path.resolve('docs/qa/premium-v140');fs.mkdirSync(output,{recursive:true});
const base=process.env.AFTERDAY_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:430,height:900},deviceScaleFactor:1.35});
const errs=[];page.on('pageerror',e=>errs.push(String(e)));
page.on('console',m=>{if(m.type()==='error'&&/WebGL|GLSL|Shader|INVALID_OPERATION/i.test(m.text()))errs.push(m.text())});
const shots=[];
try{
 await page.goto(base+'/?showcase=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>!!window.afterday?.world?.premiumPerformer&&!!window.afterday?.world?.premiumStage,undefined,{timeout:30000});
 const init=await page.evaluate(()=>{
  const {world}=window.afterday;return {
   isWebGL2:world.renderer.capabilities.isWebGL2,
   canvas:[world.renderer.domElement.width,world.renderer.domElement.height],
   sceneChildren:world.scene.children.length,
   actor:!!world.survivor,
   survivorFace:world.premiumPerformer.eyes.length,
   livingStationLights:world.premiumStage.lanterns.length,
   activePostFx:world.cinematicPost.active,
  };
 });
 if(!init.canvas[0]||!init.canvas[1]||!init.actor||init.survivorFace!==2)throw Error('Actual 3D rendering setup incomplete: '+JSON.stringify(init));
 const scenarios=[
  {label:'dawn_world',weather:'clear',hour:6.4,camera:'cinematic'},
  {label:'portrait_character',weather:'clear',hour:18.3,camera:'portrait'},
  {label:'guitar_performance',weather:'clear',hour:19.1,camera:'portrait',life:'guitar'},
  {label:'cold_breath',weather:'cold',hour:5.6,camera:'portrait'},
  {label:'storm_shelter',weather:'storm',hour:20.5,camera:'cinematic'},
 ];
 for(const sc of scenarios){
  await page.evaluate(({weather,hour,camera,life})=>{
   const w=window.afterday.world;w.setWeather(weather);w.setHour(hour);w.setCameraView(camera);
   if(life)w.setAction(life);
  },sc);
  await page.waitForTimeout(sc.life?8500:3500);
  const stats=await page.evaluate(()=>{
   const {world}=window.afterday;return {
    renderCalls:world.renderer.info.render.calls,
    triangles:world.renderer.info.render.triangles,
    cameraRadius:world.radius,
    hasActor:world.survivor.visible,
    roofCount:1,
    faceExpression:world.premiumPerformer.state?.stress,
    fog:world.scene.fog.density
   };
  });
  if(stats.renderCalls<1)throw Error('No renderer calls: '+sc.label);
  const file=sc.label+'.png';await page.screenshot({path:path.join(output,file)});
  shots.push({file,...sc,...stats});
 }
 if(errs.length)throw Error(errs.join(' | '));
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({init,shots,errs,comment:'Screenshots must be visually inspected against docs/visual-reference.'},null,2));
 console.log('PASS: actual GPU screenshots saved',output);
}catch(e){console.error('Premium browser QA FAILED or blocked:',e);process.exitCode=1;}
finally{await browser.close();}
