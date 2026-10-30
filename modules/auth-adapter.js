/* Auth owns sessions; training data remains guest/device-only in PR1b. */
(function(root){
"use strict";
function createGuardedFetch(getGeneration,fetcher=(...args)=>root.fetch(...args)){
 return async(...args)=>{
  const stamp=getGeneration(),response=await fetcher(...args),body=await response.arrayBuffer();
  if(stamp!==getGeneration())throw Error("Session changed");
  // Fetch forbids a body on 204/205/304, even a zero-byte ArrayBuffer. GoTrue
  // returns 204 for logout; throwing here prevents SDK storage/broadcast cleanup.
  const noBody=[204,205,304].includes(response.status);
  return new Response(noBody?null:body,{status:response.status,statusText:response.statusText,headers:response.headers});
 };
}
function createAuthAdapter(client,{rpcTransport}={}){
 let generation=0,session=null,stopped=false;
 const listeners=new Set(),controllers=new Set();
 let state={status:"restoring",user:null,error:null};
 const publish=()=>listeners.forEach(fn=>fn({...state}));
 function invalidate(){generation++;for(const c of controllers)c.abort();controllers.clear()}
 function accept(next){
  if(stopped)return;
  if(state.status!=="restoring"&&!state.error&&next?.user.id===session?.user.id&&next?.access_token===session?.access_token)return;
  invalidate();session=next;
  state={status:next?"authenticated":"guest",user:next?{id:next.user.id,email:next.user.email}:null,error:null};publish();
 }
 const subscription=client.auth.onAuthStateChange((_event,next)=>accept(next)).data.subscription;
 const expiryTimer=setInterval(()=>{if(session?.expires_at*1000<=Date.now())accept(null)},1000);
 const initial=generation;
 const ready=client.auth.getSession().then(({data,error})=>{if(initial===generation){accept(error?null:data.session);if(error){state.error="Không khôi phục được phiên. Hãy đăng nhập lại.";publish()}}}).catch(()=>{if(initial===generation)accept(null)});
 async function requestOtp(email,signup){
  const stamp=generation;
  try{const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:signup}});return stamp===generation?{error:message(error)}:{stale:true}}catch(_){return {error:"Lỗi mạng. Kiểm tra kết nối rồi thử lại."}}
 }
 async function verify(email,token){
  const stamp=generation;
  try{const {error}=await client.auth.verifyOtp({email,token,type:"email"});return {error:message(error),stale:!!error&&stamp!==generation}}catch(_){return {error:"Lỗi mạng. Kiểm tra kết nối rồi thử lại."}}
 }
 async function logout(){
  // Clear private DOM before waiting for network/revocation. SDK clears persisted
  // session and broadcasts SIGNED_OUT to sibling tabs on successful local signout.
  accept(null);
  try{const {error}=await client.auth.signOut({scope:"local"});if(error){state.error="Chưa thu hồi được phiên. Kết nối mạng rồi đăng xuất lại.";publish();return {error:state.error}}return {}}catch(_){state.error="Chưa đăng xuất được. Hãy kết nối mạng và thử lại.";publish();return {error:state.error}}
 }
 async function privateRead(){
  const stamp=generation,user=session?.user.id;
  if(!user)return {status:"auth_required"};
  const controller=new AbortController();controllers.add(controller);
  try{
   const {data,error}=await client.rpc("pull_changes",{p_after_revision:"0",p_limit:1,p_protocol_version:1}).abortSignal(controller.signal);
   if(stamp!==generation||user!==session?.user.id)return {status:"stale"};
   if(error)return {status:"network_error"};
   return data;
  }catch(_){return {status:stamp!==generation?"stale":"network_error"}}finally{controllers.delete(controller)}
 }
 async function importRpc(owner,method,args){
  if(!['pull_changes','begin_import','import_batch','finish_import','get_import_status'].includes(method))return {status:"invalid"};
  const stamp=generation,pinned=session;
  if(!pinned||owner!==pinned.user.id)return {status:"auth_required"};
  if(pinned.expires_at*1000<=Date.now())return {status:"auth_required"};
  const body=structuredClone(args),controller=new AbortController();controllers.add(controller);
  try{
   if(!rpcTransport)return {status:"unavailable"};
   const result=await rpcTransport(method,body,pinned.access_token,controller.signal);
   return stamp===generation&&session?.user.id===owner?result:{status:"stale"};
  }catch(_){return {status:stamp===generation?"network_error":"stale"}}finally{controllers.delete(controller)}
 }
 function message(error){
  if(!error)return null;
  if(error.status===429||error.code==="over_email_send_rate_limit")return "Gửi quá nhiều mã. Vui lòng chờ rồi thử lại.";
  if(error.code==="otp_expired"||error.status===403)return "Mã sai hoặc đã hết hạn. Kiểm tra mã hoặc yêu cầu mã mới.";
  return "Không thực hiện được. Kiểm tra kết nối hoặc thử lại sau.";
 }
 return {getGeneration:()=>generation,ready,requestOtp,verify,logout,privateRead,importRpc,subscribe(fn){listeners.add(fn);fn({...state});return ()=>listeners.delete(fn)},destroy(){stopped=true;clearInterval(expiryTimer);invalidate();subscription.unsubscribe();listeners.clear()}};
}
async function connect(config){
 const url=new URL(config.url);
 if(url.protocol!=="https:"&&!(url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname)))throw Error("Invalid Auth URL");
 if(!config.publishableKey.startsWith("sb_publishable_"))throw Error("Publishable key required");
 if(url.username||url.password||url.search||url.hash||!["","/"].includes(url.pathname))throw Error("Invalid Auth URL");
 const {createClient}=await import("../vendor/supabase.js");
 let adapter;
 const guardedFetch=createGuardedFetch(()=>adapter?.getGeneration());
 adapter=createAuthAdapter(createClient(config.url,config.publishableKey,{global:{fetch:guardedFetch},auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:"pickleup_auth_v6"}}),{rpcTransport:async(method,args,token,signal)=>{
  // Pin the token captured for this request. Never let an A request acquire B's
  // token from an async SDK auth lookup after an account switch.
  const response=await fetch(config.url.replace(/\/$/,"")+"/rest/v1/rpc/"+method,{method:"POST",signal,headers:{apikey:config.publishableKey,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(args)});
  if(!response.ok)return {status:response.status===401||response.status===403?"auth_required":response.status===400||response.status===404||response.status===422?"invalid":"network_error"};
  const text=await response.text();if(new TextEncoder().encode(text).length>16*1024*1024)return {status:"limit_exceeded"};
  return JSON.parse(text);
 }});
 return adapter;
}
let shared,sharedConfig;
function getShared(config){if(!config?.enabled)return Promise.reject(Error("Auth disabled"));const identity=config.url+"|"+config.publishableKey;if(shared&&identity!==sharedConfig)return Promise.reject(Error("Auth configuration changed; reload required"));if(!shared){sharedConfig=identity;shared=connect(config).catch(error=>{shared=null;sharedConfig=null;throw error})}return shared}
root.PickleUpAuth={createAuthAdapter,connect,getShared};
if(typeof module!=="undefined")module.exports={createAuthAdapter,createGuardedFetch};
})(typeof window!=="undefined"?window:globalThis);
