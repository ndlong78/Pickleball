/* PickleUp V2.3: formative stage checks; NOT a competitive rating. */
(function(){
"use strict";
const stages=[
{key:"1.0–2.0",next:"2.0–2.5",label:"Nền tảng",skills:["serve","return","dink","volley","position","strategy"],threshold:11,minimum:1},
{key:"2.0–2.5",next:"2.5–3.0",label:"Kiểm soát",skills:["serve","return","dink","volley","position","strategy"],threshold:14,minimum:2},
{key:"2.5–3.0",next:"3.0–3.5",label:"Sẵn sàng học chiến thuật",skills:["serve","return","dink","volley","position","strategy"],threshold:16,minimum:2}
];
const names={serve:"Giao bóng",return:"Trả giao bóng",dink:"Dinking",volley:"Volley",position:"Di chuyển",strategy:"Chiến thuật"};
const ids=Object.keys(names);
const $=id=>document.getElementById(id);
function read(){try{const value=JSON.parse(localStorage.getItem("pickleup_stage_checks_v23")||"[]");return Array.isArray(value)?value:[]}catch(_){return []}}
function choose(){const st=stages.find(s=>s.key===$("stageSelect").value)||stages[0];$("stageChecklist").replaceChildren();ids.forEach(k=>{const row=document.createElement("label");row.className="stage-check";const title=document.createElement("span");title.textContent=names[k];const field=document.createElement("input");field.type="number";field.min="0";field.max="20";field.step="1";field.required=true;field.placeholder="0–20";field.dataset.skill=k;field.setAttribute("aria-label","Số lần thành công cho "+names[k]);row.append(title,field);$("stageChecklist").append(row)});$("stageTarget").textContent="Điều kiện tham khảo: trung bình tối thiểu "+st.threshold+"/20 và từng kỹ năng ít nhất "+st.minimum+"/20. Mỗi kỹ năng thực hiện 20 lần trong bài kiểm tra được giám sát; tiêu chí này chỉ phục vụ kế hoạch luyện tập.";showHistory()}
function analyze(){const stage=stages.find(s=>s.key===$("stageSelect").value)||stages[0];const inputs=Array.from($("stageChecklist").querySelectorAll("input"));const values=Object.fromEntries(inputs.map(x=>[x.dataset.skill,Number(x.value)]));if(inputs.some(x=>x.value.trim()===""||!Number.isInteger(Number(x.value))||Number(x.value)<0||Number(x.value)>20)){ $("stageResult").textContent="Vui lòng nhập số nguyên 0–20 cho đủ sáu kỹ năng.";return}
 const avg=Object.values(values).reduce((a,b)=>a+b,0)/6,weak=ids.filter(k=>values[k]<stage.minimum||values[k]<stage.threshold);
 const ready=avg>=stage.threshold&&ids.every(k=>values[k]>=stage.minimum);
 const record={id:"check-"+Date.now(),level:stage.key,values,average:Number(avg.toFixed(2)),ready,date:new Date().toISOString()};
 const old=read();old.push(record);
 try{localStorage.setItem("pickleup_stage_checks_v23",JSON.stringify(old));$("stageResult").textContent=(ready?"Đạt mục tiêu nội bộ để THỬ giáo án "+stage.next+". ":"Chưa đạt mục tiêu chuyển nhóm giáo án. ")+"Trung bình "+avg.toFixed(1)+"/20. "+(weak.length?"Ưu tiên: "+weak.map(k=>names[k]).join(", ")+".":"Tiếp tục luyện tính ổn định trong tình huống thi đấu.")+" Đây KHÔNG phải đánh giá DUPR hay chứng nhận trình độ.";showHistory()}catch(e){$("stageResult").textContent="Không lưu được kết quả; hãy kiểm tra bộ nhớ trình duyệt."}
}
function showHistory(){const list=read().slice(-5).reverse();$("stageHistory").replaceChildren();if(!list.length){$("stageHistory").textContent="Chưa có bài kiểm tra chuyển cấp.";return}list.forEach(r=>{const p=document.createElement("p");p.className="sub";p.textContent=(new Date(r.date).toLocaleDateString("vi-VN"))+" · "+r.level+" · "+r.average+"/20 · "+(r.ready?"Đạt mục tiêu":"Cần luyện thêm");$("stageHistory").append(p)})}
(window.PICKLEUP_READY || (fn=>document.addEventListener("DOMContentLoaded",fn)))(()=>{if(!$("stageSelect"))return;$("stageSelect").addEventListener("change",choose);$("stageSubmit").addEventListener("click",analyze);choose()});
})();
