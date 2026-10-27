/* PickleUp V3.3 — context-matched outcomes and doubles follow-up. */
(function(){
"use strict";
const api=window.PICKLEUP_EVALUATION,ctx=window.PICKLEUP_PRACTICE_CONDITIONS;
if(!api||!ctx)return;
const $=id=>document.getElementById(id);
function el(tag,text,cls){const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);if(cls)x.className=cls;return x}
function read(key){try{const items=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(items)?items:[]}catch(_){return []}}
function title(id){const a=(window.PICKLEUP_ADVANCED_CURRICULUM||[]).find(x=>"ADV-"+x.id===id);if(a)return a.title;const base=window.PICKLEUP_PERSONAL_CORE?.library||{};for(const rows of Object.values(base)){const item=rows.find(x=>x.id===id);if(item)return item.name}return id}
function draw(){
 const level=$("evalLevel").value;
 const result=api.evaluate(read("pickleup_training_log_v26"),level);
 const doubles=api.doubles(read("pickleup_match_journal_v3"));
 $("evalTotals").textContent=result.measured+"/"+result.total+" lượt có đủ điều kiện · "+result.comparable.length+" nhóm so sánh được";
 $("evalUnknown").textContent=result.unknown?"Còn "+result.unknown+" lượt cũ hoặc lượt kiểm tra cuối buổi chưa ghi điều kiện: vẫn lưu, nhưng không đưa vào phép so sánh đủ điều kiện.":"Tất cả lượt trong nhóm đã chọn đều có điều kiện ghi nhận.";
 const list=$("evalComparison");list.replaceChildren();
 if(!result.comparable.length)list.append(el("p","Chưa có ít nhất hai lượt cùng bài, cấp độ, loại kiểm tra và ba điều kiện. Hãy luyện lại cùng bài trong điều kiện tương tự.","sub"));
 for(const entry of result.comparable.slice(0,12)){
  const row=el("article",undefined,"eval-item");
  const head=el("div",undefined,"eval-head");
  head.append(el("strong",title(entry.exerciseId)),el("span",(entry.delta>0?"+":"")+entry.delta+"/20"));
  row.append(head,el("p",entry.count+" lượt · "+entry.first+"/20 → "+entry.last+"/20 · "+(entry.kind==="assessment"?"Kiểm tra":"Luyện kỹ thuật"),"sub"));
  row.append(el("p",ctx.describe(entry.conditions),"sub"));list.append(row);
 }
 const details=$("evalDoubles");details.replaceChildren();
 $("evalDoublesSummary").textContent="Xem tối đa 20 trận đánh đôi gần nhất: "+doubles.documented+"/"+doubles.total+" trận có ghi tình huống.";
 if(doubles.documented===0)details.append(el("p","Chưa có tình huống đánh đôi được phân loại. Hãy chọn một vấn đề sau trận.","sub"));
 for(const [key,label] of Object.entries(ctx.DOUBLES)){
  if(!doubles.counts[key])continue;
  const item=el("div",undefined,"eval-head");
  item.append(el("span",label),el("strong",doubles.counts[key]+" trận"));details.append(item);
 }
 const next=$("evalSuggestion");next.replaceChildren();
 if(doubles.top){
  next.append(el("p","Tình huống cần chú ý được ghi nhận nhiều nhất: "+ctx.DOUBLES[doubles.top]+". Gợi ý dành 5 phút trong buổi đánh đôi tiếp theo để thống nhất cách xử lý với đồng đội."));
 }else next.append(el("p","Chưa đủ ghi nhận để nhận diện tình huống phối hợp đánh đôi thường gặp."));
 $("evalDisclaimer").textContent="Đây là báo cáo mô tả, không chứng minh bài tập gây ra tiến bộ. Ngay khi ba điều kiện trùng nhau, người cấp bóng, thể trạng và mức độ khó thực tế vẫn có thể thay đổi.";
}
(window.PICKLEUP_READY || (fn=>document.addEventListener("DOMContentLoaded",fn)))(()=>{
 if(!$("evalLevel"))return;
 const controls={feed:"pcAttemptFeed",pace:"pcAttemptPace",target:"pcAttemptTarget"};
 for(const [key,id] of Object.entries(controls)){
  const select=$(id);if(!select)continue;
  for(const [value,label] of Object.entries(ctx.OPTIONS[key])){const option=el("option",label);option.value=value;select.append(option)}
 }
 const field=$("matchDoublesIssue");
 if(field)for(const [key,label] of Object.entries(ctx.DOUBLES)){const option=el("option",label);option.value=key;field.append(option)}
 $("evalLevel").addEventListener("change",draw);
 $("evalRefresh").addEventListener("click",draw);
 document.addEventListener("pickleup:training-log-updated",draw);
 document.addEventListener("pickleup:match-saved",draw);
 window.addEventListener("storage",ev=>{if(["pickleup_training_log_v26","pickleup_match_journal_v3"].includes(ev.key))draw()});
 draw();
});
})();
