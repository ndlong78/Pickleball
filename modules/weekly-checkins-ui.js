/* V4.8: explicit confirmations; a score never marks a training session done. */
(function(){
"use strict";
const c=window.PICKLEUP_WEEK_CHECKINS,$=id=>document.getElementById(id),cards=$("wpDays");
if(!c||!cards||!$("wcDone"))return;
function load(){try{return c.read(localStorage.getItem(c.KEY))}catch(_){return c.empty()}}
function text(tag,cls,value){const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=String(value);return x}
function draw(){
 const data=load(),s=c.summary(data),today=c.today();
 $("wcDone").textContent=String(s.current.done);
 $("wcSkipped").textContent=String(s.current.skipped);
 $("wcMinutes").textContent=s.current.minutes+" phút";
 const history=document.createElement("ol");history.className="wc-weeks";
 s.weeks.forEach(w=>history.append(text("li","","Tuần "+w.start.slice(5).replace("-","/")+": "+w.done+" ngày · "+w.minutes+" phút")));
 $("wc8Weeks").replaceChildren(history);
 cards.querySelectorAll(".wp-day").forEach(card=>{
  card.querySelector(".wc-actions")?.remove();
  const day=card.dataset.date;
  if(!c.dayOK(day))return;
  const row=data.entries[day],future=day>today;
  const box=text("div","wc-actions");
  const label=text("label","wc-label","Số phút thực tế");
  const input=document.createElement("input");
  input.type="number";input.min="5";input.max="180";input.step="5";input.inputMode="numeric";
  input.value=row?.status==="done"?String(row.minutes):"30";
  input.setAttribute("aria-label","Số phút thực tế "+day);input.disabled=future;
  label.append(input);box.append(label);
  const controls=text("div","wc-buttons");
  function button(label,status){const b=text("button","wc-button",label);b.type="button";b.dataset.status=status;b.dataset.day=day;b.disabled=future;return b}
  controls.append(button("Đã tập","done"),button("Bỏ qua","skipped"));
  if(row)controls.append(button("Xóa ghi nhận","clear"));
  box.append(controls);
  box.append(text("p","wc-state",future?"Ngày chưa đến — không thể điểm danh trước.":row?.status==="done"?"Đã tập · "+row.minutes+" phút":row?.status==="skipped"?"Đã bỏ qua":"Chưa xác nhận"));
  card.append(box);
 });
}
cards.addEventListener("click",event=>{
 const button=event.target.closest?.("button[data-status]");if(!button)return;
 const card=button.closest(".wp-day"),day=button.dataset.day,status=button.dataset.status;
 const minutes=status==="done"?Number(card.querySelector(".wc-label input")?.value):null;
 try{
  const next=c.change(load(),day,status,minutes,card.querySelector("a[data-lesson-id]")?.dataset.lessonId||null);
  c.save(localStorage,next);
  $("wcStatus").textContent=status==="clear"?"Đã xóa ghi nhận ngày "+day+".":"Đã lưu ghi nhận ngày "+day+".";
  draw();
 }catch(e){$("wcStatus").textContent=e.message||"Không thể lưu dữ liệu."}
});
document.addEventListener("pickleup:weekly-plan-rendered",draw);
window.addEventListener("storage",event=>{if(event.key===c.KEY)draw()});
draw();
})();
