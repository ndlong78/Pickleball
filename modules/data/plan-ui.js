(function(){
'use strict';
const host=document.getElementById('planPilot'),data=window.PICKLEUP_PLANS;if(!host||!data)return;
const $=s=>host.querySelector(s),status=$('[role=status]'),detail=$('[data-plan-detail]');
let running=false,action=null,serial=0,owner,token,selection=null;
const names={personal_plans:'Giáo án cá nhân',user_selections:'Lựa chọn giáo án và bài Học viện'};
const errors={plan_selected:"Bỏ chọn giáo án trước khi xóa; đồng bộ sẽ gửi bỏ chọn trước lệnh xóa.",dependency_changed:"Giáo án hoặc lựa chọn liên quan đã đổi; đọc lại và mở mục cần xử lý.",restore_requires_ack:"Chờ xác nhận xóa rồi mới khôi phục.",invalid_plan:"Dữ liệu giáo án cần kiểm tra; xuất cache và đọc lại.",network_error:'Lỗi mạng. Yêu cầu đang chờ được giữ nguyên.',offline:'Đang offline; thay đổi vẫn nằm trên thiết bị.',auth_required:'Đăng nhập lại đúng tài khoản để tiếp tục.',account_changed:'Tài khoản hoặc lựa chọn nguồn đã thay đổi; yêu cầu cũ giữ riêng.',consent_changed:'Lựa chọn nguồn đã thay đổi ở tab khác. Hãy kiểm tra lại.',busy:'Một tab hoặc thao tác khác đang đồng bộ. Thử lại sau.',retry_wait:'Chưa đến lượt thử lại. Chỉ bấm thử lại khi bạn muốn gửi tiếp.',needs_review:'Có giáo án cần xem và xử lý.',uncertain_operation:'Có yêu cầu đã gửi chưa rõ kết quả. Thử lại đúng yêu cầu trước khi quyết định.',local_conflict:'Dữ liệu đã đổi sau khi xem. Mở lại mục cần xử lý trước khi chọn.',epoch_review_required:'Hãy xác nhận đã xem lại dữ liệu sau khi tải lại tài khoản.',quota_exceeded:'Không đủ dung lượng. Chưa xác nhận đã lưu; hãy xuất cache đang có.',upgrade_required:'Cần cập nhật ứng dụng. Dữ liệu chờ vẫn được giữ.',invalid_plan:'Dữ liệu cần kiểm tra. Xuất cache và đọc lại; chưa chuyển sang kho khách.',append_only:'Không thể ghi đè hoặc khôi phục lượt đã tồn tại. Chọn bản tài khoản hoặc xuất cache.',credentials_forbidden:'Không xuất được cache có trường thông tin đăng nhập. Giữ dữ liệu và kiểm tra riêng.',pending:'Còn thay đổi chờ gửi. Bấm đồng bộ tiếp để xử lý lượt kế tiếp.'};
const message=code=>errors[code]||'Chưa thực hiện được. Hãy giữ cache và kiểm tra nguồn dữ liệu trong mục này.';
const node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el};
function render(){
 const s=data.getState(),nextToken=data.token(),changedOwner=owner!==s.owner;
 if(changedOwner){serial++;running=false;action=null;owner=s.owner}
 if(changedOwner||token!==nextToken){
  if(!changedOwner&&running&&!['enable','device'].includes(action)){serial++;running=false;action=null}
  token=nextToken;selection=null;detail.replaceChildren();$('[data-plan-consent]').checked=false;status.textContent=data.notice();
 }
 const configured=window.PICKLEUP_PLAN_CONFIG?.enabled===true&&window.PICKLEUP_AUTH_CONFIG?.enabled===true;
 $('[data-plan-body]').hidden=!configured;
 if(!configured){status.textContent='Kho giáo án pilot chưa bật. Chế độ khách vẫn dùng bình thường.';return}
 const consent=$('[data-plan-consent]');consent.disabled=running||s.busy||s.mode!=='guest';
 $('[data-plan-account]').textContent=s.owner?'Kho riêng của tài khoản đang đăng nhập · kiểm tra email trong mục Tài khoản.':'Đăng nhập để chọn kho giáo án.';
 $('[data-plan-enable]').disabled=running||s.busy||!s.owner||s.mode!=='guest'||!consent.checked;
 $('[data-plan-device]').disabled=!s.owner||!['account','error'].includes(s.mode);
 $('[data-plan-read]').disabled=running||s.busy||!s.owner||!['account','error'].includes(s.mode);
 for(const key of ['send','retry'])$('[data-plan-'+key+']').disabled=running||s.busy||s.mode!=='account'||!s.snapshot;
 $('[data-plan-export]').disabled=running||s.busy||!s.owner||!data.controller();
 const ops=s.snapshot?.outbox||[],pending=ops.filter(o=>['pending','sending','deferred'].includes(o.state)),uncertain=pending.filter(o=>o.state==='sending');
 $('[data-plan-retry]').hidden=!uncertain.length;
 $('[data-plan-count]').textContent=s.mode==='account'?pending.length+' giáo án chờ gửi · '+uncertain.length+' yêu cầu chưa rõ kết quả. Lưu trên thiết bị chưa có nghĩa đã đồng bộ.':'';
 $('[data-plan-clear]').disabled=running||s.busy||s.mode!=='account'||!s.snapshot;$('[data-plan-clear-lesson]').disabled=running||!data.canSelectLesson();const selected=s.snapshot?.records.find(r=>r.kind==='user_selections'&&r.id==='self');$('[data-plan-restore-selection]').hidden=!selected?.base?.deleted_at;$('[data-plan-restore-selection]').disabled=running||s.busy||!!selected?.tailOperationId||selected?.reviewRequired;manage(s);
 if(s.error)status.textContent=message(s.error);
 for(const input of detail.querySelectorAll('input,select'))input.disabled=running||s.busy;
 if(selection?.valid)selection.valid();
 const list=$('[data-plan-reviews]');list.replaceChildren();
 for(const row of s.snapshot?.records||[]){
  if(!row.reviewRequired&&!ops.some(op=>op.kind===row.kind&&op.id===row.id&&['blocked','conflict'].includes(op.state)))continue;
  const button=node('button','Xem cần xử lý · '+names[row.kind]);button.type='button';button.disabled=running||s.busy;
  button.addEventListener('click',()=>task('preview',async()=>{const view=await data.controller().previewReview(row.kind,row.id);return {view}}));list.append(button);
 }
}
async function task(type,work){
 if(running)return;running=true;action=type;const stamp=serial;render();
 status.textContent=({enable:'Đang đọc kho giáo án tài khoản…',device:'Đang chuyển về kho thiết bị…',read:'Đang đọc lại giáo án tài khoản…',sync:'Đang đồng bộ giáo án tài khoản…',preview:'Đang đọc dữ liệu cần xử lý…',resolve:'Đang lưu quyết định xử lý…',export:'Đang chuẩn bị tệp cache giáo án…'})[type]||'Đang xử lý giáo án…';
 try{
  const result=await work();if(stamp!==serial)return;
  if(result?.view)show(result.view);
  if(result?.artifact){const url=URL.createObjectURL(new Blob([JSON.stringify(result.artifact)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='pickleup-plan-cache.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  if(result?.message)status.textContent=result.message;
 }catch(error){if(stamp===serial)status.textContent=message(error.code)}
 finally{if(stamp===serial){running=false;action=null;render()}}
}
function summary(kind,value,deleted,related=[]){
 if(!value)return 'Chưa có dữ liệu.';if(deleted)return 'Đã xóa / muốn xóa giáo án hoặc lựa chọn này.';
 if(kind==='user_selections'){
  const lesson=(window.PICKLEUP_CURRICULUM||[]).find(x=>x.id===value.selected_academy_lesson_id),lessonText=lesson?'Học viện: '+lesson.id+' · '+lesson.title:value.selected_academy_lesson_id?'Học viện: '+value.selected_academy_lesson_id:'Không chọn bài Học viện';
  if(!value.selected_personal_plan_id)return lessonText+' · Không chọn giáo án cá nhân.';
  const target=related.find(r=>r.kind==='personal_plans'&&r.id===value.selected_personal_plan_id),plan=target?.overlay||target?.base;
  return lessonText+' · '+(plan?.plan_snapshot?'Chọn giáo án '+plan.level_band+' · '+new Date(plan.plan_snapshot.createdAt).toLocaleString('vi-VN')+' · '+plan.plan_snapshot.exercises.map(e=>e.name).join(' · ')+' · Điểm '+(plan.check_score??'chưa có')+'/20':'Giáo án cá nhân được chọn không có trong cache hiện tại; đọc lại kho trước khi quyết định.');
 }
 const p=value.plan_snapshot;return (p?value.level_band+' · '+p.exercises.map(e=>e.name).join(' · '):'Kết quả giáo án')+' · Điểm '+(value.check_score??'chưa có')+'/20'+(value.completed_at?' · '+new Date(value.completed_at).toLocaleString('vi-VN'):'');
}
function show(view){
 selection={view,owner,token:data.token(),operationId:crypto.randomUUID()};detail.replaceChildren();
 detail.append(node('h4','Xem và xử lý · '+names[view.record.kind]),node('p','So sánh toàn bộ bản ban đầu, ý định đang chờ và bản tài khoản. Bản chưa chọn và yêu cầu cũ vẫn giữ trong cache. Không tự hợp nhất hoặc ghi đè nội dung giáo án.'));
 const grid=node('div','');grid.className='sync-comparison';const original=view.record.reviewBase?.row||view.conflicts[0]?.originalBase?.row;
 for(const [label,value,deleted]of [['Ban đầu',original,!!original?.deleted_at],['Bạn muốn lưu',view.record.overlay,view.record.deleted],['Trên tài khoản',view.record.base,!!view.record.base?.deleted_at]]){const card=node('div','');card.append(node('strong',label),node('p',summary(view.record.kind,value,deleted,view.relatedRecords)));if(value?.plan_snapshot){const more=node('details','');more.append(node('summary','Xem nội dung và điểm đầu vào giáo án'),node('pre',JSON.stringify(value.plan_snapshot,null,2)));more.style.overflowWrap='anywhere';more.querySelector('pre').style.whiteSpace='pre-wrap';card.append(more)}grid.append(card)}detail.append(grid);
 const action=view.record.deleted?'delete':view.record.base?.deleted_at?'restore':'put',fields=view.record.kind==='user_selections'?['selected_personal_plan_id','selected_academy_lesson_id']:view.record.base?['check_score','completed_at']:['source','schema_version','level_band','plan_snapshot','check_score','completed_at'];
 const value=action==='delete'?{}:Object.fromEntries(fields.filter(k=>Object.hasOwn(view.record.overlay||{},k)).map(k=>[k,view.record.overlay[k]]));
 const select=document.createElement('select');select.setAttribute('aria-label','Cách xử lý giáo án');select.append(new Option('Chọn cách xử lý',''),new Option('Dùng bản tài khoản, giữ bản chờ trong cache','server'));
 try{PickleUpPlanCore.payload(view.record.kind,value,{action,revision:view.record.baseRevision});if(view.record.kind==='personal_plans'&&view.record.base&&action!=='delete'&&view.record.overlay?.plan_snapshot&&PickleUpPlanCore.canonical(view.record.overlay.plan_snapshot)!==PickleUpPlanCore.canonical(view.record.base.plan_snapshot))throw Error();select.append(new Option(action==='delete'?'Gửi lại quyết định xóa':action==='restore'?'Khôi phục bản đã xóa với kết quả đã xem':'Gửi ý định đang chờ theo bản tài khoản mới nhất','local'))}catch(_){}
 detail.append(select);const epochNeeded=view.record.reviewReason==='reset_required'||view.conflicts.some(c=>c.reason==='reset_required')||view.operations.some(o=>o.request&&o.request.p_epoch!==view.cursor.epoch);
 const epoch=document.createElement('input');epoch.type='checkbox';const epochLabel=node('label',' Tôi đã xem lại dữ liệu sau khi tải lại tài khoản.');epochLabel.prepend(epoch);epochLabel.hidden=!epochNeeded;detail.append(epochLabel);
 const destructive=document.createElement('input');destructive.type='checkbox';const destructiveLabel=node('label',action==='restore'?' Tôi xác nhận khôi phục giáo án/lựa chọn đã xóa.':' Tôi xác nhận xóa giáo án/lựa chọn trên tài khoản.');destructiveLabel.prepend(destructive);detail.append(destructiveLabel);
 const uncertain=view.operations.some(o=>o.state==='sending'),confirm=node('button','Xác nhận xử lý giáo án');confirm.type='button';confirm.disabled=true;
 const valid=()=>{const needed=select.value==='local'&&action!=='put';destructiveLabel.hidden=!needed;confirm.disabled=running||data.getState().busy||uncertain||!select.value||epochNeeded&&!epoch.checked||needed&&!destructive.checked};selection.valid=valid;for(const input of [select,epoch,destructive])input.addEventListener('change',valid);valid();
 confirm.addEventListener('click',()=>{if(confirm.disabled||!selection||selection.owner!==data.getState().owner||selection.token!==data.token())return;const current=selection,mode=select.value,acknowledgeEpochChange=epoch.checked;task('resolve',async()=>{await data.controller().resolveReview(current.view,mode,{operationId:current.operationId,action,value,acknowledgeEpochChange});selection=null;detail.replaceChildren();return {message:mode==='server'?'Đã dùng bản tài khoản; bản chờ vẫn giữ trong cache.':'Đã lưu quyết định trên thiết bị · bấm đồng bộ để gửi.'}})});detail.append(confirm);if(uncertain)detail.append(node('p',message('uncertain_operation')));
}
let managePage=0;
function manage(s){
 const host=$('[data-plan-manage]');host.replaceChildren();if(s.mode!=='account')return;
 const rows=(s.snapshot?.records||[]).filter(r=>r.kind==='personal_plans');managePage=Math.min(managePage,Math.max(0,Math.ceil(rows.length/10)-1));
 for(const r of rows.slice(managePage*10,managePage*10+10)){
  const line=node('div','');line.dataset.planId=r.id;line.append(node('p',summary(r.kind,r.overlay||r.base,r.deleted)));
  const restore=!!r.base?.deleted_at,button=node('button',restore?'Khôi phục giáo án':'Xóa giáo án');button.type='button';button.disabled=running||s.busy||r.reviewRequired||r.deleted&&!restore||restore&&!!r.tailOperationId;
  button.addEventListener('click',()=>{const stamp=data.token();if(!confirm((restore?'Khôi phục':'Xóa')+' giáo án này? Bản chờ vẫn cần bấm đồng bộ.'))return;if(stamp!==data.token())return;task('manage',async()=>{const args={kind:r.kind,id:r.id,operationId:crypto.randomUUID(),expectedLocalRevision:r.localRevision};if(restore)await data.controller().restoreEntity(args);else await data.controller().deleteEntity(args);return {message:'Đã lưu quyết định giáo án trên thiết bị · chờ đồng bộ.'}})});line.append(button);host.append(line);
 }
 if(rows.length>10){host.append(node('p','Trang '+(managePage+1)+'/'+Math.ceil(rows.length/10)));for(const [text,delta]of [['Trước',-1],['Sau',1]]){const b=node('button',text);b.type='button';b.disabled=running||s.busy||managePage+delta<0||managePage+delta>=Math.ceil(rows.length/10);b.onclick=()=>{managePage+=delta;manage(data.getState())};host.append(b)}}
}
const click=(selector,type,work)=>$(selector).addEventListener('click',()=>task(type,work));
$('[data-plan-consent]').addEventListener('change',render);
click('[data-plan-enable]','enable',async()=>{if(!$('[data-plan-consent]').checked)return;await data.controller().useAccount();return {message:'Đã đọc kho giáo án tài khoản. Chưa nhập dữ liệu khách hoặc gửi thay đổi.'}});
$('[data-plan-device]').addEventListener('click',()=>{serial++;running=false;task('device',async()=>{await data.controller().useDevice();return {message:'Giáo án đang dùng kho thiết bị; cache và queue tài khoản vẫn giữ riêng.'}})});
click('[data-plan-read]','read',async()=>{await data.controller().refresh();return {message:'Đã đọc giáo án tài khoản; lượt chờ vẫn được giữ.'}});
for(const [selector,forceRetry]of [['[data-plan-send]',false],['[data-plan-retry]',true]])click(selector,'sync',async()=>{const result=await data.controller().sync({forceRetry});return {message:result.status==='synced'?'Đã đồng bộ giáo án tài khoản.':message(result.status)}});
click('[data-plan-export]','export',async()=>({artifact:await data.controller().exportCache(),message:'Đã xuất cache giáo án. Giữ tệp riêng tư ngoài trình duyệt; chưa phải backup toàn tài khoản.'}));
click('[data-plan-clear]','manage',async()=>{await data.choose(null);return {message:'Đã bỏ chọn trên thiết bị · chờ đồng bộ.'}});
click('[data-plan-clear-lesson]','manage',async()=>{await data.chooseLesson(null);return {message:'Đã bỏ chọn bài Học viện trên thiết bị · chờ đồng bộ.'}});
$('[data-plan-restore-selection]').addEventListener('click',()=>{const stamp=data.token(),s=data.getState(),r=s.snapshot?.records.find(x=>x.kind==='user_selections'&&x.id==='self');if(!r||!confirm('Khôi phục lựa chọn trống? Cả bài Học viện và giáo án cá nhân sẽ không được chọn; thay đổi còn chờ đồng bộ.')||stamp!==data.token())return;task('manage',async()=>{await data.controller().restoreEntity({kind:r.kind,id:r.id,operationId:crypto.randomUUID(),expectedLocalRevision:r.localRevision,value:{selected_personal_plan_id:null,selected_academy_lesson_id:null}});return {message:'Đã khôi phục lựa chọn trống trên thiết bị · chờ đồng bộ.'}})});
document.addEventListener('pickleup:plan-data',render);data.ready.then(render);render();
})();
