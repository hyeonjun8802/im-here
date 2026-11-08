#!/usr/bin/env node
/** Read-only, provenance-first repository audit.
 * Frontend runtime reachability is a lower bound; dynamic references are always
 * retained for manual inspection. No file is removed by this command.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import postcss from 'postcss';

const tracked=execFileSync('git',['ls-files','-z'],{maxBuffer:16*1024*1024})
  .toString('utf8').split('\0').filter(Boolean);
const activeText=tracked.filter(x=>x==='index.html'||x==='character.html'||/^src\/.*\.(js|css|json|svg)$/.test(x));
const devText=tracked.filter(x=>/^(tests\/|scripts\/|\.github\/workflows\/)/.test(x)&&/\.(mjs|js|py|yml|yaml|html|css|json|ts)$/.test(x));
const read=p=>fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
const sources=activeText.map(p=>[p,read(p)]);
const dev=devText.map(p=>[p,read(p)]);
const runtimeStr=sources.map(x=>x[1]).join('\n');
const devStr=dev.map(x=>x[1]).join('\n');
const sum=fs.statSync;
function dirStats(paths){
 const grouped={};
 for(const p of paths){
  if(!fs.existsSync(p))continue;
  const parts=p.split('/');
  const group=p.startsWith('public/assets/')?parts.slice(0,4).join('/'):
   p.startsWith('docs/qa/')?parts.slice(0,3).join('/'):parts[0];
  (grouped[group]??={count:0,bytes:0}).count++;
  grouped[group].bytes+=sum(p).size;
 }
 return Object.entries(grouped).map(([name,x])=>({name,...x,mb:+(x.bytes/1048576).toFixed(2)}))
  .sort((a,b)=>b.bytes-a.bytes);
}
const assets=tracked.filter(x=>x.startsWith('public/assets/'));
const dirs=[...new Set(assets.map(p=>p.split('/').slice(0,4).join('/')))].sort();
const assetDirs=dirs.map(dir=>{
 const files=assets.filter(p=>p.startsWith(dir+'/'));
 const needle=dir.replace(/^public\//,'');
 const id=dir.split('/').at(-1);
 const runtimeHits=sources.filter(([p,s])=>s.includes(needle)||s.includes('/'+id+'/')||s.includes('/'+id));
 const devHits=dev.filter(([p,s])=>s.includes(needle)||s.includes('/'+id+'/')||s.includes('/'+id));
 return {dir,count:files.length,mb:+(files.reduce((n,p)=>n+sum(p).size,0)/1048576).toFixed(2),
   runtime:runtimeHits.map(x=>x[0]),dev:devHits.map(x=>x[0]),unreferenced:!runtimeHits.length&&!devHits.length};
});
function resolveImport(from,spec){
 if(!spec?.startsWith('.'))return null;
 let p=path.posix.normalize(path.posix.join(path.posix.dirname(from),spec));
 if(!path.posix.extname(p))p+='.js';
 return p;
}
const srcJs=tracked.filter(p=>/^src\/.*\.js$/.test(p));
const loaded=new Set(['src/main.js']);
for(const s of sources.filter(x=>x[0].endsWith('.html'))){
 for(const m of s[1].matchAll(/(?:src|href)=["']\.?\/?(src\/[^"']+\.js)["']/g))loaded.add(m[1]);
}
const imports={};
for(const p of srcJs){
 const s=read(p);
 imports[p]=[...s.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)]
  .map(m=>resolveImport(p,m[1]||m[2])).filter(Boolean);
}
const reachable=new Set(), stack=[...loaded];
while(stack.length){const p=stack.pop();if(reachable.has(p))continue;reachable.add(p);
 for(const q of imports[p]||[])if(srcJs.includes(q))stack.push(q);
}
const unreachable=srcJs.filter(p=>!reachable.has(p)).map(p=>({
 path:p,bytes:sum(p).size,referencedByDev:dev.some(([_,s])=>s.includes(path.basename(p))||s.includes(p)),
 referencedByOtherSrc:sources.some(([q,s])=>q!==p&&(s.includes(path.basename(p))||s.includes(p)))
}));
const cssFiles=tracked.filter(p=>/^src\/.*\.css$/.test(p));
const cssRefs=[...read('index.html').matchAll(/<link[^>]+href="\.\/([^"]+\.css)"/g)].map(m=>m[1]);
const duplicates=[],seen=new Map();let rules=0,decls=0,removedPossible=0;
for(const p of cssRefs){
 const root=postcss.parse(read(p),{from:p});
 root.walkRules(rule=>{
  rules++;
  const context=[];let n=rule.parent;
  while(n&&n.type!=='root'){context.unshift(n.type+':'+(n.params||n.name));n=n.parent;}
  rule.walkDecls(d=>{
    decls++;
    const key=JSON.stringify([context,rule.selector,d.prop]);
    const prev=seen.get(key);
    if(prev&&(!prev.important||d.important)){
      removedPossible++;
      if(duplicates.length<120)duplicates.push({prior:prev.source,now:p,selector:rule.selector,property:d.prop,context});
    }
    seen.set(key,{source:p,important:d.important});
  });
 });
}
const report={
 generatedAt:new Date().toISOString(),trackedCount:tracked.length,
 trackedBytes:tracked.reduce((n,p)=>n+(fs.existsSync(p)?sum(p).size:0),0),
 dirStats:dirStats(tracked).slice(0,45),
 activeCodeFiles:activeText.length,devCodeFiles:devText.length,
 css:{loaded:cssRefs,all:cssFiles,rules,decls,repeatPropertyPotential:removedPossible,examples:duplicates},
 js:{total:srcJs.length,reachable:reachable.size,unreachable},
 assetDirs,assetCandidates:assetDirs.filter(x=>x.unreferenced),
 generated:{nodeModules:dirStats(tracked.filter(x=>x.startsWith('node_modules/'))),
 dist:dirStats(tracked.filter(x=>x.startsWith('dist/'))),
 artifacts:dirStats(tracked.filter(x=>x.startsWith('artifacts/')))},
 references:{
 artifactsRuntime:activeText.filter(p=>read(p).includes('artifacts/pixal3d')),
 artifactsDev:devText.filter(p=>read(p).includes('artifacts/pixal3d')),
 archiveRuntime:activeText.filter(p=>read(p).includes('/afterday/archive/')),
 archiveDev:devText.filter(p=>read(p).includes('/afterday/archive/'))
 }};
fs.mkdirSync('reports/maintenance',{recursive:true});
fs.writeFileSync('reports/maintenance/frontend-audit-20261108.json',JSON.stringify(report,null,2));
console.log('REPO_AUDIT_SUMMARY '+JSON.stringify({
 trackedCount:report.trackedCount,trackedMB:Math.round(report.trackedBytes/1048576),
 generated:report.dirStats.filter(x=>['dist','node_modules','artifacts'].includes(x.name)),
 css:report.css,orphanModules:report.js.unreachable,unusedAssetDirs:report.assetCandidates,
 artifactRefs:report.references
}));
