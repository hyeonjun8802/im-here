import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const MOTIONS={
  wave:{duration:1.8,view:'front'},
  guitar:{duration:2.4,view:'front'},
  eat:{duration:2.35,view:'front'},
  radio:{duration:2.4,view:'front'},
  stretch:{duration:16,view:'front'},
  'sleep-enter':{duration:5.6,view:'right'},
};
const motion=process.argv[2];
const base=process.argv[3]||'http://127.0.0.1:4173';
const outRoot=process.argv[4]||'/tmp/afterday-arm-audit';
if(!MOTIONS[motion])throw new Error('Unknown motion: '+motion);
const {duration,view}=MOTIONS[motion];
const out=path.join(outRoot,motion);fs.mkdirSync(out,{recursive:true});

const browser=await chromium.launch({
  executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome-stable',
  headless:true,
  args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']
});
const ctx=await browser.newContext({viewport:{width:420,height:620},deviceScaleFactor:1});
const page=await ctx.newPage();
let currentBad=[];
page.on('pageerror',e=>currentBad.push('PAGE '+e.message));
page.on('console',m=>{if(m.type()==='error'&&!/favicon/i.test(m.text()))currentBad.push('CONSOLE '+m.text())});
page.on('response',r=>{if(r.status()>=400&&!/favicon/i.test(r.url()))currentBad.push('HTTP '+r.status()+' '+r.url())});

// Load the real GLB only once. Repeated navigation was crashing headless WebGL
// in long 10-frame audits and wasting most of the sandbox lifetime.
const url=base+'/character.html?pose='+encodeURIComponent(motion)+'&view='+view+'&at=0';
await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>window.qaAfterdayCharacter?.modelLoaded===true,null,{timeout:30000});
await page.evaluate(()=>{
  for(const s of ['#overlay','#status','#views','#timeline','#actions','#hint']){
    const el=document.querySelector(s);if(el)el.style.display='none';
  }
});
const client=await ctx.newCDPSession(page);

for(let i=0;i<10;i++){
  const t=duration*i/9;currentBad=[];
  await page.evaluate((time)=>{
    const input=document.querySelector('#qa-time');
    const freeze=document.querySelector('#qa-freeze');
    if(freeze){freeze.checked=true;freeze.dispatchEvent(new Event('change',{bubbles:true}));}
    if(input){input.value=String(time);input.dispatchEvent(new Event('input',{bubbles:true}));}
  },t);
  // Two to three rendered frames are enough for the damped pose adapter to settle.
  await page.waitForTimeout(220);
  const qa=await page.evaluate(()=>window.qaAfterdayCharacter);
  const shot=await client.send('Page.captureScreenshot',{format:'jpeg',quality:78,captureBeyondViewport:false,fromSurface:true});
  fs.writeFileSync(path.join(out,String(i+1).padStart(2,'0')+'.jpg'),Buffer.from(shot.data,'base64'));
  fs.writeFileSync(path.join(out,String(i+1).padStart(2,'0')+'.json'),JSON.stringify({motion,frame:i+1,t,qa,bad:[...currentBad]},null,2));
  if(currentBad.length)console.error(motion,i+1,currentBad);
}
await ctx.close();await browser.close();
console.log(JSON.stringify({motion,frames:10,duration,view,out}));
