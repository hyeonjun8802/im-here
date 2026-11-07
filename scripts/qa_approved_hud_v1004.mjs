/* Validate actual HTML+CSS+PremiumHUD images and live values in Chromium.
   Only 3D WebGL boot is disabled to avoid GitHub runner's software-GPU stalls.
   This is NOT a mock HUD: the production DOM, layout and HUD module run. */
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const OUT=path.resolve('docs/qa/approved-hud-v1004');
fs.mkdirSync(OUT,{recursive:true});
const views=[['pc-2560',2560,1440,1],['pc-1280',1280,720,1],['tablet-768',768,1024,1],['mobile-390-retina',390,844,2],['mobile-320',320,568,1]];
const results=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const [name,w,h,dpr] of views){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:dpr});
  const failures=[],broken=[];
  page.on('pageerror',e=>failures.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/ui/'))broken.push(r.url())});
  await page.route('**/src/main.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'// Pause 3D for exact HUD layout measurement\n'}));
  await page.goto(process.env.AFTERDAY_QA_URL||'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(async()=>{
   document.querySelector('#loading')?.remove();
   const {installPremiumHudV1000}=await import('/src/premiumHudV1000.js');
   const t=Date.now();installPremiumHudV1000(document.querySelector('#disaster-forecast')).sync({weather:'clear',majorDisasterType:'tornado',majorDisasterAt:t+12*3600000},t);
   const style=document.createElement('style');
   style.textContent='#world{background:linear-gradient(120deg,#182e3d,#15212c,#203a49)}.event-log,.actionbar,.survival-kit,.warning,.top-right,#survival-chapter,.left-status{display:none!important}';
   document.head.appendChild(style);
  });
  await page.waitForFunction(()=>{const f=document.querySelector('.premium-hud__frame'),c=document.querySelector('.premium-hud__current-art');return f?.complete&&f.naturalWidth>0&&c?.complete&&c.naturalWidth>0},null,{timeout:15000});
  for(const scenario of ['normal','stress']){
   if(scenario==='stress')await page.evaluate(()=>{
    for(const k of ['health','food','water'])document.querySelector('#hud-'+k+'-val').textContent='100%';
    for(const k of ['food','water','medicine','parts'])document.querySelector('#hud-stock-'+k).textContent='999';
   });
   const m=await page.evaluate(()=>{
    const root=document.querySelector('.premium-hud-v1000'),frame=document.querySelector('.premium-hud__frame');
    const rect=e=>{if(!e)return null;const x=e.getBoundingClientRect();return {x:x.x,y:x.y,right:x.right,bottom:x.bottom,width:x.width,height:x.height}};
    const texts=[...root.querySelectorAll('.survival-hud-stat-label,.survival-hud-stat strong,.survival-hud-stock strong,.premium-hud__hour,.premium-hud__forecast-title,.premium-hud__forecast-status')].map(el=>{
     const node=[...el.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
     if(!node)return {value:el.textContent.trim(),rect:rect(el),glyph:null,parent:rect(el.parentElement)};
     const rng=document.createRange();rng.selectNodeContents(node);
     return {value:el.textContent.trim(),rect:rect(el),glyph:rect(rng),parent:rect(el.closest('.survival-hud-stock>div')||el.parentElement)};
    });
    const canvas=document.createElement('canvas');canvas.width=frame.naturalWidth;canvas.height=frame.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(frame,0,0);
    const alpha=(x,y)=>ctx.getImageData(Math.floor(x*canvas.width),Math.floor(y*canvas.height),1,1).data[3];
    return {hud:rect(root),frame:{url:frame.currentSrc,width:frame.naturalWidth,height:frame.naturalHeight},alpha:{center:alpha(.5,.85),wing:alpha(.15,.85)},
      stats:rect(root.querySelector('.survival-hud-stats')),forecast:rect(root.querySelector('.premium-hud__forecast')),current:rect(root.querySelector('.premium-hud__current-art')),
      title:rect(root.querySelector('.premium-hud__forecast-title')),status:rect(root.querySelector('.premium-hud__forecast-status')),texts,
      images:[...root.querySelectorAll('img')].filter(x=>x.src).map(x=>({src:x.currentSrc||x.src,ok:x.complete&&x.naturalWidth>0})),
      ticks:[...root.querySelectorAll('.premium-hud__hour')].map(x=>x.textContent),scrollWidth:document.body.scrollWidth};
   });
   const err=[...failures,...broken],R=m.hud;
   const targetWidth=w<=720?w-4:Math.min(1600,w-8);
   const targetHeight=targetWidth*(w<=720?210/1000:190/1700);
   if(Math.abs(R.x-(w-targetWidth)/2)>2||Math.abs(R.y)>2||
      Math.abs(R.width-targetWidth)>2||Math.abs(R.height-targetHeight)>2)
     err.push('HUD mismatches original compact size '+JSON.stringify({expected:[targetWidth,targetHeight],actual:R}));
   if(R.height>h*.30||m.scrollWidth>w+2)err.push('HUD/document overflows viewport');
   if(!m.frame.url.includes('/hud-reference-v1006/')||!/hud_compact_(desktop|mobile)_ref_v1006\.png(?:$|[?#])/.test(m.frame.url))err.push('Reference-dimension PNG not selected');
   if(m.alpha.center<50||m.alpha.wing>60)err.push('Incorrect raised-wing, lower-medallion silhouette');
   if(m.images.some(x=>!x.ok))err.push('Broken actual weather/icon image');
   if(m.ticks.join(',')!=='현재,+03h,+06h,+12h,+18h,+24h')err.push('Forecast ticks missing');
   if(m.stats.right>R.x+R.width*.41||m.stats.bottom>R.y+R.height*.76)err.push('Stats overflows slim wing');
   if(m.forecast.x<R.x+R.width*.60||m.forecast.right>R.right+1||m.forecast.bottom>R.y+R.height*.77)err.push('Forecast overflows wing');
   if(m.current.x<R.x+R.width*.38||m.current.right>R.x+R.width*.62)err.push('Current weather icon overflows medallion');
   for(const x of m.texts){
    const a=x.glyph,b=x.parent;if(!a||!b)continue;
    if(a.x<b.x-1||a.right>b.right+1||a.y<b.y-1||a.bottom>b.bottom+1)err.push('Text escapes region: '+x.value+' [glyph='+JSON.stringify(a)+', region='+JSON.stringify(b)+']');
   }
   if(w<=720&&m.title.bottom>m.status.y+1)err.push('Mobile forecast title/status collision');
   const clip=Math.min(h,Math.max(115,Math.ceil(R.bottom+30)));
   try{await page.screenshot({path:path.join(OUT,name+'-'+scenario+'.png'),clip:{x:0,y:0,width:w,height:clip},timeout:15000,animations:'disabled'});}
   catch(e){err.push('Screenshot failed: '+e.message)}
   results.push({name,scenario,metrics:m,errors:err});
   console.log('APPROVED_HUD_QA',JSON.stringify({name,scenario,image:m.frame,alpha:m.alpha,errors:err}));
  }
  await page.close();
 }
}finally{await browser.close()}
const bad=results.filter(x=>x.errors.length);
fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({status:bad.length?'FAIL':'PASS',results},null,2));
if(bad.length){console.error('APPROVED_HUD_QA_FAILED',JSON.stringify(bad.map(x=>({name:x.name,scenario:x.scenario,errors:x.errors}))));process.exit(1)}
console.log('APPROVED_HUD_QA_PASSED',results.length);
