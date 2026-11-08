#!/usr/bin/env node
/* One-time post-merge cleanup of old remote branches.
 * Preserve main and two latest pre-existing non-maintenance branches.
 * Never force-update any ref; save all old branch SHAs in an Actions artifact. */
import fs from 'node:fs';
const REPO='hyeonjun8802/im-here';
const TEMP='maintenance/frontend-audit-prune-20261108';
const token=process.env.GITHUB_TOKEN;
if(process.env.GITHUB_REPOSITORY!==REPO||process.env.GITHUB_REF!=='refs/heads/main'
   ||!/^[a-f0-9]{40}$/i.test(process.env.GITHUB_SHA||'')||!token)
 throw Error('Refusing branch deletion outside authorized main workflow');
const headers={
 Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
 'X-GitHub-Api-Version':'2022-11-28','User-Agent':'afterday-cleanup-once'
};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const encodeBranch=s=>s.split('/').map(encodeURIComponent).join('/');
async function api(method,path){
 for(let attempt=0;attempt<3;attempt++){
  const response=await fetch('https://api.github.com/repos/'+REPO+'/'+path,{method,headers});
  if(response.ok)return response.status===204?null:response.json();
  const msg=(await response.text()).slice(0,600);
  if(attempt<2&&(response.status===429||response.status>=500)){
    await pause(850*(attempt+1));continue;
  }
  throw Error(method+' '+path+' HTTP '+response.status+' '+msg);
 }
}
async function branches(){
 const all=[];
 for(let p=1;p<=10;p++){
  const batch=await api('GET','branches?per_page=100&page='+p);
  all.push(...batch);
  if(batch.length<100)break;
 }
 return all;
}
async function mapPool(items,limit,fn){
 const result=new Array(items.length);let offset=0;
 await Promise.all(Array.from({length:Math.min(items.length,limit)},async()=>{
  while(offset<items.length){const i=offset++;result[i]=await fn(items[i],i)}
 }));
 return result;
}
const main=await api('GET','git/ref/heads/main');
if(main.object.sha!==process.env.GITHUB_SHA)
 throw Error('Main changed since workflow dispatch; refusing destructive cleanup');
const initial=await branches();
if(initial.length<4)throw Error('Already cleaned or unexpected inventory');
const eligible=initial.filter(b=>b.name!=='main'&&b.name!==TEMP);
const dated=await mapPool(eligible,6,async b=>{
 const data=await api('GET','commits/'+b.commit.sha);
 const date=data.commit?.committer?.date||data.commit?.author?.date;
 if(!date||!Number.isFinite(Date.parse(date)))throw Error('Invalid commit date '+b.name);
 return {name:b.name,sha:b.commit.sha,date};
});
dated.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)||a.name.localeCompare(b.name));
const keep=new Set(['main',...dated.slice(0,2).map(x=>x.name)]);
if(keep.size!==3)throw Error('Unable to select exactly three branches');
const targets=initial.filter(b=>!keep.has(b.name));
const report={
 timestamp:new Date().toISOString(),repository:REPO,
 baseMainSha:main.object.sha,before:initial.length,kept:[...keep],
 targetRefs:targets.map(b=>({name:b.name,sha:b.commit.sha,protected:!!b.protected})),
 deleted:[],failed:[],remaining:[]
};
fs.mkdirSync('reports/maintenance',{recursive:true});
const save=()=>fs.writeFileSync('reports/maintenance/branch-prune-report-20261108.json',JSON.stringify(report,null,2));
save();
console.log('BRANCH_PRUNE_PLAN '+JSON.stringify({before:initial.length,keep:report.kept,deleteCount:targets.length}));
for(const b of targets){
 try{
  if(b.protected)throw Error('Protected GitHub branch; cannot delete safely');
  const ref=await api('GET','git/ref/heads/'+encodeBranch(b.name));
  if(ref.object.sha!==b.commit.sha)throw Error('Branch head advanced since inventory');
  await api('DELETE','git/refs/heads/'+encodeBranch(b.name));
  report.deleted.push({name:b.name,sha:b.commit.sha});
  await pause(85);
 }catch(error){report.failed.push({name:b.name,reason:String(error).slice(0,800)})}
 save();
}
report.remaining=(await branches()).map(b=>({name:b.name,sha:b.commit.sha}));
save();
console.log('BRANCH_PRUNE_RESULT '+JSON.stringify({
 before:report.before,deleted:report.deleted.length,kept:report.kept,
 remaining:report.remaining.map(x=>x.name),failed:report.failed
}));
if(report.failed.length||report.remaining.length!==3||
 report.remaining.some(b=>!keep.has(b.name)))throw Error('Branch cleanup incomplete; see artifact');
