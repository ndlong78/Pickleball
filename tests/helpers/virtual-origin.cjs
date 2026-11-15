// Serve the built app (dist/) for a virtual origin straight from disk.
// The earlier pattern proxied every asset through route.fetch() to the loopback server; with two workers those proxied
// fetches intermittently stayed pending until the 30 s test timeout (4 of 96 runs locally, and CI run 43709115564).
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../../dist');
const types={'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
function resolve(url){
 let name=decodeURIComponent(new URL(url).pathname);
 if(name.startsWith('/Pickleball/'))name=name.slice('/Pickleball'.length);   // same mapping as scripts/serve_test.py
 if(name.endsWith('/'))name+='index.html';
 const file=path.normalize(path.join(root,name));
 return file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?file:null;
}
async function serve(context,site){
 await context.route(site+'/**',route=>{
  const file=resolve(route.request().url());
  return file?route.fulfill({path:file,contentType:types[path.extname(file)]||'application/octet-stream'}):route.fulfill({status:404,contentType:'text/plain',body:'not found'});
 });
}
module.exports={serve,resolve};
