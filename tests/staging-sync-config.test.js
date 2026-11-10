const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../modules/data/sync-config.js'),'utf8');
const origin='https://pickleup-staging.home-309.workers.dev';
const auth={enabled:true,url:'https://rfeoeagklmaqmkcdhprb.supabase.co'};
function config(href,authentication=auth){
 const window={location:href===undefined?undefined:{href},PICKLEUP_AUTH_CONFIG:authentication};
 vm.runInNewContext(source,{window,URL});return window.PICKLEUP_SYNC_CONFIG;
}
test('staging sync requires explicit URL opt-in, with the normal staging URL staying disabled',()=>{
 for(const href of [origin+'/',origin+'/?page=settings',origin+'/?pilot=',origin+'/?pilot=all',origin+'/?pilot=preferences-checkins&pilot=preferences-checkins'])assert.equal(config(href).enabled,false);
 for(const prefix of ['/', '/index.html', '/Pickleball/', '/Pickleball/index.html']){
  const c=config(origin+prefix+'?page=settings&pilot=preferences-checkins');assert.equal(c.enabled,true);assert.equal(c.scope,'staging-preferences-checkins');assert.equal(Object.isFrozen(c),true);
 }
});
test('the trial stays disabled on Pages, custom domains, lookalike hosts, HTTP, ports and other paths',()=>{
 for(const url of ['https://ndlong78.github.io/Pickleball/','https://pickleup.no.id.vn/','https://pickleup-staging.home-309.workers.dev.example.org/','http://pickleup-staging.home-309.workers.dev/','https://pickleup-staging.home-309.workers.dev:8443/','http://127.0.0.1:4173/','https://pickleup-staging.home-309.workers.dev/other/']){
  const c=config(url+'?pilot=preferences-checkins');assert.equal(c.enabled,false);assert.equal(c.scope,null);
 }
});
test('the trial is bound to enabled Auth on the intended staging project',()=>{
 const href=origin+'/?pilot=preferences-checkins';
 for(const a of [null,{}, {...auth,enabled:false}, {...auth,url:'https://another-project.supabase.co'}, {...auth,url:auth.url+'/auth/v1'}, {...auth,url:auth.url+'?x=1'}])assert.equal(config(href,a).enabled,false);
 assert.equal(config(href,{...auth,url:auth.url+'/'}).enabled,true);
});
test('absent or malformed location fails closed and cached code reevaluates the current URL',()=>{
 for(const href of [undefined,'not-a-url','about:blank'])assert.equal(config(href).enabled,false);
 assert.equal(config(origin+'/?pilot=preferences-checkins').enabled,true);
 assert.equal(config(origin+'/?page=settings').enabled,false);
});
