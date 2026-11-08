/* Full game 3D + HUD verification. This is NOT a stubbed CSS-only test.
 * GitHub runner uses software WebGL, while real phones use device GPUs.
 */
import {chromium} from 'playwright';
import fs from 'node:fs';
const out='docs/qa/live-hud-v1400';fs.mkdirSync(out,{recursive:true});
const cases=[['live-desktop-1280',1280,800],['live-mobile-390',390,844]];
const issues=[],reports=[];
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--enable-unsafe-swiftshader','--use-angle=swiftshader','--use-gl=angle'
]});
try{
 for(const [name,w,h] of cases){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:w<720?1:.5,hasTouch:w<720,isMobile:w<720});
  page.setDefaultTimeout(30000);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/shader|boot|webgl|uncaught/i.test(m.text()))errors.push(m.text().slice(0,550))});
  try{
   await page.goto('http://127.0.0.1:5173/?visualqa=1',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>Boolean(window.afterday?.world?.renderer&&
    document.documentElement.dataset.commonUiVersion==='v3'&&
    document.querySelector('.premium-hud__current-art')?.naturalWidth>0&&
    [...document.querySelectorAll('.actionbar > button[data-v3-sprite] img')].every(img=>img.complete&&img.naturalWidth>0)
   ),null,{timeout:w<720?68000:95000});
   // Visual QA only: retain the real 3D world and live game HUD, but hide
   // the mandatory first-day decision overlay in this isolated test page.
   // No game state is changed and no production dialog logic is removed.
   await page.addStyleTag({content:'.afterday-board,.afterday-quest-backdrop{visibility:hidden!important;pointer-events:none!important}'});
   await page.evaluate(()=>{
     if(window.afterday?.world?.setQuality)window.afterday.world.setQuality('low');
   });
   await page.waitForTimeout(900);
   const metrics=await page.evaluate(()=>{
    const world=window.afterday.world,renderer=world.renderer,gl=renderer.getContext();
    const r=q=>{const el=document.querySelector(q);if(!el)return null;const b=el.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom}};
    const icons=[...document.querySelectorAll('.actionbar >button:not([hidden]) img,.actionbar > .afterday-v3-standby-slot:not([hidden]) img')].map(i=>({source:i.currentSrc.slice(0,35),width:i.naturalWidth,height:i.naturalHeight,r:r('#'+i.parentElement.id)}));
    const canvas=renderer.domElement;
    const error=document.getElementById('error');
    return {
     webgl:gl?.getParameter(gl.VERSION)||'',
     canvas:[canvas.width,canvas.height],
     visibleCanvas:canvas.width>0&&canvas.height>0,
     frame:r('#disaster-forecast'),art:r('.premium-hud__current-art'),
     stock:r('.survival-hud-stock'),nav:r('.actionbar'),icons,
     bodyReady:document.body.classList.contains('afterday-real-ui-v3'),
     error:error&&!error.classList.contains('hidden')?error.textContent.slice(0,400):null,
     drawCalls:renderer.info.render.calls,gameTime:document.querySelector('#clock')?.textContent,
     canvasDataLength:canvas.toDataURL('image/png').length
    };
   });
   const bad=[];
   if(!metrics.visibleCanvas||!metrics.webgl||metrics.canvasDataLength<15000)bad.push('3D WebGL not painted');
   if(!metrics.bodyReady)bad.push('original common UI art not initialized');
   if(metrics.icons.length<8||metrics.icons.some(x=>!x.width||!x.height))bad.push('live icons broken');
   if(metrics.stock.right>metrics.frame.x+metrics.frame.w*.405)bad.push('live stock escapes metal wing');
   if(metrics.nav.x<0||metrics.nav.right>w+2)bad.push('action rail escapes screen');
   if(metrics.error)bad.push('live game error '+metrics.error);
   if(errors.length)bad.push(...errors.slice(0,5));
   const row={name,viewport:[w,h],metrics,errors:bad};
   reports.push(row);
   console.log('LIVE_HUD_V1400 '+JSON.stringify({name,viewport:[w,h],webgl:metrics.webgl,canvas:metrics.canvas,drawCalls:metrics.drawCalls,icons:metrics.icons.length,stock:metrics.stock,nav:metrics.nav,errors:bad}));
   // Screenshot compositing of a real WebGL scene can stall for >60s on CI's
   // software GPU even when the 3D game is healthy. The renderer's actual
   // painted canvas is a stronger deterministic rendering assertion.
   const painted=await page.evaluate(()=>window.afterday.world.renderer.domElement.toDataURL('image/png').split(',')[1]);
   if(!painted||painted.length<18000)throw new Error('WebGL frame pixels not available for capture');
   fs.writeFileSync(out+'/world-'+name+'.png',Buffer.from(painted,'base64'));
   try{
     await page.screenshot({path:out+'/'+name+'.png',animations:'disabled',timeout:18000});
   }catch(error){
     console.log('LIVE_HUD_COMPOSITE_CAPTURE_SKIPPED '+name+' '+String(error).slice(0,150));
   }
   if(bad.length)issues.push(row);
  }catch(e){
   issues.push({name,error:String(e)});
   console.log('LIVE_HUD_ERROR '+name+' '+String(e).slice(0,1600));
  }finally{await page.close().catch(()=>{});}
 }
}finally{await browser.close().catch(()=>{});}
fs.writeFileSync(out+'/report.json',JSON.stringify({reports,issues},null,2));
console.log('LIVE_HUD_SUMMARY '+JSON.stringify({total:cases.length,failures:issues.length}));
if(issues.length)process.exitCode=1;
