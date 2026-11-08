/* Real production DOM, CSS and original atlas; only 3D boot is bypassed on CI.
   Reports actual Chromium bounds for mobile, tablet, and desktop. */
import {chromium} from 'playwright';
import fs from 'node:fs';
const out='docs/qa/hud-visual-20261108';fs.mkdirSync(out,{recursive:true});
const variants=[['phone-320',320,690],['phone-390',390,844],['phone-430',430,932],['tablet-768',768,1024],['desktop-1280',1280,800],['desktop-1920',1920,1080]];
const report=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
try{
 for(const [name,w,h] of variants){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:w<720,hasTouch:w<720});
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.route('**/src/main.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'// WebGL scene disabled for reproducible actual DOM HUD QA'}));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:45000});
  await page.evaluate(async()=>{
   document.querySelector('#loading')?.remove();
   const {installPremiumHudV1000}=await import('/src/premiumHudV1000.js');
   const {installCommonUiAssetsV3}=await import('/src/commonUiAssetsV3.js');
   const now=Date.now();
   installPremiumHudV1000(document.querySelector('#disaster-forecast')).sync({weather:'clear',majorDisasterType:'storm',majorDisasterAt:now+18*3600000},now);
   await installCommonUiAssetsV3();
   const sty=document.createElement('style');
   sty.textContent='#world{background:radial-gradient(ellipse at center,#263f4b,#121c27 70%)}#loading{display:none!important}.event-log{display:none!important}';
   document.head.append(sty);
  });
  await page.waitForFunction(()=>document.querySelector('.afterday-v3-action-icon')?.complete&&document.querySelector('.premium-hud__current-art')?.naturalWidth>0,null,{timeout:20000});
  const metrics=await page.evaluate(()=>{
   const sel=q=>document.querySelector(q),r=e=>{if(!e)return null;const x=e.getBoundingClientRect();return {x:+x.x.toFixed(2),y:+x.y.toFixed(2),right:+x.right.toFixed(2),bottom:+x.bottom.toFixed(2),w:+x.width.toFixed(2),h:+x.height.toFixed(2)}};
   const kit=sel('.survival-kit'),nav=sel('.actionbar'),hud=sel('.premium-hud-v1000');
   const fields={title:sel('.survival-kit > small:first-child'),inventory:sel('#inventory-items'),sleep:sel('#sleep-arrangement'),companion:sel('#companion-status'),action:sel('#survival-kit-action')};
   const children={};for(const [k,e] of Object.entries(fields))children[k]={r:r(e),text:e?.textContent,style:e?{position:getComputedStyle(e).position,whiteSpace:getComputedStyle(e).whiteSpace,font:getComputedStyle(e).fontSize}:null};
   const slots=[...nav.children].filter(e=>!(e.hidden||getComputedStyle(e).display==='none')).map(e=>{
    const icon=e.querySelector(':scope > img')||e.querySelector(':scope > span');
    const a=r(e),b=r(icon);
    let visualOffset=null;
    if(icon?.tagName==='IMG'&&icon.complete&&icon.naturalWidth){
      const can=document.createElement('canvas');can.width=icon.naturalWidth;can.height=icon.naturalHeight;
      const cx=can.getContext('2d',{willReadFrequently:true});cx.drawImage(icon,0,0);
      const data=cx.getImageData(0,0,can.width,can.height).data;
      let l=can.width,t=can.height,rr=-1,bb=-1;
      for(let yy=0;yy<can.height;yy++)for(let xx=0;xx<can.width;xx++){
        if(data[(yy*can.width+xx)*4+3]<32)continue;
        l=Math.min(l,xx);rr=Math.max(rr,xx);t=Math.min(t,yy);bb=Math.max(bb,yy);
      }
      if(rr>=l)visualOffset=+((b.x+(l+rr+1)/2*b.w/can.width)-(a.x+a.w/2)).toFixed(2);
    }
    return {id:e.id||e.className,rect:a,icon:b,offset:b?+((b.x+b.w/2)-(a.x+a.w/2)).toFixed(2):null,visualOffset,iconType:icon?.nodeName,src:icon?.getAttribute('src')?.slice(0,35)||null};
   });
   return {viewport:{w:innerWidth,h:innerHeight},atlas:document.documentElement.dataset.commonUiVersion,
   kit:r(kit),children,nav:r(nav),slots,
   weather:r(sel('.premium-hud__current-art')),forecast:r(sel('.premium-hud__forecast')),forecastIcon:r(sel('.premium-hud__future-icon')),
   hud:r(hud),stats:r(sel('.survival-hud-stats')),stock:r(sel('.survival-hud-stock')),clock:r(sel('#clock')),
   frameImage:getComputedStyle(kit).backgroundImage.slice(0,55)};
  });
  let problems=[];
  const k=metrics.kit, f=metrics.children;
  if(!k||!metrics.nav||metrics.atlas!=='v3')problems.push('atlas/panel/nav not present');
  if(k&&f.title?.r&&f.inventory?.r&&f.title.r.bottom>f.inventory.r.y-2)problems.push('title hits inventory');
  if(k&&f.action?.r&&f.companion?.r&&f.companion.r.bottom>f.action.r.y-3)problems.push('text hits explore');
  for(const key of ['inventory','sleep','companion']){
   const p=f[key]?.r;
   if(k&&p&&(p.x<k.x+9||p.right>k.right-9||p.y<k.y+26||p.bottom>k.bottom-24))problems.push(key+' out of panel');
  }
  if(metrics.slots.some(s=>s.offset!==null&&Math.abs(s.offset)>3))problems.push('action icon box center mismatch');
  if(metrics.slots.some(s=>s.visualOffset!==null&&Math.abs(s.visualOffset)>3))problems.push('action icon optical center mismatch');
  if(metrics.weather&&metrics.hud&&Math.abs((metrics.weather.x+metrics.weather.w/2)-(metrics.hud.x+metrics.hud.w/2))>2)problems.push('weather dial off center');
  const file=out+'/'+name+'.png';
  await page.screenshot({path:file,fullPage:false,animations:'disabled'});
  if(name==='phone-390'){
   await page.evaluate(()=>{
    const panel=document.createElement('div');
    panel.id='qa-icon-gallery';
    panel.style.cssText='position:fixed;z-index:1500;top:235px;left:0;right:0;background:#131a21;padding:9px;display:grid;grid-template-columns:repeat(3,1fr);gap:9px;pointer-events:none';
    for(const id of ['drink','eat','repair','medicine','explore','weather-panel-toggle']){
      const img=document.querySelector('#'+id+' > img');
      if(!img)continue;
      const cell=document.createElement('div');
      cell.style.cssText='display:flex;flex-direction:column;align-items:center;color:white;font:12px sans-serif';
      const clone=img.cloneNode(true);clone.style.cssText='height:75px;width:75px;object-fit:contain;background:#242d38';
      const lbl=document.createElement('span');lbl.textContent=id;
      cell.append(clone,lbl);panel.append(cell);
    }
    document.body.append(panel);
   });
   await page.screenshot({path:out+'/icon-gallery.png',fullPage:false,animations:'disabled'});
   await page.evaluate(()=>document.querySelector('#qa-icon-gallery')?.remove());
  }
  report.push({name,metrics,problems,pageErrors:errs});
  console.log('LAYOUT_QA',JSON.stringify({name,kit:metrics.kit,content:metrics.children,nav:metrics.nav,slotOffsets:metrics.slots.map(x=>({id:x.id,offset:x.offset,visualOffset:x.visualOffset})),weather:metrics.weather,clock:metrics.clock,problems,pageErrors:errs}));
  await page.close();
 }
}finally{await browser.close()}
fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
console.log('LAYOUT_SUMMARY',JSON.stringify(report.map(x=>({name:x.name,problems:x.problems}))));
if(process.env.STRICT_HUD_QA==='1'&&report.some(r=>r.problems.length||r.pageErrors.length))process.exitCode=1;
