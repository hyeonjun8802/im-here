/* Mobile 3D real WebGL visual + quality-switch smoke tests (software runner).
 * Screenshots are real scene pixels; GPU throughput cannot be inferred here. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const out='docs/qa/mobile-3d-optimization';
await mkdir(out,{recursive:true});
const origin=process.env.QA_BASE_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl',
 '--enable-unsafe-swiftshader','--disable-dev-shm-usage','--no-sandbox'
]});
const result=[];
try{
 const context=await browser.newContext({
  viewport:{width:390,height:844},deviceScaleFactor:2,
  isMobile:true,hasTouch:true,reducedMotion:'reduce'
 });
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{
  if(m.type()==='error'&&/webgl|shader|context lost|boot error|TypeError/i.test(m.text()))
   errors.push(m.text());
 });
 await page.goto(origin+'/?showcase=1&visualqa=1',{waitUntil:'domcontentloaded',timeout:55000});
 await page.waitForFunction(()=>Boolean(window.afterday?.world?.renderer&&window.afterday.world.sun),null,{timeout:85000});
 // Dismiss the mandatory DAY 1 decision so screenshots show the actual 3D
 // rooftop and skyline rather than a blurred/full-screen choice dialog.
 const dismiss=page.locator('.afterday-board-expedition-stay');
 if(await dismiss.isVisible())await dismiss.click();
 await page.evaluate(()=>{
  const chapter=document.querySelector('#survival-chapter');
  chapter?.classList.add('is-hidden');
 });
 await page.waitForTimeout(2600);
 for(const quality of ['auto','high','low']){
  await page.evaluate(v=>window.afterday.world.setQuality(v),quality);
  await page.waitForTimeout(1200);
  const state=await page.evaluate(()=>{
   const w=window.afterday.world,r=w.renderer,gl=r.getContext();
   return {quality:w.mobileQuality,pixelRatio:r.getPixelRatio(),
    shadowSize:w.sun.shadow.mapSize.x,shadowsEnabled:r.shadowMap.enabled,
    msaa:Boolean(gl.getContextAttributes()?.antialias),
    gpuSafeMode:w.gpuSafeMode,
    canvas:[r.domElement.width,r.domElement.height],
    calls:r.info.render.calls,triangles:r.info.render.triangles,
    loadedAssets:w.heroAssetStatus?.loaded||0,
    cameraRadius:w.radius};
  });
  assert.equal(state.quality,quality);
  assert.equal(state.gpuSafeMode,false,'Unexpected context-loss safe mode');
  assert.ok(state.shadowsEnabled);
  assert.ok(state.shadowSize>=768,JSON.stringify(state));
  assert.ok(state.pixelRatio>=1.18,JSON.stringify(state));
  assert.ok(state.calls>0&&state.triangles>0,JSON.stringify(state));
  if(quality==='auto')assert.equal(state.shadowSize,1024);
  if(quality==='high')assert.ok(state.pixelRatio>=1.5);
  // Software renderer may report MSAA unavailable; retain visual proof.
  await page.screenshot({path:out+'/'+quality+'-390x844.png',animations:'disabled',
   timeout:110000});
  result.push(state);console.log('MOBILE-3D '+JSON.stringify(state));
 }
 assert.deepEqual(errors,[]);
 await writeFile(out+'/metrics.json',JSON.stringify({
  result,errors,warning:'SwiftShader software WebGL. No physical iPhone FPS inference.',
  capturedAt:new Date().toISOString()
 },null,2));
 console.log('PASS Mobile real WebGL 3-quality matrix');
 await context.close();
}finally{await browser.close();}
