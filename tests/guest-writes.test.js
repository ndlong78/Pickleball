const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../modules/legacy-storage.js'),'utf8');
const MAIN='https://pickleup-staging.home-309.workers.dev';
function load(href,{session=null,auth,sources={}}={}){
 const data=new Map(session?[['pickleup_auth_v6',JSON.stringify(session)]]:[]);
 const storage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i]??null,get length(){return data.size}};
 const window={location:{href},localStorage:storage,sessionStorage:storage,navigator:{},addEventListener(){},document:undefined,...sources};
 if(auth!==undefined)window.PICKLEUP_AUTH_CONFIG=auth;
 vm.runInContext(source,vm.createContext({window,URL,TextEncoder,JSON,Promise,Date,Number,Set,Object,Error,Array,String}));
 return window;
}
const view=(owner,mode=owner?'account':'guest')=>({getView:()=>({owner,mode})});
test('main host without a session: device writes are refused with a sign-in message; reads are not affected',()=>{
 for(const href of [MAIN+'/',MAIN+'/?page=progress',MAIN+'/Pickleball/index.html?page=academy#x']){
  const w=load(href),g=w.PickleUpGuestWrites;assert.equal(g.cloudOnly(),true,href);assert.equal(g.allowed(),false);
  assert.throws(()=>g.require(),e=>e.code==='sign_in_required'&&e.message===g.MESSAGE&&/đăng nhập/i.test(e.message));
 }
});
test('a stored session or an account runtime with an owner counts as signed in',()=>{
 assert.equal(load(MAIN+'/',{session:{access_token:'x',user:{id:'11111111-1111-4111-8111-111111111111'}}}).PickleUpGuestWrites.allowed(),true);
 for(const name of ['PICKLEUP_DATA','PICKLEUP_ACTIVITY','PICKLEUP_PLANS'])assert.equal(load(MAIN+'/',{sources:{[name]:view('11111111-1111-4111-8111-111111111111')}}).PickleUpGuestWrites.allowed(),true,name);
 for(const bad of [{user:{}},{user:{id:''}},{user:null},'not json'])assert.equal(load(MAIN+'/',{session:bad}).PickleUpGuestWrites.allowed(),false);
 assert.equal(load(MAIN+'/',{sources:{PICKLEUP_DATA:view(null),PICKLEUP_PLANS:{getView(){throw Error('x')}}}}).PickleUpGuestWrites.allowed(),false);
 load(MAIN+'/',{session:{user:{id:'u'}}}).PickleUpGuestWrites.require();
});
test('other hosts, operator URLs, loopback and disabled Auth keep device storage',()=>{
 for(const href of ['https://ndlong78.github.io/Pickleball/','https://preview-pickleup-staging.home-309.workers.dev/','http://127.0.0.1:4173/Pickleball/',MAIN+'/?pilot=account-data',MAIN+'/?page=settings&maintenance=account-cache',MAIN+'/other/','http://pickleup-staging.home-309.workers.dev/','not a url']){
  const g=load(href).PickleUpGuestWrites;assert.equal(g.cloudOnly(),false,href);assert.equal(g.allowed(),true);g.require();
 }
 assert.equal(load(MAIN+'/',{auth:{enabled:false}}).PickleUpGuestWrites.allowed(),true);
 assert.equal(load(MAIN+'/',{auth:{enabled:true}}).PickleUpGuestWrites.allowed(),false);
});
test('the gate is exported for node and frozen',()=>{
 const w=load(MAIN+'/');assert.equal(Object.isFrozen(w.PickleUpGuestWrites),true);assert.equal(w.PickleUpLegacyStorage.guestWrites,w.PickleUpGuestWrites);
});
test('loaded account sources decide over a stored session: an expired session on such a page cannot write to the device',()=>{
 const session={user:{id:'11111111-1111-4111-8111-111111111111'}};
 assert.equal(load(MAIN+'/',{session,sources:{PICKLEUP_DATA:view(null)}}).PickleUpGuestWrites.allowed(),false);
 assert.equal(load(MAIN+'/',{session,sources:{PICKLEUP_DATA:{getView:()=>({owner:null,mode:'loading'})}}}).PickleUpGuestWrites.allowed(),true,'still loading: fall back to the session');
 assert.equal(load(MAIN+'/',{sources:{PICKLEUP_PLANS:{getState:()=>({owner:'u',mode:'account'})}}}).PickleUpGuestWrites.allowed(),true,'plans runtime exposes getState only');
 assert.equal(load(MAIN+'/',{session,sources:{PICKLEUP_DATA:view(null),PICKLEUP_ACTIVITY:view('u')}}).PickleUpGuestWrites.allowed(),true);
});
