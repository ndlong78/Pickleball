(function(){
'use strict';
const host=document.getElementById('syncPilot'),data=window.PICKLEUP_DATA;if(!host||!data)return;
const $=selector=>host.querySelector(selector),status=$('[role=status]'),body=$('[data-sync-body]'),list=$('[data-sync-conflicts]'),detail=$('[data-sync-detail]');
let serial=0,selection=null,previous=null,running=false,shownTimezone=null;
const errors={offline:'Đang offline. Các thay đổi đã lưu vẫn chờ trong kho tài khoản trên thiết bị.',network_error:'Lỗi mạng. Yêu cầu đang chờ được giữ nguyên; chưa xác nhận đã đồng bộ.',auth_required:'Phiên đã hết hạn. Đăng nhập lại đúng tài khoản để tiếp tục.',stale:'Phiên vừa thay đổi. Yêu cầu cũ được giữ riêng cho tài khoản đó.',quota_exceeded:'Không đủ dung lượng lưu trữ. Không xác nhận đã lưu; hãy xuất bản cache đang có.',storage_unavailable:'Không truy cập được kho trên thiết bị. Không tự chuyển sang ghi kho khách.',local_conflict:'Dữ liệu đã thay đổi sau preview. Đọc lại và xem lại lựa chọn trước khi lưu.',epoch_review_required:'Hãy xác nhận đã kiểm tra dữ liệu sau khi tải lại tài khoản.',explicit_restore_required:'Hãy xác nhận khôi phục bản đã xóa.',uncertain_operation:'Có yêu cầu đã gửi chưa rõ kết quả. Thử gửi lại đúng yêu cầu trước khi quyết định.',bootstrap_required:'Cần đọc dữ liệu tài khoản lần đầu trước khi chỉnh sửa.',needs_review:'Có thay đổi cần bạn xem và xử lý.',upgrade_required:'Cần cập nhật ứng dụng. Yêu cầu đang chờ được giữ nguyên.',invalid_response:'Phản hồi chưa hợp lệ. Không xác nhận đã đồng bộ.',busy:'Một thao tác khác đang chạy.',retry_wait:'Chưa đến lúc thử lại hoặc đã đạt giới hạn. Chỉ dùng nút thử lại khi bạn muốn tiếp tục.',pending:'Còn thay đổi chờ gửi. Bấm đồng bộ tiếp để xử lý lượt kế tiếp.'};
const message=code=>errors[code]||'Không thực hiện được. Dữ liệu chờ vẫn được giữ; hãy kiểm tra kết nối và đọc lại.';
function node(tag,text){const el=document.createElement(tag);el.textContent=text;return el}
function summary(kind,value,deleted){
 if(deleted)return 'Đã xóa ghi nhận.';if(!value)return 'Chưa có dữ liệu.';
 if(kind==='user_preferences')return (value.target_days??'?')+' ngày/tuần · '+(value.level_band??'?')+' · '+(value.session_minutes??'?')+' phút · '+(value.gentle?'Tập nhẹ':'Nhịp thông thường')+' · '+(value.goal_configured===true?'Đã chọn mục tiêu':value.goal_configured===false?'Chưa chọn mục tiêu':'Chưa rõ mục tiêu đã được chọn');
 return (value.status==='done'?'Đã tập · '+value.minutes+' phút · '+(value.lesson_id||'Không chọn bài'):value.status==='skipped'?'Đã bỏ qua':'Chưa xác nhận')+' · Múi giờ: '+(value.timezone_at_entry||'Chưa rõ');
}
function render(){
 const s=data.getState(),source=s.owner+':'+s.mode;
 const sourceChanged=previous!==source;
 if(sourceChanged){serial++;running=false;selection=null;detail.replaceChildren();status.textContent=data.notice();previous=source}
 const configured=PICKLEUP_SYNC_CONFIG?.enabled===true&&PICKLEUP_AUTH_CONFIG?.enabled===true;
 body.hidden=!configured;
 $('[data-sync-enable]').disabled=running||s.busy||!s.owner||s.mode!=='guest';
 $('[data-sync-device]').disabled=running||s.busy||!s.owner||!['account','error'].includes(s.mode);
 for(const selector of ['[data-sync-read]','[data-sync-send]','[data-sync-retry]','[data-sync-export]'])$(selector).disabled=running||s.busy||s.mode!=='account'||!s.snapshot;
 $('[data-sync-read]').disabled=running||s.busy||!s.owner||!['account','error'].includes(s.mode);
 $('[data-sync-zone-save]').disabled=running||s.busy||s.mode!=='account';
 if(sourceChanged||shownTimezone!==s.timezone){$('[data-sync-timezone]').value=s.timezone||'';shownTimezone=s.timezone}
 if(!configured){status.textContent='Đồng bộ pilot chưa bật. Dữ liệu khách vẫn dùng bình thường.';return}
 $('[data-sync-account]').textContent=s.owner?'Kho riêng của tài khoản đang đăng nhập · kiểm tra email trong mục Tài khoản bên dưới.':'Cần đăng nhập để dùng kho tài khoản.';
 const ops=s.snapshot?.outbox||[],pending=ops.filter(o=>['pending','deferred','sending'].includes(o.state)),uncertain=pending.filter(o=>o.state==='sending');
 $('[data-sync-count]').textContent=s.mode==='account'?pending.length+' thay đổi chờ gửi · '+uncertain.length+' yêu cầu đã gửi chưa rõ kết quả. Chỉ “Đã đồng bộ” sau khi server xác nhận.':'';
 $('[data-sync-retry]').hidden=!uncertain.length;
 if(s.error)status.textContent=message(s.error);
 list.replaceChildren();
 for(const c of s.snapshot?.conflicts||[]){
  if(c.state!=='open')continue;
  const b=node('button','Xem xung đột · '+(c.kind==='user_preferences'?'Mục tiêu/lịch tập':c.id));b.type='button';b.disabled=running||s.busy;
  b.addEventListener('click',()=>task(async()=>{const view=await data.controller().previewConflict(c.conflictId);show(view)}));list.append(b);
 }
}
async function task(work){
 if(running)return;running=true;const stamp=serial;render();
 try{await work()}catch(error){if(stamp===serial)status.textContent=message(error.code)}finally{if(stamp===serial){running=false;render()}}
}
function show(view){
 selection={view,owner:data.getState().owner};detail.replaceChildren();
 detail.append(node('h4','Xem hai bản · '+(view.record.kind==='user_preferences'?'Mục tiêu/lịch tập':view.record.id)),node('p','Chọn một bản cho toàn bộ mục này. Bản còn lại và chuỗi yêu cầu cũ được giữ trong bản cache có thể xuất. Quyết định giữ bản của bạn chỉ tạo thay đổi chờ gửi; có thể xung đột lại.'));
 const grid=node('div','');grid.className='sync-comparison';
 const base=view.conflict.originalBase?.row,remote=view.record.base,uncertain=view.operations.some(o=>o.state==='sending');let local=view.record.overlay,localAvailable=true;
 try{local=PickleUpDomainCore.intent(view)}catch(_){localAvailable=false;detail.append(node('p','Bản chờ cần kiểm tra định dạng. Hãy xuất cache để giữ nguồn; hiện có thể chọn bản tài khoản.'))}
 for(const [label,value,deleted]of [['Lúc bắt đầu sửa',base,!!base?.deleted_at],['Bạn muốn lưu',local,view.record.deleted],['Trên tài khoản',remote,!!remote?.deleted_at]]){const card=node('div','');card.append(node('strong',label),node('p',summary(view.record.kind,value,deleted)));grid.append(card)}detail.append(grid);
 const select=document.createElement('select');select.setAttribute('aria-label','Bản muốn giữ');select.append(new Option('Chọn bản muốn giữ',''),new Option('Dùng bản tài khoản','server'),new Option('Giữ bản của tôi','local'));detail.append(select);
 select.options[2].disabled=!localAvailable;
 const epoch=document.createElement('input');epoch.type='checkbox';const epochLabel=node('label',' Tôi đã kiểm tra dữ liệu sau khi tải lại tài khoản.');epochLabel.prepend(epoch);epochLabel.hidden=view.conflict.reason!=='reset_required';detail.append(epochLabel);
 const restore=document.createElement('input');restore.type='checkbox';const restoreLabel=node('label',' Tôi muốn khôi phục mục đã bị xóa trên tài khoản.');restoreLabel.prepend(restore);restoreLabel.hidden=!(remote?.deleted_at&&!view.record.deleted);detail.append(restoreLabel);
 const confirm=node('button','Xác nhận lựa chọn');confirm.type='button';confirm.disabled=true;
 const valid=()=>{confirm.disabled=uncertain||!select.value||!epochLabel.hidden&&!epoch.checked||select.value==='local'&&(!localAvailable||!restoreLabel.hidden&&!restore.checked)};
 for(const input of [select,epoch,restore])input.addEventListener('change',valid);
 confirm.addEventListener('click',()=>{if(confirm.disabled)return;const current=selection;if(!current||current.owner!==data.getState().owner)return;task(async()=>{await data.controller().resolveConflict(current.view,select.value,{acknowledgeEpochChange:epoch.checked,restore:restore.checked});selection=null;detail.replaceChildren();status.textContent=select.value==='server'?'Đã chọn bản tài khoản; bản chưa chọn được giữ trong cache.':'Đã lưu quyết định trên thiết bị. Bấm đồng bộ để gửi.'})});detail.append(confirm);
 if(uncertain){confirm.disabled=true;detail.append(node('p',message('uncertain_operation')))}
}
function click(selector,work){$(selector).addEventListener('click',()=>task(work))}
click('[data-sync-enable]',async()=>{await data.controller().useAccount();status.textContent='Đã đọc kho tài khoản. Dữ liệu khách chưa được nhập hoặc thay đổi.'});
click('[data-sync-device]',async()=>{await data.controller().useDevice();status.textContent='Đang dùng dữ liệu thiết bị. Queue tài khoản được giữ riêng, chưa bị xóa.'});
click('[data-sync-read]',async()=>{await data.controller().refresh();status.textContent='Đã đọc dữ liệu tài khoản. Các thay đổi chờ vẫn được giữ để đối soát.'});
click('[data-sync-zone-save]',async()=>{await data.controller().setTimezone($('[data-sync-timezone]').value.trim());status.textContent='Đã xác nhận múi giờ cho ghi nhận mới.'});
for(const [selector,forceRetry]of [['[data-sync-send]',false],['[data-sync-retry]',true]])click(selector,async()=>{const result=await data.controller().sync({forceRetry});status.textContent=result.status==='synced'?'Đã đồng bộ mục tiêu và check-in.':message(result.status)});
click('[data-sync-export]',async()=>{const artifact=data.controller().exportCache(),url=URL.createObjectURL(new Blob([JSON.stringify(artifact)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='pickleup-account-cache.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Đã xuất cache mục tiêu/check-in, queue và conflict. Giữ tệp riêng tư; đây chưa phải backup toàn tài khoản hoặc tệp có thể nhập lại.'});
document.addEventListener('pickleup:domain-data',render);data.ready.then(render);render();
})();
