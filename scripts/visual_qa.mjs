/**
 * Optional REAL browser screenshot suite. Do not confuse Node static tests with
 * rendered scene QA. Install Playwright/browser separately; run npm run dev first.
 * Produces actual game screenshots for comparison with docs/visual-reference.
 */
import fs from 'node:fs';
import path from 'node:path';
let chromium;
try { ({chromium}=await import('playwright')); }
catch { console.error('Run: npm install --save-dev playwright && npx playwright install chromium');process.exit(2); }
const base=process.env.AFTERDAY_URL||'http://localhost:5173';
const out=path.resolve('docs/qa/screenshots');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:430,height:860},deviceScaleFactor:1.4});
const shots=[
 ['dawn','clear',6.0],
 ['heat','heat',13.7],
 ['rain','rain',16.3],
 ['lightning','storm',22.8],
 ['tornado','tornado',18.9],
 ['snow','cold',9.3],
];
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',message=>{
  if(message.type()==='error' && /WebGLProgram|Shader Error|GLSL|INVALID_OPERATION|THREE.WebGLRenderer/i.test(message.text())){
    errors.push('GPU shader: '+message.text());
  }
});
try{
 await page.goto(`${base}/?showcase=1`,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>Boolean(window.afterday?.world),undefined,{timeout:25000});
 await page.waitForTimeout(1100);
 const canvas=await page.evaluate(()=>{
   const c=document.querySelector('#world');
   return {width:c?.width||0,height:c?.height||0,webgl2:!!c?.getContext('webgl2'),
     cityCount:window.afterday?.world?.distantCityPlan?.length||0};
 });
 if(!canvas.webgl2||canvas.width===0||canvas.cityCount<80)throw Error(`3D renderer failed ${JSON.stringify(canvas)}`);
 const observations=[];
 for(const [label,weather,hour] of shots){
   await page.locator('#weather-panel-toggle').click();
   await page.locator(`#weather-options button[data-weather="${weather}"]`).click();
   await page.locator('#time-preview').evaluate((el,val)=>{el.value=String(val);el.dispatchEvent(new Event('input',{bubbles:true}));},hour);
   await page.locator('#close-weather').click();
   await page.waitForTimeout(9000);
   const state=await page.evaluate(()=>{
     const w=window.afterday.world;
     return {fog:w.scene.fog.density,city:w.distantCityPlan.length,roof:w.roof.visible,
       rainBlend:w.visualWeather.rain,snowBlend:w.visualWeather.snow,
       rainVisible:w.weatherVfx.rain.some(m=>m.visible),
       snowVisible:w.weatherVfx.snow.visible,
       cloudDensity:w.weatherVfx.clouds.material.uniforms.uCover.value,
       renderCalls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,
       sky:Object.keys(w.skyWeatherLayers)};
   });
   if(state.renderCalls<1)throw Error(`No Three.js draw calls in ${label}`);
   if(weather==='rain'&&(!state.rainVisible||state.rainBlend<.5))throw Error('GPU rainfall missing');
   if(weather==='cold'&&(!state.snowVisible||state.snowBlend<.5))throw Error('GPU snowfall missing');
   const filename=`AFTERDAY_3D_${label}.png`;
   await page.screenshot({path:path.join(out,filename)});
   observations.push({label,weather,hour,file:filename,...state});
   console.log(label,JSON.stringify(state));
 }
 fs.writeFileSync(path.join(out,'visual_qa_results.json'),JSON.stringify({viewport:canvas,observations,errors},null,2));
 if(errors.length)throw Error('Page errors: '+errors.join('; '));
 console.log('PASS: real browser captures created in',out);
}catch(err){console.error('FAIL: actual 3D browser QA',err);process.exitCode=1;}
finally{await browser.close();}
