const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'../modules/data/',file),'utf8');
const sources=['staging-pilot.js','sync-config.js','activity-config.js','plan-config.js','import-config.js'].map(read);
const origin='https://pickleup-staging.home-309.workers.dev',auth={enabled:true,url:'https://rfeoeagklmaqmkcdhprb.supabase.co',publishableKey:'sb_publishable_synthetic'};
function config(href,authentication=auth){const window={location:{href},PICKLEUP_AUTH_CONFIG:authentication},context=vm.createContext({window,URL});for(const source of sources)vm.runInContext(source,context);return window}
const flags=w=>[w.PICKLEUP_SYNC_CONFIG.enabled,w.PICKLEUP_ACTIVITY_CONFIG.enabled,w.PICKLEUP_PLAN_CONFIG.enabled,w.PICKLEUP_IMPORT_CONFIG.enabled];
const autos=w=>[w.PICKLEUP_SYNC_CONFIG.auto,w.PICKLEUP_ACTIVITY_CONFIG.auto,w.PICKLEUP_PLAN_CONFIG.auto];
const scopesOf=w=>[w.PICKLEUP_SYNC_CONFIG.scope,w.PICKLEUP_ACTIVITY_CONFIG.scope,w.PICKLEUP_PLAN_CONFIG.scope];
test('V5.31/V5.33: the main host turns the three account sources and the importer on by default (auto, no trial banner)',()=>{
 for(const href of [origin+'/',origin+'/?page=settings',origin+'/Pickleball/?page=journey#x']){const w=config(href);assert.deepEqual(flags(w),[true,true,true,true],href);assert.equal(Object.isFrozen(w.PICKLEUP_IMPORT_CONFIG),true);assert.deepEqual(autos(w),[true,true,true]);assert.deepEqual(scopesOf(w),[null,null,null]);assert.equal(w.PickleUpStagingPilot.auto(),true)}
});
test('operator URLs keep their old meaning: legacy trial opens one gate, maintenance closes every gate, none is auto',()=>{
 let w=config(origin+'/?pilot=preferences-checkins');assert.deepEqual(flags(w),[true,false,false,false]);assert.deepEqual(autos(w),[false,false,false]);assert.equal(w.PICKLEUP_SYNC_CONFIG.scope,'staging-preferences-checkins');
 w=config(origin+'/?page=settings&pilot=account-data');assert.deepEqual(autos(w),[false,false,false]);assert.deepEqual(scopesOf(w),['staging-preferences-checkins','staging-activity-events','staging-plans-selections']);
 for(const q of ['maintenance=account-cache','maintenance=x','page=settings&maintenance=account-cache']){w=config(origin+'/?'+q);assert.deepEqual(flags(w),[false,false,false,false],q);assert.equal(w.PickleUpStagingPilot.auto(),false)}
});
test('account-data trial opens three gates only on allowed paths, never importer or unknown scopes',()=>{
 for(const path of ['/','/index.html','/Pickleball/','/Pickleball/index.html']){
  const w=config(origin+path+'?page=settings&pilot=account-data');assert.deepEqual(flags(w),[true,true,true,false]);assert.equal(w.PickleUpStagingPilot.enabled('other'),false);assert.equal(Object.isFrozen(w.PICKLEUP_ACTIVITY_CONFIG),true);assert.equal(Object.isFrozen(w.PICKLEUP_PLAN_CONFIG),true);
 }
});
test('staging opt-in rejects duplicate/unknown modes, other hosts, preview origins, ports and paths',()=>{
 for(const href of [origin+'/?pilot=account-data&pilot=preferences-checkins',origin+'/?pilot=account-data&pilot=account-data',origin+'/?pilot=all','http://pickleup-staging.home-309.workers.dev/?pilot=account-data',origin+':8443/?pilot=account-data',origin+'/other/?pilot=account-data','https://preview-pickleup-staging.home-309.workers.dev/?pilot=account-data','https://ndlong78.github.io/Pickleball/?pilot=account-data','https://pickleup.no.id.vn/?pilot=account-data','not-a-url'])assert.deepEqual(flags(config(href)),[false,false,false,false]);
});
test('missing Auth, other project and non-publishable keys fail closed for all domains',()=>{
 for(const value of [null,{}, {...auth,enabled:false},{...auth,url:'https://other.supabase.co'},{...auth,publishableKey:undefined},{...auth,publishableKey:'sb_secret_synthetic'},{...auth,publishableKey:'eyJsynthetic'}])assert.deepEqual(flags(config(origin+'/?pilot=account-data',value)),[false,false,false,false]);
 assert.deepEqual(flags(config(origin+'/?pilot=account-data',{...auth,url:auth.url+'/'})),[true,true,true,false]);
});
test('entry button only offers a canonical staging URL without copying query strings or fragments',()=>{
 const w=config(origin+'/?page=progress&extra=value#section');assert.equal(w.PickleUpStagingPilot.available(),true);assert.equal(w.PickleUpStagingPilot.entry(),origin+'/?page=settings&pilot=account-data');assert.equal(w.PickleUpStagingPilot.mode(),null);
 assert.equal(config('https://example.org/?pilot=account-data').PickleUpStagingPilot.entry(),null);
});
test('domain flags remain off if the shared gate did not load',()=>{
 const window={},context=vm.createContext({window,URL});for(const source of sources.slice(1))vm.runInContext(source,context);assert.deepEqual(flags(window),[false,false,false,false]);
});
