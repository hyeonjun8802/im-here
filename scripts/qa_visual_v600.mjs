/** AFTERDAY v6 premium visual capture matrix — REAL WebGL only.
 * GPU runner: real 1440x900 page screenshots (including HUD).
 * CPU runner: lower-res direct WebGL canvas capture (scene only).
 * The two contexts stay open across time/weather variants, reducing reloads.
 */
import fs from 'node:fs';
import path from 'node:path';
let chromium;
try{({chromium}=await import('playwright'));}
catch{console.error('Playwright must be installed only in the visual QA runner.');process.exit(2);}
const output=path.resolve(process.env.AFTERDAY_VISUAL_OUTPUT||'docs/qa/live-v600');
fs.mkdirSync(output,{recursive:true});
const softwareCI=process.env.AFTERDAY_CI_SOFTWARE==='1';
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
const warnings=[],checks=[],pages=new Map();
let browser;
try{
 browser=await chromium.launch({headless:true,args:[
   '--use-gl=angle','--use-angle=swiftshader','--enable-webgl',
   '--enable-unsafe-swiftshader','--disable-dev-shm-usage','--no-sandbox'
 ]});
 for(const c of cases){
  const mode=c.viewport.width<700?'mobile':'desktop';
  const viewport=softwareCI&&mode==='desktop'?{width:800,height:500}:c.viewport;
  let page=pages.get(mode);
  if(!page){
   page=await browser.newPage({viewport,deviceScaleFactor:softwareCI?1:mode==='mobile'?2:1.5});
   pages.set(mode,page);
   page.on('pageerror',e=>warnings.push(mode+': '+String(e)));
   page.on('console',m=>{
    if(m.type()==='error'&&/webgl|shader|invalid_operation|boot error/i.test(m.text()))
     warnings.push(mode+': '+m.text());
   });
   await page.goto((process.env.AFTERDAY_URL||'http://127.0.0.1:5173')+'/?showcase=1&visualqa=1',
     {waitUntil:'domcontentloaded',timeout:40000});
   try{
    await page.waitForFunction(()=>!!window.afterday?.world?.renderer&&!!window.afterday?.world?.cinematicPost,
       null,{timeout:50000});
   }catch(e){
    const diag=await page.evaluate(()=>({
     errorText:document.querySelector('#error')?.textContent||'',
     loadText:document.querySelector('#load-progress')?.textContent||'',
     worldExposed:Boolean(window.afterday?.world),state:document.readyState
    })).catch(x=>({error:String(x)}));
    throw Error('Real WebGL world could not boot: '+JSON.stringify({mode,diag,warnings,error:String(e)}));
   }
  }
  console.log('RENDER '+c.name+' mode='+mode+' cpu='+softwareCI);
  await page.evaluate(async args=>{
    const w=window.afterday.world;
    // Await authored GLBs once per world. Subsequent shots reuse the same
    // characters/scene rather than allocating a fresh city every time.
    await Promise.allSettled([w.heroAssetPromise,w.beardedSurvivor?.ready]);
    w.setHour(args.hour);w.setWeather(args.weather);
    w.setCameraView(args.view);
    w.setQuality(args.mobile?'low':'high');
    if(args.softwareCI){
     // CI has no physical GPU. Keep post/grading enabled on desktop, but
     // lower the shadow atlas only inside this QA browser instance.
     w.sun.shadow.mapSize.set(512,512);
     w.sun.shadow.map?.dispose();w.sun.shadow.map=null;
    }
  },{hour:c.hour,weather:c.weather,view:c.view,
     mobile:mode==='mobile',softwareCI});
  await page.waitForTimeout(softwareCI?700:c.weather==='tornado'?4000:2600);
  const data=await page.evaluate(()=>{
   const w=window.afterday.world,r=w.renderer,p=w.cinematicPost,gl=r.getContext();
   return {
    webgl:gl?.getParameter(gl.VERSION)||'',
    pixelRatio:r.getPixelRatio(),composerPixelRatio:p?.composer?p.composer._pixelRatio:null,
    postActive:p?.active,fxaa:!!p?.fxaa,exposure:r.toneMappingExposure,
    shadowResolution:w.sun.shadow.mapSize.x,drawCalls:r.info.render.calls,
    triangles:r.info.render.triangles,assetLoaded:w.heroAssetStatus?.loaded??0,
    frame:[r.domElement.width,r.domElement.height],oneRoof:true
   };
  });
  if(!data.webgl||data.frame[0]<viewport.width){
   throw Error('No actual WebGL pixels: '+JSON.stringify({scene:c.name,data}));
  }
  if(softwareCI){
   const uri=await page.evaluate(()=>{
    const w=window.afterday.world;
    if(w.cinematicPost?.active)w.cinematicPost.render();
    else w.renderer.render(w.scene,w.camera);
    return w.renderer.domElement.toDataURL('image/png');
   });
   if(!uri.startsWith('data:image/png;base64,')||uri.length<14000){
    throw Error('Real WebGL canvas pixels not produced: '+c.name+' length='+uri.length);
   }
   fs.writeFileSync(path.join(output,c.name+'.png'),Buffer.from(uri.split(',')[1],'base64'));
  }else{
   await page.screenshot({path:path.join(output,c.name+'.png'),timeout:90000});
  }
  checks.push({name:c.name,weather:c.weather,hour:c.hour,capture:softwareCI?'direct-webgl-canvas':'real-browser-page',...data});
  console.log('CAPTURED '+c.name+' '+JSON.stringify(data));
 }
 if(warnings.length)throw Error('Renderer errors: '+warnings.join('\n'));
 fs.writeFileSync(path.join(output,'metrics.json'),JSON.stringify({checks,warnings,createdAt:new Date().toISOString(),
   softwareCI,caveat:'CPU CI captures a reduced-shadow 3D canvas, not a high-end GPU screen. No Frostpunk visual parity claim.'},null,2));
 console.log('AFTERDAY real WebGL screenshot matrix: '+output);
}catch(e){console.error('WEBGL VISUAL CAPTURE FAILED:',String(e));process.exitCode=1;}
finally{for(const p of pages.values())await p.close().catch(()=>{});await browser?.close();}
