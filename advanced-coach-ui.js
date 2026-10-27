/* PickleUp V3.1 — advanced Personal Coach UI and independent local history. */
(function(){
"use strict";
const core=window.PICKLEUP_ADVANCED_COACH;if(!core)return;
const $=id=>document.getElementById(id);
const names=core.names,keys=core.categories.map(c=>c.key),selectionKey="pickleup_selected_plan_v31";
let current=null;
function node(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el}
function valid(n){return Number.isInteger(n)&&n>=0&&n<=20}
function read(key,otherwise){try{return JSON.parse(localStorage.getItem(key)||"null")??otherwise}catch(_){return otherwise}}
function history(){const list=read(core.KEY,[]);return Array.isArray(list)?list.filter(core.validPlan):[]}
function writableHistory(){
 const raw=localStorage.getItem(core.KEY);
 if(raw===null)return [];
 let plans;try{plans=JSON.parse(raw)}catch(_){throw Error("Lịch sử giáo án bị lỗi JSON; hãy sao lưu trước khi ghi thêm.")}
 if(!core.validateList(plans))throw Error("Lịch sử giáo án không hợp lệ; không ghi đè dữ liệu cũ.");
 return plans;
}
function status(s){$("acCoachStatus").textContent=s}
function chooseSource(){
 const checks=read("pickleup_advanced_checks_v3",[]);
 const recent=Array.isArray(checks)?checks.filter(x=>x&&core.levels.includes(x.level)&&core.validScores(x.values)).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")))[0]:null;
 const last=history().filter(p=>p.completedAt&&valid(p.checkScore)).sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt)))[0];
 if(last&&(!recent||String(last.completedAt)>String(recent.date||""))){
  const scores={...last.scores};scores[last.checkpoint.skill]=last.checkScore;
  return {scores,level:last.level,label:"Dữ liệu sau buổi tập nâng cao đã hoàn thành gần nhất."};
 }
 if(recent)return {scores:{...recent.values},level:recent.level,label:"Kết quả kiểm tra chiến thuật V3.0 gần nhất."};
 return {scores:{},level:"3.0–3.5",label:"Chưa có đủ sáu điểm nâng cao. Hãy nhập thủ công hoặc làm bài kiểm tra nâng cao."};
}
function populate(){
 const source=chooseSource();$("acCoachLevel").value=source.level;
 for(const key of keys)$("acInput-"+key).value=valid(source.scores[key])?source.scores[key]:"";
 $("acCoachSource").textContent=source.label;
}
function scoresFromInputs(){
 const values={};for(const key of keys){
  const str=$("acInput-"+key).value.trim(),value=Number(str);
  if(!str||!valid(value))throw Error("Cần nhập số nguyên 0–20 cho "+names[key]+".");
  values[key]=value;
 }return values;
}
function planCard(target,plan,active){
 target.replaceChildren();
 if(!plan){target.append(node("p","Chưa có giáo án nâng cao. Nhập kết quả và chọn Tạo buổi tập 60 phút.","sub"));return}
 target.append(node("h3","Giáo án nâng cao · "+plan.level));
 target.append(node("p","Ba trọng tâm: "+plan.exercises.map(e=>e.skillName+" "+e.baseline+"/20").join(" · "),"sub"));
 target.append(node("h4","Khởi động – 10 phút"));
 target.append(node("p","Di chuyển chân nhẹ, làm nóng vai/hông/cổ chân, đánh bóng dễ rồi tăng dần đến tốc độ vừa."));
 for(const [i,e] of plan.exercises.entries()){
  const el=node("article",undefined,"pc-drill");
  el.append(node("h4","Bài "+(i+1)+" · "+e.name+" — "+e.minutes+" phút"));
  const lines=[["Trọng tâm",e.skillName],["Bố trí",e.setup],["Cách thực hiện",e.instructions],["Đánh giá",e.measure],["Lưu ý",e.mistake]];
  for(const [label,body] of lines){const p=node("p");p.append(node("strong",label+": "),document.createTextNode(body));el.append(p)}
  target.append(el);
 }
 target.append(node("h4","Kiểm tra – 6 phút"));
 target.append(node("p","Thử 20 tình huống về "+names[plan.checkpoint.skill]+". Điểm đầu vào "+plan.checkpoint.baseline+"/20, mốc tham khảo "+plan.checkpoint.target+"/20."));
 target.append(node("h4","Thả lỏng – 5 phút"));
 target.append(node("p","Đi bộ nhẹ, thả lỏng vai và chân. Dừng khi đau hoặc chóng mặt."));
 $("acCoachComplete").hidden=!active;
 if(active){
  $("acCoachResultLabel").textContent="Kết quả "+names[plan.checkpoint.skill]+" sau buổi tập /20";
  $("acCoachResult").value=valid(plan.checkScore)?plan.checkScore:"";
  $("acCoachSave").textContent=plan.completedAt?"Cập nhật kết quả":"Lưu kết quả buổi tập";
 }
}
function select(plan,activate=true){
 current=plan;
 planCard($("acCoachPlan"),plan,activate);
 if(!plan)return;
 if(activate){
  try{localStorage.setItem(selectionKey,JSON.stringify({source:"advanced",id:plan.id}))}catch(_){}
  document.dispatchEvent(new CustomEvent("pickleup:plan-selected",{detail:{plan}}));
  $("acCoachRun").disabled=false;
 }else $("acCoachRun").disabled=true;
}
function showHistory(){
 const plans=history(),container=$("acCoachHistory");container.replaceChildren();
 const finished=plans.filter(p=>p.completedAt&&valid(p.checkScore));
 $("acCoachCount").textContent=plans.length+" giáo án";$("acCoachFinished").textContent=finished.length+" đã tập";
 if(!plans.length){container.append(node("p","Chưa có giáo án nâng cao được lưu.","sub"));return}
 const selected=read(selectionKey,null);
 plans.slice(-6).reverse().forEach(plan=>{
  const label=(plan.completedAt?"✓ ":"○ ")+new Date(plan.createdAt).toLocaleDateString("vi-VN")+" · "+plan.level+" · "+plan.exercises.map(e=>e.skillName).join(", ");
  const button=node("button",label,"pc-history-item");button.type="button";
  if(selected?.source==="advanced"&&selected.id===plan.id)button.setAttribute("aria-current","true");
  button.addEventListener("click",()=>{select(plan,true);showHistory();$("acCoachPlan").scrollIntoView({behavior:"smooth",block:"start"})});
  container.append(button);
 });
}
function make(){
 try{
  const scores=scoresFromInputs(),plans=writableHistory();
  const requested=$("acCoachMatchFocus").value||null;
  const plan=core.createPlan(scores,plans,$("acCoachLevel").value,new Date().toISOString(),window.PICKLEUP_ADVANCED_CURRICULUM||[],{focusMetric:requested});
  const next=plans.concat(plan).slice(-100);
  localStorage.setItem(core.KEY,JSON.stringify(next));
  select(plan,true);showHistory();
  status("Đã tạo và lưu giáo án mới. Ba ưu tiên: "+plan.exercises.map(e=>e.skillName).join(", ")+". "+(requested?"Đã áp dụng ưu tiên được bạn chọn từ nhật ký trận đấu.":"Chọn thuần theo điểm kỹ năng."));
 }catch(err){status("Không tạo được giáo án: "+err.message)}
}
function complete(){
 if(!current)return;
 const str=$("acCoachResult").value.trim(),result=Number(str);
 if(!str||!valid(result)){status("Nhập kết quả nguyên từ 0 đến 20.");return}
 try{
  const plans=writableHistory(),idx=plans.findIndex(p=>p.id===current.id);
  if(idx<0)throw Error("Không tìm thấy giáo án đã lưu.");
  const before=plans[idx],updated={...before,completedAt:new Date().toISOString(),checkScore:result};
  plans[idx]=updated;localStorage.setItem(core.KEY,JSON.stringify(plans));
  const note=result-before.checkpoint.baseline, sign=note>0?"+":"";
  let logMessage="";
  if(!before.completedAt&&window.PICKLEUP_TRAINING_LOG){
   try{const e=updated.exercises[0];window.PICKLEUP_TRAINING_LOG.record(localStorage,{planId:updated.id,exerciseId:e.id,skill:e.skill,level:updated.level,kind:"assessment",hits:result,note:"Kiểm tra V3.1: "+names[updated.checkpoint.skill]});document.dispatchEvent(new Event("pickleup:training-log-updated"))}
   catch(err){logMessage=" Nhật ký bài tập chưa lưu được: "+err.message}
  }
  $("acInput-"+updated.checkpoint.skill).value=String(result);
  $("acCoachSource").textContent="Điểm sau tập đã cập nhật. Giáo án mới sẽ dùng kết quả này.";
  select(updated,true);showHistory();
  status("Đã lưu: "+result+"/20 ("+sign+note+" so với đầu vào)."+logMessage);
 }catch(err){status("Lỗi lưu kết quả: "+err.message)}
}
document.addEventListener("pickleup:plan-selected",event=>{
 const chosen=event.detail?.plan;
 if(chosen&&chosen.version!=="3.1"&&$("acCoachRun")){
  $("acCoachRun").disabled=true;
  $("acCoachComplete").hidden=true;
 }
});
document.addEventListener("DOMContentLoaded",()=>{
 if(!$("acCoachInputs"))return;
 for(const key of keys){
  const label=node("label",undefined,"pc-input-row");
  const text=node("span",names[key]);const wrap=node("span",undefined,"pc-input-wrap");
  const input=node("input");input.id="acInput-"+key;input.type="number";input.inputMode="numeric";input.min="0";input.max="20";input.step="1";input.placeholder="0–20";
  input.setAttribute("aria-label",names[key]+" số lượt thành công");
  wrap.append(input,document.createTextNode("/20"));label.append(text,wrap);$("acCoachInputs").append(label);
 }
 const focus=$("acCoachMatchFocus");
 for(const category of core.categories){const option=node("option",category.name);option.value=category.key;focus.append(option)}
 focus.value="";
 focus.addEventListener("change",()=>{$("acCoachFocusStatus").textContent=focus.value?"Bạn đã chọn ưu tiên "+core.names[focus.value]+". Kỹ năng này được đưa lên đầu trong giáo án mới; điểm bài kiểm tra không thay đổi.":"Không thêm ưu tiên từ nhật ký; chọn ba kỹ năng có điểm thấp nhất.";});
 populate();$("acCoachImport").addEventListener("click",()=>{populate();status("Đã nạp điểm có sẵn, có thể điều chỉnh thủ công.")});
 $("acCoachCreate").addEventListener("click",make);
 $("acCoachRun").addEventListener("click",()=>{
  const selected=read(selectionKey,null);
  if(!current||selected?.source!=="advanced"||selected.id!==current.id){status("Vui lòng chọn hoặc tạo giáo án nâng cao trước.");return}
  $("pcOnCourt").scrollIntoView({behavior:"smooth",block:"start"});
 });
 $("acCoachSave").addEventListener("click",complete);
 const selected=read(selectionKey,null),plans=history(),saved=selected?.source==="advanced"?plans.find(p=>p.id===selected.id):null;
 if(saved)select(saved,true);else planCard($("acCoachPlan"),null,false);
 showHistory();
});
})();
