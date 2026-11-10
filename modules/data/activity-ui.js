(function(){
'use strict';
const host=document.getElementById('activityPilot'),data=window.PICKLEUP_ACTIVITY;if(!host||!data)return;
const $=s=>host.querySelector(s),status=$('[role=status]'),detail=$('[data-activity-detail]');
let running=false,action=null,serial=0,owner,token,selection=null,syncFeedback=false;
const names={academy_attempts:'Lượt Học viện',skill_assessments:'Đánh giá',training_entries:'Nhật ký tập',match_records:'Trận đấu'};
const errors={network_error:'Lỗi mạng. Yêu cầu đang chờ được giữ nguyên.',offline:'Đang offline; thay đổi vẫn nằm trên thiết bị.',auth_required:'Đăng nhập lại đúng tài khoản để tiếp tục.',account_changed:'Tài khoản hoặc lựa chọn nguồn đã thay đổi; yêu cầu cũ giữ riêng.',consent_changed:'Lựa chọn nguồn đã thay đổi ở tab khác. Hãy kiểm tra lại.',busy:'Một tab hoặc thao tác khác đang đồng bộ. Thử lại sau.',retry_wait:'Chưa đến lượt thử lại. Chỉ bấm thử lại khi bạn muốn gửi tiếp.',needs_review:'Có hoạt động cần xem và xử lý.',uncertain_operation:'Có yêu cầu đã gửi chưa rõ kết quả. Thử lại đúng yêu cầu trước khi quyết định.',local_conflict:'Dữ liệu đã đổi sau khi xem. Mở lại mục cần xử lý trước khi chọn.',epoch_review_required:'Hãy xác nhận đã xem lại dữ liệu sau khi tải lại tài khoản.',quota_exceeded:'Không đủ dung lượng. Chưa xác nhận đã lưu; hãy xuất cache đang có.',upgrade_required:'Cần cập nhật ứng dụng. Dữ liệu chờ vẫn được giữ.',invalid_activity:'Dữ liệu cần kiểm tra. Xuất cache và đọc lại; chưa chuyển sang kho khách.',append_only:'Không thể ghi đè hoặc khôi phục lượt đã tồn tại. Chọn bản tài khoản hoặc xuất cache.',credentials_forbidden:'Không xuất được cache có trường thông tin đăng nhập. Giữ dữ liệu và kiểm tra riêng.',pending:'Còn thay đổi chờ gửi. Bấm đồng bộ tiếp để xử lý lượt kế tiếp.'};
const message=code=>errors[code]||'Chưa thực hiện được. Hãy giữ cache và kiểm tra nguồn dữ liệu trong mục này.';
const node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el};
function render(){
 const s=data.getState(),nextToken=data.token(),changedOwner=owner!==s.owner;
 if(changedOwner){serial++;running=false;action=null;owner=s.owner}
 if(changedOwner||token!==nextToken){
  if(!changedOwner&&running&&!['enable','device'].includes(action)){serial++;running=false;action=null}
  syncFeedback=false;token=nextToken;selection=null;detail.replaceChildren();$('[data-activity-consent]').checked=false;status.textContent=data.notice();
 }
 const configured=window.PICKLEUP_ACTIVITY_CONFIG?.enabled===true&&window.PICKLEUP_AUTH_CONFIG?.enabled===true;
 $('[data-activity-body]').hidden=!configured;
 $('[data-activity-staging]').hidden=window.PICKLEUP_ACTIVITY_CONFIG?.scope!=='staging-activity-events';
 if(!configured){status.textContent='Kho hoạt động pilot chưa bật. Chế độ khách vẫn dùng bình thường.';return}
 const consent=$('[data-activity-consent]');consent.disabled=running||s.busy||s.mode!=='guest';
 $('[data-activity-account]').textContent=s.owner?'Kho riêng của tài khoản đang đăng nhập · kiểm tra email trong mục Tài khoản.':'Đăng nhập để chọn kho hoạt động.';
 $('[data-activity-enable]').disabled=running||s.busy||!s.owner||s.mode!=='guest'||!consent.checked;
 $('[data-activity-device]').disabled=!s.owner||!['account','error'].includes(s.mode);
 $('[data-activity-read]').disabled=running||s.busy||!s.owner||!['account','error'].includes(s.mode);
 for(const key of ['send','retry'])$('[data-activity-'+key+']').disabled=running||s.busy||s.mode!=='account'||!s.snapshot;
 $('[data-activity-export]').disabled=running||s.busy||!s.owner||!data.controller();
 const ops=s.snapshot?.outbox||[],pending=ops.filter(o=>['pending','sending','deferred'].includes(o.state)),uncertain=pending.filter(o=>o.state==='sending');
 $('[data-activity-retry]').hidden=!uncertain.length;
 $('[data-activity-count]').textContent=s.mode==='account'?pending.length+' hoạt động chờ gửi · '+uncertain.length+' yêu cầu chưa rõ kết quả. Lưu trên thiết bị chưa có nghĩa đã đồng bộ.':'';
 if(syncFeedback&&s.mode==='account'&&s.snapshot){const review=ops.some(o=>['conflict','blocked'].includes(o.state));status.textContent=review?message('needs_review'):pending.length?message('pending'):'Đã đồng bộ hoạt động tài khoản.';}
 if(s.error)status.textContent=message(s.error);
 for(const input of detail.querySelectorAll('input,select'))input.disabled=running||s.busy;
 if(selection?.valid)selection.valid();
 const list=$('[data-activity-reviews]');list.replaceChildren();
 for(const row of s.snapshot?.records||[]){
  if(!row.reviewRequired&&!ops.some(op=>op.kind===row.kind&&op.id===row.id&&['blocked','conflict'].includes(op.state)))continue;
  const button=node('button','Xem cần xử lý · '+names[row.kind]);button.type='button';button.disabled=running||s.busy;
  button.addEventListener('click',()=>task('preview',async()=>{const view=await data.controller().previewReview(row.kind,row.id);return {view}}));list.append(button);
 }
}
async function task(type,work){
 if(running)return;running=true;syncFeedback=false;action=type;const stamp=serial;render();
 status.textContent=({enable:'Đang đọc kho hoạt động tài khoản…',device:'Đang chuyển về kho thiết bị…',read:'Đang đọc lại hoạt động tài khoản…',sync:'Đang đồng bộ hoạt động tài khoản…',preview:'Đang đọc dữ liệu cần xử lý…',resolve:'Đang lưu quyết định xử lý…',export:'Đang chuẩn bị tệp cache hoạt động…'})[type]||'Đang xử lý hoạt động…';
 try{
  const result=await work();if(stamp!==serial)return;
  if(result?.view)show(result.view);
  if(result?.artifact){const url=URL.createObjectURL(new Blob([JSON.stringify(result.artifact)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='pickleup-activity-cache.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  syncFeedback=['synced','pending','needs_review'].includes(result?.syncStatus);
  if(result?.message)status.textContent=result.message;
 }catch(error){if(stamp===serial)status.textContent=message(error.code)}
 finally{if(stamp===serial){running=false;action=null;render()}}
}
function summary(kind,value,deleted){
 if(deleted)return 'Muốn xóa lượt này.';if(!value)return 'Chưa có lượt này.';
 const date=value.occurred_at?new Date(value.occurred_at).toLocaleString('vi-VN'):'Chưa rõ ngày';
 if(kind==='academy_attempts')return value.lesson_id+' · '+value.score+'/20 · '+date+' · '+(value.conditions?'Đã ghi điều kiện':'Điều kiện chưa rõ');
 if(kind==='skill_assessments')return ({self:'Tự đánh giá',stage:'Kiểm tra cơ bản',advanced:'Kiểm tra nâng cao'})[value.assessment_type]+' · '+(value.level_band||'Thang tự đánh giá')+' · '+date+' · '+Object.entries(value.scores).map(([key,score])=>PickleUpActivitySourceCore.NAMES[key]+': '+score+'/'+value.scale).join(' · ');
 if(kind==='training_entries')return value.exercise_id+' · '+value.level_band+' · '+value.kind+' · '+value.hits+'/20 · '+date+' · '+(value.plan_id?'Giáo án: '+value.plan_id:'Giáo án cũ: '+value.legacy_plan_id)+' · '+(window.PICKLEUP_PRACTICE_CONDITIONS?.describe(value.conditions)||'Chưa rõ điều kiện')+(value.note?' · '+value.note:'');
 return value.ours+'–'+value.theirs+' · '+(value.mode==='doubles'?'Đánh đôi':'Đánh đơn')+' · '+date+' · '+PickleUpActivitySourceCore.FOCUS_LABELS[value.focus]+(value.doubles_issue?' · '+(window.PICKLEUP_PRACTICE_CONDITIONS?.DOUBLES[value.doubles_issue]||value.doubles_issue):'')+(value.note?' · '+value.note:'');
}
function show(view){
 selection={view,owner,token:data.token(),operationId:crypto.randomUUID()};detail.replaceChildren();
 detail.append(node('h4','Xem và xử lý · '+names[view.record.kind]),node('p','Lựa chọn giữ toàn bộ lượt, không sửa nội dung sự kiện. Bản đang chờ và yêu cầu cũ được giữ trong cache có thể xuất.'));
 const grid=node('div','');grid.className='sync-comparison';
 const original=view.record.reviewBase?.row||view.conflicts[0]?.originalBase?.row;
 for(const [label,value,deleted]of [['Ban đầu',original,!!original?.deleted_at],['Bạn muốn lưu',view.record.overlay,view.record.deleted],['Trên tài khoản',view.record.base,!!view.record.base?.deleted_at]]){const card=node('div','');card.append(node('strong',label),node('p',summary(view.record.kind,value,deleted)));grid.append(card)}detail.append(grid);
 const select=document.createElement('select');select.setAttribute('aria-label','Cách xử lý hoạt động');select.append(new Option('Chọn cách xử lý',''),new Option('Dùng bản tài khoản, giữ bản chờ trong cache','server'));
 if(!view.record.deleted&&view.record.base===null){try{PickleUpActivityCore.payload(view.record.kind,view.record.overlay);select.append(new Option('Gửi lại đúng lượt đang chờ, tài khoản chưa có','retry_create'))}catch(_){}}
 if(view.record.deleted&&view.record.base?.deleted_at===null)select.append(new Option('Xóa bản đang có trên tài khoản','retry_delete'));
 detail.append(select);
 const epochNeeded=view.record.reviewReason==='reset_required'||view.conflicts.some(c=>c.reason==='reset_required')||view.operations.some(o=>o.request&&o.request.p_epoch!==view.cursor.epoch);
 const epoch=document.createElement('input');epoch.type='checkbox';const epochLabel=node('label',' Tôi đã xem lại dữ liệu sau khi tải lại tài khoản.');epochLabel.prepend(epoch);epochLabel.hidden=!epochNeeded;detail.append(epochLabel);
 const deletion=document.createElement('input');deletion.type='checkbox';const deletionLabel=node('label',' Tôi xác nhận xóa bản đang có trên tài khoản, không có khôi phục lượt đã xóa.');deletionLabel.prepend(deletion);deletionLabel.hidden=true;detail.append(deletionLabel);
 const uncertain=view.operations.some(o=>o.state==='sending'),confirm=node('button','Xác nhận xử lý hoạt động');confirm.type='button';confirm.disabled=true;
 const valid=()=>{deletionLabel.hidden=select.value!=='retry_delete';confirm.disabled=running||data.getState().busy||uncertain||!select.value||epochNeeded&&!epoch.checked||select.value==='retry_delete'&&!deletion.checked};selection.valid=valid;
 for(const input of [select,epoch,deletion])input.addEventListener('change',valid);
 confirm.addEventListener('click',()=>{
  if(confirm.disabled||!selection||selection.owner!==data.getView().owner||selection.token!==data.token())return;
  const current=selection,mode=select.value,acknowledgeEpochChange=epoch.checked;
  task('resolve',async()=>{await data.controller().resolveReview(current.view,mode,{operationId:current.operationId,acknowledgeEpochChange});selection=null;detail.replaceChildren();return {message:mode==='server'?'Đã dùng bản tài khoản; bản chờ vẫn giữ trong cache.':'Đã lưu quyết định trên thiết bị · bấm đồng bộ để gửi.'}});
 });detail.append(confirm);if(uncertain)detail.append(node('p',message('uncertain_operation')));
}
const click=(selector,type,work)=>$(selector).addEventListener('click',()=>task(type,work));
$('[data-activity-consent]').addEventListener('change',render);
click('[data-activity-enable]','enable',async()=>{if(!$('[data-activity-consent]').checked)return;await data.controller().useAccount();return {message:'Đã đọc kho hoạt động tài khoản. Chưa nhập dữ liệu khách hoặc gửi thay đổi.'}});
$('[data-activity-device]').addEventListener('click',()=>{serial++;running=false;task('device',async()=>{await data.controller().useDevice();return {message:'Hoạt động đang dùng kho thiết bị; cache và queue tài khoản vẫn giữ riêng.'}})});
click('[data-activity-read]','read',async()=>{await data.controller().refresh();return {message:'Đã đọc hoạt động tài khoản; lượt chờ vẫn được giữ.'}});
for(const [selector,forceRetry]of [['[data-activity-send]',false],['[data-activity-retry]',true]])click(selector,'sync',async()=>{const result=await data.controller().sync({forceRetry});return {syncStatus:result.status,message:result.status==='synced'?'Đã đồng bộ hoạt động tài khoản.':message(result.status)}});
click('[data-activity-export]','export',async()=>({artifact:await data.controller().exportCache(),message:'Đã xuất cache hoạt động. Giữ tệp riêng tư ngoài trình duyệt; chưa phải backup toàn tài khoản.'}));
document.addEventListener('pickleup:activity-data',render);data.ready.then(render);render();
})();
