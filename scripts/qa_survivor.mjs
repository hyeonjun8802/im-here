/** OPTIONAL live WebGL QA: must run with dev server + Playwright on user's machine.
 * This script has NOT been run in the package-building environment.
 */
import fs from 'node:fs';
import path from 'node:path';
let chromium;try{({chromium}=await import('playwright'))}catch{console.error('Install Playwright: npm install -D playwright && npx playwright install chromium');process.exit(2)}
const base=process.env.AFTERDAY_URL||'http://localhost:5173';
const out=path.resolve('docs/qa/survivor');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:430,height:850},deviceScaleFactor:1.5});
const failures=[];page.on('pageerror',e=>failures.push(String(e)));
try{
 await page.goto(base+'/?showcase=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>Boolean(window.afterday?.world?.life),undefined,{timeout:30000});
 const gpu=await page.evaluate(()=>{const c=document.getElementById('world');return {ready:!!c.getContext('webgl2'),draws:window.afterday.world.renderer.info.render.calls}});
 if(!gpu.ready)throw Error('WebGL2 unavailable');
 await page.locator('#life-panel-toggle').click();
 await page.locator('#follow-survivor-camera').click();
 const results=[];
 for(const activity of ['sit','guitar','radio','stretch','watch','rest']){
   // Avoid huge waits after starting an animation by invoking the same public
   // game function as the UI. No change to survival state or resources.
   await page.evaluate(a=>window.afterday.world.setAction(a),activity);
   await page.waitForFunction(a=>{const d=window.afterday.world.life;return d.current===a&&d.stage==='perform'},activity,{timeout:60000});
   await page.waitForTimeout(550);
   const state=await page.evaluate(()=>{
     const w=window.afterday.world;return {action:w.life.current,phase:w.life.stage,
       pos:w.survivor.position.toArray(),guitar:w.survivorGuitar.visible,
       radio:w.survivorRadio.visible,cameraRadius:w.radius,
       calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles};
   });
   if(state.calls<1)throw Error('Three.js frame did not render '+activity);
   if(activity==='guitar'&&!state.guitar)throw Error('Guitar is invisible');
   if(activity==='radio'&&!state.radio)throw Error('Radio is invisible');
   const file=`afterday_${activity}.png`;await page.screenshot({path:path.join(out,file)});results.push({file,...state});
 }
 await page.evaluate(()=>window.afterday.world.setWeather('storm'));
 await page.waitForFunction(()=>window.afterday.world.life.current==='shelter',undefined,{timeout:10000});
 await page.screenshot({path:path.join(out,'afterday_storm_shelter.png')});
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({gpu,results,failures},null,2));
 if(failures.length)throw Error('Browser errors '+failures.join(' | '));
 console.log('Real WebGL survivor motion screenshots:',out);
}catch(e){console.error('Survivor QA FAILED:',e);process.exitCode=1}
finally{await browser.close()}
