import http from 'node:http';
import {createReadStream,statSync,existsSync} from 'node:fs';
import path from 'node:path';

// Local-only dependency-free server for the bundled ES module distribution.
const root=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json',
 '.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
 '.webp':'image/webp','.svg':'image/svg+xml','.wasm':'application/wasm'};
const port=Number(process.env.PORT)||5173;
const server=http.createServer((req,res)=>{
 let p;
 try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 if(p==='/')p='/index.html';
 const file=path.resolve(root,'.'+p);
 if(!file.startsWith(root+path.sep)||!existsSync(file)||!statSync(file).isFile()){
  res.writeHead(404).end('Not found');return;
 }
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream',
  'Cache-Control':'no-cache'});
 createReadStream(file).pipe(res);
});
server.listen(port,'127.0.0.1',()=>console.log(`AFTERDAY static 3D build: http://localhost:${port}/`));
