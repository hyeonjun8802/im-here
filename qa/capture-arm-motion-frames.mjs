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
for(let i=0;i<10;i++){
  const t=duration*i/9;
  const ctx=await browser.newContext({viewport:{width:420,height:620},deviceScaleFactor:1});
  const page=await ctx.newPage();const bad=[];
  page.on('pageerror',e=>bad.push('PAGE '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))bad.push('CONSOLE '+m.text())});
  const url=base+'/character.html?pose='+encodeURIComponent(motion)+'&view='+view+'&at='+t.toFixed(4);
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.qaAfterdayCharacter?.modelLoaded===true,null,{timeout:30000});
  await page.waitForTimeout(550);
  await page.screenshot({path:path.join(out,String(i+1).padStart(2,'0')+'.jpg'),type:'jpeg',quality:78});
  const qa=await page.evaluate(()=>window.qaAfterdayCharacter);
  fs.writeFileSync(path.join(out,String(i+1).padStart(2,'0')+'.json'),JSON.stringify({motion,frame:i+1,t,qa,bad},null,2));
  if(bad.length)console.error(motion,i+1,bad);
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify({motion,frames:10,duration,view,out}));
