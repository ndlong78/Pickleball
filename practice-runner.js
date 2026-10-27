/* PickleUp V2.5 — guided on-court player for personalized plans. */
(function(){
"use strict";
const clock=window.PICKLEUP_PRACTICE_CLOCK,draw=window.PICKLEUP_DRILL_DIAGRAM;
if(!clock)return;
const storageKey="pickleup_practice_state_v25",plansKey="pickleup_plans_v24",$=id=>document.getElementById(id);
let plan=null,state=null,lastExpired=-1,wakeLock=null;
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch(_){return fallback}}
function save(){try{if(state)localStorage.setItem(storageKey,JSON.stringify(state))}catch(_){message("Không lưu được trạng thái đồng hồ; hãy giữ trang đang mở.")}}
function message(value){$("pcRunMessage").textContent=value}
function phaseInfo(index){
 if(!plan||index>=clock.stages.length)return null;
 const step=clock.stages[index];
 if(index===0||index===5)return {name:step.title,minutes:step.minutes,info:step.description,skill:null,exercise:null};
 if(index>=1&&index<=3){const e=plan.exercises[index-1];return {name:step.title+" · "+e.skillName,minutes:step.minutes,info:e.instructions,skill:e.skill,exercise:e}}
 const c=plan.checkpoint;
 return {name:step.title+" · "+(window.PICKLEUP_PERSONAL_CORE?.names[c.skill]||c.skill),minutes:6,info:"Thực hiện 20 lượt kiểm tra kỹ năng ưu tiên số một. Mốc trước tập "+c.baseline+"/20, mục tiêu tham khảo "+c.target+"/20. Chỉ tính lượt hợp lệ đúng mục tiêu.",skill:c.skill,exercise:plan.exercises[0]};
}
function loadPlan(p){
 if(!p||!p.id||!Array.isArray(p.exercises)||p.exercises.length!==3){plan=null;state=null;render();return}
 const old=read(storageKey,null),changing=plan?.id!==p.id;
 plan=p;if(changing){state=clock.readStored(old,plan.id);lastExpired=-1}
 render();
}
function render(){
 const enabled=!!plan;
 $("pcRunEmpty").hidden=enabled;$("pcRunPlayer").hidden=!enabled;
 if(!enabled)return;
 if(!state)state=clock.create(plan.id);
 const done=state.index>=clock.stages.length;
 const info=phaseInfo(state.index);
 $("pcRunTitle").textContent=done?"Đã kết thúc thời gian tập":info.name;
 $("pcRunStep").textContent=done?"Đã hoàn thành 6 phần thời gian — hãy ghi kết quả kiểm tra.":"Phần "+(state.index+1)+"/6 · "+info.minutes+" phút · Giáo án "+plan.level;
 $("pcRunClock").textContent=clock.fmt(clock.seconds(state));
 $("pcRunStart").textContent=state.running?"Tạm dừng":"Bắt đầu";
 $("pcRunStart").disabled=done||state.remaining===0;
 $("pcRunPrev").disabled=state.index===0;
 $("pcRunNext").disabled=done;
 $("pcRunNext").textContent=state.index===clock.stages.length-1?"Kết thúc giờ tập":state.remaining===0?"Phần tiếp theo":"Bỏ qua sang phần sau";
 $("pcRunProgress").style.width=(done?100:(state.index/clock.stages.length*100))+"%";
 const guide=$("pcRunGuide"),diagram=$("pcRunDiagram");
 guide.replaceChildren();diagram.replaceChildren();
 if(done){const p=document.createElement("p");p.textContent="Bạn đã đi hết sáu phần của đồng hồ. Hãy ghi lại kết quả kiểm tra để giáo án sau phù hợp hơn.";guide.append(p)}
 else {
  const heading=document.createElement("h4");heading.textContent=info.name;guide.append(heading);
  const p=document.createElement("p");p.textContent=info.info;guide.append(p);
  if(info.exercise){
   const setup=document.createElement("p");setup.textContent="Bố trí: "+info.exercise.setup;guide.append(setup);
   const measure=document.createElement("p");measure.textContent="Đánh giá: "+info.exercise.measure;guide.append(measure);
   const caution=document.createElement("p");caution.textContent="Tránh: "+info.exercise.mistake;guide.append(caution);
   if(typeof draw==="function")draw(diagram,info.exercise);
  }
 }
 const items=$("pcRunSegments");items.replaceChildren();
 clock.stages.forEach((s,i)=>{const el=document.createElement("span");el.className="pc-run-segment"+(i===state.index?" is-active":"")+(i<state.index?" is-done":"");el.textContent=(i+1)+". "+s.title;items.append(el)});
 $("pcRunScore").hidden=!done&&state.index!==4;
}
function advance(direction){
 if(!state)return;
 state=clock.step(state,direction,Date.now());save();lastExpired=-1;render();
 message(state.ended?"Đã hoàn tất sáu phần thời gian. Ghi kết quả ở cuối giáo án.":"Đã chuyển phần. Nhấn Bắt đầu khi bạn sẵn sàng.");
}
function startPause(){
 if(!state)return;
 state=state.running?clock.pause(state):clock.start(state);
 save();render();
 message(state.running?"Đang đếm ngược cho phần này.":"Đồng hồ đã tạm dừng.");
}
function reset(){
 if(!state||!confirm("Đặt lại đồng hồ về phần khởi động của kế hoạch này?"))return;
 state=clock.reset(state);save();lastExpired=-1;render();message("Đã đặt lại đồng hồ.");
}
function pulse(){
 if(!state||!state.running)return;
 const old=state;state=clock.tick(state);
 // Avoid rebuilding text/diagram every quarter-second; update only the clock.
 $("pcRunClock").textContent=clock.fmt(clock.seconds(state));
 if(old.running&&!state.running&&state.remaining===0){
  save();render();
  if(lastExpired!==state.index){lastExpired=state.index;message("Đã hết thời gian phần này. Chọn Phần tiếp theo khi sẵn sàng.")}
 }
}
document.addEventListener("pickleup:plan-selected",event=>loadPlan(event.detail?.plan||null));
document.addEventListener("DOMContentLoaded",()=>{
 if(!$("pcOnCourt"))return;
 const selected=$("pcPlan")?.dataset.planId;
 const plans=read(plansKey,[]);
 if(selected&&Array.isArray(plans))loadPlan(plans.find(p=>p.id===selected)||null);else render();
 $("pcOpenRun").addEventListener("click",()=>{$("pcOnCourt").scrollIntoView({behavior:"smooth",block:"start"})});
 $("pcRunStart").addEventListener("click",startPause);
 $("pcRunPrev").addEventListener("click",()=>advance(-1));
 $("pcRunNext").addEventListener("click",()=>advance(1));
 $("pcRunReset").addEventListener("click",reset);
 $("pcRunScore").addEventListener("click",()=>{$("pcCompletion").scrollIntoView({behavior:"smooth",block:"center"});$("pcPostScore").focus()});
 // Wall-clock deadlines recover from mobile background throttling without incorrectly skipping stages.
 setInterval(pulse,350);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&state){state=clock.tick(state);save();render()}});
});
})();
