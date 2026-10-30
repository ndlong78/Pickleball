/* Loopback-only integration fixture. Never use this gateway in a deployment. */
'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..');
const ALLOWED=new Set(['/auth/v1/otp','/auth/v1/verify','/auth/v1/token','/auth/v1/logout','/auth/v1/user','/auth/v1/settings',...['pull_changes','begin_import','import_batch','finish_import','get_import_status'].map(n=>'/rest/v1/rpc/'+n)]);
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const listen=(server,port)=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server.address().port))});
function fixtureError(){return Object.assign(new Error('fixture_error'),{code:'fixture_error'})}
async function readBody(req){let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>1024*1024)throw fixtureError();chunks.push(chunk)}return Buffer.concat(chunks)}
async function start({backendURL,anonKey,appPort=4173,apiPort=4174}){
 // The only credential source is ephemeral `supabase status`. Refuse a remote
 // project even if a caller accidentally supplies one. Unit tests use loopback.
 const base=new URL(backendURL);
 if(base.protocol!=='http:'||base.hostname!=='127.0.0.1'||base.pathname!=='/'||base.search||base.hash||base.username||base.password||!anonKey)throw fixtureError();
 const alias='sb_publishable_local_'+crypto.randomBytes(24).toString('hex');
 const state={rpc:[],dropNextBatch:false,dropCount:0,held:null};let appOrigin,apiOrigin,app,api;
 function holdNextPull(){
  if(state.held)throw fixtureError();let reached,release;
  const seen=new Promise(r=>reached=r),gate=new Promise(r=>release=r);
  state.held={reached,gate,release,claimed:false};return {seen,release};
 }
 try{
  api=http.createServer(async(req,res)=>{
   const cors={'Access-Control-Allow-Origin':appOrigin,'Access-Control-Allow-Headers':'apikey,authorization,content-type,x-client-info,x-supabase-api-version','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
   try{
    const url=new URL(req.url,'http://fixture.invalid');
    if(req.headers.origin!==appOrigin||!ALLOWED.has(url.pathname)||!['GET','POST','OPTIONS'].includes(req.method)){res.writeHead(403,cors).end();return}
    if(req.method==='OPTIONS'){res.writeHead(204,cors).end();return}
    if(req.headers.apikey!==alias){res.writeHead(401,cors).end();return}
    const body=await readBody(req),headers={apikey:anonKey,'Content-Type':'application/json'};
    // Older local Kong exposes a JWT anon key, while the app only accepts a
    // publishable key. Translate the test alias at this boundary, never in UI.
    // Authenticated JWTs pass through unchanged. No fabricated Auth/RPC result.
    if(req.headers.authorization)headers.Authorization=req.headers.authorization==='Bearer '+alias?'Bearer '+anonKey:req.headers.authorization;
    const upstream=await fetch(base.origin+url.pathname+url.search,{method:req.method,headers,body:req.method==='GET'?undefined:body,redirect:'error',signal:AbortSignal.timeout(30000)});
    const data=Buffer.from(await upstream.arrayBuffer());if(data.length>16*1024*1024)throw fixtureError();
    if(url.pathname.startsWith('/rest/v1/rpc/')){
     const name=url.pathname.split('/').at(-1);state.rpc.push({name,body:body.toString('utf8')});
     if(name==='import_batch'&&state.dropNextBatch&&upstream.ok&&JSON.parse(data).status==='applied'){state.dropNextBatch=false;state.dropCount++;res.destroy();return}
     if(name==='pull_changes'&&state.held&&!state.held.claimed){const hold=state.held;hold.claimed=true;hold.reached(JSON.parse(data));await hold.gate;if(state.held===hold)state.held=null}
    }
    if(!res.destroyed)res.writeHead(upstream.status,{...cors,'Content-Type':upstream.headers.get('content-type')||'application/json'}).end(data);
   }catch(_){if(!res.destroyed)res.writeHead(502,cors).end('{"error":"local_fixture_unavailable"}')}
  });
  apiOrigin='http://127.0.0.1:'+await listen(api,apiPort);
  app=http.createServer(async(req,res)=>{
   try{
    const url=new URL(req.url,'http://fixture.invalid');let file=decodeURIComponent(url.pathname);
    if(!file.startsWith('/Pickleball/')){res.writeHead(404).end();return}
    file=file.slice('/Pickleball/'.length)||'index.html';
    if(file==='modules/auth-config.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end('window.PICKLEUP_AUTH_CONFIG=Object.freeze('+JSON.stringify({enabled:true,url:apiOrigin,publishableKey:alias})+');');return}
    if(file==='modules/data/import-config.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end('window.PICKLEUP_IMPORT_CONFIG=Object.freeze({enabled:true});');return}
    const resolved=path.resolve(ROOT,file),type=TYPES[path.extname(file)];
    if(!resolved.startsWith(ROOT+path.sep)||!type||file.split('/').some(p=>p.startsWith('.'))||file.startsWith('node_modules/')||file.startsWith('test-results/')){res.writeHead(404).end();return}
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','Service-Worker-Allowed':'/Pickleball/'}).end(await fs.readFile(resolved));
   }catch(_){if(!res.headersSent)res.writeHead(404);res.end()}
  });
  appOrigin='http://127.0.0.1:'+await listen(app,appPort);
 }catch(error){api?.closeAllConnections();api?.close();app?.closeAllConnections();app?.close();throw error}
 return {appOrigin,apiOrigin,alias,state,holdNextPull,async close(){state.held?.release();await Promise.all([app,api].map(server=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve)})))}};
}
module.exports={start};
