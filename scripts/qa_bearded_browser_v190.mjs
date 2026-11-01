/** Browser screenshot QA. Run AFTER `npm run dev` and `npm install -D playwright`.
 * This does NOT fabricate a PASS if rendering fails, GLB missing, or errors occur.
 */
import fs from 'node:fs/promises';
import {join} from 'node:path';
let chromium;
try{({chromium}=await import('playwright'))}catch{console.error('Install screenshot driver: npm install -D playwright && npx playwright install chromium');process.exit(2)}
const base=process.env.AFTERDAY_QA_URL||'http://localhost:5173';
const out=join(process.cwd(),'docs/qa/browser_v190');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const results={project:'AFTERDAY v1.9',type:'Real Three.js Chromium screenshot, separate from offline GLB review',testedAt:new Date().toISOString(),cases:[]};
let fatal=false;
try{
 for(const pose of ['idle','walk','sit','eat','guitar','radio','stretch']){
  const page=await browser.newPage({viewport:{width:1365,height:850},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  const info={pose,status:'unknown',errors};
  try{
   await page.goto(base+'/character.html?pose='+pose,{waitUntil:'domcontentloaded',timeout:35000});
   await page.waitForFunction(()=>window.qaAfterdayCharacter?.status==='ready'||window.qaAfterdayCharacter?.status==='failed',null,{timeout:35000});
   await page.waitForTimeout(2500);
   const metrics=await page.evaluate(()=>window.qaAfterdayCharacter||{});
   info.metrics=metrics;info.status=metrics.status;
   await page.screenshot({path:join(out,'3d_character_'+pose+'.png'),fullPage:false});
   if(metrics.status!=='ready'||metrics.rigCount!==9||errors.length){fatal=true;info.pass=false}else info.pass=true;
  }catch(err){info.pass=false;info.error=String(err);fatal=true}
  results.cases.push(info);await page.close();
 }
 // Actual integrated AFTERDAY game (not isolated model viewer).
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const err=[];page.on('pageerror',e=>err.push(e.message));
 const game={pose:'integrated_game',errors:err};
 try{
  await page.goto(base+'/?characterqa=1',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>window.afterday?.world?.beardedSurvivor?.status==='ready'||window.afterday?.world?.beardedSurvivor?.status==='failed',null,{timeout:40000});
  await page.waitForTimeout(3500);
  game.appearance=await page.evaluate(()=>window.afterday?.world?.survivorAppearanceStatus);
  await page.screenshot({path:join(out,'3d_character_in_game.png'),fullPage:false});
  game.pass=game.appearance?.status==='ready'&&!err.length;if(!game.pass)fatal=true;
 }catch(e){game.pass=false;game.error=String(e);fatal=true}
 results.cases.push(game);await page.close();
}finally{results.passed=!fatal;await fs.writeFile(join(out,'qa_results.json'),JSON.stringify(results,null,2));await browser.close()}
console.log(JSON.stringify({passed:results.passed,cases:results.cases.map(c=>({pose:c.pose,pass:c.pass,status:c.status}))},null,2));
if(fatal)process.exitCode=1;
