/* v18 production HUD responsive quality gate; real atlas, Safari/Chrome. */
import {chromium,webkit} from 'playwright';
import fs from 'node:fs';
const out='docs/qa/compact-hud-v1800';
fs.mkdirSync(out,{recursive:true});
const sizes=[['mobile320',320,640],['mobile390',390,844],['mobile430',430,932],['tablet768',768,1024],['desktop1280',1280,800]];
const expectedMax={mobile320:213,mobile390:230,mobile430:250,tablet768:285,desktop1280:335};
const cases=[],issues=[];
for(const [engine,driver] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await driver.launch({headless:true,args:engine==='chromium'?['--no-sandbox','--disable-dev-shm-usage']:[]});
 try {
  for(const [name,w,h] of sizes){
   const page=await browser.newPage({viewport:{width:w,height:h},isMobile:w<=720,hasTouch:w<=720});
   const errors=[]; page.on('pageerror',err=>errors.push(err.message));
   try{
    await page.route('**/src/main.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'// Render real HUD sprites and CSS without 3D boot for deterministic layout audit.'}));
    await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:45000});
    await page.evaluate(async()=>{
     document.querySelector('#loading')?.remove();
     const {installPremiumHudV1000}=await import('/src/premiumHudV1000.js');
     const {installCommonUiAssetsV3}=await import('/src/commonUiAssetsV3.js');
     const {installPremiumEquipmentHudV1600}=await import('/src/premiumEquipmentHudV1600.js');
     const now=Date.now();
     installPremiumHudV1000(document.querySelector('#disaster-forecast'))
       .sync({weather:'storm',majorDisasterType:'storm',majorDisasterAt:now+18*3600000},now);
     await installCommonUiAssetsV3();
     installPremiumEquipmentHudV1600();
     document.querySelector('#inventory-items').textContent='보유 4종 · 텐트 · 정수기 · 재배 씨앗 · 무전기';
     document.querySelector('#sleep-arrangement').textContent='텐트 수면 · 회복 강화';
     document.querySelector('#companion-status').textContent='생존자 신호 대기';
     document.querySelector('#radio-contact').hidden=false;
     const style=document.createElement('style');
     style.textContent='#world{background:radial-gradient(circle at 50% 55%,#334342,#101823 75%)}.event-log{display:none!important}';
     document.head.append(style);
    });
    await page.waitForFunction(()=>document.documentElement.dataset.commonUiVersion==='v3'&&
      document.querySelector('#survival-kit')?.dataset.premiumEquipmentHud==='v16'&&
      [...document.querySelectorAll('.actionbar > button:not([hidden]) img')].every(img=>img.complete&&img.naturalWidth>0),
      null,{timeout:20000});
    const m=await page.evaluate(()=>{
     const box=selector=>{
      const el=document.querySelector(selector);if(!el)return null;
      const x=el.getBoundingClientRect();
      return {x:x.x,y:x.y,w:x.width,h:x.height,right:x.right,bottom:x.bottom};
     };
     const bar=document.querySelector('.actionbar');
     return {
      kit:box('#survival-kit'),header:box('#survival-kit > small:first-child'),
      inventory:box('#inventory-items'),sleep:box('#sleep-arrangement'),
      companion:box('#companion-status'),action:box('#survival-kit-action'),
      toggle:box('#equipment-actions-toggle'),nav:box('.actionbar'),
      menuDisplay:getComputedStyle(document.querySelector('.survival-kit-controls')).display,
      metalOnly:/url\(/.test(getComputedStyle(bar).backgroundImage),
      icons:[...bar.querySelectorAll(':scope > button:not([hidden]) > img,:scope > .afterday-v3-standby-slot:not([hidden]) > img')].map(icon=>{
        const a=icon.getBoundingClientRect(),b=icon.parentElement.getBoundingClientRect();
        return {id:icon.parentElement.id||'reserve',dx:(a.left+a.width/2)-(b.left+b.width/2),
          dy:(a.top+a.height/2)-(b.top+b.height/2),srcOK:icon.complete&&icon.naturalWidth>0,
          size:a.width,cell:b.width,shadow:getComputedStyle(icon.parentElement).boxShadow,
          background:getComputedStyle(icon.parentElement).backgroundImage};
      })
     };
    });
    const fail=[...errors];
    const kit=m.kit;
    if(!kit)fail.push('equipment frame absent');
    else {
      if(kit.w>expectedMax[name])fail.push('equipment oversized '+kit.w);
      if(Math.abs(kit.w/kit.h-461/308)>.08)fail.push('equipment frame aspect distorted');
      if(kit.x<0||kit.right>w)fail.push('equipment offscreen');
      if(m.header.bottom>m.inventory.y-2)fail.push('header hits inventory');
      if(m.inventory.y<kit.y+kit.h*.27-4)fail.push('inventory invades metal title');
      if(m.companion.bottom>m.action.y-5)fail.push('content overlaps emergency button');
      if(kit.bottom>m.nav.y-7)fail.push('equipment overlaps bottom navigation');
    }
    if(m.menuDisplay!=='none')fail.push('disclosure not closed by default');
    if(!m.metalOnly)fail.push('metal bar art missing');
    if(m.icons.length<8)fail.push('fewer than eight icons');
    for(const icon of m.icons){
      const target=w<=720?4:3;
      if(!icon.srcOK)fail.push(icon.id+' icon broken');
      if(Math.abs(icon.dx)>1.6)fail.push(icon.id+' not centered horizontally '+icon.dx.toFixed(1));
      if(Math.abs(icon.dy-target)>1.5)fail.push(icon.id+' y target '+icon.dy.toFixed(1)+' vs '+target);
      if(icon.size>icon.cell-8)fail.push(icon.id+' icon clipped');
      if(icon.shadow!=='none'||icon.background!=='none')fail.push(icon.id+' duplicated metal');
    }
    await page.screenshot({path:out+'/'+engine+'-'+name+'.png',animations:'disabled'});
    const result={engine,name,viewport:[w,h],metrics:m,issues:fail};cases.push(result);
    if(fail.length)issues.push(result);
    console.log('COMPACT_HUD_V18 '+JSON.stringify({engine,name,kitWidth:kit?.w,headerY:m.header?.y,bodyY:m.inventory?.y,buttonY:m.action?.y,iconOffsets:m.icons.map(i=>i.dy.toFixed(1)),problems:fail}));
   }catch(e){
    const row={engine,name,error:String(e)};cases.push(row);issues.push(row);
    console.log('COMPACT_HUD_ERROR '+engine+' '+name+' '+String(e));
   }finally{await page.close().catch(()=>{})}
  }
 }finally{await browser.close()}
}
fs.writeFileSync(out+'/results.json',JSON.stringify({cases,issues},null,2));
console.log('COMPACT_HUD_SUMMARY '+JSON.stringify({tested:cases.length,failures:issues.length}));
if(issues.length)process.exitCode=1;
