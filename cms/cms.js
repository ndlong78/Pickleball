/* PickleUp CMS: edit Academy lessons locally and export curriculum.js.
   No network writes: publishing is a GitHub upload + pull request with CI. */
(function(){
'use strict';
const core=window.PICKLEUP_CONTENT;
const DRAFT='pickleupcms_draft_v1';
const ANGLES={back:'Sau lưng',side:'Bên hông',top:'Trên cao',front:'Phía trước'};
const $=id=>document.getElementById(id);
let base=null,work=null,selected=null,lastErrors=[];
const clone=v=>JSON.parse(JSON.stringify(v));
const find=(doc,id)=>doc.lessons.find(l=>l.id===id);
function setStatus(message){$('status').textContent=message}
function readDraft(){try{const d=JSON.parse(localStorage.getItem(DRAFT)||'null');return d&&d.doc&&Array.isArray(d.doc.lessons)?d:null}catch(_){return null}}
function saveDraft(){try{localStorage.setItem(DRAFT,JSON.stringify({savedAt:new Date().toISOString(),doc:work}))}catch(_){setStatus('Không lưu được bản nháp trên trình duyệt này; hãy tải tệp về thường xuyên.')}}
function clearDraft(){try{localStorage.removeItem(DRAFT)}catch(_){}}
function changedIds(){return work.lessons.filter(l=>{const b=find(base,l.id);return !b||core.canonical(b)!==core.canonical(l)}).map(l=>l.id)}
function load(doc,{fromDraft=false}={}){
 base=doc;work=clone(doc);selected=null;
 const levels=[...new Set(base.lessons.map(l=>l.level))];
 const select=$('filterLevel');select.replaceChildren(new Option('Tất cả',''),...levels.map(l=>new Option(l,l)));
 if(!fromDraft){const draft=readDraft();if(draft&&core.canonical(draft.doc)!==core.canonical(base)){$('draftText').textContent='Có bản nháp chưa xuất lưu lúc '+new Date(draft.savedAt).toLocaleString('vi-VN')+'.';$('draftBanner').hidden=false}}
 refresh();
}
async function fetchSource(){
 setStatus('Đang tải nội dung…');
 try{
  const res=await fetch('../curriculum.js?cms='+Date.now(),{cache:'no-store'});
  if(!res.ok)throw new Error('HTTP '+res.status);
  load(core.parseCurriculum(await res.text()));
  setStatus('Đã tải '+base.lessons.length+' bài từ trang.');
 }catch(error){setStatus('Không tải được nội dung: '+error.message+'. Có thể mở tệp curriculum.js từ máy.')}
}
function lessonLabel(l){return l.id+' · '+l.title}
function renderList(){
 const level=$('filterLevel').value,q=$('filterText').value.trim().toLowerCase(),changed=new Set(changedIds());
 const errored=new Set(lastErrors.map(e=>e.split(':')[0]));
 const items=work.lessons.filter(l=>(!level||l.level===level)&&(!q||lessonLabel(l).toLowerCase().includes(q)||String(l.skill).includes(q)));
 $('lessonList').replaceChildren(...items.map(l=>{
  const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.dataset.id=l.id;
  b.setAttribute('aria-current',String(l.id===selected));b.textContent=lessonLabel(l);
  const add=(textValue,cls)=>{const s=document.createElement('span');s.className='badge'+(cls?' '+cls:'');s.textContent=textValue;b.append(s)};
  if(Array.isArray(l.media)&&l.media.length)add('🎬 '+l.media.length);
  if(l.status!=='published')add(l.status);
  if(changed.has(l.id))add('đã sửa','changed');
  if(errored.has(l.id))add('lỗi','error');
  li.append(b);return li;
 }));
}
function drillRow(d,i){
 const box=document.createElement('div');box.className='drill';
 const title=document.createElement('strong');title.textContent='Drill '+(i+1)+' · '+d.minutes+' phút 🔒';box.append(title);
 for(const [key,label,area] of [['name','Tên bài drill',false],['instruction','Hướng dẫn',true],['check','Cách tự kiểm tra',false]]){
  const l=document.createElement('label');l.textContent=label;
  const input=document.createElement(area?'textarea':'input');input.value=d[key];input.dataset.drill=String(i);input.dataset.key=key;
  l.append(input);box.append(l);
 }
 return box;
}
function videoRow(m,i){
 const box=document.createElement('div');box.className='video';box.dataset.video=String(i);
 const link=document.createElement('label');link.textContent='Link hoặc ID YouTube';
 const url=document.createElement('input');url.dataset.vkey='url';url.value=m.id||'';url.placeholder='https://youtu.be/…';link.append(url);
 const grid=document.createElement('div');grid.className='grid2';
 const angleL=document.createElement('label');angleL.textContent='Góc quay';
 const angle=document.createElement('select');angle.dataset.vkey='angle';
 for(const [k,v] of Object.entries(ANGLES))angle.append(new Option(v,k));angle.value=m.angle||'back';angleL.append(angle);
 const titleL=document.createElement('label');titleL.textContent='Ghi chú ngắn (tùy chọn)';
 const title=document.createElement('input');title.dataset.vkey='title';title.maxLength=120;title.value=m.title||'';titleL.append(title);
 const startL=document.createElement('label');startL.textContent='Bắt đầu ở giây (tùy chọn)';
 const start=document.createElement('input');start.type='number';start.min='0';start.dataset.vkey='start';start.value=m.start??'';startL.append(start);
 const endL=document.createElement('label');endL.textContent='Kết thúc ở giây (tùy chọn)';
 const end=document.createElement('input');end.type='number';end.min='1';end.dataset.vkey='end';end.value=m.end??'';endL.append(end);
 grid.append(angleL,titleL,startL,endL);
 const row=document.createElement('div');row.className='row';
 const remove=document.createElement('button');remove.type='button';remove.textContent='Xóa video';remove.dataset.removeVideo=String(i);
 row.append(remove);
 if(core.youtubeId(m.id)){const a=document.createElement('a');a.href='https://youtu.be/'+m.id;a.target='_blank';a.rel='noopener';a.textContent='Xem thử trên YouTube';row.append(a)}
 box.append(link,grid,row);return box;
}
function renderEditor(){
 const l=selected&&find(work,selected);
 $('editor').hidden=!l;$('editorEmpty').hidden=!!l;if(!l)return;
 $('lessonMeta').textContent=l.id+' · '+l.level+' · '+l.skillName+' · revision '+l.revision+' · phiên bản đề '+l.assessmentVersion;
 for(const el of document.querySelectorAll('[data-field]')){const key=el.dataset.field;el.value=key==='mistakes'?l.mistakes.join('\n'):l[key]}
 for(const el of document.querySelectorAll('[data-cue]'))el.value=l.cues[Number(el.dataset.cue)]||'';
 $('f-zone').value=l.zone;$('f-assessment').value=l.assessment.instruction;$('f-target').value=String(l.assessment.target);
 $('drills').replaceChildren(...l.drills.map(drillRow));
 $('videos').replaceChildren(...(l.media||[]).map(videoRow));
}
function readForm(l){
 const next=clone(l);
 for(const el of document.querySelectorAll('[data-field]')){const key=el.dataset.field;next[key]=key==='mistakes'?el.value.split('\n').map(s=>s.trim()).filter(Boolean):el.value}
 next.cues=[...document.querySelectorAll('[data-cue]')].map(el=>el.value);
 for(const el of document.querySelectorAll('[data-drill]'))next.drills[Number(el.dataset.drill)][el.dataset.key]=el.value;
 next.media=[...document.querySelectorAll('[data-video]')].map(box=>{
  const get=k=>box.querySelector('[data-vkey="'+k+'"]').value.trim();
  const raw=get('url'),id=core.youtubeId(raw)||raw,m={kind:'youtube',id,angle:get('angle')};
  const title=get('title'),start=get('start'),end=get('end');
  if(title)m.title=title;if(start!=='')m.start=Number(start);if(end!=='')m.end=Number(end);
  return m;
 });
 return next;
}
function onEdit(){
 const i=work.lessons.findIndex(l=>l.id===selected);if(i<0)return;
 const original=find(base,selected)||work.lessons[i];
 work.lessons[i]=core.applyEdit(original,readForm(work.lessons[i]));
 saveDraft();refresh(false);
}
function refresh(redraw=true){
 lastErrors=core.validate(work,{previous:base});
 $('errors').replaceChildren(...lastErrors.slice(0,30).map(e=>{const li=document.createElement('li');li.textContent=e;return li}));
 const changed=changedIds();
 $('changeSummary').textContent=changed.length?'Đã sửa '+changed.length+' bài: '+changed.join(', ')+(lastErrors.length?'. Còn '+lastErrors.length+' lỗi cần sửa trước khi xuất.':'. Sẵn sàng xuất.'):'Chưa có thay đổi.';
 $('download').disabled=$('copy').disabled=!changed.length||lastErrors.length>0;
 renderList();if(redraw)renderEditor();
}
$('lessonList').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(!b)return;selected=b.dataset.id;refresh()});
$('filterLevel').addEventListener('change',()=>renderList());
$('filterText').addEventListener('input',()=>renderList());
$('editor').addEventListener('input',onEdit);
$('editor').addEventListener('change',onEdit);
$('editor').addEventListener('submit',e=>e.preventDefault());
$('addVideo').addEventListener('click',()=>{const l=find(work,selected);if(!l)return;$('videos').append(videoRow({kind:'youtube',id:'',angle:'back'},(l.media||[]).length));onEdit();renderEditor()});
$('videos').addEventListener('click',e=>{const b=e.target.closest('[data-remove-video]');if(!b)return;b.closest('[data-video]').remove();onEdit();renderEditor()});
$('reload').addEventListener('click',fetchSource);
$('openFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{load(core.parseCurriculum(await file.text()));setStatus('Đã mở '+file.name+'.')}catch(error){setStatus('Tệp không hợp lệ: '+error.message)}finally{e.target.value=''}});
$('draftRestore').addEventListener('click',()=>{const d=readDraft();if(!d)return;work=clone(d.doc);$('draftBanner').hidden=true;setStatus('Đã khôi phục bản nháp.');refresh()});
$('draftDiscard').addEventListener('click',()=>{clearDraft();$('draftBanner').hidden=true;setStatus('Đã bỏ bản nháp.')});
function exportText(){return core.renderCurriculum(work)}
$('download').addEventListener('click',()=>{
 if(lastErrors.length)return;
 const url=URL.createObjectURL(new Blob([exportText()],{type:'text/javascript'})),a=document.createElement('a');
 a.href=url;a.download='curriculum.js';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 setStatus('Đã tải curriculum.js. Làm tiếp các bước tải lên GitHub bên dưới.');
});
$('copy').addEventListener('click',async()=>{if(lastErrors.length)return;try{await navigator.clipboard.writeText(exportText());setStatus('Đã sao chép toàn bộ nội dung curriculum.js.')}catch(_){setStatus('Không sao chép được; hãy dùng nút tải tệp.')}});
if(!core){setStatus('Thiếu modules/content-core.js.');return}
fetchSource();
})();
