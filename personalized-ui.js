/* PickleUp V2.4: UI, local score import, planning and completion history. */
(function(){
"use strict";
const core=window.PICKLEUP_PERSONAL_CORE;if(!core)return;
const keys=Object.keys(core.names),$=id=>document.getElementById(id),storageKey="pickleup_plans_v24";
function read(key,fallback){try{const x=JSON.parse((window.PICKLEUP_ACTIVITY?window.PICKLEUP_ACTIVITY.raw(key):localStorage.getItem(key))||"null");return x??fallback}catch(_){return fallback}}
const plansSource=window.PICKLEUP_PLANS;
function history(){if(plansSource?.isAccount())return plansSource.history("basic");const data=read(storageKey,[]);return Array.isArray(data)?data.filter(p=>p&&p.version==="2.4"&&p.id&&Array.isArray(p.exercises)):[]}
function valid(v){return Number.isInteger(v)&&v>=0&&v<=20}
function latestInputs(){
 if(plansSource?.isAccount())return {scores:{},level:"1.0–2.0",source:"Giáo án dùng kho tài khoản. Nhập sáu điểm thủ công; không tự sao chép dữ liệu thiết bị hoặc điểm từ nguồn khác."};
 if(window.PICKLEUP_ACTIVITY?.isAccount())return {scores:{},level:"1.0–2.0",source:"Học viện dùng kho tài khoản. Nạp điểm vào giáo án trên thiết bị chưa bật; nhập sáu điểm thủ công hoặc dùng lại kho thiết bị. Không tự sao chép điểm tài khoản vào giáo án khách."};
 const tests=read("pickleup_stage_checks_v23",[]);
 const stage=Array.isArray(tests)?tests.filter(t=>t&&core.validScores(t.values)&&core.levels.includes(t.level)).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")))[0]:null;
 const lastCompleted=history().filter(p=>p.completedAt&&valid(p.checkScore)&&p.checkpoint&&core.validScores(p.scores)).sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt)))[0];
 if(lastCompleted&&(!stage||String(lastCompleted.completedAt)>=String(stage.date||""))){
  const next={...lastCompleted.scores};next[lastCompleted.checkpoint.skill]=lastCompleted.checkScore;
  return {scores:next,level:lastCompleted.level,source:"Kết quả cập nhật sau lần tập cá nhân gần nhất ("+new Date(lastCompleted.completedAt).toLocaleDateString("vi-VN")+"). Có thể chỉnh lại sáu điểm."};
 }
 if(stage)return {scores:{...stage.values},level:stage.level,source:"Bài kiểm tra chuyển cấp V2.3 gần nhất ("+new Date(stage.date).toLocaleDateString("vi-VN")+")"};
 const source=read("pickleup_academy_v2",{}),legacy=read("pickleup_scores",{}),lessons=window.PICKLEUP_CURRICULUM||[],out={},dateBySkill={};
 for(const [id,record] of Object.entries(source||{})){
  const lesson=lessons.find(s=>s.id===id);if(!lesson||lesson.advanced||!record||!valid(record.score))continue;
  const date=String(record.date||"");
  if(date>=String(dateBySkill[lesson.skill]||"")){out[lesson.skill]=record.score;dateBySkill[lesson.skill]=date}
 }
 for(const [id,record] of Object.entries(legacy||{})){
  const lesson=lessons[Number(id)];if(!/^[0-5]$/.test(id)||!lesson||!record||!valid(record.score))continue;
  const date=String(record.date||"");
  if(date>=String(dateBySkill[lesson.skill]||"")){out[lesson.skill]=record.score;dateBySkill[lesson.skill]=date}
 }
 if(Object.keys(out).length)return {scores:out,level:"1.0–2.0",source:"Kết quả gần nhất theo kỹ năng trong Học viện ("+Object.keys(out).length+"/6 kỹ năng). Có thể bổ sung điểm còn thiếu."};
 const plans=history(),previous=plans[plans.length-1];
 if(previous&&core.validScores(previous.scores))return {scores:{...previous.scores},level:previous.level,source:"Điểm đầu vào từ kế hoạch đã lưu trước đó. Hãy cập nhật nếu đã kiểm tra lại."};
 return {scores:{},level:"1.0–2.0",source:"Chưa có dữ liệu đủ để tạo giáo án. Nhập sáu kết quả kiểm tra, mỗi kỹ năng trên 20 lần."};
}
function element(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e}
function setStatus(message){$("pcStatus").textContent=message}
function fill(){
 const info=latestInputs();$("pcLevel").value=core.levels.includes(info.level)?info.level:core.levels[0];
 for(const skill of keys){const input=$("pc-"+skill);input.value=valid(info.scores[skill])?String(info.scores[skill]):""}
 $("pcSource").textContent=info.source;
}
function getScores(){
 const scores={};for(const skill of keys){
  const input=$("pc-"+skill),value=input.value.trim();
  if(!value||!valid(Number(value)))throw Error("Cần nhập đủ sáu điểm nguyên từ 0 đến 20. Hãy kiểm tra "+core.names[skill]+".");
  scores[skill]=Number(value)
 }
 return scores;
}
function addExercise(container,exercise,i){
 const box=element("article",undefined,"pc-drill");box.append(element("h4","Bài "+(i+1)+" · "+exercise.skillName+" — "+exercise.name));
 box.append(element("p",exercise.minutes+" phút · Mốc hiện tại "+exercise.baseline+"/20 · Mục tiêu tham khảo "+exercise.target+"/20","pc-muted"));
 const fields=[["Bố trí",exercise.setup],["Cách tập",exercise.instructions],["Tự kiểm tra",exercise.measure],["Lỗi cần tránh",exercise.mistake]];
 for(const [label,body] of fields){const line=element("p");line.append(element("strong",label+": "),document.createTextNode(body));box.append(line)}
 container.append(box);
}
let current=null,createIntent=null,resultDirty=false,editRevision=null,historyPage=0;
function render(plan,explicit=false){
 const previous=current?.id;current=plan;const area=$("pcPlan");area.replaceChildren();
 if(plan&&explicit&&!plansSource?.isAccount()){try{localStorage.setItem("pickleup_selected_plan_v31",JSON.stringify({source:"basic",id:plan.id}))}catch(_){}}
 area.dataset.planId=plan?.id||"";
 if(!plansSource?.isAccount())document.dispatchEvent(new CustomEvent("pickleup:plan-selected",{detail:{plan}}));
 if(!plan){$("pcPostScore").value="";$("pcLastOutcome").textContent="";area.append(element("p","Chưa có kế hoạch. Hãy nhập điểm và chọn Tạo giáo án 60 phút.","pc-muted"));$("pcCompletion").hidden=true;return}
 area.append(element("h3","Kế hoạch "+new Date(plan.createdAt).toLocaleDateString("vi-VN")+" · "+plan.level));
 area.append(element("p","Ba kỹ năng ưu tiên: "+plan.exercises.map(e=>e.skillName+" ("+e.baseline+"/20)").join(" · "),"pc-muted"));
 area.append(element("h4","1. Khởi động — 10 phút"));
 area.append(element("p","Khởi động vai, cổ tay, hông, cổ chân, bước ngang nhẹ; đánh bóng làm quen với tốc độ thấp."));
 plan.exercises.forEach((e,i)=>addExercise(area,e,i));
 area.append(element("h4","5. Kiểm tra — 6 phút"));
 area.append(element("p","Dùng 20 lượt kiểm tra kỹ năng ưu tiên nhất: "+core.names[plan.checkpoint.skill]+". Mốc trước tập "+plan.checkpoint.baseline+"/20, mục tiêu tham khảo "+plan.checkpoint.target+"/20. Chỉ tính lượt thực hiện đúng mục tiêu và hợp lệ."));
 area.append(element("h4","6. Thả lỏng — 5 phút"));
 area.append(element("p","Đi bộ nhẹ, thả lỏng tay và chân, uống nước. Dừng sớm nếu thấy đau hoặc chóng mặt."));
 $("pcCompletion").hidden=false;
 $("pcPostScoreLabel").textContent="Kết quả kiểm tra "+core.names[plan.checkpoint.skill]+" sau tập (0–20)";
 if(previous!==plan.id||!resultDirty)$("pcPostScore").value=valid(plan.checkScore)?plan.checkScore:"";
 $("pcComplete").textContent=plan.completedAt?"Cập nhật kết quả đã tập":"Lưu kết quả buổi tập";
 $("pcLastOutcome").textContent=plan.completedAt?"Đã hoàn thành: "+plan.checkScore+"/20, thay đổi "+((plan.checkScore-plan.checkpoint.baseline)>=0?"+":"")+(plan.checkScore-plan.checkpoint.baseline)+" lần so với đầu vào.":"Nhập kết quả sau buổi tập để lưu mức cải thiện (hoặc giảm sút) thực tế.";
}
function renderHistory(){
 const list=$("pcHistory");list.replaceChildren();const arr=history();$("pcCount").textContent=arr.length+" kế hoạch";const completed=arr.filter(p=>p.completedAt&&valid(p.checkScore));$("pcDone").textContent=completed.length+" hoàn thành";
 if(!arr.length){list.append(element("p","Chưa có giáo án được lưu.","pc-muted"));return}
 const account=plansSource?.isAccount(),ordered=arr.slice().reverse();historyPage=Math.min(historyPage,Math.max(0,Math.ceil(arr.length/6)-1));
 (account?ordered.slice(historyPage*6,historyPage*6+6):ordered.slice(0,6)).forEach(p=>{
  const btn=element("button",(p.completedAt?"✓ ":"○ ")+new Date(p.createdAt).toLocaleDateString("vi-VN")+" · "+p.exercises.map(e=>core.names[e.skill]).join(", "),"pc-history-item");
  btn.type="button";btn.dataset.planId=p.id;btn.disabled=plansSource?.isAccount()&&!plansSource.canWrite(p.id);btn.addEventListener("click",async()=>{const stamp=plansSource?.token();resultDirty=false;render(p,true);if(plansSource?.isAccount()){try{await plansSource.choose(p.id);if(stamp!==plansSource.token())return;setStatus("Đã chọn trên thiết bị · đồng bộ giáo án để dùng Court.")}catch(_){if(stamp===plansSource.token())setStatus("Chưa chọn được; đọc lại hoặc xem mục cần xử lý trong Dữ liệu.")}}window.PICKLEUP_ROUTER?.openSection("personalCoach")||$("pcPlan").scrollIntoView({behavior:"smooth",block:"start"})});list.append(btn)
 });
 if(account&&arr.length>6){for(const [label,delta]of [["Trang trước",-1],["Trang sau",1]]){const b=element("button",label);b.type="button";b.disabled=historyPage+delta<0||historyPage+delta>=Math.ceil(arr.length/6);b.onclick=()=>{historyPage+=delta;renderHistory()};list.append(b)}}
}
async function generate(){
 const operationToken=plansSource?.token();
 try{
  const scores=getScores(),level=$("pcLevel").value,plans=history();
  if(plansSource?.isAccount()){
   const stamp=plansSource.token(),signature=JSON.stringify([scores,level]);
   if(createIntent?.signature!==signature){const snapshot=core.createPlan(scores,plans,level,new Date().toISOString());createIntent={signature,id:crypto.randomUUID(),operationId:crypto.randomUUID(),value:{source:'basic',schema_version:1,level_band:level,plan_snapshot:snapshot}}}
   const {signature:ignored,...intent}=createIntent;await plansSource.create(intent);if(stamp!==plansSource.token())return;createIntent=null;resultDirty=false;render(history().find(p=>p.id===intent.id)||null);renderHistory();controls();setStatus('Đã tạo giáo án trong kho tài khoản trên thiết bị · chọn giáo án và bấm đồng bộ.');return;
  }
  const plan=core.createPlan(scores,plans,level,new Date().toISOString());
  const next=plans.concat(plan).slice(-100);
  localStorage.setItem(storageKey,JSON.stringify(next));
  render(plan,true);renderHistory();
  setStatus("Đã tạo và lưu giáo án với ba ưu tiên: "+plan.exercises.map(e=>e.skillName).join(", ")+". Tạo lần kế tiếp để luân phiên bài tập.");
  document.dispatchEvent(new Event("pickleup:personal-plan-updated"));
 }catch(err){if(operationToken!==plansSource?.token())return;setStatus(plansSource?.isAccount()?"Chưa tạo được giáo án; giữ điểm nhập và kiểm tra quyền lưu trữ hoặc xung đột trong Dữ liệu.":"Không thể tạo giáo án: "+err.message)}
}
async function complete(){
 if(!current)return;
 const text=$("pcPostScore").value.trim(),score=Number(text);
 if(!text||!valid(score)){setStatus("Nhập kết quả nguyên từ 0 đến 20 trước khi lưu.");return}
 if(plansSource?.isAccount()){
  const stamp=plansSource.token(),id=current.id,revision=resultDirty?editRevision:current._localRevision;
  try{await plansSource.complete(id,score,revision);if(stamp!==plansSource.token())return;resultDirty=false;render(history().find(p=>p.id===id)||null);renderHistory();setStatus('Đã lưu kết quả trên thiết bị · chờ đồng bộ. Không tự tạo nhật ký tập hoặc attendance.')}catch(_){if(stamp===plansSource.token())setStatus('Chưa lưu được kết quả; giữ điểm nhập và kiểm tra quyền lưu trữ hoặc xung đột trong Dữ liệu.')}return;
 }
 try{
  const plans=history(),i=plans.findIndex(p=>p.id===current.id);
  if(i<0)throw Error("Không tìm thấy kế hoạch; hãy tạo giáo án mới.");
  const wasCompleted=Boolean(plans[i].completedAt);
  const updated={...plans[i],completedAt:new Date().toISOString(),checkScore:score};
  plans[i]=updated;localStorage.setItem(storageKey,JSON.stringify(plans));
  // Append the first measured checkpoint only; editing an earlier score is not a new attempt.
  let logWarning="";
  if(!wasCompleted&&!window.PICKLEUP_ACTIVITY?.isAccount()&&window.PICKLEUP_TRAINING_LOG){
   try{
    const e=updated.exercises[0];
    window.PICKLEUP_TRAINING_LOG.record(localStorage,{planId:updated.id,exerciseId:e.id,skill:e.skill,level:updated.level,kind:"assessment",hits:score,note:"Kiểm tra cuối buổi"});
    document.dispatchEvent(new Event("pickleup:training-log-updated"));
   }catch(err){logWarning=" (Điểm kế hoạch đã lưu, nhưng nhật ký lần tập chưa lưu được: "+err.message+")"}
  }
  $("pc-"+updated.checkpoint.skill).value=String(score);
  $("pcSource").textContent="Đã cập nhật điểm "+core.names[updated.checkpoint.skill]+" sau buổi tập. Kế hoạch tiếp theo sẽ sử dụng điểm mới khi bạn chọn Tạo giáo án.";
  render(updated,true);renderHistory();
  const d=score-updated.checkpoint.baseline;
  setStatus("Đã lưu kết quả: "+score+"/20 ("+(d>=0?"+":"")+d+" so với đầu vào)."+logWarning);
  document.dispatchEvent(new Event("pickleup:personal-plan-updated"));
 }catch(err){setStatus("Không lưu được: "+err.message)}
}
function controls(){
 const writable=plansSource?plansSource.canWrite(current?.id):true;for(const id of ['pcGenerate','pcLoad','pcComplete'])if($(id))$(id).disabled=!writable;
 if(plansSource?.isAccount()&&$("pcOpenRun"))$("pcOpenRun").disabled=!current||plansSource.selected()?.id!==current.id;
 else if($("pcOpenRun"))$("pcOpenRun").disabled=false;
}
function sourceUpdate(changed){
 if(changed){current=null;createIntent=null;resultDirty=false;editRevision=null;historyPage=0;fill();setStatus('')}
 if(plansSource?.isAccount()){const selected=plansSource.selected(),fresh=history().find(p=>p.id===current?.id)||(selected?.version==='2.4'?history().find(p=>p.id===selected.id):null);render(fresh||null)}
 else if(changed){const saved=history();render(saved[saved.length-1]||null)}renderHistory();controls();
}
(window.PICKLEUP_READY || (fn=>document.addEventListener("DOMContentLoaded",fn)))(()=>{
 if(!$("pcInputs"))return;
 for(const skill of keys){
  const row=element("label",undefined,"pc-input-row");
  const title=element("span",core.names[skill]);const wrap=element("span",undefined,"pc-input-wrap");
  const input=element("input");input.type="number";input.inputMode="numeric";input.min="0";input.max="20";input.step="1";input.placeholder="0–20";input.id="pc-"+skill;input.setAttribute("aria-label",core.names[skill]+" số lượt đúng trên 20");
  wrap.append(input,document.createTextNode("/20"));row.append(title,wrap);$("pcInputs").append(row);
 }
 fill();$("pcLoad").addEventListener("click",()=>{fill();setStatus("Đã nạp kết quả có sẵn; bạn có thể sửa từng điểm trước khi tạo giáo án.")});
 $("pcGenerate").addEventListener("click",generate);
 // This button lives on Coach, whereas the Court module is lazy-loaded.
 // Bind navigation here so the very first click opens Court.
 $("pcOpenRun")?.addEventListener("click",()=>{
  window.PICKLEUP_ROUTER?.openSection("pcOnCourt");
 });
 $("pcComplete").addEventListener("click",complete);
 $("pcPostScore").addEventListener("input",()=>{if(!resultDirty)editRevision=current?._localRevision;resultDirty=true});
 const saved=history();render((plansSource?.isAccount()?saved.find(p=>p.id===plansSource.selected()?.id):null)||saved[saved.length-1]||null);renderHistory();controls();
 document.addEventListener('pickleup:plan-score-request',event=>{if(event.detail?.version!=='2.4')return;const target=history().find(p=>p.id===event.detail.id);if(target){resultDirty=false;render(target);controls()}});
 let planToken=plansSource?.token();document.addEventListener("pickleup:plan-data",()=>{const next=plansSource?.token();sourceUpdate(next!==planToken);planToken=next});
 let activityToken=window.PICKLEUP_ACTIVITY?.token();document.addEventListener("pickleup:activity-data",()=>{const next=window.PICKLEUP_ACTIVITY?.token();if(next!==activityToken){activityToken=next;fill();setStatus("")}});
 window.addEventListener("storage",event=>{if([storageKey,"pickleup_stage_checks_v23","pickleup_academy_v2"].includes(event.key))renderHistory()});
});
})();
