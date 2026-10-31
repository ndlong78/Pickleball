const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {start}=require('../scripts/lib/auth-browser-host.cjs');
async function fixture(work){
 const seen=[];const upstream=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;seen.push({path:req.url,key:req.headers.apikey,authorization:req.headers.authorization,body});res.writeHead(200,{'Content-Type':'application/json'}).end('{"status":"applied","changes":[]}')});
 await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
 const host=await start({backendURL:'http://127.0.0.1:'+upstream.address().port,anonKey:'synthetic-local-anon',appPort:0,apiPort:0});
 try{await work(host,seen)}finally{await host.close();upstream.closeAllConnections();await new Promise(resolve=>upstream.close(resolve))}
}
test('real-browser host is loopback-only and serves enabled config without leaking upstream credentials',async()=>{
 await assert.rejects(start({backendURL:'https://project.invalid',anonKey:'synthetic'}));
 await fixture(async host=>{
  const config=await(await fetch(host.appOrigin+'/Pickleball/modules/auth-config.js')).text();
  assert.ok(config.includes(host.alias));assert.ok(config.includes(host.apiOrigin));assert.ok(!config.includes('synthetic-local-anon'));
  assert.equal((await fetch(host.appOrigin+'/Pickleball/index.html')).status,200);
  for(const file of ['.git/config','node_modules/package.json','scripts/test_auth_browser.cjs','playwright-report/index.html','supabase/seed.sql','missing.js'])assert.equal((await fetch(host.appOrigin+'/Pickleball/'+file)).status,404);
 });
});
test('gateway rejects wrong origin/key and unsupported paths before contacting upstream',async()=>{
 await fixture(async(host,seen)=>{
  const headers={Origin:host.appOrigin,apikey:host.alias,Authorization:'Bearer '+host.alias};
  assert.equal((await fetch(host.apiOrigin+'/auth/v1/otp',{method:'OPTIONS',headers})).status,204);
  for(const [url,changes,expected]of [['/auth/v1/otp',{apikey:'wrong'},401],['/auth/v1/otp',{Origin:'https://other.invalid'},403],['/rest/v1/profiles',{},403]])assert.equal((await fetch(host.apiOrigin+url,{headers:{...headers,...changes}})).status,expected);
  assert.equal(seen.length,0);
 });
});
test('gateway translates only anonymous publishable alias; user bearer and RPC body remain unchanged',async()=>{
 await fixture(async(host,seen)=>{
  const headers={Origin:host.appOrigin,apikey:host.alias,Authorization:'Bearer '+host.alias,'Content-Type':'application/json'};
  assert.equal((await fetch(host.apiOrigin+'/auth/v1/otp',{method:'POST',headers,body:'{}'})).status,200);
  const body='{"p_operation_id":"synthetic-operation"}';
  assert.equal((await fetch(host.apiOrigin+'/rest/v1/rpc/pull_changes',{method:'POST',headers:{...headers,Authorization:'Bearer synthetic-user-jwt'},body})).status,200);
  assert.equal(seen[0].authorization,'Bearer synthetic-local-anon');assert.equal(seen[1].authorization,'Bearer synthetic-user-jwt');assert.equal(seen[1].key,'synthetic-local-anon');assert.equal(seen[1].body,body);
 });
});
test('network fault is injected after upstream commit and held pull can be released without fabricating its response',async()=>{
 await fixture(async(host,seen)=>{
  const headers={Origin:host.appOrigin,apikey:host.alias,'Content-Type':'application/json'};
  host.state.dropNextBatch=true;
  assert.equal((await fetch(host.apiOrigin+'/rest/v1/rpc/import_batch',{method:'POST',headers,body:'{}'})).status,502);
  assert.equal(seen.length,1);assert.equal(host.state.dropCount,1);
  const held=host.holdNextPull();const response=fetch(host.apiOrigin+'/rest/v1/rpc/pull_changes',{method:'POST',headers,body:'{}'});
  assert.deepEqual(await held.seen,{status:'applied',changes:[]});held.release();assert.equal((await response).status,200);
 });
});
