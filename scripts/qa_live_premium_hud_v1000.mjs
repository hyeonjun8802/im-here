/**
 * Release-blocking real Three.js game browser QA (NOT a static fixture).
 * Usage: npm run dev (separate process), node scripts/qa_live_premium_hud_v1000.mjs
 * Needs: npm i -D playwright && npx playwright install chromium
 */
import fs from 'node:fs';import path from 'node:path';
import {chromium} from 'playwright';
const target=process.env.AFTERDAY_QA_URL||'http://127.0.0.1:5173/';
const out=path.resolve('docs/qa/premium-hud-v1000');fs.mkdirSync(out,{recursive:true});
const cases=[['PC_2560',2560,1440],['PC_1280',1280,720],['Mobile_390',390,844],['Mobile_320',320,568]];
const results=[];
let hasFailure=false;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const [name,width,height] of cases){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push('JS '+e.message));
  page.on('requestfailed',req=>{
    if(req.url().includes('/afterday-premium-v1000/'))errors.push('HUD ASSET '+req.url()+' '+(req.failure()?.errorText||''));
  });
  try{
   const response=await page.goto(target,{timeout:30000,waitUntil:'domcontentloaded'});
   if(!response?.ok())throw Error('HTTP '+response?.status());
   await page.waitForFunction(()=>window.afterday?.state&&window.afterday.world&&window.afterday.gameClock&&window.afterday.renderHUD,null,{timeout:35000});
   await page.waitForFunction(()=>document.getElementById('loading')?.classList.contains('hidden'),null,{timeout:35000});
   await page.waitForTimeout(1000);
   const data=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
    const root=document.querySelector('#disaster-forecast');const timeline=root.querySelector('.premium-hud__timeline');
    const imgs=[...root.querySelectorAll('.premium-hud__frame img,.premium-hud__current-art,.premium-hud__present-art,.premium-hud__future-art')].filter(x=>!!x.src);
    const broken=imgs.filter(x=>!x.complete||!x.naturalWidth).map(x=>x.src);
    const state=window.afterday?.state;
    return {mounted:root.dataset.premiumHudVersion==='1000',hud:rect(root),forecast:rect(timeline),
      broken,stats:[...document.querySelectorAll('.survival-hud-stat strong')].map(x=>x.textContent),
      stocks:[...document.querySelectorAll('.survival-hud-stock strong')].map(x=>x.textContent),
      stateValidated:!!(state?.supply&&Number.isFinite(state.health)),
      viewWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth};
   });
   if(!data.mounted||!data.stateValidated)throw Error('Actual game HUD or saved state missing');
   if(data.hud.height>height*.20)throw Error('HUD too tall: '+data.hud.height);
   if(data.hud.x< -1||data.hud.right>width+1||data.scrollWidth>data.viewWidth+1)throw Error('Horizontal overflow');
   if(data.forecast.right>data.hud.right+2)throw Error('Forecast outside frame');
   if(data.broken.length||errors.length)throw Error('Broken images or JS: '+JSON.stringify({broken:data.broken,errors}));
   if(data.stats.length!==3||data.stocks.length!==4)throw Error('Missing authoritative live vitals or inventory');
   await page.screenshot({path:path.join(out,name+'.png')});
   results.push({name,result:'PASS',data});console.log('PASS',name,Math.round(data.hud.height)+'px');
  }catch(e){hasFailure=true;results.push({name,result:'FAIL',reason:String(e),errors});console.error('FAIL',name,String(e));
   try{await page.screenshot({path:path.join(out,name+'-FAIL.png')})}catch{} }
  await page.close();
 }
}finally{
 await browser.close();
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({target,passed:!hasFailure,cases:results},null,2));
}
if(hasFailure){console.error('RELEASE BLOCKED: actual Three.js viewport failed');process.exitCode=1;}