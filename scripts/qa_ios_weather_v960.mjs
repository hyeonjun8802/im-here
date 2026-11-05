/** WebKit browser engine check: iPhone-like 360/390/430 HUD + all nine art resources.
 * Uses the ACTUAL shipped HTML, CSS, SVG and responsive <picture> source.
 * The 3D canvas is intentionally not substituted for an image mockup. */
import fs from 'node:fs';
import path from 'node:path';
import {webkit} from 'playwright';

const out=path.resolve('docs/qa/ios-weather-v960');
fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync('index.html','utf8');
const a=html.indexOf('<header class="topbar">');
const b=html.indexOf('</header>',a);
if(a<0||b<0)throw Error('Missing real topbar');
const header=html.slice(a,b+9);
const base='http://127.0.0.1:5173/';
const browser=await webkit.launch({headless:true});
const errors=[];
try{
 for(const [device,w,h] of [['iphone-mini',360,780],['iphone',390,844],['iphone-max',430,932]]){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true});
  await page.setContent(`<!doctype html><html lang="ko"><head><base href="${base}">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="${base}src/style.css"></head>
    <body style="margin:0;background:linear-gradient(#0a1117,#343f46);min-height:100vh">
     <div id="hud" style="position:fixed;inset:0">${header}</div>
    </body></html>`,{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{
    const root=document.querySelector('#disaster-forecast');
    for(const el of root.querySelectorAll('.disaster-forecast__current img')){
     el.src='/assets/ui/weather-premium/cloud.svg';el.classList.add('is-active');
    }
    for(const el of root.querySelectorAll('.disaster-forecast__future img')){
     el.src='/assets/ui/weather-premium/dust.svg';el.classList.add('is-active');
    }
    root.querySelector('.disaster-forecast__future').classList.add('is-visible');
    root.style.setProperty('--forecast-x','80%');
    root.querySelector('.disaster-forecast__bar').style.setProperty('--weather-bar-progress','50%');
    document.getElementById('hud-disaster-name').textContent='모래폭풍';
    document.getElementById('hud-disaster-eta').textContent='12시간 후';
    await document.fonts.ready;
  });
  await page.waitForFunction(()=>{
    const f=document.querySelector('.disaster-forecast__frame');
    return f&&f.complete&&f.naturalWidth>0&&f.currentSrc.includes('forecast_hud_mobile_v960.svg');
  },{timeout:20000});
  await page.waitForTimeout(1100);
  const data=await page.evaluate(()=>{
   const rect=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
   const frame=rect('.disaster-forecast__frame'),root=rect('#disaster-forecast'),day=rect('.survival-hud-date');
   const vital=rect('.survival-hud-vitals'),stock=rect('.survival-hud-stock'),present=rect('.disaster-forecast__current');
   const forecast=rect('.disaster-forecast__future'),speed=rect('#speed-toggle'),rail=rect('.disaster-forecast__bar');
   const centerDelta=Math.abs((present.x+present.width/2)-(root.x+root.width/2));
   const labels=[...document.querySelectorAll('.survival-hud-stat-label,.survival-hud-stock span')].map(e=>e.textContent.trim());
   return {frame,day,vital,stock,present,forecast,speed,rail,centerDelta,labels,frameSrc:document.querySelector('.disaster-forecast__frame').currentSrc};
  });
  const okay=data.frame.y>=0&&data.frame.y<18&&data.frame.width>w-16&&
    data.day.y>data.frame.y+9&&data.day.bottom<data.vital.y+5&&
    data.stock.y>data.vital.y&&data.stock.bottom<data.frame.bottom-12&&
    data.stock.right<data.present.x+10&&data.centerDelta<3&&
    data.forecast.x>data.present.right-4&&data.rail.x>data.present.right-6&&
    data.speed.y>data.frame.bottom+3&&data.speed.right<=w+1;
  if(!okay)errors.push({device,data});
  console.log('WEBKIT HUD',device,JSON.stringify({okay,frame:data.frame,day:data.day,stock:data.stock,centerDelta:data.centerDelta,speedY:data.speed.y,source:data.frameSrc}));
  await page.screenshot({path:path.join(out,device+'.png'),animations:'disabled'});
  await page.close();
 }
 const weather=[
   ['clear','맑음'],['cloud','흐림'],['rain','비'],['storm','뇌우'],['tornado','토네이도'],
   ['heat','폭염'],['cold','한파'],['dust','모래폭풍'],['wildfire','산불']
 ];
 const gallery=await browser.newPage({viewport:{width:1080,height:900},deviceScaleFactor:1});
 const cards=weather.map(([type,korean])=>`<article style="background:linear-gradient(#26323b,#0c141a);border:2px solid #8c704d;border-radius:16px;padding:14px;box-shadow:0 12px 25px #0008;display:flex;flex-direction:column;align-items:center">
 <img style="width:150px;height:150px;object-fit:contain" src="${base}assets/ui/weather-premium/${type}.svg"/>
 <strong style="font-size:21px;color:#eccfa7;margin-top:8px">${korean}</strong><small style="font-size:12px;color:#8e9da4;margin-top:3px">${type}</small></article>`).join('');
 await gallery.setContent(`<html><body style="margin:0;padding:38px;background:#0a1218;font-family:sans-serif">
 <h2 style="color:#dfc6a0;text-align:center;letter-spacing:2px">AFTERDAY — WEATHER ART / 9 TYPES</h2>
 <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">${cards}</div></body></html>`,{waitUntil:'load'});
 await gallery.waitForFunction(()=>[...document.querySelectorAll('article img')].every(im=>im.complete&&im.naturalWidth>0),{timeout:20000});
 await gallery.screenshot({path:path.join(out,'weather-nine-art-gallery.png'),fullPage:true});
 await gallery.close();
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({failed:errors,screenshots:4},null,2));
 if(errors.length)throw Error('WebKit mobile HUD alignment: '+JSON.stringify(errors).slice(0,5000));
 console.log('WEBKIT iOS-like HUD VISUAL QA SUCCESS: 3 mobile screens + 9 premium icons.');
}catch(e){console.error('WEBKIT VISUAL QA FAILURE',e);process.exitCode=1}finally{await browser.close()}
