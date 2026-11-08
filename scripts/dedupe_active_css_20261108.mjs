#!/usr/bin/env node
/** Conservative, idempotent CSS cleanup.
 * Only exact duplicate selector/context/property/value/priority declarations
 * are removed. Changing CSS value, specificity, media behavior or source order
 * is forbidden. Keep intentional fallbacks with different values.
 */
import fs from 'node:fs';
import postcss from 'postcss';
const html=fs.readFileSync('index.html','utf8');
const files=[...html.matchAll(/<link[^>]+href="\.\/([^"]+\.css)"/g)].map(x=>x[1]);
const asts=files.map(file=>({file,ast:postcss.parse(fs.readFileSync(file,'utf8'),{from:file})}));
const entries=[];
for(const {file,ast} of asts){
 ast.walkRules(rule=>{
  const context=[];let node=rule.parent;
  while(node&&node.type!=='root'){context.unshift([node.type,node.name||'',node.params||'']);node=node.parent;}
  for(const d of rule.nodes||[]){
   if(d.type!=='decl')continue;
   entries.push({file,node:d,selector:rule.selector,context,
     key:JSON.stringify([context,rule.selector,d.prop,d.value.trim(),Boolean(d.important)])});
  }
 });
}
let dup=0,counts={};const seen=new Set();
for(let i=entries.length-1;i>=0;i--){
 const entry=entries[i];
 if(!seen.has(entry.key)){seen.add(entry.key);continue;}
 dup++;counts[entry.file]=(counts[entry.file]||0)+1;
 if(process.argv.includes('--apply'))entry.node.remove();
}
const touched=[];
if(process.argv.includes('--apply')){
 for(const {file,ast} of asts){
  let next=ast.toString();
  const prev=fs.readFileSync(file,'utf8');
  if(next!==prev){fs.writeFileSync(file,next);touched.push(file);}
 }
}
console.log('CSS_EXACT_DEDUPE '+JSON.stringify({
 scannedFiles:files.length,totalDeclarations:entries.length,
 removedExactDuplicates:dup,byFile:counts,modifiedFiles:touched,
 mode:process.argv.includes('--apply')?'applied':'audit-only'
}));
