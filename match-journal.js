/* PickleUp V3.0: privacy-friendly, local match journal. */
(function(){
"use strict";
const $=id=>document.getElementById(id),KEY="pickleup_match_journal_v3";
const foci=["third-drop","transition-reset","serve-return","kitchen-pressure","doubles-coverage","third-choice","advanced-reset","counter-volley","doubles-switch","defense-attack","tactical-choice"];
const labels={"third-drop":"Third-shot drop","transition-reset":"Reset và di chuyển","serve-return":"Giao – trả – bóng ba","kitchen-pressure":"Dinking tại kitchen","doubles-coverage":"Vị trí đánh đôi","third-choice":"Chọn cú thứ ba","advanced-reset":"Reset nâng cao","counter-volley":"Counter volley","doubles-switch":"Phối hợp đánh đôi","defense-attack":"Phòng thủ/phản công","tactical-choice":"Quyết định chiến thuật"};
function valid(x){return !!x&&typeof x==="object"&&!Array.isArray(x)&&typeof x.id==="string"&&x.id.length<=90&&typeof x.date==="string"&&Number.isFinite(Date.parse(x.date))&&["singles","doubles"].includes(x.mode)&&Number.isInteger(x.ours)&&x.ours>=0&&x.ours<=99&&Number.isInteger(x.theirs)&&x.theirs>=0&&x.theirs<=99&&foci.includes(x.focus)&&typeof x.note==="string"&&x.note.length<=280&&(x.doublesIssue===undefined||window.PICKLEUP_PRACTICE_CONDITIONS?.isDoublesIssue(x.doublesIssue)===true)}
function validateList(list){return Array.isArray(list)&&list.length<=500&&list.every(valid)}
function read(){try{const data=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(data)?data:[]}catch(_){return []}}
function node(tag,txt,cls){const p=document.createElement(tag);if(txt!==undefined)p.textContent=txt;if(cls)p.className=cls;return p}
function draw(){
 const list=$("matchHistory");list.replaceChildren();
 const matches=read().filter(valid).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
 const all=read().filter(valid),wins=all.filter(x=>x.ours>x.theirs).length,losses=all.filter(x=>x.ours<x.theirs).length;
 $("matchSummary").textContent=all.length+" trận ghi nhận · "+wins+" thắng · "+losses+" thua · "+(all.length-wins-losses)+" hòa/chưa phân định.";
 if(!matches.length){list.append(node("p","Chưa có nhật ký. Ghi một trận đã chơi để bắt đầu theo dõi.","sub"));return}
 matches.forEach(m=>{
  const box=node("div",undefined,"match-record");
  const head=node("div",undefined,"match-head");
  head.append(node("strong",m.ours+"–"+m.theirs+" · "+(m.mode==="doubles"?"Đánh đôi":"Đánh đơn")),
    node("span",new Date(m.date).toLocaleDateString("vi-VN")));
  box.append(head,node("p",labels[m.focus], "sub"));
  if(m.doublesIssue&&window.PICKLEUP_PRACTICE_CONDITIONS?.DOUBLES[m.doublesIssue])box.append(node("p","Tình huống đánh đôi: "+window.PICKLEUP_PRACTICE_CONDITIONS.DOUBLES[m.doublesIssue],"sub"));
  if(m.note)box.append(node("p",m.note,"sub"));
  list.append(box);
 });
}
function submit(){
 const rawO=$("matchOurs").value.trim(),rawT=$("matchTheirs").value.trim(),ours=Number(rawO),theirs=Number(rawT);
 if(!rawO||!rawT||!Number.isInteger(ours)||!Number.isInteger(theirs)||ours<0||ours>99||theirs<0||theirs>99){$("matchStatus").textContent="Nhập hai điểm nguyên từ 0 đến 99.";return}
 const date=new Date().toISOString(),entry={id:"MATCH-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),date,mode:$("matchMode").value,ours,theirs,focus:$("matchFocus").value,note:$("matchNotes").value.trim()};
 if(entry.mode==="doubles"&&$("matchDoublesIssue")?.value)entry.doublesIssue=$("matchDoublesIssue").value;
 if(!valid(entry)){$("matchStatus").textContent="Dữ liệu trận đấu không hợp lệ.";return}
 const previous=read();if(!validateList(previous)){$("matchStatus").textContent="Lịch sử hiện tại không hợp lệ. Hãy sao lưu trước khi ghi thêm.";return}
 try{
  localStorage.setItem(KEY,JSON.stringify(previous.concat(entry).slice(-500)));
  $("matchNotes").value="";$("matchOurs").value="";$("matchTheirs").value="";if($("matchDoublesIssue"))$("matchDoublesIssue").value="";
  $("matchStatus").textContent="Đã lưu trận đấu và trọng tâm cần luyện tập.";
  draw();document.dispatchEvent(new Event("pickleup:match-saved"));
 }catch(err){$("matchStatus").textContent="Không lưu được nhật ký: "+err.message}
}
(window.PICKLEUP_READY || (fn=>document.addEventListener("DOMContentLoaded",fn)))(()=>{
 if(!$("matchFocus"))return;
 foci.forEach(k=>{const e=node("option",labels[k]);e.value=k;$("matchFocus").append(e)});
 if($("matchMode")&&$("matchDoublesField")){$("matchMode").addEventListener("change",()=>{$("matchDoublesField").hidden=$("matchMode").value!=="doubles"});$("matchMode").dispatchEvent(new Event("change"))}
 $("matchSave").addEventListener("click",submit);draw();
});
window.PICKLEUP_VALIDATE_MATCHES=validateList;
})();
