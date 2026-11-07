/* REAL GAME QA - FAIL CLOSED. This script cannot be replaced by isolated DOM previews.
 * Run from im-here project root: npm install --no-save playwright; npx playwright install chromium;
 * npm run dev; node scripts/qa_premium_v1000.mjs
 */
import fs from 'node:fs';import path from 'node:path';
import {chromium} from 'playwright';
const BASE=process.env.AFTERDAY_QA_URL||'http://127.0.0.1:5173/';
const OUT=path.resolve('docs/qa/premium-hud-v1000');fs.mkdirSync(OUT,{recursive:true});
const variants=[['pc-2560',2560,1440],['pc-1280',1280,720],['mobile-390',390,844],['mobile-320',320,568]];
const gameErrors=[];const reports=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try{
 for(const [label,w,h] of variants){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/ui/afterday-premium-v1000'))failed.push(`${r.status()} ${r.url()}`)});
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  try{
   await page.waitForFunction(()=>window.afterday?.world && window.afterday?.state && document.querySelector('#loading')?.classList.contains('hidden'),null,{timeout:60000});
   await page.waitForFunction(()=>document.querySelector('.premium-hud-v1000')?.dataset.premiumHudV1000==='true',null,{timeout:10000});
  }catch(e){errors.push('World/HUD initialization timeout: '+e.message)}
  const metrics=await page.evaluate(async()=>{
   const root=document.querySelector('.premium-hud-v1000');
   const cnv=document.getElementById('world');
   const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
   const names=['health','hunger','water','food','medicine','parts'];
   const paths=names.map(x=>`/assets/ui/afterday-premium-v1000/vitals/${x}.png`);
   const fetched=await Promise.all(paths.map(async u=>{try{return (await fetch(u)).ok}catch{return false}}));
   const imgs=[...document.querySelectorAll('.premium-hud-v1000 img')].filter(e=>e.src&&!e.closest('.disaster-forecast__artwork'));
   const frame=document.querySelector('.premium-hud__frame');
   const gl=cnv&&(cnv.getContext('webgl2')||cnv.getContext('webgl'));
   return {hud:rect(root),canvas:rect(cnv),webglContextPresent:!!gl,worldReady:!!window.afterday?.world,
     resourceIconLoads:fetched,images:imgs.map(x=>({src:x.src.slice(0,130),ok:x.complete&&x.naturalWidth>0})),
     frameNaturalWidth:frame?.naturalWidth,
     currentWeatherText:document.querySelector('.premium-hud__weather-name')?.textContent,
     forecastLabels:[...document.querySelectorAll('.premium-hud__hour')].map(x=>x.textContent),
     bodyScrollWidth:document.body.scrollWidth};
  });
  if(!metrics.worldReady||!metrics.webglContextPresent)errors.push('No live Three.js WebGL game detected');
  if(!metrics.hud)errors.push('Premium HUD missing');
  if(metrics.hud&&(metrics.hud.x < -1||metrics.hud.right>w+1||metrics.hud.height>h*.21))errors.push('HUD does not fit the screen');
  if(metrics.frameNaturalWidth!==(w<=720?1000:1700))errors.push('Wrong responsive frame art selected');
  if(metrics.images.some(x=>!x.ok)||metrics.resourceIconLoads.some(x=>!x))errors.push('Missing HUD image asset');
  if(metrics.forecastLabels.join(',')!=='+24h,+18h,+12h,+06h,+03h,현재')errors.push('Forecast timeline ticks invalid');
  if(failed.length)errors.push(...failed);
  await page.screenshot({path:path.join(OUT,`${label}.png`),fullPage:true,animations:'disabled'});
  reports.push({label,viewport:[w,h],metrics,errors});
  await page.close();
  if(errors.length)gameErrors.push(...errors.map(e=>`${label}: ${e}`));
 }
}finally{await browser.close()}
fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({status:gameErrors.length?'FAIL':'PASS',reports,gameErrors},null,2));
for(const r of reports)console.log(r.label, r.errors.length?'FAILED: '+r.errors.join('; '):'PASSED');
if(gameErrors.length){console.error('Do NOT deploy: live game QA failed.');process.exit(1)}
console.log('Live HUD QA passed; manually inspect the four game screenshots before release.');
