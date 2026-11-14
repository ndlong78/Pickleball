(function(){
const data=window.PICKLEUP_CURRICULUM||[];
const level=document.getElementById('academyLevel'),weeks=document.getElementById('academyWeek'),detail=document.getElementById('academyDetail'),score=document.getElementById('academyScore'),status=document.getElementById('academyStatus');
window.PICKLEUP_FILL_LEVELS?.(level);
{const heading=document.querySelector('#academy .sectionHead h2'),range=window.PICKLEUP_LESSON_RANGE;if(heading&&range&&data.length)heading.textContent=data.length+' buổi tập từ '+range.replace('–',' đến ')}
const activity=window.PICKLEUP_ACTIVITY,plans=window.PICKLEUP_PLANS;
const privatePractice=()=>plans?.isAccount()||activity?.isAccount();
const practice=window.PICKLEUP_ACADEMY_PRACTICE;
let practiceFocus=null;
let seedGuest=true,planToken=plans?.token(),remembering=false,selectionId=plans?.academySelection().id;
function scoreUnavailable(){return activity?.isAccount()&&(activity.getView().mode!=="account"||plans?.isAccount()&&plans.getState().owner!==activity.getView().owner)}
let records={};try{records=activity?activity.records():JSON.parse(localStorage.getItem('pickleup_academy_v2')||'{}')}catch(e){}
const trends=window.PICKLEUP_ACADEMY_TRENDS;
const historyKey='pickleup_academy_history_v44';
let history=[];try{history=activity?activity.history():trends.readHistory(localStorage.getItem(historyKey))}catch(_){}
let dirty=false,saving=false,formLesson=null,sourceToken=activity?.token(),historyPage=0,feedbackVersion=null;
// Focus/tab reads of the same cache must preserve feedback; a new revision invalidates it.
function statusVersion(){const cursor=activity?.getState().snapshot?.cursor;return cursor?cursor.epoch+':'+cursor.localVersion:null}
function feedback(text){status.textContent=text;feedbackVersion=statusVersion()}
score.addEventListener('input',()=>{dirty=true});
function paintScore(){
 const x=get();if(!x)return;
 if(scoreUnavailable()){score.value='';status.textContent=activity.notice();return}
 // C1: a guest score from an earlier assessment version is shown as such and never pre-fills the new test.
 const oldTest=!!records[x.id]&&!trends.sameAssessment(records[x.id],x);
 if(!dirty)score.value=oldTest?x.assessment.target:records[x.id]?.score??x.assessment.target;
 if(!dirty&&!saving&&(feedbackVersion===null||feedbackVersion!==statusVersion())){feedbackVersion=null;status.textContent=records[x.id]?(activity?.isAccount()?'Kho tài khoản · ':'Đã lưu: ')+records[x.id].score+'/20 · '+new Date(records[x.id].date).toLocaleDateString('vi-VN')+(oldTest?' · theo đề kiểm tra cũ':'')+(records[x.id].pending?' · chờ đồng bộ':''):''}
}
function controls(){
 const blocked=saving||scoreUnavailable()||activity&&!activity.canWrite();
 document.getElementById('academyRemember').disabled=remembering||!!plans&&!plans.canSelectLesson();level.disabled=weeks.disabled=remembering;score.disabled=!!blocked;document.getElementById('academySave').disabled=!!blocked;
 document.getElementById('academyConditions').hidden=!activity?.isAccount();for(const id of ['academyFeed','academyPace','academyTarget'])document.getElementById(id).disabled=!!blocked;
}
function renderAttempts(){
 const host=document.getElementById('academyAccountHistory');host.hidden=!activity?.isAccount();if(host.hidden){document.getElementById('academyAttemptList').replaceChildren();return}
 if(activity.getView().mode!=='account'){document.getElementById('academyAttemptList').replaceChildren();document.getElementById('academyHistoryCount').textContent=activity.notice();document.getElementById('academyHistoryPage').textContent='Chưa đọc được lịch sử';document.getElementById('academyHistoryPrev').disabled=true;document.getElementById('academyHistoryNext').disabled=true;return}
 const snapshot=activity.getState().snapshot,byId=new Map((snapshot?.records||[]).map(r=>[r.kind+':'+r.id,r]));
 const events=activity.events(),total=events.length,pages=Math.max(1,Math.ceil(total/20));historyPage=Math.min(historyPage,pages-1);
 document.getElementById('academyHistoryCount').textContent=total+' lượt đang lưu trong cache tài khoản · không cắt lịch sử theo giới hạn 500 lượt của kho cũ.';
 document.getElementById('academyHistoryPage').textContent='Trang '+(historyPage+1)+'/'+pages;
 document.getElementById('academyHistoryPrev').disabled=historyPage===0;document.getElementById('academyHistoryNext').disabled=historyPage===pages-1;
 const list=document.getElementById('academyAttemptList'),fragment=document.createDocumentFragment();
 for(const event of events.slice(historyPage*20,(historyPage+1)*20)){
  const item=document.createElement('li'),text=document.createElement('p'),button=document.createElement('button');
  const when=event.occurred_at===null?'Chưa rõ ngày':new Date(event.occurred_at).toLocaleString('vi-VN');
  const conditions=event.conditions?['Nguồn bóng: '+({partner:'người hỗ trợ',machine:'máy',rally:'đánh qua lại'})[event.conditions.feed],'nhịp '+({slow:'chậm',moderate:'vừa',match:'thi đấu'})[event.conditions.pace],'mục tiêu '+({wide:'rộng',standard:'thường',narrow:'hẹp'})[event.conditions.target]].join(' · '):'Điều kiện chưa rõ';
  text.textContent=event.lesson_id+' · '+event.lesson_snapshot.title+' · '+event.score+'/20 · '+when+' · '+conditions+(event.pending?' · chờ đồng bộ':'')+(event.occurred_at&&Date.parse(event.occurred_at)>Date.now()?' · ngày tương lai, chưa dùng để phân tích':'');
  button.type='button';button.textContent='Xóa lượt này';button.setAttribute('aria-label','Xóa lượt '+event.lesson_id+' '+event.score+'/20 · '+when);const row=byId.get('academy_attempts:'+event.id);button.disabled=saving||!activity.canWrite()||!row||row.reviewRequired;
  const renderedToken=activity.token();button.addEventListener('click',async()=>{
   if(saving||renderedToken!==activity.token())return;
   if(!confirm('Xóa riêng lượt kiểm tra này? Thay đổi sẽ chờ đồng bộ; sự kiện đã xóa không có thao tác khôi phục.'))return;
   if(renderedToken!==activity.token())return;
   const stamp=renderedToken,selectionStamp=plans?.token();saving=true;feedbackVersion=null;controls();button.disabled=true;
   try{await activity.deleteAttempt(event.id,row.localRevision);if(stamp===activity.token()&&selectionStamp===plans?.token())feedback('Đã lưu thao tác xóa trên thiết bị · chờ đồng bộ.')}
   catch(_){if(stamp===activity.token()&&selectionStamp===plans?.token())feedback('Chưa xóa được. Đọc lại hoặc xem mục cần xử lý trong Dữ liệu.')}
   finally{if(stamp===activity.token()&&selectionStamp===plans?.token()){saving=false;controls();renderAttempts()}}
  });item.append(text,button);fragment.append(item);
 }list.replaceChildren(fragment);
}
for(const [id,delta]of [['academyHistoryPrev',-1],['academyHistoryNext',1]])document.getElementById(id).addEventListener('click',()=>{historyPage+=delta;renderAttempts()});
document.addEventListener('pickleup:activity-data',()=>{
 const next=activity?.token();if(next!==sourceToken){sourceToken=next;resetPracticeSource();dirty=false;saving=false;feedbackVersion=null;status.textContent='';historyPage=0;const lesson=get();if(lesson)drawSteps(lesson);for(const id of ['academyFeed','academyPace','academyTarget'])document.getElementById(id).value=''}
 records=activity.records();history=activity.history();refreshLearning();paintScore();controls();renderAttempts();
});
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function get(){return data.find(x=>x.id===weeks.value)}
const selectionKey='pickleup_academy_last_lesson_v4';
let resumedId=null;
try{resumedId=plans?plans.academySelection().id:localStorage.getItem(selectionKey)}catch(_){}
function completedIds(){return new Set(Object.keys(records).filter(id=>data.some(x=>x.id===id)&&Number.isInteger(records[id]?.score)&&records[id].score>=0&&records[id].score<=20))}
function refreshLearning(){
 const complete=completedIds(),total=data.length;
 const progress=document.getElementById('academyProgressText'),resume=document.getElementById('academyResumeText'),next=document.getElementById('academyNext'),resumeButton=document.getElementById('academyResume');
 const unavailable=scoreUnavailable();
 progress.textContent=unavailable?'Chưa đọc được tiến độ tài khoản.':'Đã ghi kết quả '+complete.size+'/'+total+' bài học';
 const last=data.find(x=>x.id===resumedId);
 resume.textContent=plans?.isAccount()&&['loading','error','needs_review','deleted'].includes(plans.academySelection().status)?plans.selectionNotice():last?'Bài gần nhất: Tuần '+last.week+' · '+last.title:'Bạn chưa chọn bài học trước đó.';
 resumeButton.disabled=!last;
 next.disabled=unavailable||complete.size>=total;
 updateRecommendation();
}
function recommendedLesson(){
 const scope=level.value==='all'?(get()?.level||'all'):level.value;
 return trends.recommend(data,records,history,scope);
}
function updateRecommendation(){
 if(scoreUnavailable()){document.getElementById('academyRecommendReason').textContent=activity.notice();document.getElementById('academyTrendText').textContent='Chưa có nguồn để phân tích.';document.getElementById('academyRecommendLesson').textContent='Chưa đọc được kết quả.';document.getElementById('academyRecommendOpen').disabled=true;return}
 const result=recommendedLesson();
 document.getElementById('academyRecommendReason').textContent=result.reason;
 document.getElementById('academyTrendText').textContent=result.trend;
 document.getElementById('academyRecommendLesson').textContent=result.lesson?'Tuần '+result.lesson.week+' · '+result.lesson.title:'Chưa có giáo án.';
 document.getElementById('academyRecommendOpen').disabled=!result.lesson;
}
document.getElementById('academyRecommendOpen').addEventListener('click',()=>{const x=recommendedLesson().lesson;if(x)visitLesson(x.id)});
function visitLesson(id,persist=true){
 const lesson=data.find(x=>x.id===id);
 if(!lesson)return;
 level.value='all';
 choose();
 weeks.value=id;
 show(persist);
}
document.addEventListener('pickleup:academy-request-lesson',event=>{const {id,sourceToken,persisted}=event.detail||{};if(sourceToken!==undefined&&sourceToken!==plans?.token())return;if(data.some(x=>x.id===id))visitLesson(id,!persisted)});
const stepsKey='pickleup_academy_steps_v41';
let stepRecords={};
function readPractice(key){if(privatePractice())return {};try{const v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(_){return {}}}
stepRecords=readPractice(stepsKey);
const focusKey='pickleup_academy_focus_v42';
let focusPositions=readPractice(focusKey);
let focusEnabled=false;
let focusTimer=null,timerInterval=null;
function stageSeconds(x){const i=currentFocusIndex(x);return (i===0?10:i===4?6:i===5?5:Math.max(1,Number(x.drills[i-1]?.minutes)||10))*60}
function formatClock(n){const sec=Math.max(0,Math.ceil(n));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function stopTick(){if(timerInterval!==null){clearInterval(timerInterval);timerInterval=null}}
function pauseTimer(){if(!focusTimer)return;focusTimer.remaining=remainingSeconds();focusTimer.endsAt=null;stopTick()}
function remainingSeconds(){return focusTimer?.endsAt===null?focusTimer.remaining:Math.max(0,Math.ceil((focusTimer.endsAt-Date.now())/1000))}
function timerView(){
 const x=get();if(!x)return;
 const remaining=focusTimer?remainingSeconds():stageSeconds(x);
 if(focusTimer&&remaining===0&&focusTimer.endsAt!==null){focusTimer.remaining=0;focusTimer.endsAt=null;stopTick()}
 document.getElementById('academyTimerClock').textContent=formatClock(remaining);
 document.getElementById('academyTimerStart').textContent=focusTimer?.endsAt!==null&&focusTimer?'Tạm dừng':remaining===0?'Đã hết giờ':'Bắt đầu';
 document.getElementById('academyTimerStart').disabled=remaining===0;
 document.getElementById('academyTimerStatus').textContent=remaining===0?'Đã hết thời gian. Xác nhận hoàn thành hoặc chuyển bước khi sẵn sàng.':focusTimer?.endsAt!==null&&focusTimer?'Đang đếm ngược':'Đồng hồ đang dừng.';
}
function resetTimer(){stopTick();const x=get();focusTimer=x?{lessonId:x.id,remaining:stageSeconds(x),endsAt:null}:null;timerView()}
document.getElementById('academyTimerStart').addEventListener('click',()=>{
 const x=get();if(!x)return;
 if(!focusTimer)resetTimer();
 if(focusTimer.endsAt!==null)pauseTimer();
 else if(focusTimer.remaining>0){focusTimer.endsAt=Date.now()+focusTimer.remaining*1000;timerInterval=setInterval(timerView,250)}
 timerView();
});
document.getElementById('academyTimerReset').addEventListener('click',resetTimer);

function lessonSteps(x){return [{title:'Khởi động · 10 phút',description:'Di chuyển nhẹ, làm nóng khớp và làm quen bóng.'},...x.drills.map((d,i)=>({title:'Bài '+(i+1)+' · '+d.name+' · '+d.minutes+' phút',description:d.instruction})),{title:'Kiểm tra · 6 phút',description:x.assessment.instruction},{title:'Thả lỏng · 5 phút',description:'Đi bộ nhẹ, giãn cơ thoải mái và bổ sung nước.'}]}
function currentFocusIndex(x){const i=focusPositions[x.id];return Number.isInteger(i)?Math.max(0,Math.min(5,i)):0}
function showFocus(x){
 const panel=document.getElementById('academyFocusPanel'),button=document.getElementById('academyFocusToggle');
 panel.hidden=!focusEnabled;button.setAttribute('aria-pressed',String(focusEnabled));button.textContent=focusEnabled?'Thoát tập trung':'Bật tập trung';
 if(!x)return;
 const steps=lessonSteps(x),i=currentFocusIndex(x),step=steps[i],done=(stepRecords[x.id]||[]).includes(i);
 document.getElementById('academyFocusPosition').textContent='Bước '+(i+1)+'/6';
 document.getElementById('academyFocusTitle').textContent=step.title;
 document.getElementById('academyFocusGuide').textContent=step.description;
 document.getElementById('academyFocusStatus').textContent=focusEnabled?'Đang tập bước '+(i+1)+'/6 · '+(done?'Đã đánh dấu':'Chưa đánh dấu'):'Mỗi lần tập trung vào một bước.';
 document.getElementById('academyFocusPrev').disabled=i===0;
 document.getElementById('academyFocusNext').disabled=i===5;
 document.getElementById('academyFocusDone').textContent=done?'Bỏ đánh dấu':'Đánh dấu đã tập';
 timerView();practiceControls();
}
function moveFocus(delta){const x=get();if(!x)return;const index=Math.max(0,Math.min(5,currentFocusIndex(x)+delta));if(privatePractice()){practice?.edit({lessonId:x.id,action:'focus',index});return}stopTick();focusTimer=null;focusPositions[x.id]=index;try{localStorage.setItem(focusKey,JSON.stringify(focusPositions))}catch(_){}showFocus(x)}
document.getElementById('academyFocusToggle').addEventListener('click',()=>{if(focusEnabled)pauseTimer();focusEnabled=!focusEnabled;showFocus(get())});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&focusTimer?.endsAt!==null){pauseTimer();timerView()}});
document.getElementById('academyFocusPrev').addEventListener('click',()=>moveFocus(-1));
document.getElementById('academyFocusNext').addEventListener('click',()=>moveFocus(1));
document.getElementById('academyFocusDone').addEventListener('click',()=>{
 const x=get();if(!x)return;
 const i=currentFocusIndex(x),done=new Set(Array.isArray(stepRecords[x.id])?stepRecords[x.id]:[]);
 if(privatePractice()){practice?.edit({lessonId:x.id,action:'check',index:i,checked:!done.has(i)});return}
 if(done.has(i))done.delete(i);else done.add(i);
 stepRecords[x.id]=[...done].sort((a,b)=>a-b);
 try{if(!privatePractice())localStorage.setItem(stepsKey,JSON.stringify(stepRecords))}catch(_){}
 drawSteps(x);
});
function drawSteps(x){
 const list=document.getElementById('academyStepList'),hint=document.getElementById('academyStepsStatus');
 const steps=[{title:'Khởi động · 10 phút',description:'Di chuyển nhẹ, làm nóng khớp và làm quen bóng.'},...x.drills.map((d,i)=>({title:'Bài '+(i+1)+' · '+d.name+' · '+d.minutes+' phút',description:d.instruction})),{title:'Kiểm tra · 6 phút',description:x.assessment.instruction},{title:'Thả lỏng · 5 phút',description:'Đi bộ nhẹ, giãn cơ thoải mái và bổ sung nước.'}];
 const stored=Array.isArray(stepRecords[x.id])?stepRecords[x.id]:[];
 const finished=new Set(stored.filter(n=>Number.isInteger(n)&&n>=0&&n<steps.length));
 if(list.dataset.lesson===x.id&&list.querySelectorAll('input[data-step]').length===steps.length){
  for(const input of list.querySelectorAll('input[data-step]')){
   if(!practice?.getState().busy)input.checked=finished.has(Number(input.dataset.step));
   input.disabled=!!privatePractice()&&!practice?.canEdit();
  }
 }else{
 const fragment=document.createDocumentFragment();
 steps.forEach((step,i)=>{
  const label=document.createElement('label');label.className='academy-step';
  const input=document.createElement('input');input.type='checkbox';input.checked=finished.has(i);input.dataset.step=String(i);
  input.disabled=!!privatePractice()&&!practice?.canEdit();
  const copy=document.createElement('span'),title=document.createElement('strong'),desc=document.createElement('span');
  title.textContent=step.title;desc.textContent=step.description;copy.append(title,desc);label.append(input,copy);fragment.append(label);
 });
 list.replaceChildren(fragment);
 list.dataset.lesson=x.id;
 }
 hint.textContent='Đã thực hiện '+finished.size+'/'+steps.length+' bước · Không thay thế điểm kiểm tra 20 lượt.';
 showFocus(x);
 practiceControls();
}
document.getElementById('academyStepList').addEventListener('change',event=>{
 const input=event.target;if(!input.matches('input[data-step]'))return;
 const x=get();if(!x)return;
 const done=new Set(Array.isArray(stepRecords[x.id])?stepRecords[x.id]:[]);
 const index=Number(input.dataset.step);
 if(privatePractice()){practice?.edit({lessonId:x.id,action:'check',index,checked:input.checked});drawSteps(x);return}
 if(input.checked)done.add(index);else done.delete(index);
 stepRecords[x.id]=[...done].sort((a,b)=>a-b);
 try{if(!privatePractice())localStorage.setItem(stepsKey,JSON.stringify(stepRecords))}catch(_){}
 drawSteps(x);
});
document.getElementById('academyResetSteps').addEventListener('click',()=>{
 const x=get();if(!x)return;
 if(privatePractice()){practice?.edit({lessonId:x.id,action:'reset'});return}
 delete stepRecords[x.id];try{if(!privatePractice())localStorage.setItem(stepsKey,JSON.stringify(stepRecords))}catch(_){}
 drawSteps(x);
});
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
 if([...weeks.options].some(x=>x.value===previous))weeks.value=previous;else weeks.value=weeks.options[0]?.value||'';
 show();
}
let lastDrawnId=null;
// V5.20 progressive disclosure: layer 1 answers "how?" (diagram, three cues,
// one start action); layer 2 keeps rules, mistakes, setup and timeline one tap away.
// V5.21: coach videos are YouTube IDs from the CMS. Nothing loads from YouTube
// until the player taps play; the stored ID is re-validated before embedding.
const ANGLE_LABELS={back:'Sau lưng',side:'Bên hông',top:'Trên cao',front:'Phía trước'};
function videoMarkup(x){
 const content=window.PICKLEUP_CONTENT,list=(Array.isArray(x.media)?x.media:[]).filter(m=>content?.embedUrl(m));
 if(!list.length)return '';
 const tabs=list.length>1?'<div class="lesson-video-tabs" role="group" aria-label="Góc quay">'+list.map((m,i)=>'<button type="button" data-video-index="'+i+'" aria-pressed="'+(i===0)+'">'+esc(ANGLE_LABELS[m.angle]||m.angle)+'</button>').join('')+'</div>':'';
 return '<section class="lesson-video" data-lesson-video aria-label="Video hướng dẫn">'+tabs+'<div class="lesson-video-frame" data-video-frame>'+videoButton(list[0])+'</div><p class="sub">Video mở từ YouTube khi bấm xem; cần kết nối mạng.</p></section>';
}
function videoButton(m){return '<button type="button" class="lesson-video-play" data-video-play>▶ Xem video · '+esc(ANGLE_LABELS[m.angle]||m.angle)+(m.title?' · '+esc(m.title):'')+'</button>'}
function playableMedia(){const x=get();return (Array.isArray(x?.media)?x.media:[]).filter(m=>window.PICKLEUP_CONTENT?.embedUrl(m))}
detail.addEventListener('click',event=>{
 const section=event.target.closest?.('[data-lesson-video]');if(!section)return;
 const list=playableMedia(),frame=section.querySelector('[data-video-frame]');
 const tab=event.target.closest('[data-video-index]');
 if(tab){
  const i=Number(tab.dataset.videoIndex);if(!list[i])return;
  for(const b of section.querySelectorAll('[data-video-index]'))b.setAttribute('aria-pressed',String(b===tab));
  frame.dataset.index=String(i);frame.innerHTML=videoButton(list[i]);return;
 }
 if(!event.target.closest('[data-video-play]'))return;
 const media=list[Number(frame.dataset.index||0)],src=window.PICKLEUP_CONTENT?.embedUrl(media);if(!src)return;
 if(navigator.onLine===false){frame.querySelector('[data-video-play]').textContent='Đang offline · cần mạng để xem video';return}
 const iframe=document.createElement('iframe');
 iframe.src=src;iframe.title='Video hướng dẫn · '+(ANGLE_LABELS[media.angle]||media.angle);
 iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;
 iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.loading='lazy';
 frame.replaceChildren(iframe);
});
function lessonMarkup(x,court){
 const view=window.PICKLEUP_ACADEMY_LESSON?.summary(x)||{cues:x.cues||[],mistakes:x.mistakes||[],minutes:60,parts:6,rule:null};
 const block=(minutes,title,body,check)=>'<div class="block"><div class="minute">'+minutes+'<small>phút</small></div><div><h4>'+title+'</h4><p>'+body+'</p>'+(check?'<em>'+check+'</em>':'')+'</div></div>';
 const more=(key,summary,body,open)=>'<details class="lesson-more" data-lesson-more="'+key+'"'+(open?' open':'')+'><summary>'+summary+'</summary><div class="lesson-more-body">'+body+'</div></details>';
 const list=items=>'<ul class="noteList">'+items.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>';
 const timeline=block(10,'Khởi động','Di chuyển nhẹ, xoay khớp và đánh bóng làm quen.')
  +x.drills.map((d,i)=>block(d.minutes,'Bài '+(i+1)+': '+esc(d.name),esc(d.instruction),esc(d.check))).join('')
  +block(6,'Kiểm tra',esc(x.assessment.instruction)+' Mục tiêu tham khảo: '+x.assessment.target+'/20.')
  +block(5,'Thả lỏng','Đi bộ nhẹ, thả lỏng vai và chân, uống nước.');
 return '<header class="lesson-head"><p class="kicker">Cấp độ '+esc(x.level)+(x.skillName?' · '+esc(x.skillName):'')+'</p>'
  +'<h3>Tuần '+x.week+' · '+esc(x.title)+'</h3><p class="sub">'+esc(x.goal)+'</p>'
  +'<p class="lesson-meta"><span>⏱ '+view.minutes+' phút · '+view.parts+' phần</span><span>🎯 '+esc(x.zone||'Trong sân đối phương')+'</span></p></header>'
  +court
  +videoMarkup(x)
  +'<section class="lesson-cues" aria-label="Điểm cần nhớ"><h4>Điểm cần nhớ</h4><ol>'+view.cues.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ol></section>'
  +'<div class="lesson-cta"><button type="button" class="primary" data-lesson-start>▶ Bắt đầu tập</button>'
  +'<p class="sub">Mở đồng hồ từng bước. Chạy hết giờ hoặc đánh dấu bước không tự tính là buổi đã tập.</p></div>'
  +(view.rule?more('rule',esc(view.rule.title),list(view.rule.items)+'<p class="sub">Tóm tắt tham khảo; giải đấu có thể áp dụng luật địa phương.</p>',view.rule.open):'')
  +more('mistakes','Cần tránh ('+view.mistakes.length+')',list(view.mistakes),false)
  +more('setup','Chuẩn bị và vùng mục tiêu','<p><b>Chuẩn bị:</b> '+esc(x.setup||'Hai người chơi, bóng và sân.')+'</p><p class="sub"><b>Vùng mục tiêu:</b> '+esc(x.zone||'Trong sân đối phương')+' · Vùng tô sáng là minh họa kỹ năng; thực hiện theo hướng dẫn và quy tắc sân thực tế.</p>',false)
  +more('timeline','Lộ trình buổi '+view.minutes+' phút ('+view.parts+' phần)',timeline,false)
  +'<p class="sub">Giáo án và ngưỡng kiểm tra là tham khảo; xếp hạng 3.0/4.0 cần kiểm chứng trong thi đấu thực tế.</p>';
}
// The start action reuses the existing focus mode; it never saves or confirms anything.
detail.addEventListener('click',event=>{
 if(!event.target.closest?.('[data-lesson-start]'))return;
 const toggle=document.getElementById('academyFocusToggle'),focus=document.getElementById('academyFocus');
 if(toggle&&!toggle.disabled&&toggle.getAttribute('aria-pressed')!=='true')toggle.click();
 (focus||document.getElementById('academyStepList'))?.scrollIntoView({block:'start'});
 const start=document.getElementById('academyTimerStart');
 if(start&&!start.disabled&&start.offsetParent!==null)start.focus();else toggle?.focus();
});
function show(persistSelection=false){const x=get();if(!x){detail.textContent='Chưa tải được giáo án. Vui lòng tải lại trang khi có mạng.';return}
if(formLesson!==x.id){formLesson=x.id;dirty=false;feedbackVersion=null}
if(focusTimer&&focusTimer.lessonId!==x.id){stopTick();focusTimer=null}
if(!privatePractice()&&seedGuest){resumedId=x.id;try{if(plans)plans.rememberGuestLesson(x.id);else localStorage.setItem(selectionKey,x.id)}catch(_){}}
if(persistSelection)rememberLesson(x.id);
refreshLearning();
drawSteps(x);
if(lastDrawnId===x.id){paintScore();return}
lastDrawnId=x.id;
const court=x.advanced?(window.PICKLEUP_ADVANCED_COURT?window.PICKLEUP_ADVANCED_COURT(x):''):(window.PICKLEUP_COURT?window.PICKLEUP_COURT(x):'');
detail.innerHTML=lessonMarkup(x,court);
paintScore()}
level.addEventListener('change',()=>{choose();const x=get();if(x)rememberLesson(x.id)});weeks.addEventListener('change',()=>show(true));
document.getElementById('academyResume').addEventListener('click',()=>{if(resumedId)visitLesson(resumedId)});
document.getElementById('academyNext').addEventListener('click',()=>{
 const complete=completedIds();
 const next=data.find(x=>!complete.has(x.id));
 if(next)visitLesson(next.id);
});
document.getElementById('academySave').addEventListener('click',async()=>{
 if(saving)return;
 const x=get(),v=Number(score.value);
 if(!x||score.value.trim()===''||!Number.isInteger(v)||v<0||v>20){status.textContent='Hãy nhập số nguyên từ 0 đến 20.';return}
 if(activity&&!activity.canWrite()){status.textContent='Chưa thể lưu. Kiểm tra nguồn và kho tài khoản trong Dữ liệu.';return}
 if(activity?.isAccount()){
  const values=['academyFeed','academyPace','academyTarget'].map(id=>document.getElementById(id).value);
  if(values.some(Boolean)&&!values.every(Boolean)){status.textContent='Ghi đủ ba điều kiện hoặc để tất cả là chưa rõ.';return}
  const conditions=values.every(Boolean)?{feed:values[0],pace:values[1],target:values[2]}:null,stamp=activity.token(),selectionStamp=plans?.token();saving=true;feedbackVersion=null;controls();
  try{await activity.saveAttempt(x,v,conditions);if(stamp===activity.token()&&selectionStamp===plans?.token()&&get()?.id===x.id){dirty=false;feedback('Đã lưu '+v+'/20 trong kho tài khoản trên thiết bị · chờ đồng bộ. Không tự xác nhận buổi tập.')}}
  catch(error){if(stamp===activity.token()&&selectionStamp===plans?.token())feedback(error.code==='quota_exceeded'?'Không đủ dung lượng. Chưa xác nhận đã lưu; hãy xuất cache đang có.':'Chưa lưu được. Kiểm tra nguồn dữ liệu hoặc mục cần xử lý trong Dữ liệu.')}
  finally{if(stamp===activity.token()&&selectionStamp===plans?.token()){saving=false;controls();renderAttempts()}}
  return;
 }
 const date=new Date().toISOString(),nextRecord={score:v,date,skill:x.skill,level:x.level};
 if(Number.isInteger(x.assessmentVersion))nextRecord.av=trends.lessonVersion(x);
 try{
  localStorage.setItem('pickleup_academy_v2',JSON.stringify({...records,[x.id]:nextRecord}));
 }catch(_){status.textContent='Không lưu được điểm; hãy kiểm tra quyền lưu trữ trình duyệt.';return}
 records[x.id]=nextRecord;
 let historySaved=true;
 try{
  const next=trends.append(history,x,v,date);
  localStorage.setItem(historyKey,JSON.stringify(next));
  history=next;
 }catch(_){historySaved=false}
 lastDrawnId=null;
 document.dispatchEvent(new Event('pickleup:score-saved'));
 refreshLearning();
 status.textContent='Đã lưu '+v+'/20 · '+(v>=x.assessment.target?'Đạt mục tiêu tuần này.':'Tiếp tục luyện kỹ thuật tuần này.')+(historySaved?'':' Điểm đã lưu, nhưng lịch sử lần tập chưa lưu được.');
});
function resetPracticeSource(){
 practiceFocus=null;
 seedGuest=false;stopTick();focusTimer=null;focusEnabled=false;stepRecords=readPractice(stepsKey);focusPositions=readPractice(focusKey);dirty=false;saving=false;remembering=false;feedbackVersion=null;status.textContent='';
 for(const id of ['academyFeed','academyPace','academyTarget'])document.getElementById(id).value='';score.value='';
}
function practiceControls(){
 const blocked=!!privatePractice()&&!practice?.canEdit();
 for(const id of ['academyResetSteps','academyFocusDone'])document.getElementById(id).disabled=blocked;
 const x=get();document.getElementById('academyFocusPrev').disabled=blocked||!x||currentFocusIndex(x)===0;document.getElementById('academyFocusNext').disabled=blocked||!x||currentFocusIndex(x)===5;
 const notice=document.getElementById('academyPracticeStatus');if(notice)notice.textContent=practice?.notice()||'';
 const retry=document.getElementById('academyPracticeRetry');if(retry){const s=practice?.getState();retry.hidden=!privatePractice()||s?.mode==='account'&&!s.error;retry.disabled=!!s?.busy||s?.mode==='loading'||s?.mode==='unavailable'}
}
function acceptPractice(){
 const practiceState=practice?.getState();
 if(practiceState?.busy&&document.activeElement?.closest('#academyStepList, .academy-focus-controls'))practiceFocus=document.activeElement;
 if(privatePractice()){
  const s=practice?.getState(),lessons=s?.mode==='account'?s.row?.value.lessons||{}:{};
  const old=currentFocusIndex(get()||{});stepRecords=Object.fromEntries(Object.entries(lessons).map(([id,v])=>[id,v.checked]));focusPositions=Object.fromEntries(Object.entries(lessons).map(([id,v])=>[id,v.focus]));
  if(old!==currentFocusIndex(get()||{})){stopTick();focusTimer=null}
 }
 const x=get();if(x)drawSteps(x);else practiceControls();
 if(!practiceState?.busy&&practiceFocus){if(document.hasFocus()&&document.activeElement===document.body&&practiceFocus.isConnected&&!practiceFocus.disabled)practiceFocus.focus({preventScroll:true});practiceFocus=null}
}
document.addEventListener('pickleup:academy-practice-data',acceptPractice);
document.getElementById('academyPracticeRetry')?.addEventListener('click',()=>practice?.retry());
async function rememberLesson(id){
 if(remembering)return;const stamp=plans?.token();remembering=true;controls();
 try{if(plans)await plans.chooseLesson(id);else localStorage.setItem(selectionKey,id);if(stamp===plans?.token()){resumedId=id;selectionId=id;refreshLearning()}}
 catch(_){}finally{if(stamp===plans?.token()){remembering=false;controls()}}
}
document.getElementById('academyRemember').addEventListener('click',()=>{const x=get();if(x)rememberLesson(x.id)});
document.addEventListener('pickleup:plan-data',()=>{
 const next=plans?.token(),s=plans?.academySelection();if(!s)return;const changed=next!==planToken;
 if(changed){planToken=next;resetPracticeSource();level.value='all';selectionId=null;resumedId=null;weeks.value='';choose()}
 if(changed||s.id!==selectionId){selectionId=s.id;resumedId=s.id;if(s.id&&get()?.id!==s.id)visitLesson(s.id,false)}
 refreshLearning();paintScore();controls();
});
const initialLesson=resumedId;
choose();
if(initialLesson&&data.some(x=>x.id===initialLesson))visitLesson(initialLesson,false);
refreshLearning();
// The fragment can become visible before this lazy-loaded script arrives.
// Enable score editing only after initial values and save listeners are ready.
seedGuest=false;controls();renderAttempts();acceptPractice();
document.getElementById('academyFocusToggle').disabled=false;
})();
