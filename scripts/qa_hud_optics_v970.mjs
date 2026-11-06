import fs from 'node:fs';
import path from 'node:path';
import {chromium,webkit} from 'playwright';
/* Pixel-oriented QA with ACTUAL game HTML, CSS, SVG files.
   Unlike the old tests, it checks text overlap, engraved panel bounds,
   motion, Safari layout and current-vs-future symbol collision. */
const source=fs.readFileSync('index.html','utf8');
const begin=source.indexOf('<header class="topbar">');
const end=source.indexOf('</header>',begin);
if(begin<0||end<0)throw Error('Game HUD missing');
const markup=source.slice(begin,end+9);
const out=path.resolve('docs/qa/hud-v970');
fs.mkdirSync(out,{recursive:true});
const checks=[],issues=[];
const base='http://127.0.0.1:5173/';
for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await browserType.launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
 try{
  for(const [label,width,height] of [['phone-s',360,780],['phone-m',390,844],['phone-l',430,932],['tablet',720,1000],['desktop',1440,900]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   await page.setContent('<!doctype html><html lang="ko"><head><base href="'+base+'"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+base+'src/style.css"><link rel="stylesheet" href="'+base+'src/hud-refine-v970.css"></head><body><div id="hud" style="position:absolute;inset:0">'+markup+'</div></body></html>',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('.disaster-forecast__frame');
   await page.evaluate(async()=>{
    const cur=document.querySelectorAll('.disaster-forecast__current img');
    const fut=document.querySelectorAll('.disaster-forecast__future img');
    for(const img of cur){img.src='/assets/ui/weather-premium-v970/cloud.svg';img.classList.add('is-active');}
    for(const img of fut){img.src='/assets/ui/weather-premium-v970/rain.svg';img.classList.add('is-active');}
    document.querySelector('.disaster-forecast__future').classList.add('is-visible');
    document.getElementById('days').textContent='DAY 028';
    document.getElementById('hud-disaster-name').textContent='폭우';
    document.getElementById('hud-disaster-eta').textContent='12시간 후';
    document.getElementById('hud-stock-food').textContent='24';
    document.getElementById('hud-stock-water').textContent='18';
    document.getElementById('hud-stock-medicine').textContent='7';
    document.getElementById('hud-stock-parts').textContent='63';
    await document.fonts.ready;
   });
   await page.waitForFunction(()=>[
    document.querySelector('.disaster-forecast__frame'),
    document.querySelector('.disaster-forecast__current .is-active'),
    document.querySelector('.disaster-forecast__future .is-active')
   ].every(img=>img&&img.complete&&img.naturalWidth>0),{timeout:20000});
   const steps=label==='desktop'||label==='tablet'?[['approach',78.95,50,12]]:[
    ['far',88.60,0,24],['approach',78.95,50,12],['near',70.25,95,1]
   ];
   const seq=[];
   for(const [stage,x,progress,hours] of steps){
    await page.evaluate(({x,progress,hours})=>{
     const root=document.querySelector('.disaster-forecast');
     root.style.setProperty('--forecast-x',x+'%');
     const bar=root.querySelector('.disaster-forecast__bar');
     bar.style.setProperty('--weather-bar-progress',progress+'%');
     root.querySelector('#hud-disaster-eta').textContent=hours+'시간 후';
    },{x,progress,hours});
    await page.waitForTimeout(850);
    const m=await page.evaluate(({engine,label,stage})=>{
      const R=(el)=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
      const Q=s=>R(document.querySelector(s));
      const root=Q('.disaster-forecast'),frame=Q('.disaster-forecast__frame');
      const present=Q('.disaster-forecast__current'),future=Q('.disaster-forecast__future');
      const eta=Q('.disaster-forecast__countdown'),stock=Q('.survival-hud-stock');
      const date=Q('.survival-hud-date'),vitals=Q('.survival-hud-vitals');
      const bar=Q('.disaster-forecast__bar'),fill=Q('.disaster-forecast__bar-fill');
      const speed=Q('#speed-toggle');
      const dateParts=[...document.querySelectorAll('.survival-hud-date>*')].map(R);
      const vitalParts=[...document.querySelectorAll('.survival-hud-stat')].map(r=>[...r.children].map(R));
      const stockParts=[...document.querySelectorAll('.survival-hud-stock>div')].map(r=>[...r.children].map(R));
      const font=Math.min(...[...document.querySelectorAll('.survival-hud-stat-label,.survival-hud-stock span')].map(x=>parseFloat(getComputedStyle(x).fontSize)));
      return{engine,label,stage,width:innerWidth,root,frame,present,future,eta,stock,date,vitals,bar,speed,dateParts,vitalParts,stockParts,minFont:font,
       fillRatio:fill.w/bar.w,
       iconReady:document.querySelector('.disaster-forecast__future .is-active').naturalWidth>0,
       art:document.querySelector('.disaster-forecast__frame').currentSrc.split('/').at(-1)};
    },{engine,label,stage});
    const problems=[];
    const overlap=(a,b,tol=.5)=>a.right>b.x+tol&&b.right>a.x+tol&&a.bottom>b.y+tol&&b.bottom>a.y+tol;
    const isMobile=width<=900;
    if(!m.iconReady)problems.push('hazard image not loaded');
    if(!m.art.includes(isMobile?'forecast_hud_mobile_v970.svg':'forecast_hud_frame_v950.svg'))problems.push('incorrect art source');
    if(Math.abs(m.present.x+m.present.w/2-(m.root.x+m.root.w/2))>2.5)problems.push('current weather not centered');
    if(m.future.x<m.present.right-1||m.future.right>m.frame.right-4)problems.push('moving icon collides with current/weather frame');
    if(m.eta.bottom>m.future.y+4&&overlap(m.eta,m.future))problems.push('countdown title collides with icon');
    if(m.stock.bottom>m.frame.bottom-13||m.stock.y<m.vitals.bottom-3)problems.push('stock outside its engraved frame');
    if(m.dateParts[0].right>m.dateParts[1].x+1)problems.push('DAY overlaps time-scale note');
    for(const [i,r]of m.vitalParts.entries()){
     if(r[0].right>r[1].x+1||r[1].right>r[2].x+1)problems.push('vital row '+i+' overlaps its gauge or value');
    }
    for(const [i,r] of m.stockParts.entries()){
     if(r[0].right>r[1].x+1)problems.push('stock cell '+i+' label overlaps quantity');
    }
    if(!Number.isFinite(m.fillRatio)||Math.abs(m.fillRatio-progress/100)>.05)problems.push('forecast bar fill out of sync');
    if(m.speed.y<m.frame.bottom+2)problems.push('speed control overlays frame');
    if(width<521&&m.minFont<7.3)problems.push('illegible vital/inventory caption size');
    if(problems.length)issues.push({engine,label,stage,problems,metrics:m});
    seq.push(m.future);
    checks.push({engine,label,stage,problems,frame:m.frame,stock:m.stock,future:m.future,current:m.present,barRatio:m.fillRatio});
    await page.screenshot({path:path.join(out,engine+'-'+label+'-'+stage+'.png'),animations:'disabled',timeout:25000});
    console.log('OPTICAL HUD QA',engine,label,stage,'frame',m.frame.w.toFixed(1)+'x'+m.frame.h.toFixed(1),'future',m.future.x.toFixed(1),'issues',problems.join('|')||'none');
   }
   if(seq.length===3&&!(seq[0].x>seq[1].x&&seq[1].x>seq[2].x&&Math.abs(seq[0].w-seq[2].w)<.2))issues.push({engine,label,reason:'future icon did not move LEFT at identical size'});
   await page.close();
  }
 }finally{await browser.close();}
}
const gallery=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await gallery.newPage({viewport:{width:1050,height:890}});
 const items=[['clear','맑음'],['cloud','흐림'],['rain','폭우'],['storm','뇌우'],['tornado','토네이도'],['heat','폭염'],['cold','한파'],['dust','모래폭풍'],['wildfire','산불']];
 const cards=items.map(([type,ko])=>'<div style="border:1px solid #bd9361;border-radius:12px;background:linear-gradient(#263946,#101b23);height:220px;display:grid;place-items:center"><img width="145" height="145" src="'+base+'assets/ui/weather-premium-v970/'+type+'.svg"><b style="color:#ecd2aa;font-size:22px">'+ko+'</b></div>').join('');
 await page.setContent('<html><body style="padding:30px;margin:0;background:#071019"><h2 style="color:#e7c693;text-align:center;font-family:sans-serif">AFTERDAY WEATHER ART · NINE TYPES</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px">'+cards+'</div></body></html>',{waitUntil:'load'});
 await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0),{timeout:15000});
 await page.screenshot({path:path.join(out,'all-nine-weather-icons.png'),fullPage:true});
 await page.close();
}finally{await gallery.close();}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,issues},null,2));
if(issues.length){console.error('V970 HUD VISUAL QA FAILED',JSON.stringify(issues).slice(0,5000));process.exitCode=1}
else console.log('V970 HUD VISUAL QA PASS '+checks.length+' state screenshots, 9 icon assets, all labels and resources legible');
