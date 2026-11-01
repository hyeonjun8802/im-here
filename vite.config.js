import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({
 root:'.',base:'./',publicDir:'public',
 build:{
  outDir:'dist',emptyOutDir:true,
  rollupOptions:{input:{game:resolve(process.cwd(),'index.html'),character:resolve(process.cwd(),'character.html')}}
 }
});
