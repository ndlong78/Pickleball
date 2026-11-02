/* PickleUp V3 advanced skill-readiness checklist. Not a verified playing rating. */
(function(){
"use strict";
const checks=[
 ["third","Third-shot drop","Bóng thứ ba mềm rơi gần kitchen trong 20 lần thử, đúng luật hai lần nảy."],
 ["reset","Reset ở transition zone","Trong 20 tình huống có cấp bóng kiểm soát, đưa bóng mềm trở về kitchen."],
 ["movement","Di chuyển chuyển tiếp","Trong 20 tình huống, chọn lúc tiến và split-step có thăng bằng."],
 ["counter","Counter volley an toàn","Trong 20 bóng tốc độ vừa, chặn/đối trả volley hợp lệ ngoài kitchen."],
 ["doubles","Phối hợp đánh đôi","Trong 20 tình huống mô phỏng, gọi bóng và giữ khoảng giữa an toàn."],
 ["decision","Chọn cú đánh","Trong 20 pha bóng, lựa chọn drop, reset, dink hay tấn công phù hợp."]
];
const $=id=>document.getElementById(id),KEY="pickleup_advanced_checks_v3",levels={"3.0–3.5":{average:13,min:8},"3.5–4.0":{average:15,min:10}};
const data=window.PICKLEUP_ACTIVITY;let sourceToken=data.token(),saving=false,accountHistory=null;
function read(){try{const rows=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(rows)?rows:[]}catch(_){return []}}
function validateRecord(r){return !!r&&typeof r==="object"&&!Array.isArray(r)&&typeof r.id==="string"&&r.id.length>0&&r.id.length<=90&&Object.prototype.hasOwnProperty.call(levels,r.level)&&r.values&&checks.every(c=>Number.isInteger(r.values[c[0]])&&r.values[c[0]]>=0&&r.values[c[0]]<=20)&&typeof r.average==="number"&&Number.isFinite(r.average)&&r.average>=0&&r.average<=20&&typeof r.ready==="boolean"&&typeof r.date==="string"&&Number.isFinite(Date.parse(r.date))}
function validateList(a){return Array.isArray(a)&&a.length<=200&&a.every(validateRecord)}
function el(tag,text){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x}
function showHistory(){
 if(data.isAccount()){accountHistory?.render();return}
 const list=$("advancedCheckHistory");list.replaceChildren();const rows=read().filter(validateRecord).slice(-6).reverse();
 if(!rows.length){list.textContent="Chưa có kết quả kiểm tra nâng cao.";return}
 rows.forEach(r=>{const p=el("p",(new Date(r.date)).toLocaleDateString("vi-VN")+" · "+r.level+" · "+r.average.toFixed(1)+"/20 · "+(r.ready?"Đạt ngưỡng tham khảo":"Cần củng cố"));p.className="sub";list.append(p)});
}
function generateFields(){
 const field=$("advancedCheckInputs");field.replaceChildren();
 checks.forEach(([id,name,help])=>{
  const label=el("label");label.className="stage-check";
  const left=el("span",name);left.title=help;
  const input=el("input");input.type="number";input.min="0";input.max="20";input.step="1";input.inputMode="numeric";input.placeholder="0–20";input.id="ac-"+id;input.setAttribute("aria-label",name+" số lượt đạt trên 20");
  label.append(left,input);field.append(label);
 });
}
function getScore(){
 const values={};for(const [id,name] of checks){const field=$("ac-"+id),str=field.value.trim(),v=Number(str);if(!str||!Number.isInteger(v)||v<0||v>20)throw Error("Nhập điểm 0–20 cho "+name);values[id]=v}return values;
}
async function assess(){
 if(saving||!data.canWrite())return;const stamp=data.token();
 try{
  const values=getScore(),level=$("advancedLevel").value,gate=levels[level];
  if(!gate)throw Error("Cấp độ không hợp lệ");
  const total=Object.values(values).reduce((a,b)=>a+b,0),average=total/6;
  const low=checks.filter(([id])=>values[id]<gate.average).map(x=>x[1]);
  const ready=average>=gate.average&&Object.values(values).every(v=>v>=gate.min);
  const item={id:"AC-"+Date.now(),level,values,average:Number(average.toFixed(2)),ready,date:new Date().toISOString()};
  saving=true;controls();$("advancedCheckResult").textContent="Đang lưu bài kiểm tra…";
  if(data.isAccount())await data.saveAssessment("advanced",values,level);
  else{const old=read();if(!validateList(old))throw Error("Lịch sử cũ không hợp lệ; không ghi đè dữ liệu");const next=old.concat(item).slice(-200);localStorage.setItem(KEY,JSON.stringify(next))}
  if(stamp!==data.token())return;
  $("advancedCheckResult").textContent=(ready?"Đạt ngưỡng luyện tập nội bộ của nhóm "+level+". ":"Chưa đạt ngưỡng luyện tập nội bộ của nhóm "+level+". ")+"Trung bình "+average.toFixed(1)+"/20. "+(low.length?"Nên ưu tiên: "+low.join(", ")+". ":"Tiếp tục tập phối hợp và kiểm chứng qua trận đấu.")+" Không phải chứng nhận DUPR hoặc xếp hạng 4.0."+(data.isAccount()?" Đã lưu lượt mới trên thiết bị · chờ đồng bộ.":"");
  showHistory();
 }catch(err){if(stamp===data.token())$("advancedCheckResult").textContent=data.isAccount()?PickleUpActivityHistory.error(err):"Chưa lưu: "+err.message}
 finally{if(stamp===data.token()){saving=false;controls()}}
}
function controls(){for(const el of [...$("advancedCheckInputs").querySelectorAll("input"),$("advancedCheckSave"),$("advancedLevel")])el.disabled=saving||!data.canWrite()}
function sourceChanged(){if(sourceToken!==data.token()){sourceToken=data.token();saving=false;for(const [id]of checks)$("ac-"+id).value="";$("advancedLevel").selectedIndex=0;$("advancedLevel").dispatchEvent(new Event("change"));$("advancedCheckResult").textContent=""}if(data.isAccount()&&data.getView().mode!=="account")$("advancedCheckResult").textContent=data.notice();controls();showHistory()}
let initialized=false;
function initialize(){
 if(initialized||!$("advancedCheckInputs"))return;initialized=true;sourceToken=data.token();
 generateFields();accountHistory=PickleUpActivityHistory.mount($("advancedCheckHistory"),{kind:"skill_assessments",type:"advanced"});document.addEventListener("pickleup:activity-data",sourceChanged);controls();$("advancedCheckSave").addEventListener("click",assess);
 $("advancedLevel").addEventListener("change",()=>{const gate=levels[$("advancedLevel").value];$("advancedCheckTarget").textContent="Mốc nội bộ: trung bình ≥"+gate.average+"/20 và từng mục ≥"+gate.min+"/20. Chỉ là gợi ý chương trình tập."});
 $("advancedLevel").dispatchEvent(new Event("change"));showHistory();
}
document.addEventListener("pickleup:fragment-ready",initialize);
(window.PICKLEUP_READY || (fn=>document.addEventListener("DOMContentLoaded",fn)))(initialize);
window.PICKLEUP_VALIDATE_ADVANCED_CHECKS=validateList;
})();
