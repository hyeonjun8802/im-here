/** Download an unmodified CC0 VRoid sample model. No avatar generation API. */
import {mkdir,stat,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {OFFICIAL_AVATAR} from '../src/avatarProviderV170.js';
const url='https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/beta/Sakurada_Fumiriya.vrm';
const dest=join(process.cwd(),'public','assets','avatar','survivor.vrm');
const tmp=dest+'.download';
const minimum=1024*1024;
async function valid(file){try{const s=await stat(file);if(s.size<minimum)return false;const fd=await readFile(file);return fd.toString('ascii',0,4)==='glTF'&&fd.readUInt32LE(8)===s.size;}catch{return false;}}
if(await valid(dest)){console.log('✓ CC0 VRM avatar already installed');}else{
await mkdir(join(process.cwd(),'public','assets','avatar'),{recursive:true});
try{
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),90000);
 try{
  const response=await fetch(url,{signal:ctrl.signal,headers:{'User-Agent':'Afterday-Game-Asset-Installer'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==OFFICIAL_AVATAR.expectedBytes)throw Error('Downloaded avatar size mismatch: '+bytes.length);
  if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(8)!==bytes.length)throw Error('Not a valid GLB/VRM binary');
  await writeFile(tmp,bytes);await rename(tmp,dest);
  console.log(`✓ Real full-body VRM installed: ${dest} (${(bytes.length/1048576).toFixed(1)}MB)`);
 }finally{clearTimeout(timer)}
}catch(e){await rm(tmp,{force:true}).catch(()=>{});console.error('Avatar download failed:',e.message);process.exitCode=1;}

}
