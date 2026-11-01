/** Real browser screenshots — cannot run without Playwright, dev server and WebGL.
 * Unlike structural tests, this intentionally fails when actual rendering fails.
 * npm install --save-dev playwright && npx playwright install chromium
 * npm run dev   # other terminal
 * npm run qa:visual-v150
 */
import fs from 'node:fs';
import path from 'node:path';
let chromium;
try{({chromium}=await import('playwright'));}catch(e){console.error('MISSING PLAYWRIGHT. npm i -D playwright; npx playwright install chromium');process.exit(2);}
const out=path.resolve('docs/qa/live-v150');fs.mkdirSync(out,{recursive:true});
let browser,errors=[];const checks=[];
try{
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--enable-webgl','--enable-unsafe-swiftshader']});
 const cases=[
  {name:'01_dawn',hour:6.2,weather:'clear',viewport:{width:1440,height:900}},
  {name:'02_dusk',hour:18.2,weather:'clear',viewport:{width:1440,height:900}},
  {name:'03_rain',hour:16.3,weather:'rain',viewport:{width:1440,height:900}},
  {name:'04_lightning',hour:22.6,weather:'storm',viewport:{width:1440,height:900}},
  {name:'05_portrait',hour:18.2,weather:'clear',view:'portrait',viewport:{width:941,height:1672}}
 ];
 for(const scenario of cases){
  const page=await browser.newPage({viewport:scenario.viewport,deviceScaleFactor:1});
  page.on('pageerror',err=>errors.push(`${scenario.name}: ${err}`));
  page.on('console',msg=>{if(msg.type()==='error'&&/WebGL|shader|INVALID_OPERATION|THREE/i.test(msg.text()))errors.push(`${scenario.name}: ${msg.text()}`)});
  await page.goto((process.env.AFTERDAY_URL||'http://127.0.0.1:5173')+'/?showcase=1',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!window.afterday?.world?.cityInfill&&!!window.afterday?.world?.renderer,{timeout:30000});
  await page.evaluate(({hour,weather,view})=>{const w=window.afterday.world;w.setHour(hour);w.setWeather(weather);w.setCameraView(view||'cinematic');},scenario);
  await page.waitForTimeout(scenario.view?4500:3600);
  const metrics=await page.evaluate(()=>{
   const w=window.afterday.world,gl=w.renderer.getContext();return {
    cityInfill:w.cityInfill?.plan?.length,webgl:gl?.getParameter(gl.VERSION),drawCalls:w.renderer.info.render.calls,
    triangles:w.renderer.info.render.triangles,loadedHeroGlb:w.heroAssetStatus?.loaded||0,
    canvas:[w.renderer.domElement.width,w.renderer.domElement.height],
    activeWeather:w.previewWeather||w.simulatedWeather,roofCount:1
   };
  });
  if(!metrics.webgl||metrics.drawCalls<1||metrics.cityInfill<300||!metrics.canvas[0])throw Error(`Rendering not verified: ${scenario.name} ${JSON.stringify(metrics)}`);
  await page.screenshot({path:path.join(out,scenario.name+'.png'),fullPage:true});checks.push({scenario:scenario.name,...metrics});
  await page.close();
 }
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify({checks,errors,verifiedAt:new Date().toISOString()},null,2));
 console.log('Real WebGL screenshots: '+out);
}catch(e){console.error('LIVE WEBGL QA NOT VERIFIED:',String(e));process.exitCode=1;}
finally{await browser?.close();}
