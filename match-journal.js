/* PickleUp V3.0: privacy-friendly, local match journal. */
(function(){
"use strict";
const $=id=>document.getElementById(id),KEY="pickleup_match_journal_v3";
const data=window.PICKLEUP_ACTIVITY;let sourceToken=data.token(),saving=false,accountHistory=null;
const foci=["third-drop","transition-reset","serve-return","kitchen-pressure","doubles-coverage","third-choice","advanced-reset","counter-volley","doubles-switch","defense-attack","tactical-choice"];
const labels=window.PickleUpActivitySourceCore.FOCUS_LABELS;
function valid(x){return !!x&&typeof x==="object"&&!Array.isArray(x)&&typeof x.id==="string"&&x.id.length<=90&&typeof x.date==="string"&&Number.isFinite(Date.parse(x.date))&&["singles","doubles"].includes(x.mode)&&Number.isInteger(x.ours)&&x.ours>=0&&x.ours<=99&&Number.isInteger(x.theirs)&&x.theirs>=0&&x.theirs<=99&&foci.includes(x.focus)&&typeof x.note==="string"&&x.note.length<=280&&(x.doublesIssue===undefined||window.PICKLEUP_PRACTICE_CONDITIONS?.isDoublesIssue(x.doublesIssue)===true)}
function validateList(list){return Array.isArray(list)&&list.length<=500&&list.every(valid)}
function read(){try{const data=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(data)?data:[]}catch(_){return []}}
function node(tag,txt,cls){const p=document.createElement(tag);if(txt!==undefined)p.textContent=txt;if(cls)p.className=cls;return p}
function draw(){
 if(data.isAccount()){const matches=data.matches(),wins=matches.filter(x=>x.ours>x.theirs).length,losses=matches.filter(x=>x.ours<x.theirs).length;$("matchSummary").textContent=data.getView().mode!=="account"?data.notice():matches.length+" trận có ngày hợp lệ để thống kê · "+wins+" thắng · "+losses+" thua · "+(matches.length-wins-losses)+" hòa/chưa phân định. Toàn bộ lượt ở lịch sử bên dưới.";accountHistory?.render();return}
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
async function submit(){
 if(saving||!data.canWrite())return;const stamp=data.token();
 const rawO=$("matchOurs").value.trim(),rawT=$("matchTheirs").value.trim(),ours=Number(rawO),theirs=Number(rawT);
 if(!rawO||!rawT||!Number.isInteger(ours)||!Number.isInteger(theirs)||ours<0||ours>99||theirs<0||theirs>99){$("matchStatus").textContent="Nhập hai điểm nguyên từ 0 đến 99.";return}
 const date=new Date().toISOString(),entry={id:"MATCH-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),date,mode:$("matchMode").value,ours,theirs,focus:$("matchFocus").value,note:$("matchNotes").value.trim()};
 if(entry.mode==="doubles"&&$("matchDoublesIssue")?.value)entry.doublesIssue=$("matchDoublesIssue").value;
 if(!data.isAccount()&&!valid(entry)){$("matchStatus").textContent="Dữ liệu trận đấu không hợp lệ.";return}
 const previous=data.isAccount()?[]:read();if(!data.isAccount()&&!validateList(previous)){$("matchStatus").textContent="Lịch sử hiện tại không hợp lệ. Hãy sao lưu trước khi ghi thêm.";return}
 saving=true;controls();$("matchStatus").textContent="Đang lưu trận đấu…";
 try{
  if(data.isAccount())await data.saveMatch({mode:entry.mode,ours,theirs,focus:entry.focus,note:entry.note,doubles_issue:entry.doublesIssue||null});else localStorage.setItem(KEY,JSON.stringify(previous.concat(entry).slice(-500)));
  if(stamp!==data.token())return;
  $("matchNotes").value="";$("matchOurs").value="";$("matchTheirs").value="";if($("matchDoublesIssue"))$("matchDoublesIssue").value="";
  $("matchStatus").textContent=data.isAccount()?"Đã lưu trận đấu trên thiết bị · chờ đồng bộ. Không tự xác nhận buổi tập.":"Đã lưu trận đấu và trọng tâm cần luyện tập.";
  draw();document.dispatchEvent(new Event("pickleup:match-saved"));
 }catch(err){if(stamp===data.token())$("matchStatus").textContent=data.isAccount()?PickleUpActivityHistory.error(err):"Không lưu được nhật ký: "+err.message}
 finally{if(stamp===data.token()){saving=false;controls()}}
}
function controls(){for(const id of ["matchMode","matchFocus","matchOurs","matchTheirs","matchDoublesIssue","matchNotes","matchSave"])$(id).disabled=saving||!data.canWrite()}
function sourceChanged(){if(sourceToken!==data.token()){sourceToken=data.token();saving=false;for(const id of ["matchOurs","matchTheirs","matchNotes"])$(id).value="";for(const id of ["matchMode","matchFocus","matchDoublesIssue"])$(id).selectedIndex=0;$("matchMode").dispatchEvent(new Event("change"));$("matchStatus").textContent=""}if(data.isAccount()&&data.getView().mode!=="account")$("matchStatus").textContent=data.notice();controls();draw()}
let initialized=false;
function initialize(){
 if(initialized||!$("matchFocus"))return;initialized=true;sourceToken=data.token();
 const issueField=$("matchDoublesIssue"),cond=window.PICKLEUP_PRACTICE_CONDITIONS;
 if(issueField&&cond&&issueField.options.length<=1){
  for(const [value,label] of Object.entries(cond.DOUBLES)){
   const option=node("option",label);option.value=value;issueField.append(option);
  }
 }

 foci.forEach(k=>{const e=node("option",labels[k]);e.value=k;$("matchFocus").append(e)});
 if($("matchMode")&&$("matchDoublesField")){$("matchMode").addEventListener("change",()=>{$("matchDoublesField").hidden=$("matchMode").value!=="doubles"});$("matchMode").dispatchEvent(new Event("change"))}
 accountHistory=PickleUpActivityHistory.mount($("matchHistory"),{kind:"match_records"});document.addEventListener("pickleup:activity-data",sourceChanged);$("matchSave").addEventListener("click",submit);draw();controls();
}
document.addEventListener("pickleup:fragment-ready",initialize);
(window.PICKLEUP_READY || (fn=>document.addEventListener("DOMContentLoaded",fn)))(initialize);
window.PICKLEUP_VALIDATE_MATCHES=validateList;
})();
