const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const stage='https://pickleup-staging.home-309.workers.dev',project='https://rfeoeagklmaqmkcdhprb.supabase.co',source=fs.readFileSync(path.join(__dirname,'../modules/data/account-purge-config.js'),'utf8'),pilot=fs.readFileSync(path.join(__dirname,'../modules/data/staging-pilot.js'),'utf8');
function load(href,{helper=true,auth={enabled:true,url:project,publishableKey:'sb_publishable_synthetic'},flags={}}={}){const window={location:{href},PICKLEUP_AUTH_CONFIG:auth};for(const k of ['SYNC','ACTIVITY','PLAN','IMPORT'])window['PICKLEUP_'+k+'_CONFIG']={enabled:flags[k]??false};const context=vm.createContext({window,URL});if(helper)vm.runInContext(pilot,context);vm.runInContext(source,context);return window.PickleUpAccountPurgeConfig}
test('maintenance mode is explicit, independent of sync, and the entry strips other queries/fragments',()=>{
 for(const pathname of ['/','/index.html','/Pickleball/','/Pickleball/index.html'])assert.equal(load(stage+pathname+'?page=settings&maintenance=account-cache').active(),true);
 assert.equal(load(stage+'/?page=settings').active(),false);assert.equal(load(stage+'/?page=settings&pilot=account-data&code=synthetic#private').entry(),stage+'/?page=settings&maintenance=account-cache');
 for(const query of ['maintenance=other','maintenance=account-cache&maintenance=account-cache','maintenance=account-cache&pilot=account-data','maintenance=account-cache&pilot=','pilot=account-data'])assert.equal(load(stage+'/?'+query).active(),false);
 for(const flag of ['SYNC','ACTIVITY','PLAN','IMPORT'])assert.equal(load(stage+'/?maintenance=account-cache',{flags:{[flag]:true}}).active(),false);
});
test('wrong host/path/project, missing Auth/helper or key stays off',()=>{
 for(const href of ['https://ndlong78.github.io/Pickleball/','https://preview-pickleup-staging.home-309.workers.dev/','https://pickleup.no.id.vn/',stage+'/other/','invalid']){const c=load(href);assert.equal(c.active(),false);assert.equal(c.entry(),null)}
 for(const options of [{helper:false},{auth:{enabled:false,url:project,publishableKey:'sb_publishable_synthetic'}},{auth:{enabled:true,url:'https://other.supabase.co',publishableKey:'sb_publishable_synthetic'}},{auth:{enabled:true,url:project,publishableKey:'secret'}}]){const c=load(stage+'/?maintenance=account-cache',options);assert.equal(c.active(),false);assert.equal(c.entry(),null)}
});
