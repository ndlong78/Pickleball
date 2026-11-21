(function(){
"use strict";
const host=document.getElementById("accountPanel");
if(!host)return;
const status=host.querySelector('[role="status"]'),form=host.querySelector("form"),email=form.elements.email,otp=form.elements.otp,signup=form.elements.signup,send=form.elements.send,verify=form.elements.verify,logout=host.querySelector('[data-logout]'),probe=host.querySelector('[data-private]');
const del=host.querySelector('[data-account-delete]'),delSend=host.querySelector('[data-delete-send]'),delOtp=host.querySelector('[data-delete-otp]'),delPhrase=host.querySelector('[data-delete-phrase]'),delConfirm=host.querySelector('[data-delete-confirm]'),delStatus=host.querySelector('[data-delete-status]');
let previousUser=null,current=null,deleting=false,deletedNotice=null;
const phraseOk=v=>String(v||'').normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'D').trim().replace(/\s+/g,' ').toUpperCase()==='XOA TAI KHOAN';
let adapter,busy=false,until=0,serial=0,initializing=false;
const maintenance=new Set();
function controls(){const locked=busy||maintenance.size>0;send.disabled=locked||Date.now()<until;verify.disabled=locked;email.disabled=locked;signup.disabled=locked||config?.allowSignup!==true;otp.disabled=locked;logout.disabled=locked||deleting;probe.disabled=locked;if(del){const dl=locked||deleting;delSend.disabled=dl||Date.now()<until;delOtp.disabled=dl;delPhrase.disabled=dl;delConfirm.disabled=dl||!phraseOk(delPhrase.value)||!/^[0-9]{6,10}$/.test(delOtp.value.trim());delSend.textContent=Date.now()<until?"Gửi lại sau "+Math.ceil((until-Date.now())/1000)+"s":"Gửi mã xác nhận xóa tới email"}send.textContent=Date.now()<until?"Gửi lại sau "+Math.ceil((until-Date.now())/1000)+"s":"Gửi mã OTP"}
const config=window.PICKLEUP_AUTH_CONFIG;
if(!config?.enabled||!config.url||!config.publishableKey){status.textContent=config?.url&&config?.publishableKey?"Chế độ khách · Đăng nhập thử chỉ có trên trang staging riêng.":"Chế độ khách · Đăng nhập chưa được cấu hình.";form.hidden=true;return}
signup.checked=false;signup.disabled=config.allowSignup!==true;
signup.closest('label').hidden=config.allowSignup!==true;
async function init(){
 if(initializing||adapter)return;initializing=true;
 try{
  adapter=await PickleUpAuth.getShared(config);
  adapter.subscribe(state=>{
   serial++;busy=false;otp.value="";
   if(previousUser!==state.user?.id)email.value="";
   if(del&&previousUser!==state.user?.id){delOtp.value="";delPhrase.value="";delStatus.textContent="";del.open=false}
   previousUser=state.user?.id;current=state;
   const signed=state.status==="authenticated";
   form.hidden=signed||state.status==="restoring";logout.hidden=probe.hidden=!signed&&!state.error;if(del)del.hidden=!signed;
   status.textContent=state.error||(signed?"Đã đăng nhập: "+state.user.email:state.status==="restoring"?"Đang khôi phục phiên…":deletedNotice||"Chế độ khách");if(signed)deletedNotice=null;
   controls();
  });
  await adapter.ready;
 }catch(_){status.textContent="Đăng nhập chưa sẵn sàng. Cập nhật/tải lại ứng dụng hoặc đóng tab đang dọn cache rồi thử lại. Chế độ khách vẫn dùng được.";form.hidden=true}finally{initializing=false}
}
async function run(fn){if(maintenance.size)return;const stamp=++serial;busy=true;controls();try{const result=await fn();if(stamp!==serial||result?.stale)return;if(result?.error)status.textContent=result.error;else status.textContent="Đã thực hiện."}finally{if(stamp===serial){busy=false;controls()}}}
form.addEventListener("submit",event=>{event.preventDefault();if(busy||!form.reportValidity())return;run(async()=>{const result=await adapter.verify(email.value.trim(),otp.value.trim());otp.value="";return result})});
send.addEventListener("click",()=>{if(busy||Date.now()<until||!email.reportValidity())return;run(async()=>{const result=await adapter.requestOtp(email.value.trim(),signup.checked);if(!result.error&&!result.stale){until=Date.now()+60000;status.textContent="Nếu email hợp lệ, mã đã được gửi. Kiểm tra hộp thư, cả mục thư rác/quảng cáo; mã chỉ dùng một lần.";return {stale:true}}return result})});
logout.addEventListener("click",()=>run(()=>adapter.logout()));
probe.addEventListener("click",()=>run(async()=>{const data=await adapter.privateRead();return {error:data.status==="ok"||data.status==="applied"?null:"Trạng thái dữ liệu riêng: "+data.status}}));
if(del){
 const DELETE_MESSAGES={reauth_required:"Máy chủ cần mã vừa nhận (trong 10 phút). Gửi mã mới rồi thử lại; tài khoản chưa bị xóa.",auth_required:"Phiên đăng nhập đã đổi hoặc hết hạn; tài khoản chưa bị xóa. Đăng nhập lại rồi thử lại.",stale:"Phiên đăng nhập đã đổi trong lúc xóa; tài khoản chưa bị xóa. Kiểm tra lại rồi thử lại.",network_error:"Lỗi mạng: chưa chắc máy chủ đã nhận yêu cầu. Kết nối lại, đăng nhập và kiểm tra; nếu vẫn đăng nhập được thì tài khoản chưa bị xóa.",unavailable:"Xóa tài khoản chưa sẵn sàng trên máy chủ (thiếu bản cập nhật SQL). Tài khoản chưa bị xóa.",invalid:"Máy chủ từ chối yêu cầu xóa (có thể chưa cài bản cập nhật SQL). Tài khoản chưa bị xóa."};
 delOtp.addEventListener("input",controls);delPhrase.addEventListener("input",controls);
 delSend.addEventListener("click",async()=>{
  if(deleting||busy||Date.now()<until||current?.status!=="authenticated")return;
  deleting=true;controls();
  try{const result=await adapter.requestOtp(current.user.email,false);if(result.stale)return;if(result.error){delStatus.textContent=result.error;return}until=Date.now()+60000;delStatus.textContent="Mã xác nhận xóa đã được gửi tới email của tài khoản. Nhập mã trong 10 phút.";}
  finally{deleting=false;controls()}
 });
 delConfirm.addEventListener("click",async()=>{
  if(deleting||busy||current?.status!=="authenticated")return;
  const code=delOtp.value.trim();if(!phraseOk(delPhrase.value)||!/^[0-9]{6,10}$/.test(code)){delStatus.textContent="Nhập mã trong email và gõ đúng XÓA TÀI KHOẢN.";return}
  const owner=current.user.id,email=current.user.email;deleting=true;controls();delStatus.textContent="Đang xác minh mã…";
  try{
   const verified=await adapter.verify(email,code);delOtp.value="";
   if(verified.error){delStatus.textContent=verified.error+" Tài khoản chưa bị xóa.";return}
   if(current?.status!=="authenticated"||current.user.id!==owner){delStatus.textContent=DELETE_MESSAGES.stale;return}
   delStatus.textContent="Đang xóa tài khoản…";
   const result=await adapter.deleteAccount(owner);
   if(result.status!=="deleted"){delStatus.textContent=DELETE_MESSAGES[result.status]||DELETE_MESSAGES.invalid;return}
   deletedNotice="Đã xóa tài khoản "+email+" và dữ liệu trên máy chủ. Bạn đã được đăng xuất. Cache trên máy này không còn được dùng; xóa dữ liệu trang web trong trình duyệt nếu muốn xóa hẳn.";
   delPhrase.value="";await adapter.logout();status.textContent=deletedNotice;
  }finally{deleting=false;controls()}
 });
}
setInterval(controls,1000);
document.addEventListener('pickleup:maintenance-busy',event=>{const d=event.detail;if(typeof d?.id!=='string'||!/^[a-f0-9-]{36}$/i.test(d.id))return;if(d.busy===true)maintenance.add(d.id);else maintenance.delete(d.id);controls()});
navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(!adapter)init()});
init();
})();
