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
     // The 3D boot is disabled for deterministic HUD QA. Supply representative
     // live gauge widths so the screenshot also checks bars, not empty rails.
     for(const [id,width] of [['hud-health-fill','88%'],['hud-food-fill','72%'],['hud-water-fill','68%']]){
       const el=document.getElementById(id);if(el)el.style.width=width;
     }
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
const problems=[];
for(const r of reports){
 const errors=[...r.pageErrors];
 if(!r.root||!r.pic||!r.picPixels)errors.push('HUD or weather artwork missing');
 else{
  // Trim-independent visual diameter: real painted pixels, not the img DOM box.
  const ink=Math.min(r.pic.w*r.picPixels.fillX,r.pic.h*r.picPixels.fillY);
  const ratio=ink/r.root.w;
  if(ratio<.118||ratio>.152)errors.push('weather medallion fails real painted fill ratio: '+ratio.toFixed(4));
  if(Math.abs((r.pic.x+r.pic.w/2)-(r.root.x+r.root.w/2))>2)
    errors.push('weather artwork horizontal center shifted');
  const safeRight=r.root.x+r.root.w*.405;
  if(r.stock.right>safeRight)errors.push('resource stock outside authored left wing: '+(r.stock.right-safeRight).toFixed(2)+'px');
  for(const [idx,row] of r.stockRows.entries()){
   if(row.icon?.x<r.stock.x-.2||row.count?.right>r.stock.right+.2)
     errors.push('stock icon/counter '+idx+' escapes stock bounds');
  }
 }
 if(!r.nav||r.nav.x<-.5||r.nav.right>r.viewport.w+.5)errors.push('action bar outside viewport');
 if(r.slots.length!==9)errors.push('expected 9 original slots, got '+r.slots.length);
 for(const [idx,slot] of r.slots.entries()){
  if(!slot.alpha||!slot.icon)errors.push('missing complete vector icon in slot '+idx);
  else{
   const [left,top,right,bottom]=slot.alpha.alphaBounds;
   if(left<3||top<1||right>60||bottom>60)
     errors.push('slot '+idx+' source glyph clipped: '+slot.alpha.alphaBounds.join(','));
   if(slot.icon.x<slot.cell.x+3||slot.icon.right>slot.cell.right-3||
      slot.icon.y<slot.cell.y+3||slot.icon.bottom>slot.cell.bottom-3)
     errors.push('slot '+idx+' box touches metal frame');
   const center=(slot.icon.x+slot.icon.right)/2,frame=(slot.cell.x+slot.cell.right)/2;
   if(Math.abs(center-frame)>1.2)errors.push('slot '+idx+' icon horizontal center shifted');
  }
 }
 if(errors.length)problems.push({engine:r.engine,name:r.name,issues:errors});
}
fs.writeFileSync(dir+'/strict-results.json',JSON.stringify({cases:reports.length,failures:problems},null,2));
console.log('ART_FIT_STRICT '+JSON.stringify({tested:reports.length,errors:problems}));
if(process.env.QA_STRICT_ART_FIT==='1'&&problems.length)process.exitCode=1;
