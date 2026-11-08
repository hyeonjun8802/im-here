import { chromium, webkit } from 'playwright';
import fs from 'node:fs';
const dir='docs/qa/hud-art-fit-v1400';
fs.mkdirSync(dir,{recursive:true});
const variants=[['mobile-320',320,568],['mobile-390',390,844],['mobile-430',430,932],['desktop-1280',1280,800],['desktop-1920',1920,1080]];
const engines=(process.env.QA_BROWSER||'chromium').split(',');
const reports=[];
for(const engine of engines){
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,args:engine==='chromium'?['--no-sandbox','--disable-dev-shm-usage']:[]});
 try{
  for(const [name,w,h] of variants){
   const page=await browser.newPage({viewport:{width:w,height:h},isMobile:w<=720,hasTouch:w<=720});
   const errs=[];
   page.on('pageerror',e=>errs.push(e.message));
   await page.route('**/src/main.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'// only 3D world is disabled for HUD layout capture'}));
   await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:45000});
   await page.evaluate(async()=>{
     document.querySelector('#loading')?.remove();
     const p=await import('/src/premiumHudV1000.js');
     const ui=await import('/src/commonUiAssetsV3.js');
     p.installPremiumHudV1000(document.querySelector('#disaster-forecast')).sync({weather:'clear',majorDisasterType:'storm',majorDisasterAt:Date.now()+18*3600000},Date.now());
     await ui.installCommonUiAssetsV3();
     const style=document.createElement('style');
     style.textContent='#world{background:#14202b} .event-log{display:none!important}';
     document.head.append(style);
   });
   await page.waitForFunction(()=>document.querySelector('.premium-hud__current-art')?.complete&&document.querySelector('.premium-hud__current-art')?.naturalWidth>0&&document.querySelector('.afterday-v3-action-icon')?.complete,{timeout:20000});
   const value=await page.evaluate(()=>{
     const rect=el=>{if(!el)return null;const b=el.getBoundingClientRect();return {x:+b.x.toFixed(2),y:+b.y.toFixed(2),w:+b.width.toFixed(2),h:+b.height.toFixed(2),right:+b.right.toFixed(2),bottom:+b.bottom.toFixed(2)}};
     const pic=document.querySelector('.premium-hud__current-art');
     function imgAlpha(img){
       if(!img?.naturalWidth)return null;
       const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
       const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
       const d=ctx.getImageData(0,0,c.width,c.height).data;
       let minX=c.width,minY=c.height,maxX=-1,maxY=-1,n=0;
       for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
         const idx=(y*c.width+x)*4;
         if(d[idx+3]>80){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);n++;}
       }
       return {width:c.width,height:c.height,alphaBounds:[minX,minY,maxX,maxY],fillX:+((maxX-minX+1)/c.width).toFixed(3),fillY:+((maxY-minY+1)/c.height).toFixed(3),src:img.currentSrc?.slice(-65),pixels:n};
     }
     const root=document.querySelector('.premium-hud-v1000'),stats=document.querySelector('.survival-hud-stats');
     const stock=document.querySelector('.survival-hud-stock'),vitals=document.querySelector('.survival-hud-vitals');
     const nav=document.querySelector('.actionbar');
     const slots=[...nav.children].filter(el=>!el.hidden&&getComputedStyle(el).display!=='none').map(el=>{
       const icon=el.querySelector(':scope > img')||el.querySelector(':scope > span');
       return {id:el.id||el.className,cell:rect(el),icon:rect(icon),alpha:icon?.tagName==='IMG'?imgAlpha(icon):null,overflow:getComputedStyle(el).overflow,src:icon?.getAttribute('src')?.slice(0,35)};
     });
     const stockRows=[...stock.children].map(el=>({self:rect(el),icon:rect(el.querySelector('i')),count:rect(el.querySelector('strong'))}));
     const cssTop=['.survival-hud-stats','.survival-hud-vitals','.survival-hud-stock','.premium-hud__current-art'].map(q=>{const e=document.querySelector(q),cs=getComputedStyle(e);return [q,{left:cs.left,top:cs.top,width:cs.width,height:cs.height,overflow:cs.overflow,objectFit:cs.objectFit}]});
     return {viewport:{w:innerWidth,h:innerHeight},root:rect(root),stats:rect(stats),vitals:rect(vitals),stock:rect(stock),stockRows,pic:rect(pic),picPixels:imgAlpha(pic),nav:rect(nav),slots,cssTop};
   });
   await page.screenshot({path:dir+'/'+engine+'-'+name+'.png',animations:'disabled'});
   reports.push({engine,name,...value,pageErrors:errs});
   console.log('ART_FIT_METRICS '+JSON.stringify({engine,name,viewport:value.viewport,pic:value.pic,picPixels:value.picPixels,stats:value.stats,stock:value.stock,stockRows:value.stockRows,slots:value.slots.map(s=>({id:s.id,cell:s.cell,icon:s.icon,alpha:s.alpha?.alphaBounds,overflow:s.overflow})),errors:errs}).slice(0,22000));
   await page.close();
  }
 }finally{await browser.close();}
}
fs.writeFileSync(dir+'/metrics.json',JSON.stringify(reports,null,2));
if(reports.some(r=>r.pageErrors.length))process.exitCode=1;
