/* PickleUp V3.2 — local tactical report, no third-party analytics. */
(function(){
"use strict";
const core=window.PICKLEUP_TACTICAL_INSIGHTS,coach=window.PICKLEUP_ADVANCED_COACH;
if(!core||!coach)return;
const $=id=>document.getElementById(id);
function e(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n}
function report(){
 if(!$("tacticalStats"))return;
 const level=$("tacticalLevel").value,info=core.fromStorage(localStorage,level);
 const stats=$("tacticalStats");stats.replaceChildren();
 for(const [v,label] of [[info.matchCount,"Trận gần nhất phân tích"],[info.attemptCount,"Lượt đo tại cấp độ này"],[info.comparable.length,"Bài có ≥2 lượt so sánh"]]){
  const box=e("div",undefined,"tactical-stat");box.append(e("strong",v),e("span",label));stats.append(box)
 }
 const signals=$("tacticalSignals");signals.replaceChildren();
 if(info.matchCount===0)signals.append(e("p","Chưa có trận đấu được ghi nhận. Bạn có thể ghi một trận trong Nhật ký thi đấu phía dưới.","sub"));
 else{
  for(const metric of core.METRICS){
   const row=e("div",undefined,"tactical-signal"),head=e("div",undefined,"tactical-signal-head");
   head.append(e("span",coach.names[metric]),e("strong",info.votes[metric]+" lần"));
   const track=e("div",undefined,"tactical-track"),bar=e("div",undefined,"tactical-fill");
   bar.style.width=(info.votes[metric]/info.matchCount*100)+"%";track.append(bar);row.append(head,track);signals.append(row);
  }
 }
 const recommendation=$("tacticalRecommendation");recommendation.replaceChildren();
 if(info.suggested){
  recommendation.append(e("p","Trọng tâm xuất hiện nhiều nhất trong "+info.matchCount+" trận gần nhất: "+coach.names[info.suggested]+" ("+info.votes[info.suggested]+" lần)."));
  const btn=e("button","Đưa trọng tâm này vào HLV nâng cao","pc-alt");btn.type="button";
  btn.addEventListener("click",()=>{
   const priority=info.suggested;
   window.PICKLEUP_ROUTER?.openSection("advancedCoach");
   const ready=window.PICKLEUP_PAGE_LOADER?.ensure("coach")||Promise.resolve();
   ready.then(()=>{
    const target=$("acCoachMatchFocus");if(!target)return;
    target.value=priority;
    target.dispatchEvent(new Event("change"));
    $("acCoachFocusStatus").textContent="Đã chọn ưu tiên "+coach.names[priority]+". Điểm kiểm tra gốc không thay đổi.";
    $("advancedCoach").scrollIntoView({behavior:"smooth",block:"start"});
   }).catch(()=>{$("acCoachFocusStatus").textContent="Không tải được HLV nâng cao. Hãy kiểm tra mạng và thử lại."});
  });
  recommendation.append(btn);
 }else recommendation.append(e("p","Chưa có trọng tâm sau trận để đề xuất. Hãy ghi nhận trận đấu trước."));
 const comparisons=$("tacticalComparisons");comparisons.replaceChildren();
 if(!info.comparable.length){
  comparisons.append(e("p","Chưa có hai lượt cùng mã bài, cùng cấp độ và cùng loại kiểm tra để so sánh.","sub"));
 }else{
  info.comparable.slice(0,8).forEach(row=>{
   const name=(window.PICKLEUP_ADVANCED_CURRICULUM||[]).find(s=>"ADV-"+s.id===row.exerciseId)?.title||row.exerciseId;
   const item=e("div",undefined,"tactical-comparison");const line=e("div",undefined,"tactical-signal-head");
   line.append(e("span",name+" · "+(row.kind==="assessment"?"Kiểm tra":"Luyện kỹ thuật")),e("strong",(row.delta>0?"+":"")+row.delta+"/20"));
   item.append(line,e("p",row.count+" lần đo · đầu "+row.first+"/20 → gần nhất "+row.last+"/20","sub"));comparisons.append(item)
  });
 }
 $("tacticalNotice").textContent="Dữ liệu trên thiết bị này. Trọng tâm sau trận là nhận xét định tính, không tương đương điểm 0–20. Chỉ so sánh bài cùng mã, cấp độ và loại kiểm tra; điều kiện thực tế vẫn có thể khác nhau.";
 const summary=$("acCoachMatchSuggestion");
 if(summary)summary.textContent=info.suggested?"Nhật ký gợi ý: "+coach.names[info.suggested]+" ("+info.votes[info.suggested]+"/"+info.matchCount+" trận). Chỉ áp dụng khi bạn chọn.":"Chưa có gợi ý dựa trên nhật ký trận đấu.";
}
(window.PICKLEUP_READY || (fn=>document.addEventListener("DOMContentLoaded",fn)))(()=>{
 if(!$("tacticalLevel"))return;
 $("tacticalLevel").addEventListener("change",report);
 $("tacticalRefresh").addEventListener("click",report);
 $("acCoachLevel")?.addEventListener("change",()=>{if($("tacticalLevel"))$("tacticalLevel").value=$("acCoachLevel").value;report()});
 document.addEventListener("pickleup:match-saved",report);
 document.addEventListener("pickleup:training-log-updated",report);
 window.addEventListener("storage",event=>{if([core.MATCH_KEY,core.ATTEMPT_KEY].includes(event.key))report()});
 report();
});
})();
