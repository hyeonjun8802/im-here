import fs from 'node:fs';
import {chromium} from 'playwright';
const OUT='docs/qa/quests-v1100';
fs.mkdirSync(OUT,{recursive:true});
const sizes=[['desktop-1280',1280,720],['tablet-768',768,1024],['phone-390',390,844],['phone-320',320,568]];
const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
const reports=[];
try{
 for(const [name,width,height] of sizes){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'// 3D rendering paused for isolated quest layout QA'}));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(async()=>{
   document.querySelector('#loading')?.remove();
   const [{AfterdayEventBoard},{defaults,applyAction},{offerDailyScavenge},{offerCompanionRescue}]=await Promise.all([
     import('/src/eventBoard.js'),import('/src/simulation.js'),import('/src/scavengeDirector.js'),import('/src/supportCompanion.js')
   ]);
   const s=defaults(Date.now());
   offerDailyScavenge(s,1);
   const b=new AfterdayEventBoard({host:document.querySelector('#hud'),initialState:s,
    onExpeditionChoice:choice=>{const r=applyAction(s,'scavenge_'+choice,Date.now());if(r.good){b.dismiss(true);b.sync(s)}},
    onCompanionChoice:choice=>{const r=applyAction(s,'companion_'+choice,Date.now());if(r.good){b.dismiss(true);b.sync(s)}}
   });
   window.__questTest={s,b,offerCompanionRescue};
   document.querySelector('.top-right').style.display='none';
   b.sync(s);
  });
  for(const mode of ['expedition','companion']){
   if(mode==='companion')await page.evaluate(()=>{
    const {s,b,offerCompanionRescue}=window.__questTest;
    b.dismiss(true);s.scavenge.pending=null;s.kit.radio=true;
    s.scavenge.radioNewsId=23;s.scavenge.radioNewsType='contact';
    offerCompanionRescue(s,2);
    b.sync(s);
   });
   const result=await page.evaluate(mode=>{
    const {s,b}=window.__questTest;
    const root=document.querySelector('.afterday-board');
    const buttons=[...root.querySelectorAll(mode==='expedition'?'.afterday-board-expedition button':'.afterday-board-companion button')];
    const rect=el=>{let r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    const boardRect=rect(root);
    const buttonRects=buttons.map(rect);
    const locked=b.requiresChoice();
    const dismissResult=b.dismiss();
    const visibleButtons=buttons.filter(x=>getComputedStyle(x).display!=='none');
    return {locked,dismissResult,stillOpen:!root.hidden,backdropVisible:!b.backdrop.hidden,
     title:root.querySelector('.afterday-board-title').textContent,
     boardRect,buttonRects,buttonCount:buttons.length,visibleCount:visibleButtons.length,
     id:mode==='expedition'?s.scavenge.pending?.id:s.companion.pending?.id,
     role:root.getAttribute('role'),scrollHeight:root.scrollHeight,clientHeight:root.clientHeight};
   },mode);
   if(!result.locked||result.dismissResult!==false||!result.stillOpen||!result.backdropVisible)
    errors.push(mode+' is not mandatory');
   if(result.role!=='dialog'||!result.id||result.buttonCount!==4||result.visibleCount!==4)
    errors.push(mode+' does not show exactly four choices');
   if(result.boardRect.x<0||result.boardRect.y<0||result.boardRect.right>width+1||result.boardRect.bottom>height+1)
    errors.push(mode+' board outside screen');
   if(result.buttonRects.some(r=>r.x<0||r.y<0||r.right>width+1||r.bottom>height+1))
    errors.push(mode+' choices outside screen');
   await page.screenshot({path:OUT+'/'+name+'-'+mode+'.png',animations:'disabled'});
   reports.push({name,mode,width,height,errors:[...errors],result});
  }
  await page.close();
 }
}finally{await browser.close()}
fs.writeFileSync(OUT+'/report.json',JSON.stringify(reports,null,2));
for(const r of reports)console.log('QUEST_QA',r.name,r.mode,'choices='+r.result.buttonCount,'locked='+r.result.locked,'errors='+JSON.stringify(r.errors));
if(reports.some(x=>x.errors.length))process.exit(1);
