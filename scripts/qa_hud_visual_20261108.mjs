/* Real production DOM, CSS and original atlas; only 3D boot is bypassed on CI.
   Reports actual Chromium bounds for mobile, tablet, and desktop. */
import {chromium,webkit} from 'playwright';
import fs from 'node:fs';
const out='docs/qa/hud-visual-20261108';fs.mkdirSync(out,{recursive:true});
fs.copyFileSync('public/assets/ui/apocalypse-v3/spritesheet.webp',out+'/atlas.webp');
fs.copyFileSync('public/assets/ui/apocalypse-v3/spritesheet.json',out+'/atlas.json');
const variants=[['phone-320',320,568],['phone-390-safari',390,668],['phone-390',390,844],['phone-430',430,732],['tablet-768',768,1024],['desktop-1280',1280,800],['desktop-1920',1920,1080]];
const report=[];
const engine=process.env.QA_BROWSER==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,args:engine==='chromium'?['--no-sandbox','--disable-dev-shm-usage']:[]});
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
  if(name==='phone-390-safari'||name==='desktop-1280'){
    const audit=await page.evaluate(()=>{
      const selectors={
       frame:'#hud .survival-kit',header:'#hud .survival-kit > small:first-child',
       content:'#inventory-items',action:'#survival-kit-action',
       nav:'#hud .actionbar',slot:'#hud .actionbar #drink',
       center:'.premium-hud__current-art',forecast:'.premium-hud__forecast',
       stats:'.survival-hud-stats',stock:'.survival-hud-stock',clock:'#clock'
      };
      const props=['top','left','right','bottom','width','height','min-height','padding','padding-top','padding-bottom','transform','grid-template-columns','background-size','object-position','font-size','position','display'];
      const log={};
      for(const [label,selector] of Object.entries(selectors)){
        const el=document.querySelector(selector);
        if(!el)continue;
        const rules=[];
        function scan(owner,list,media){
          for(const r of Array.from(list)){
            if(r.type===CSSRule.MEDIA_RULE){
              if(matchMedia(r.conditionText).matches)scan(owner,r.cssRules,r.conditionText);
            }else if(r.type===CSSRule.STYLE_RULE){
              let yes=false;try{yes=el.matches(r.selectorText)}catch{}
              if(!yes)continue;
              const d={};
              for(const p of props)if(r.style.getPropertyValue(p))d[p]=r.style.getPropertyValue(p)+(r.style.getPropertyPriority(p)==='important'?' !important':'');
              if(Object.keys(d).length)rules.push({css:owner.split('/').pop(),media,selector:r.selectorText,decl:d});
            }
          }
        }
        for(const sh of document.styleSheets){
          let rs;try{rs=sh.cssRules}catch{continue}
          scan(sh.href||'inline',rs,'all');
        }
        const computed=getComputedStyle(el);
        log[label]={computed:Object.fromEntries(props.map(p=>[p,computed.getPropertyValue(p)])),rules};
      }
      return log;
    });
    fs.writeFileSync(out+'/css-audit-'+engine+'-'+name+'.json',JSON.stringify(audit,null,2));
  }
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
  // Measure against the ORIGINAL sprite pixel coordinates, not the HTML box alone.
  // Native frame: equipment_panel 461x308, bottom_action_bar_full 1148x172.
  if(k&&f.title?.r){
   const center=(f.title.r.y+f.title.r.bottom)/2;
   const sourceCenter=k.y+k.h*53/308;
   if(Math.abs(center-sourceCenter)>3.2)problems.push('equipment raised header ink vs art center '+(center-sourceCenter).toFixed(2));
  }
  if(k&&f.inventory?.r){
   const sourceContentTop=k.y+k.h*90/308;
   if(f.inventory.r.y<sourceContentTop-2)problems.push('equipment text overlaps ORIGINAL header tab');
  }
  if(k&&f.action?.r){
   const center=(f.action.r.y+f.action.r.bottom)/2;
   const sourceCenter=k.y+k.h*250/308;
   if(Math.abs(center-sourceCenter)>3.2)problems.push('explore label off ORIGINAL button well '+(center-sourceCenter).toFixed(2));
  }
  const sourceSlotCenters=[110,230,350,468,586,706,826,943,1062];
  if(metrics.slots.length===9){
   for(let i=0;i<9;i++){
    const slot=metrics.slots[i],target=metrics.nav.x+metrics.nav.w*(sourceSlotCenters[i]/1148);
    const actual=slot.rect.x+slot.rect.w/2;
    if(Math.abs(actual-target)>2.8)problems.push('slot '+i+' misses ORIGINAL metal image center '+(actual-target).toFixed(2)+'px');
   }
  }else if(!metrics.nav||metrics.slots.length<9)problems.push('expected nine visible original art slots');
  // All live top-HUD data must fit the original metal safe wings.
  if(metrics.forecast&&metrics.hud&&metrics.forecast.right>metrics.hud.right)problems.push('forecast escapes original wing');

  const file=out+'/'+engine+'-'+name+'.png';
  await page.screenshot({path:file,fullPage:false,animations:'disabled'});
  if(name==='phone-390-safari'){
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
   await page.screenshot({path:out+'/icon-gallery-'+engine+'.png',fullPage:false,animations:'disabled'});
   await page.evaluate(()=>document.querySelector('#qa-icon-gallery')?.remove());
  }
  report.push({engine,name,metrics,problems,pageErrors:errs});
  console.log('LAYOUT_QA',JSON.stringify({engine,name,kit:metrics.kit,content:metrics.children,nav:metrics.nav,slotOffsets:metrics.slots.map(x=>({id:x.id,offset:x.offset,visualOffset:x.visualOffset})),weather:metrics.weather,clock:metrics.clock,problems,pageErrors:errs}));
  await page.close();
 }
}finally{await browser.close()}
fs.writeFileSync(out+'/report-'+engine+'.json',JSON.stringify(report,null,2));
console.log('LAYOUT_SUMMARY',JSON.stringify(report.map(x=>({name:x.name,problems:x.problems}))));
if(process.env.STRICT_HUD_QA==='1'&&report.some(r=>r.problems.length||r.pageErrors.length))process.exitCode=1;
