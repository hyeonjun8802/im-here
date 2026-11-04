/** v6 visual screenshot matrix, actual WebGL — NEVER fake screenshots.
 * Requires Playwright only in the QA runner. Does not deploy or modify saves.
 * Run: npm run dev, then node scripts/qa_visual_v600.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
let chromium;
try{({chromium}=await import('playwright'));}
catch{console.error('Install Playwright in the QA runner before running real screenshot QA.');process.exit(2);}
const output=path.resolve(process.env.AFTERDAY_VISUAL_OUTPUT||'docs/qa/live-v600');
fs.mkdirSync(output,{recursive:true});
const cases=[
 {name:'01_clear_day_desktop',hour:13,weather:'clear',view:'cinematic',viewport:{width:1440,height:900}},
 {name:'02_cold_dawn_desktop',hour:6.2,weather:'cold',view:'cinematic',viewport:{width:1440,height:900}},
 {name:'03_sunset_desktop',hour:18.4,weather:'clear',view:'cinematic',viewport:{width:1440,height:900}},
 {name:'04_night_camp_desktop',hour:22.7,weather:'clear',view:'survivor',viewport:{width:1440,height:900}},
 {name:'05_storm_desktop',hour:16.2,weather:'storm',view:'cinematic',viewport:{width:1440,height:900}},
 {name:'06_near_tornado_desktop',hour:18.1,weather:'tornado',view:'overhead',viewport:{width:1440,height:900}},
 {name:'07_day_mobile',hour:13,weather:'clear',view:'cinematic',viewport:{width:390,height:844}},
 {name:'08_night_mobile',hour:22.7,weather:'clear',view:'cinematic',viewport:{width:390,height:844}}
];
const issues=[],checks=[];
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--no-sandbox']});
 for(const c of cases){
  const page=await browser.newPage({viewport:c.viewport,deviceScaleFactor:c.viewport.width<700?2:1.5});
  page.on('pageerror',e=>issues.push(c.name+': '+e));
  page.on('console',m=>{
   if(m.type()==='error')issues.push(c.name+': console '+m.text());
  });
  try{
   await page.goto((process.env.AFTERDAY_URL||'http://127.0.0.1:5173')+'/?showcase=1',
    {waitUntil:'domcontentloaded',timeout:45000});
   try{
    await page.waitForFunction(()=>!!window.afterday?.world?.renderer&&!!window.afterday?.world?.cinematicPost,{timeout:15000});
   }catch(e){
    const diagnostic=await page.evaluate(()=>({
     errorText:document.querySelector('#error')?.textContent||'',
     loadText:document.querySelector('#load-progress')?.textContent||'',
     worldExposed:Boolean(window.afterday?.world),
     hasCanvas:Boolean(document.querySelector('canvas')),
     readyState:document.readyState
    })).catch(err=>({evaluationError:String(err)}));
    throw Error('Live WebGL boot failed: '+JSON.stringify({diagnostic,issues,error:String(e)}));
   }
   await page.evaluate(async({hour,weather,view})=>{
    const w=window.afterday.world;
    await Promise.allSettled([w.heroAssetPromise,w.beardedSurvivor?.ready]);
    w.setHour(hour);w.setWeather(weather);
    w.setCameraView(view);
    w.setQuality(window.innerWidth<700?'low':'high');
   },c);
   await page.waitForTimeout(c.weather==='tornado'?4000:2500);
   const data=await page.evaluate(()=>{
    const w=window.afterday.world,renderer=w.renderer,
     gl=renderer.getContext(),post=w.cinematicPost;
    return {
      webgl:gl?.getParameter(gl.VERSION)||'',
      pixelRatio:renderer.getPixelRatio(),composerPixelRatio:post?.composer?post.composer._pixelRatio:null,
      postActive:post?.active,fxaa:!!post?.fxaa,exposure:renderer.toneMappingExposure,
      shadowResolution:w.sun.shadow.mapSize.x,drawCalls:renderer.info.render.calls,
      triangles:renderer.info.render.triangles,assetLoaded:w.heroAssetStatus?.loaded??0,
      frame:[renderer.domElement.width,renderer.domElement.height],
      oneRoof:true,
    };
   });
   if(!data.webgl||data.drawCalls<1||data.frame[0]<c.viewport.width){
    throw Error('Real WebGL scene not captured: '+JSON.stringify(data));
   }
   await page.screenshot({path:path.join(output,c.name+'.png')});
   console.log('CAPTURED '+c.name+' '+JSON.stringify(data));
   checks.push({name:c.name,weather:c.weather,hour:c.hour,...data});
  }finally{await page.close();}
 }
 if(issues.length)throw Error(issues.join('\n'));
 fs.writeFileSync(path.join(output,'metrics.json'),JSON.stringify({checks,issues,createdAt:new Date().toISOString(),
   scope:'Raw, real 3D screenshots only. Art direction comparison requires a human reviewer.'},null,2));
 console.log('AFTERDAY real WebGL screenshots: '+output);
}catch(e){console.error('WEBGL VISUAL CAPTURE FAILED:',String(e));process.exitCode=1;}
finally{await browser?.close();}
