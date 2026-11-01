/** Download project-selected original GitHub GLB models and texture atlas into public/assets.
 * Requires network on the developer's machine. No third-party npm modules required.
 */
import fs from 'node:fs/promises';import path from 'node:path';
const root=process.cwd();const manifest=JSON.parse(await fs.readFile(path.join(root,'public/assets/manifest.json'),'utf8'));
const origin='https://raw.githubusercontent.com/dgreenheck/simcity-threejs-clone/main/src/public/';
let failures=[],successes=0;const jobs=[...manifest.models.map(n=>['models',n]),...manifest.textureFiles.map(n=>['textures',n])];
async function fetchAsset([type,name]){const dest=path.join(root,'public','assets',type,name);try{await fs.mkdir(path.dirname(dest),{recursive:true});try{const old=await fs.stat(dest);if(old.size>100){successes++;return;}}catch{}
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),45000);
 try{const r=await fetch(origin+type+'/'+name,{signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);const buf=Buffer.from(await r.arrayBuffer());if(buf.length<100)throw Error('Too small');await fs.writeFile(dest,buf);successes++;console.log('✓ '+type+'/'+name+' ('+Math.round(buf.length/1024)+' KB)');}finally{clearTimeout(timer);}}
 catch(e){failures.push(type+'/'+name);console.error('✗ '+type+'/'+name+': '+e.message)}}
const concurrency=4;const workers=Array.from({length:concurrency},async(_,i)=>{for(let k=i;k<jobs.length;k+=concurrency)await fetchAsset(jobs[k]);});await Promise.all(workers);
console.log(`Finished: ${successes}/${jobs.length}. Failed: ${failures.length}`);
if(failures.length){await fs.writeFile(path.join(root,'asset-download-failures.txt'),failures.join('\n'));process.exitCode=1}

// The original AFTERDAY survivor GLB ships locally. No external avatar download required.
