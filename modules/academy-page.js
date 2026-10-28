(function(){
const data=window.PICKLEUP_CURRICULUM||[];
const level=document.getElementById('academyLevel'),weeks=document.getElementById('academyWeek'),detail=document.getElementById('academyDetail'),score=document.getElementById('academyScore'),status=document.getElementById('academyStatus');
let records={};try{records=JSON.parse(localStorage.getItem('pickleup_academy_v2')||'{}')}catch(e){}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function get(){return data.find(x=>x.id===weeks.value)}
const selectionKey='pickleup_academy_last_lesson_v4';
let resumedId=null;
try{resumedId=localStorage.getItem(selectionKey)}catch(_){}
function completedIds(){return new Set(Object.keys(records).filter(id=>data.some(x=>x.id===id)&&Number.isInteger(records[id]?.score)&&records[id].score>=0&&records[id].score<=20))}
function refreshLearning(){
 const complete=completedIds(),total=data.length;
 const progress=document.getElementById('academyProgressText'),resume=document.getElementById('academyResumeText'),next=document.getElementById('academyNext'),resumeButton=document.getElementById('academyResume');
 progress.textContent='Đã ghi kết quả '+complete.size+'/'+total+' bài học';
 const last=data.find(x=>x.id===resumedId);
 resume.textContent=last?'Bài gần nhất: Tuần '+last.week+' · '+last.title:'Bạn chưa chọn bài học trước đó.';
 resumeButton.disabled=!last;
 next.disabled=complete.size>=total;
}
function visitLesson(id){
 const lesson=data.find(x=>x.id===id);
 if(!lesson)return;
 level.value='all';
 choose();
 weeks.value=id;
 show();
}
let selectedLevel=null;
const cachedOptions=new Map();
function choose(){
 const selected=level.value,previous=weeks.value;
 if(selected!==selectedLevel){
  if(!cachedOptions.has(selected)){
   const f=data.filter(x=>selected==='all'||x.level===selected);
   const fragment=document.createDocumentFragment();
   f.forEach(x=>{const option=document.createElement('option');option.value=x.id;option.textContent='Tuần '+x.week+' · '+x.skillName+' · '+x.title;fragment.append(option)});
   cachedOptions.set(selected,fragment.cloneNode(true));
  }
  weeks.replaceChildren(cachedOptions.get(selected).cloneNode(true));
  selectedLevel=selected;
 }
 if([...weeks.options].some(x=>x.value===previous))weeks.value=previous;
 show();
}
let lastDrawnId=null;
function show(){const x=get();if(!x){detail.textContent='Chưa tải được giáo án. Vui lòng tải lại trang khi có mạng.';return}
resumedId=x.id;
try{localStorage.setItem(selectionKey,x.id)}catch(_){}
refreshLearning();
if(lastDrawnId===x.id){score.value=records[x.id]?.score??x.assessment.target;return}
lastDrawnId=x.id;
const court=x.advanced?(window.PICKLEUP_ADVANCED_COURT?window.PICKLEUP_ADVANCED_COURT(x):''):(window.PICKLEUP_COURT?window.PICKLEUP_COURT(x):'');
detail.innerHTML='<h3>Tuần '+x.week+' · '+esc(x.title)+'</h3><p class="sub">Cấp độ '+esc(x.level)+' · '+esc(x.goal)+'</p><p class="sub"><b>Chuẩn bị:</b> '+esc(x.setup||'Hai người chơi, bóng và sân.')+'</p>'+court+'<p class="sub"><b>Vùng mục tiêu:</b> '+esc(x.zone||'Trong sân đối phương')+' · Vùng tô sáng là minh họa kỹ năng; thực hiện theo hướng dẫn và quy tắc sân thực tế.</p><div class="block"><div class="minute">10<small>phút</small></div><div><h4>Khởi động</h4><p>Di chuyển nhẹ, xoay khớp và đánh bóng làm quen.</p></div></div>'+x.drills.map((d,i)=>'<div class="block"><div class="minute">'+d.minutes+'<small>phút</small></div><div><h4>Bài '+(i+1)+': '+esc(d.name)+'</h4><p>'+esc(d.instruction)+'</p><em>'+esc(d.check)+'</em></div></div>').join('')+'<div class="block"><div class="minute">6<small>phút</small></div><div><h4>Kiểm tra</h4><p>'+esc(x.assessment.instruction)+' Mục tiêu tham khảo: '+x.assessment.target+'/20.</p></div></div><div class="block"><div class="minute">5<small>phút</small></div><div><h4>Thả lỏng</h4><p>Đi bộ nhẹ, thả lỏng vai và chân, uống nước.</p></div></div><h4>Cần tránh</h4><ul class="noteList">'+x.mistakes.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul><h4>Điểm cần nhớ</h4><ul class="noteList">'+(x.cues||[]).map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul><p class="sub">Giáo án và ngưỡng kiểm tra là tham khảo; xếp hạng 3.0/4.0 cần kiểm chứng trong thi đấu thực tế.</p>';
score.value=records[x.id]?.score??x.assessment.target;status.textContent=records[x.id]?'Đã lưu: '+records[x.id].score+'/20 vào '+new Date(records[x.id].date).toLocaleDateString('vi-VN'):''}
level.addEventListener('change',choose);weeks.addEventListener('change',show);
document.getElementById('academyResume').addEventListener('click',()=>{if(resumedId)visitLesson(resumedId)});
document.getElementById('academyNext').addEventListener('click',()=>{
 const complete=completedIds();
 const next=data.find(x=>!complete.has(x.id));
 if(next)visitLesson(next.id);
});
document.getElementById('academySave').addEventListener('click',()=>{const x=get(),v=Number(score.value);if(!x||!Number.isInteger(v)||v<0||v>20){status.textContent='Hãy nhập số nguyên từ 0 đến 20.';return}records[x.id]={score:v,date:new Date().toISOString(),skill:x.skill,level:x.level};lastDrawnId=null;try{localStorage.setItem('pickleup_academy_v2',JSON.stringify(records));document.dispatchEvent(new Event('pickleup:score-saved'));refreshLearning();status.textContent='Đã lưu '+v+'/20 · '+(v>=x.assessment.target?'Đạt mục tiêu tuần này.':'Tiếp tục luyện kỹ thuật tuần này.')}catch(e){status.textContent='Không lưu được; hãy kiểm tra quyền lưu trữ trình duyệt.'}});
choose();
if(resumedId&&data.some(x=>x.id===resumedId))visitLesson(resumedId);
refreshLearning();
})();
