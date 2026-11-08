/* AFTERDAY v17 — verify ONE metal frame layer only.
 * Uses real production DOM, actual 48-sprite atlas and both browser engines.
 * 3D is bypassed exclusively in this deterministic CSS/asset test.
 */
import {chromium,webkit} from 'playwright';
import fs from 'node:fs';
const out='docs/qa/actionbar-single-layer-v1700';
fs.mkdirSync(out,{recursive:true});
const sizes=[['mobile-320',320,568],['iphone-390',390,844],['phone-430',430,932],['tablet-768',768,1024],['desktop-1280',1280,800],['desktop-1920',1920,1080]];
const engines=[['chromium',chromium],['webkit',webkit]];
const results=[];
for(const [engine,driver] of engines){
 const browser=await driver.launch({headless:true,args:engine==='chromium'?['--no-sandbox','--disable-dev-shm-usage']:[]});
 try{
  for(const [name,w,h] of sizes){
   const page=await browser.newPage({viewport:{width:w,height:h},hasTouch:w<=720,isMobile:w<=720});
   const pageErrors=[];
   page.on('pageerror',e=>pageErrors.push(String(e)));
   try{
    await page.route('**/src/main.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'// world disabled in actionbar art QA only'}));
    await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:45000});
    await page.evaluate(async()=>{
     document.querySelector('#loading')?.remove();
     const {installCommonUiAssetsV3}=await import('/src/commonUiAssetsV3.js');
     await installCommonUiAssetsV3();
     const style=document.createElement('style');
     style.textContent='#world{background:radial-gradient(circle at center,#253a3c,#151d26)}.event-log{display:none!important}';
     document.head.append(style);
    });
    await page.waitForFunction(()=>document.body.classList.contains('afterday-real-ui-v3')&&
      [...document.querySelectorAll('#hud .actionbar img')].length>=8&&
      [...document.querySelectorAll('#hud .actionbar img')].every(img=>img.complete&&img.naturalWidth>0),
      null,{timeout:20000});
    const capture=()=>page.evaluate(()=>{
      const bar=document.querySelector('#hud .actionbar');
      const rb=bar.getBoundingClientRect(),css=getComputedStyle(bar);
      const children=[...bar.children].filter(el=>!el.hidden&&getComputedStyle(el).display!=='none');
      return {
       viewport:{w:innerWidth,h:innerHeight},mode:bar.classList.contains('v3-has-extra-actions')?'overflow':'nine',
       bar:{left:rb.left,right:rb.right,width:rb.width,height:rb.height,bg:css.backgroundImage.slice(0,70)},
       children:children.map((el,i)=>{
        const s=getComputedStyle(el),before=getComputedStyle(el,'::before'),after=getComputedStyle(el,'::after');
        const img=el.querySelector(':scope > img');
        const box=el.getBoundingClientRect(),ib=img?.getBoundingClientRect();
        return {
         i,id:el.id||el.className,
         background:s.backgroundImage,backgroundColor:s.backgroundColor,
         border:[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth],
         boxShadow:s.boxShadow,
         before:{content:before.content,display:before.display,backgroundImage:before.backgroundImage},
         after:{content:after.content,display:after.display,backgroundImage:after.backgroundImage},
         iconPresent:!!img&&img.complete&&img.naturalWidth>0,
         iconCenterX:ib?(ib.left+ib.right)/2:null,
         iconCenterY:ib?(ib.top+ib.bottom)/2:null,
         cellCenterX:(box.left+box.right)/2,
         cellCenterY:(box.top+box.bottom)/2,
         width:box.width,iconW:ib?.width||0
        };
       })
      };
    });
    const check=(mode, data)=>{
     const failures=[...pageErrors];
     if(mode==='nine'&&data.children.length!==9)failures.push('expected nine buttons/placeholder');
     if(mode==='nine'&&!/url\(/.test(data.bar.bg))failures.push('source bar art missing');
     if(mode==='nine'&&(data.bar.left<-.5||data.bar.right>data.viewport.w+.5))failures.push('original bar overflows viewport');
     for(const item of data.children){
       if(item.background!=='none')failures.push(item.id+' has a second background image');
       if(item.border.some(b=>parseFloat(b)>0))failures.push(item.id+' draws its own border');
       if(item.boxShadow!=='none')failures.push(item.id+' draws a shadow/metal plate');
       if(item.before.content!=='none'&&item.before.display!=='none')failures.push(item.id+' has ::before overlay');
       if(item.after.content!=='none'&&item.after.display!=='none')failures.push(item.id+' has ::after overlay');
       if(item.before.backgroundImage!=='none'||item.after.backgroundImage!=='none')failures.push(item.id+' has pseudo-element image');
       if(!item.iconPresent)failures.push(item.id+' icon not loaded');
       if(mode==='nine'&&Math.abs(item.iconCenterX-item.cellCenterX)>2)failures.push(item.id+' icon not horizontally centered');
       if(mode==='nine'&&Math.abs(item.iconCenterY-item.cellCenterY)>2)failures.push(item.id+' icon not vertically centered');
     }
     return failures;
    };
    let normal=await capture();
    let failures=check('nine',normal);
    await page.screenshot({path:out+'/'+engine+'-'+name+'-single-frame.png',animations:'disabled'});
    // Weather emergency can reveal 10/11 actions; the overflow rail must
    // also contain icons only, never resurrect square_slot images.
    await page.evaluate(()=>{
      for(const id of ['take-cover','secure-supplies']){
        const button=document.getElementById(id);
        if(button)button.hidden=false;
      }
      document.getElementById('explore')?.classList.add('needs-attention');
    });
    await page.waitForFunction(()=>document.querySelector('.actionbar')?.classList.contains('v3-has-extra-actions'),null,{timeout:10000});
    const overflow=await capture();
    failures.push(...check('overflow',overflow));
    const record={engine,name,normal,overflow,issues:failures};
    results.push(record);
    console.log('SINGLE_FRAME_QA '+JSON.stringify({engine,name,normalSlots:normal.children.length,extraSlots:overflow.children.length,problems:failures}));
   }catch(e){
    results.push({engine,name,issues:[String(e)]});
    console.log('SINGLE_FRAME_ERROR '+engine+' '+name+' '+String(e));
   }finally{await page.close().catch(()=>{})}
  }
 }finally{await browser.close()}
}
fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
const failed=results.filter(x=>x.issues.length);
console.log('SINGLE_FRAME_SUMMARY '+JSON.stringify({tested:results.length,failed:failed.length,problems:failed.map(x=>({engine:x.engine,name:x.name,issues:x.issues}))}));
if(failed.length)process.exitCode=1;
