/* Settings-only cache rescue. Private data never enters logs, URLs or storage. */
(function(root){
'use strict';const host=document.getElementById('accountRescue');if(!host)return;
const $=selector=>host.querySelector(selector),status=$('[role=status]'),capture=$('[data-account-capture]'),download=$('[data-account-download]'),file=$('input[type=file]'),list=$('tbody'),summary=$('[data-account-rescue-summary]'),compare=$('[data-account-compare]'),comparison=$('[data-restore-preview]'),comparisonRows=$('[data-restore-rows]'),comparisonSummary=$('[data-restore-summary]'),risks=$('[data-restore-risks]');
const labels={records:'Bản ghi và bản chỉnh sửa trên máy',outbox:'Yêu cầu chờ và đã xử lý',conflicts:'Xung đột và quyết định đã lưu',sync_cursor:'Mốc đồng bộ',import_receipts:'Checkpoint nhập và thông tin nguồn',device_state:'Checklist, bước tập trung và điểm dừng',metadata:'Thiết lập và thông tin phục hồi'};
const errors={auth_required:'Đăng nhập để đọc cache của đúng tài khoản.',account_changed:'Tài khoản đã đổi; chọn lại dữ liệu trong phiên hiện tại.',foreign_account:'Tệp hoặc dữ liệu không thuộc tài khoản đang đăng nhập. Chưa hiển thị nội dung.',credentials_detected:'Phát hiện trường có thể chứa thông tin đăng nhập. Không tạo hoặc mở bản xuất; dữ liệu gốc giữ nguyên.',credentials_forbidden:'Phát hiện trường có thể chứa thông tin đăng nhập. Không xuất; dữ liệu gốc giữ nguyên.',too_large:'Tệp/cache vượt giới hạn 32 MiB hoặc 100.000 dòng. Chưa xuất hoặc cắt dữ liệu.',rescue_too_large:'Cache vượt giới hạn bản xuất. Dữ liệu gốc được giữ nguyên, không cắt lịch sử.',too_complex:'Cấu trúc tệp quá sâu hoặc phức tạp. Chưa mở nội dung.',checksum_mismatch:'Checksum không khớp. Tệp có thể đã hỏng hoặc đổi nội dung.',invalid_format:'Chưa nhận diện được định dạng cứu hộ cache V6 này.',invalid_json:'Tệp không phải JSON hợp lệ.',duplicate_key:'Tệp có khóa trùng. Chưa mở nội dung.',unsupported_value:'Cache có giá trị chưa biểu diễn an toàn bằng JSON. Chưa tạo bản xuất.',invalid_payload:'Cache có giá trị chưa biểu diễn an toàn bằng JSON. Chưa tạo bản xuất.',upgrade_required:'Kho dữ liệu cần được mở lại sau nâng cấp. Tải lại ứng dụng.',storage_unavailable:'Chưa đọc được IndexedDB. Kiểm tra quyền lưu trữ rồi thử lại.'};
const riskLabels={server_records:'Bản ghi cần đối chiếu lại với máy chủ',request_reconciliation:'Yêu cầu cần đối chiếu kết quả gửi với máy chủ, kể cả mục đã đánh dấu hoàn tất trong tệp',unfinished_requests:'Yêu cầu chưa xử lý xong theo tệp; giữ nguyên để đối soát',uncertain_requests:'Yêu cầu đang gửi trong tệp, chưa biết kết quả thật',conflict_review:'Xung đột/quyết định cần kiểm lại trước phục hồi',fresh_pull:'Thông tin đồng bộ cần đọc mới từ máy chủ',import_provenance:'Lượt nhập cần đối soát tệp nguồn và kết quả trên máy chủ',device_binding:'Trạng thái trên máy cần kiểm thiết bị, bài tập và giáo án liên quan',settings_not_reused:'Thiết lập tài khoản trong tệp cần kiểm lại và không được tự kích hoạt',unreadable_keys:'Dòng có khóa chưa đối chiếu được, cần giữ tệp gốc'};
const planBtn=$('[data-account-plan]'),planPanel=$('[data-restore-plan]'),planSummary=$('[data-restore-plan-summary]'),planList=$('[data-restore-plan-list]'),planExcluded=$('[data-restore-plan-excluded]');
const kindLabels={user_preferences:'Mục tiêu và lịch tập',practice_checkins:'Check-in buổi tập',profiles:'Hồ sơ',personal_plans:'Giáo án cá nhân',academy_attempts:'Điểm Học viện',skill_assessments:'Đánh giá kỹ năng',training_entries:'Nhật ký tập',match_records:'Nhật ký trận',user_selections:'Lựa chọn giáo án'};
const actionLabels={put:'lưu/cập nhật',delete:'xóa'};
const warningLabels={uncertain_send:'Tệp ghi yêu cầu này đang gửi, chưa rõ máy chủ đã nhận chưa.',device_has_unsent_change:'Máy có thay đổi chưa gửi cho cùng mục; xử lý trước.',device_has_open_conflict:'Máy có conflict đang mở cho cùng mục; xử lý trước.'};
const excludedLabels={settled:'đã hoàn tất theo tệp',already_on_device:'máy đã có',invalid_operation:'dữ liệu không hợp lệ',unknown_kind:'loại dữ liệu lạ',unsupported_protocol:'giao thức không hỗ trợ',dependency_missing:'thiếu thao tác phụ thuộc',dependency_excluded:'phụ thuộc thao tác đã loại',dependency_cycle:'phụ thuộc vòng'};
const statusLabels={queued:'Đã đưa vào hàng chờ trên máy (chưa gửi). Vào phần đồng bộ để gửi.','blocked:unsupported_kind':'Loại này chưa hỗ trợ khôi phục tự động.','blocked:dependency':'Phụ thuộc thao tác khác; chưa hỗ trợ.','blocked:device_unsent':'Máy có thay đổi chưa gửi cho mục này; không ghi đè.','blocked:needs_review':'Mục này đang cần xem xét conflict.','blocked:record_changed':'Dữ liệu trên máy chủ đã đổi sau thao tác này; không ghi đè.','blocked:invalid_record':'Dữ liệu trong tệp không hợp lệ cho mục này; đã bỏ qua.','blocked:invalid_payload':'Nội dung trong tệp không hợp lệ cho mục này; đã bỏ qua.','blocked:nothing_to_restore':'Không có gì để khôi phục: dữ liệu đã giống hoặc đã bị xóa.','failed:offline':'Cần mạng để tải dữ liệu mới từ máy chủ; chưa ghi gì.','failed:pilot_disabled':'Nguồn dữ liệu tài khoản đang tắt ở địa chỉ này; chưa ghi gì.','failed:source_unavailable':'Chưa bật nguồn dữ liệu tài khoản trên máy này; chưa ghi gì.','failed:bootstrap_required':'Cần tải dữ liệu tài khoản trước; chưa ghi gì.','failed:busy':'Đang bận, thử lại sau.','failed:account_changed':'Tài khoản đã đổi; chưa ghi gì.','failed:network_error':'Chưa tải được dữ liệu mới; chưa ghi gì.','failed:unknown':'Chưa khôi phục được; chưa ghi gì.'};
let controller=null,url=null,lastOwner=null;
function clearURL(){if(url)URL.revokeObjectURL(url);url=null;download.removeAttribute('href')}
function paint(state){
 if(state.owner!==lastOwner){file.value='';lastOwner=state.owner}
 clearURL();list.replaceChildren();planList.replaceChildren();planExcluded.replaceChildren();planSummary.textContent='';planPanel.hidden=true;planBtn.disabled=state.busy||!state.owner||state.source!=='file';comparisonRows.replaceChildren();risks.replaceChildren();comparisonSummary.textContent='';comparison.hidden=true;compare.disabled=state.busy||!state.owner||state.source!=='file';summary.textContent='';capture.disabled=file.disabled=state.busy||!state.owner;download.hidden=true;
 if(!state.owner){status.textContent='Chế độ khách · đăng nhập để xuất cache V6 của tài khoản. Backup V5/raw rescue phía trên vẫn dành cho dữ liệu khách.';file.value='';return}
 if(state.busy){status.textContent='Đang đọc và kiểm tra cache/tệp trên thiết bị…';return}
 if(state.error){status.textContent=errors[state.error]||'Chưa đọc được bản cứu hộ. Dữ liệu gốc được giữ nguyên.';return}
 if(!state.report){status.textContent='Chưa đọc cache. Thao tác này không gửi dữ liệu hoặc thay đổi kho đang dùng.';return}
 const r=state.report;for(const [name,label] of Object.entries(labels)){const tr=document.createElement('tr');for(const value of [label,r.counts[name]]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}list.append(tr)}
 summary.textContent=r.total+' dòng trong cache · '+r.pending+' yêu cầu chưa xử lý xong, gồm '+r.uncertain+' yêu cầu chưa rõ kết quả gửi · '+r.openConflicts+' conflict đang mở · '+r.deviceStates+' dòng trạng thái thực hành. Đây không phải số buổi đã tập.';
 status.textContent=state.source==='file'?'Đã kiểm tra cấu trúc và checksum của tệp đúng tài khoản. Chỉ xem trước; chưa kiểm tra khả năng khôi phục, chưa ghi dữ liệu hoặc đồng bộ.':'Đã chụp cache nhất quán của tài khoản này trên máy. Dữ liệu trên cloud chưa tải về hoặc dữ liệu RAM chưa lưu không nằm trong tệp. Tệp riêng tư, chưa mã hóa; giữ ở nơi an toàn.';
 if(state.comparison){
  const c=state.comparison,t=c.totals;comparison.hidden=false;
  comparisonSummary.textContent='Ảnh chụp cục bộ: '+t.same+' dòng giống · '+t.onlyFile+' chỉ trong tệp · '+t.onlyDevice+' chỉ trên máy · '+t.different+' cùng khóa nhưng khác nội dung · '+t.unreadableFile+'/'+t.unreadableDevice+' chưa đối chiếu được tệp/máy. Không phải số buổi tập và chưa kiểm tra dữ liệu cloud.';
  for(const row of c.stores){const tr=document.createElement('tr');tr.dataset.restoreStore=row.store;for(const value of [labels[row.store],row.same,row.onlyFile,row.onlyDevice,row.different,row.unreadableFile+'/'+row.unreadableDevice]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}comparisonRows.append(tr)}
  for(const risk of c.risks){const li=document.createElement('li');li.textContent=risk.count+' · '+riskLabels[risk.code];risks.append(li)}
  status.textContent='Đã đối chiếu tệp với cache tại lúc đọc. Chỉ xem trước; chưa khôi phục, ghi đè hoặc đồng bộ.';
 }

 if(state.plan){
  const p=state.plan,sm=p.summary;planPanel.hidden=false;
  planSummary.textContent=sm.candidates+' thao tác chưa gửi trong tệp mà máy chưa có · '+sm.withWarnings+' cần chú ý. Đây không phải số buổi tập.';
  p.items.forEach((item,index)=>{
   const li=document.createElement('li'),label=document.createElement('span');
   label.textContent=(kindLabels[item.kind]||'Dữ liệu khác')+' · '+(actionLabels[item.action]||'thay đổi');li.append(label);
   for(const w of item.warnings){const note=document.createElement('div');note.textContent=warningLabels[w]||'Cần kiểm tra.';li.append(note)}
   if(item.status){const note=document.createElement('div');note.setAttribute('role','status');note.textContent=statusLabels[item.status]||statusLabels['failed:unknown'];li.append(note)}
   else if(!item.restorable){const note=document.createElement('div');note.textContent=item.warnings.some(w=>w==='device_has_unsent_change'||w==='device_has_open_conflict')?'Chưa thể khôi phục lúc này.':'Chưa hỗ trợ khôi phục tự động; tệp gốc được giữ nguyên.';li.append(note)}
   else{const button=document.createElement('button');button.type='button';button.dataset.restoreIndex=String(index);button.textContent='Đưa vào hàng chờ trên máy';button.disabled=state.busy;li.append(button)}
   planList.append(li);
  });
  for(const e of sm.excluded){const li=document.createElement('li');li.textContent=e.count+' · không đưa vào danh sách: '+(excludedLabels[e.code]||'không hợp lệ');planExcluded.append(li)}
 }
 download.hidden=state.source!=='device';
 if(!download.hidden){const prepared=controller?.download();if(prepared){url=URL.createObjectURL(new Blob([prepared.text],{type:'application/json'}));download.href=url;download.download='pickleup-account-cache-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'}}
}
async function run(work){try{await work()}catch(_){} }
planBtn.addEventListener('click',()=>{if(!planBtn.disabled&&controller)run(()=>controller.planRestore())});
planList.addEventListener('click',event=>{const button=event.target.closest?.('button[data-restore-index]');if(!button||button.disabled||!controller)return;const index=Number(button.dataset.restoreIndex);button.disabled=true;run(()=>controller.restoreItem(index))});
compare.addEventListener('click',()=>{if(!compare.disabled&&controller)run(()=>controller.compareFile())});
capture.addEventListener('click',()=>{if(!capture.disabled&&controller)run(()=>controller.capture())});
file.addEventListener('change',()=>{const selected=file.files?.[0];if(!selected||file.disabled||!controller)return;run(()=>controller.inspect(()=>{if(selected.size>PickleUpAccountRescueCore.MAX_BYTES)throw new PickleUpAccountRescueCore.RescueError('too_large');return selected.text()})).finally(()=>{file.value=''})});
download.addEventListener('click',event=>{try{if(!controller||download.hidden||!url)throw Error();controller.download()}catch(_){event.preventDefault();clearURL();download.hidden=true}});
const config=root.PICKLEUP_AUTH_CONFIG;
if(!config?.enabled||!config.url||!config.publishableKey){capture.disabled=file.disabled=compare.disabled=planBtn.disabled=true;download.hidden=true;status.textContent='Chế độ khách · đăng nhập chưa được cấu hình. Backup V5/raw rescue phía trên vẫn dùng được.';return}
(async()=>{
 try{const auth=await PickleUpAuth.getShared(config);await auth.ready;controller=PickleUpAccountRescueController.create({auth,openRepository:()=>PickleUpLocalRepository.open({onVersionChange:()=>controller?.invalidate()}),onChange:paint});paint(controller.getState())}
 catch(_){capture.disabled=file.disabled=compare.disabled=planBtn.disabled=true;status.textContent='Chưa mở được chức năng cứu hộ tài khoản. Chế độ khách vẫn dùng được.'}
})();
})(window);
