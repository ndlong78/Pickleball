(function(){
"use strict";
const host=document.getElementById("accountPanel");
if(!host)return;
const status=host.querySelector('[role="status"]'),form=host.querySelector("form"),email=form.elements.email,otp=form.elements.otp,signup=form.elements.signup,send=form.elements.send,verify=form.elements.verify,logout=host.querySelector('[data-logout]'),probe=host.querySelector('[data-private]');
let previousUser=null;
let adapter,busy=false,until=0,serial=0,initializing=false;
const maintenance=new Set();
function controls(){const locked=busy||maintenance.size>0;send.disabled=locked||Date.now()<until;verify.disabled=locked;email.disabled=locked;signup.disabled=locked||config?.allowSignup!==true;otp.disabled=locked;logout.disabled=locked;probe.disabled=locked;send.textContent=Date.now()<until?"Gửi lại sau "+Math.ceil((until-Date.now())/1000)+"s":"Gửi mã OTP"}
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
   previousUser=state.user?.id;
   const signed=state.status==="authenticated";
   form.hidden=signed||state.status==="restoring";logout.hidden=probe.hidden=!signed&&!state.error;
   status.textContent=state.error||(signed?"Đã đăng nhập: "+state.user.email:state.status==="restoring"?"Đang khôi phục phiên…":"Chế độ khách");
   controls();
  });
  await adapter.ready;
 }catch(_){status.textContent="Đăng nhập chưa sẵn sàng. Cập nhật/tải lại ứng dụng hoặc đóng tab đang dọn cache rồi thử lại. Chế độ khách vẫn dùng được.";form.hidden=true}finally{initializing=false}
}
async function run(fn){if(maintenance.size)return;const stamp=++serial;busy=true;controls();try{const result=await fn();if(stamp!==serial||result?.stale)return;if(result?.error)status.textContent=result.error;else status.textContent="Đã thực hiện."}finally{if(stamp===serial){busy=false;controls()}}}
form.addEventListener("submit",event=>{event.preventDefault();if(busy||!form.reportValidity())return;run(async()=>{const result=await adapter.verify(email.value.trim(),otp.value.trim());otp.value="";return result})});
send.addEventListener("click",()=>{if(busy||Date.now()<until||!email.reportValidity())return;run(async()=>{const result=await adapter.requestOtp(email.value.trim(),signup.checked);if(!result.error&&!result.stale){until=Date.now()+60000;status.textContent="Nếu email được phép, mã đã được gửi. Kiểm tra hộp thư.";return {stale:true}}return result})});
logout.addEventListener("click",()=>run(()=>adapter.logout()));
probe.addEventListener("click",()=>run(async()=>{const data=await adapter.privateRead();return {error:data.status==="ok"||data.status==="applied"?null:"Trạng thái dữ liệu riêng: "+data.status}}));
setInterval(controls,1000);
document.addEventListener('pickleup:maintenance-busy',event=>{const d=event.detail;if(typeof d?.id!=='string'||!/^[a-f0-9-]{36}$/i.test(d.id))return;if(d.busy===true)maintenance.add(d.id);else maintenance.delete(d.id);controls()});
navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(!adapter)init()});
init();
})();
