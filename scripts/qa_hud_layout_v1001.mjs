import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('docs/qa/hud-layout-v1001',{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
const sizes=[['pc-2560',2560,1440],['pc-1280',1280,720],['tablet-768',768,1024],['mobile-390',390,844],['mobile-320',320,568]];
const reports=[];
try {
 for(const [name,width,height] of sizes){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'// game paused for HUD layout QA'}));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:35000});
  await page.evaluate(async()=>{
   document.querySelector('#loading')?.remove();
   const {installPremiumHudV1000}=await import('/src/premiumHudV1000.js');
   const now=Date.now();
   installPremiumHudV1000(document.querySelector('#disaster-forecast')).sync({weather:'clear',majorDisasterType:'storm',majorDisasterAt:now+12*3600000},now);
   const style=document.createElement('style');
   style.textContent='#world{background:linear-gradient(110deg,#304957,#101b27)}.event-log,.actionbar,.survival-kit,.warning,.top-right,#survival-chapter{display:none!important}';
   document.head.appendChild(style);
  });
  await page.waitForFunction(()=>document.querySelector('.premium-hud__frame')?.naturalWidth>0);
  for(const scenario of ['normal','stress']){
   if(scenario==='stress')await page.evaluate(()=>{
    for(const key of ['health','food','water'])document.querySelector('#hud-'+key+'-val').textContent='100%';
    for(const key of ['food','water','medicine','parts'])document.querySelector('#hud-stock-'+key).textContent='999';
   });
   const metrics=await page.evaluate(()=>{
    const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    const ink=el=>{const text=[...el.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());if(!text)return null;const range=document.createRange();range.selectNodeContents(text);return rect(range)};
    const targets=[...document.querySelectorAll('.survival-hud-stat-label,.survival-hud-stat strong,.survival-hud-stock strong')];
    const texts=targets.map(el=>{
      const bounds=rect(el),glyph=ink(el),parent=rect(el.closest('.survival-hud-stock>div')||el.parentElement);
      return {name:el.id||el.closest('[data-meter]')?.dataset.meter,text:el.textContent.trim(),fontPx:parseFloat(getComputedStyle(el).fontSize),bounds,glyph,parent,
        overOwn:!!glyph&&(glyph.left<bounds.left-.7||glyph.right>bounds.right+.7),
        overParent:!!glyph&&(glyph.left<parent.left-.7||glyph.right>parent.right+.7)};
    });
    return {hud:rect(document.querySelector('.premium-hud-v1000')),stats:rect(document.querySelector('.survival-hud-stats')),
       stock:rect(document.querySelector('.survival-hud-stock')),frameNaturalWidth:document.querySelector('.premium-hud__frame')?.naturalWidth,
       medallion:rect(document.querySelector('.premium-hud__current-art')),
       weatherNameCount:document.querySelectorAll('.premium-hud__weather-name').length,
       infoButtonCount:document.querySelectorAll('.premium-hud__info').length,
       texts,issues:texts.filter(t=>t.overOwn||t.overParent).map(t=>({name:t.name,text:t.text,overOwn:t.overOwn,overParent:t.overParent})),
       tiny:texts.filter(t=>t.fontPx<7).map(t=>({name:t.name,fontPx:t.fontPx}))};
   });
   if(metrics.issues.length)errors.push('Survivor text exceeds allocated slot: '+JSON.stringify(metrics.issues));
   if(metrics.weatherNameCount||metrics.infoButtonCount)errors.push('Removed weather label/info button still present');
   if(!metrics.medallion||metrics.medallion.width<metrics.hud.width*(width<=720?.15:.11))errors.push('Current weather medallion is undersized');
   if(metrics.stock.right>metrics.stats.right+1)errors.push('Resource grid extends beyond status safe area');
   const filename='docs/qa/hud-layout-v1001/'+name+'-'+scenario+'.png';
   await page.screenshot({path:filename,clip:{x:0,y:0,width,height:Math.min(height,Math.max(115,Math.ceil(metrics.hud.bottom+20)))},animations:'disabled'});
   reports.push({name,scenario,width,height,metrics,errors});
   console.log('HUD_LAYOUT',JSON.stringify({name,scenario,issues:metrics.issues,tiny:metrics.tiny,frameNaturalWidth:metrics.frameNaturalWidth,errors}));
  }
  await page.close();
 }
}finally{await browser.close()}
fs.writeFileSync('docs/qa/hud-layout-v1001/report.json',JSON.stringify(reports,null,2));
if(reports.some(r=>r.errors.length)){console.error('HUD_RESPONSIVE_QA_FAILED',JSON.stringify(reports.filter(r=>r.errors.length).map(r=>({name:r.name,scenario:r.scenario,errors:r.errors}))));process.exitCode=1;}
