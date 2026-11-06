/** Real application screenshot with actual Three.js city, not an isolated UI mockup.
 * This catches HUD stacking bugs the isolated CSS snapshots cannot reveal. */
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=path.resolve('docs/qa/live-weather-v960');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--enable-unsafe-swiftshader','--use-angle=swiftshader','--use-gl=angle'
]});
const issues=[];const results=[];
try{
 for(const [name,w,h] of [['iphone-full-game',390,844],['desktop-full-game',1440,900]]){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:name.startsWith('iphone')?2:1});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push('pageerror '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&/shader|webgl|boot|frame error/i.test(m.text()))pageErrors.push(m.text().slice(0,500));});
  try{
   const response=await page.goto('http://127.0.0.1:5173/?visualqa=1',{waitUntil:'domcontentloaded',timeout:45000});
   const navigation=await page.evaluate(()=>({
     url:location.href,title:document.title,bodyNodes:document.querySelectorAll('body *').length,
     hasHud:Boolean(document.getElementById('disaster-forecast')),
     bodyLead:document.body?.innerHTML.slice(0,380),
     ready:document.readyState
   }));
   console.log('LIVE NAVIGATION',name,response?.status(),JSON.stringify(navigation));
   if(!navigation.hasHud)throw Error('Live page did not include game HUD: '+JSON.stringify(navigation));
   await page.waitForSelector('#disaster-forecast .disaster-forecast__frame',{state:'attached',timeout:12000});
   console.log('LIVE DOM DIAG',name,await page.evaluate(()=>{const el=document.querySelector('.disaster-forecast__frame');return{ready:document.readyState,display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,parent:getComputedStyle(el.parentElement).display,rect:el.getBoundingClientRect().toJSON(),loading:document.querySelector('#loading')?.className}}));
   // Actual 3D load can take longer than static icons. Allow the procedural fallback.
   await page.waitForTimeout(8200);
   const data=await page.evaluate(()=>{
    const measure=x=>{const r=document.querySelector(x)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}:null};
    const frame=measure('.disaster-forecast__frame');
    const speed=measure('#speed-toggle');
    const center=measure('.disaster-forecast__current');
    const hud=measure('#disaster-forecast');
    const date=measure('.survival-hud-date'),stock=measure('.survival-hud-stock');
    const art=document.querySelector('.disaster-forecast__frame');
    const loading=document.querySelector('#loading');
    const err=document.querySelector('#error');
    return {frame,speed,center,hud,date,stock,frameSource:art?.currentSrc,frameReady:art?.naturalWidth>0,
      gameBooted:Boolean(window.afterday&&window.afterday.renderHUD),
      gameError:err&&!err.classList.contains('hidden')?err.textContent?.slice(0,500):null,
      loadingVisible:Boolean(loading&&!loading.classList.contains('hidden')),
      pixelRatio:window.devicePixelRatio};
   });
   const ok=data.frameReady&&Math.abs(data.frame.height/data.frame.width-(w<=720?.22:175/1600))<.005&&data.frame.width>100&&data.frame.y>=0&&data.frame.y<18&&
    data.speed.y>=data.frame.bottom+1&&
    Math.abs(data.center.x+data.center.width/2-(data.hud.x+data.hud.width/2))<3&&
    data.date.y>data.frame.y&&data.stock.bottom<data.frame.bottom-8&&
    (w<=720?data.frameSource.includes('forecast_hud_mobile_v970.svg'):!data.frameSource.includes('forecast_hud_mobile_v970.svg'));
   if(!ok)issues.push({name,kind:'real scene HUD layout',data});
   // A game boot failure is reported separately from layout and is not masked.
   if(data.gameError||!data.gameBooted)issues.push({name,kind:'3D runtime initialization',error:data.gameError,booted:data.gameBooted});
   await page.screenshot({path:path.join(out,name+'.png'),timeout:60000,animations:'disabled'});
   results.push({name,ok,data,pageErrors:pageErrors.slice(0,8)});
   console.log('ACTUAL GAME HUD',name,JSON.stringify({ok,frame:data.frame,loading:data.loadingVisible,booted:data.gameBooted,error:data.gameError,pageErrors:pageErrors.slice(0,3)}));
  }catch(e){
   issues.push({name,kind:'navigation or screenshot',error:String(e)});
   console.error('ACTUAL GAME CAPTURE FAILED',name,String(e));
  }
  await page.close();
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({issues,results},null,2));
 if(issues.length)throw Error('Real game visual QA: '+JSON.stringify(issues).slice(0,5500));
 console.log('ACTUAL GAME HUD QA SUCCESS: game scene and responsive frame rendered in both viewports');
}catch(e){console.error('ACTUAL GAME QA FAILURE',e);process.exitCode=1}finally{await browser.close()}
