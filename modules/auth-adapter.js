/* Auth owns sessions; training data remains guest/device-only in PR1b. */
(function(root){
"use strict";
function createAuthAdapter(client){
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
 function message(error){
  if(!error)return null;
  if(error.status===429||error.code==="over_email_send_rate_limit")return "Gửi quá nhiều mã. Vui lòng chờ rồi thử lại.";
  if(error.code==="otp_expired"||error.status===403)return "Mã sai hoặc đã hết hạn. Kiểm tra mã hoặc yêu cầu mã mới.";
  return "Không thực hiện được. Kiểm tra kết nối hoặc thử lại sau.";
 }
 return {getGeneration:()=>generation,ready,requestOtp,verify,logout,privateRead,subscribe(fn){listeners.add(fn);fn({...state});return ()=>listeners.delete(fn)},destroy(){stopped=true;clearInterval(expiryTimer);invalidate();subscription.unsubscribe();listeners.clear()}};
}
async function connect(config){
 const url=new URL(config.url);
 if(url.protocol!=="https:"&&!(url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname)))throw Error("Invalid Auth URL");
 if(!config.publishableKey.startsWith("sb_publishable_"))throw Error("Publishable key required");
 const {createClient}=await import("../vendor/supabase.js");
 let adapter;
 const guardedFetch=async (...args)=>{
  const stamp=adapter?.getGeneration();
  const response=await fetch(...args);
  const body=await response.arrayBuffer();
  if(stamp!==adapter?.getGeneration())throw Error("Session changed");
  return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
 };
 adapter=createAuthAdapter(createClient(config.url,config.publishableKey,{global:{fetch:guardedFetch},auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:"pickleup_auth_v6"}}));
 return adapter;
}
root.PickleUpAuth={createAuthAdapter,connect};
if(typeof module!=="undefined")module.exports={createAuthAdapter};
})(typeof window!=="undefined"?window:globalThis);
