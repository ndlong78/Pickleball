/* PickleUp V2.6 — attempt history and like-for-like progress trends. */
(function(){
"use strict";
const api=window.PICKLEUP_TRAINING_LOG,conditions=window.PICKLEUP_PRACTICE_CONDITIONS;if(!api)return;
const $=id=>document.getElementById(id);
const names=window.PICKLEUP_PERSONAL_CORE?.names||{serve:"Giao bóng",return:"Trả giao bóng",dink:"Dinking",volley:"Volley",position:"Di chuyển",strategy:"Chiến thuật"};
function el(tag,text,cls){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x}
function rows(){return api.read(localStorage)}
function title(exId){if(exId.startsWith("ADV-PU-"))return (window.PICKLEUP_ADVANCED_CURRICULUM||[]).find(e=>"ADV-"+e.id===exId)?.title||exId;const p=window.PICKLEUP_PERSONAL_CORE?.library||{};const skill=exId.split("-")[0];return p[skill]?.find(e=>e.id===exId)?.name||exId}
function render(){
 const data=rows(),skill=$("thSkill").value,drill=$("thDrill"),old=drill.value;
 $("thTotal").textContent=data.length+" lần tập đã lưu";
 $("thSkillsCount").textContent=new Set(data.map(e=>e.skill)).size+"/6 kỹ năng có dữ liệu";
 const list=data.filter(e=>skill==="all"||e.skill===skill);
 const groups=new Map();
 for(const row of list){
  const signature=conditions?.signature(row.conditions)||"legacy";
  const key=[row.skill,row.exerciseId,row.level,row.kind,signature].join("|");
  if(!groups.has(key))groups.set(key,{skill:row.skill,exerciseId:row.exerciseId,level:row.level,kind:row.kind,conditionsKey:signature,conditions:row.conditions});
 }
 drill.replaceChildren();
 const placeholder=el("option","Chọn một bài tập để so sánh");placeholder.value="";drill.append(placeholder);
 Array.from(groups.entries()).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([key,g])=>{
  const option=el("option",names[g.skill]+" · "+title(g.exerciseId)+" · "+g.level+(g.kind==="assessment"?" (kiểm tra)":"")+" · "+(g.conditionsKey==="legacy"?"Thiếu điều kiện":conditions.describe(g.conditions)));option.value=key;drill.append(option)
 });
 if(groups.has(old))drill.value=old;
 else if(groups.size)drill.value=groups.keys().next().value;
 const comparison=$("thComparison"),chart=$("thTrend"),history=$("thEntries");chart.replaceChildren();history.replaceChildren();
 if(!drill.value){
  comparison.textContent="Chưa có kết quả nào. Ghi số lần thành công sau mỗi bài tập trong chế độ trên sân.";
  history.append(el("p","Chưa có nhật ký luyện tập.","sub"));return
 }
 const group=groups.get(drill.value),matches=api.matching(data,group),stats=api.compare(data,group);
 if(group.conditionsKey==="legacy"){comparison.textContent="Dữ liệu lịch sử thiếu điều kiện bài tập. Có "+stats.count+" lượt cùng mã bài/cấp độ, nhưng chưa đủ căn cứ để xác nhận điều kiện tương đương."}
 else if(!stats.comparable){comparison.textContent="Có "+stats.count+" lượt cùng mã bài, cấp độ, kiểu kiểm tra và cả ba điều kiện. Cần ít nhất hai lượt để so sánh."}
 else{comparison.textContent=stats.count+" lượt cùng điều kiện đã ghi · "+stats.first+"/20 → "+stats.last+"/20 · "+(stats.delta>0?"Tăng "+stats.delta:stats.delta<0?"Giảm "+Math.abs(stats.delta):"Không đổi")+" lần đạt. Đây là mô tả kết quả, không chứng minh nguyên nhân thay đổi trình độ."}
 const recent=matches.slice(-12);const bars=el("div",undefined,"th-bars");
 for(let i=0;i<recent.length;i++){
  const r=recent[i],col=el("div",undefined,"th-col"),v=el("strong",r.hits+"/20"),bar=el("div",undefined,"th-bar");
  bar.style.height=Math.max(3,r.hits*5)+"%";
  bar.title=r.hits+"/20 · "+new Date(r.date).toLocaleString("vi-VN");
  col.append(v,bar,el("span","#"+(matches.length-recent.length+i+1)));bars.append(col);
 }
 chart.append(bars,el("p","Mỗi cột là một lần tập đã lưu với "+group.exerciseId+" · "+group.level+". Nhóm hiện tại chỉ chứa cùng mã bài, cấp độ, kiểu kiểm tra và cùng bộ điều kiện nếu có.","sub"));
 recent.slice().reverse().forEach(r=>{
  const p=el("div",undefined,"th-row");
  const when=el("span",new Date(r.date).toLocaleString("vi-VN")+(r.note?" · "+r.note:""));
  p.append(when,el("strong",r.hits+"/20"));history.append(p)
 });
}
document.addEventListener("DOMContentLoaded",()=>{
 if(!$("thSkill"))return;
 const select=$("thSkill");
 for(const s of api.skills){const opt=el("option",names[s]);opt.value=s;select.append(opt)}
 select.addEventListener("change",render);
 $("thDrill").addEventListener("change",render);
 $("thRefresh").addEventListener("click",render);
 document.addEventListener("pickleup:training-log-updated",render);
 window.addEventListener("storage",event=>{if(event.key===api.KEY)render()});
 render();
});
})();
