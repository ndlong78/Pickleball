const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {allowed}=require('../modules/auth-origin.js');
const stage='https://pickleup-staging.home-309.workers.dev',project='https://rfeoeagklmaqmkcdhprb.supabase.co';
const originSource=fs.readFileSync(path.join(__dirname,'../modules/auth-origin.js'),'utf8');
const configSource=fs.readFileSync(path.join(__dirname,'../modules/auth-config.js'),'utf8');
test('Auth permits only the exact staging origin/project and documented app paths',()=>{
 for(const pathname of ['/','/index.html','/Pickleball/','/Pickleball/index.html']){
  assert.equal(allowed({href:stage+pathname},project),true);
  assert.equal(allowed({href:stage+pathname+'?page=settings&pilot=account-data'},project+'/'),true);
 }
 for(const href of ['https://ndlong78.github.io/Pickleball/','https://ndlong78.github.io/other/','https://pickleup.no.id.vn/','https://preview-pickleup-staging.home-309.workers.dev/','http://pickleup-staging.home-309.workers.dev/','https://pickleup-staging.home-309.workers.dev:8443/',stage+'/other/','not a URL'])assert.equal(allowed({href},project),false);
});
test('Auth fail closes on malformed or swapped projects and absent location',()=>{
 for(const api of [undefined,'invalid',project+'/auth/v1',project+'?x=1',project+'#secret','https://other.supabase.co','http://127.0.0.1:54321'])assert.equal(allowed({href:stage+'/'},api),false);
 assert.equal(allowed(undefined,project),false);
});
test('loopback Auth requires a loopback backend, never the Managed project',()=>{
 for(const hostname of ['localhost','127.0.0.1','[::1]']){
  assert.equal(allowed({href:'http://'+hostname+':4173/Pickleball/'},'http://127.0.0.1:54321'),true);
  assert.equal(allowed({href:'http://'+hostname+':4173/'},project),false);
 }
});
test('deployment config is disabled on Pages or without its helper; signup stays closed',()=>{
 for(const [href,helper,enabled]of [[stage+'/',true,true],['https://ndlong78.github.io/Pickleball/',true,false],['http://127.0.0.1:4173/',true,false],[stage+'/',false,false]]){
  const window={location:{href}},context=vm.createContext({window,URL});
  if(helper)vm.runInContext(originSource,context);
  vm.runInContext(configSource,context);
  assert.equal(window.PICKLEUP_AUTH_CONFIG.enabled,enabled);
  assert.equal(window.PICKLEUP_AUTH_CONFIG.allowSignup,false);
 }
});
