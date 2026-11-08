import {chromium,webkit} from 'playwright';
import fs from 'node:fs';
const directory='docs/qa/premium-equipment-v1600';fs.mkdirSync(directory,{recursive:true});
const sizes=[['phone320',320,640],['iphone390',390,844],['phone430',430,932],['tablet768',768,1024],['desktop1280',1280,800]];
const results=[];
for(const [engine,driver] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await driver.launch({headless:true,args:engine==='chromium'?['--no-sandbox','--disable-dev-shm-usage']:[]});
 try{
  for(const [name,w,h] of sizes){
   const page=await browser.newPage({viewport:{width:w,height:h},isMobile:w<=720,hasTouch:w<=720});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.route('**/src/main.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'// Real app DOM / sprites / CSS; 3D disabled for deterministic dense-equipment QA'}));
    await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:45000});
    await page.evaluate(async()=>{
     document.querySelector('#loading')?.remove();
     const {installCommonUiAssetsV3}=await import('/src/commonUiAssetsV3.js');
     const {installPremiumHudV1000}=await import('/src/premiumHudV1000.js');
     const {installPremiumEquipmentHudV1600}=await import('/src/premiumEquipmentHudV1600.js');
     installPremiumHudV1000(document.querySelector('#disaster-forecast')).sync({weather:'storm',majorDisasterType:'tornado',majorDisasterAt:Date.now()+20*3600000},Date.now());
     await installCommonUiAssetsV3();
     installPremiumEquipmentHudV1600();
     document.querySelector('#inventory-items').textContent='보유 4종 · 텐트 · 정수기 · 재배 씨앗 · 무전기';
     document.querySelector('#sleep-arrangement').textContent='텐트 수면 · 회복 강화';
     document.querySelector('#companion-status').textContent='생존자 신호 대기';
     document.querySelector('#radio-contact').hidden=false;
     const style=document.createElement('style');style.textContent='#world{background:radial-gradient(circle at 50% 55%,#394d4b,#121d28 70%)}.event-log{display:none!important}';
     document.head.append(style);
    });
    await page.waitForFunction(()=>{
     const t=document.querySelector('#equipment-actions-toggle');
     return t&&!t.hidden&&document.querySelector('.premium-hud__current-art')?.naturalWidth>0&&document.querySelector('#survival-kit').dataset.premiumEquipmentHud==='v16';
    },null,{timeout:20000});
    const metrics=await page.evaluate(()=>{
     function rect(sel){
      const e=document.querySelector(sel);if(!e)return null;
      const r=e.getBoundingClientRect();return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2),right:+r.right.toFixed(2),bottom:+r.bottom.toFixed(2)};
     }
     return {
      kit:rect('#survival-kit'),title:rect('#survival-kit > small:first-child'),
      inventory:rect('#inventory-items'),sleep:rect('#sleep-arrangement'),companion:rect('#companion-status'),
      primary:rect('#survival-kit-action'),toggle:rect('#equipment-actions-toggle'),
      menu:rect('.survival-kit-controls'),menuDisplay:getComputedStyle(document.querySelector('.survival-kit-controls')).display,
      fullButtons:[...document.querySelectorAll('.survival-kit-controls button:not([hidden])')].map(e=>({id:e.id,hidden:e.hidden})),
      nav:rect('.actionbar'),
      icons:[...document.querySelectorAll('.actionbar > button:not([hidden]) > img')].map(img=>{
       const a=img.getBoundingClientRect(),b=img.parentElement.getBoundingClientRect();
       return {dx:+((a.left+a.width/2)-(b.left+b.width/2)).toFixed(2),size:+a.width.toFixed(2),cell:+b.width.toFixed(2)}
      }),
      frameStyle:getComputedStyle(document.querySelector('#survival-kit')).backgroundImage.slice(0,55)
     };
    });
    const fail=[...errors];
    const m=metrics,k=m.kit;
    if(!k)fail.push('equipment frame missing');
    else{
     const ratio=k.w/k.h;
     if(Math.abs(ratio-(461/308))>.09)fail.push('equipment artwork stretched '+ratio.toFixed(3));
     if(m.inventory.y<k.y+k.h*.27-4)fail.push('inventory invades source title tab');
     if(m.companion.bottom>m.primary.y-5)fail.push('equipment details overlap baked emergency button');
     if(m.title.y<k.y||m.title.bottom>m.inventory.y)fail.push('title collides with body');
     if(m.toggle.x<m.title.right+2)fail.push('title overlaps feature disclosure');
     if(k.x<0||k.right>w)fail.push('equipment escapes viewport');
    }
    if(m.menuDisplay!=='none')fail.push('secondary actions overlap primary at rest');
    if(m.icons.length<8||m.icons.some(i=>Math.abs(i.dx)>2||i.size>i.cell-8))
      fail.push('bottom icons not centered within real slots');
    await page.screenshot({path:directory+'/'+engine+'-'+name+'-closed.png',animations:'disabled'});
    await page.locator('#equipment-actions-toggle').click();
    const opened=await page.evaluate(()=>{
     const kit=document.querySelector('#survival-kit'),menu=document.querySelector('.survival-kit-controls');
     const rect=menu.getBoundingClientRect(),frame=kit.getBoundingClientRect();
     return {expanded:kit.classList.contains('premium-equipment-open'),aria:document.querySelector('#equipment-actions-toggle').getAttribute('aria-expanded'),
      menuBottom:rect.bottom,frameTop:frame.top,visible:getComputedStyle(menu).display!=='none'};
    });
    if(!opened.expanded||opened.aria!=='true'||!opened.visible||opened.menuBottom>opened.frameTop-3)
      fail.push('disclosure menu overlaps original metal frame');
    await page.screenshot({path:directory+'/'+engine+'-'+name+'-open.png',animations:'disabled'});
    await page.keyboard.press('Escape');
    if(await page.locator('#equipment-actions-toggle').getAttribute('aria-expanded')!=='false')
     fail.push('Escape does not close equipment menu');
    const result={engine,name,metrics,opened,issues:fail};results.push(result);
    console.log('PREMIUM_V16_LAYOUT '+JSON.stringify({engine,name,kit:k,inventory:m.inventory,companion:m.companion,primary:m.primary,toggle:m.toggle,opened,issues:fail}));
   }catch(e){
    results.push({engine,name,issues:[String(e)]});
    console.error('PREMIUM_V16_ERROR '+engine+' '+name+' '+String(e));
   }finally{await page.close().catch(()=>{})}
  }
 }finally{await browser.close()}
}
fs.writeFileSync(directory+'/report.json',JSON.stringify(results,null,2));
const bad=results.filter(r=>r.issues.length);
console.log('PREMIUM_V16_RESULT '+JSON.stringify({tested:results.length,failed:bad.length,failedCases:bad.map(r=>({engine:r.engine,name:r.name,issues:r.issues}))}));
if(bad.length)process.exitCode=1;
