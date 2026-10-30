(function(){
"use strict";
const host=document.getElementById("accountPanel");
if(!host)return;
const status=host.querySelector('[role="status"]'),form=host.querySelector("form"),email=form.elements.email,otp=form.elements.otp,signup=form.elements.signup,send=form.elements.send,verify=form.elements.verify,logout=host.querySelector('[data-logout]'),probe=host.querySelector('[data-private]');
let previousUser=null;
let adapter,busy=false,until=0,serial=0;
function controls(){send.disabled=busy||Date.now()<until;verify.disabled=busy;email.disabled=busy;signup.disabled=busy;otp.disabled=busy;logout.disabled=busy;probe.disabled=busy;send.textContent=Date.now()<until?"Gửi lại sau "+Math.ceil((until-Date.now())/1000)+"s":"Gửi mã OTP"}
const config=window.PICKLEUP_AUTH_CONFIG;
if(!config?.enabled||!config.url||!config.publishableKey){status.textContent="Chế độ khách · Đăng nhập chưa được cấu hình.";form.hidden=true;return}
async function init(){
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
 }catch(_){status.textContent="Đăng nhập chưa sẵn sàng. Bạn vẫn có thể dùng chế độ khách.";form.hidden=true}
}
async function run(fn){const stamp=++serial;busy=true;controls();try{const result=await fn();if(stamp!==serial||result?.stale)return;if(result?.error)status.textContent=result.error;else status.textContent="Đã thực hiện."}finally{if(stamp===serial){busy=false;controls()}}}
form.addEventListener("submit",event=>{event.preventDefault();if(busy||!form.reportValidity())return;run(async()=>{const result=await adapter.verify(email.value.trim(),otp.value.trim());otp.value="";return result})});
send.addEventListener("click",()=>{if(busy||Date.now()<until||!email.reportValidity())return;run(async()=>{const result=await adapter.requestOtp(email.value.trim(),signup.checked);if(!result.error&&!result.stale){until=Date.now()+60000;status.textContent="Nếu email được phép, mã đã được gửi. Kiểm tra hộp thư.";return {stale:true}}return result})});
logout.addEventListener("click",()=>run(()=>adapter.logout()));
probe.addEventListener("click",()=>run(async()=>{const data=await adapter.privateRead();return {error:data.status==="ok"||data.status==="applied"?null:"Trạng thái dữ liệu riêng: "+data.status}}));
setInterval(controls,1000);
init();
})();
