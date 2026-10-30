(function(){
'use strict';
const host=document.getElementById('rescuePanel');if(!host)return;
const core=window.PickleUpRescue,status=host.querySelector('[role=status]'),rows=host.querySelector('tbody'),unknown=host.querySelector('[data-unknown]'),download=host.querySelector('[data-download]'),refresh=host.querySelector('[data-refresh]'),file=host.querySelector('input[type=file]');
const labels={absent:'Không có',readable:'Đọc được · cần đối soát',malformed:'JSON lỗi · giữ raw',empty:'Chuỗi rỗng · giữ nguyên',unknown:'Chưa biết định dạng',device_only:'Chỉ trên thiết bị'};
const errors={source_changed:'Dữ liệu đang thay đổi. Đóng tab khác, tạm dừng thao tác và xem lại trước khi tải.',storage_unavailable:'Không đọc được lưu trữ. Kiểm tra quyền của trình duyệt rồi thử lại.',credentials_detected:'Phát hiện trường có thể chứa thông tin đăng nhập. Không tạo bản xuất; dữ liệu gốc được giữ nguyên.',too_large:'Tệp hoặc dữ liệu vượt giới hạn 32 MiB. Dữ liệu gốc được giữ nguyên.',checksum_mismatch:'Fingerprint không khớp. Tệp có thể đã bị thay đổi; không dùng để nhập.',invalid_json:'Tệp không phải JSON hợp lệ.',unsafe_key:'Nhóm dữ liệu không được phép xuất.',missing_inventory:'Tệp cứu hộ thiếu khóa trong danh mục 18 khóa.',invalid_format:'Chưa nhận diện được định dạng tệp PickleUp này.',too_complex:'Cấu trúc tệp quá sâu.',too_many_keys:'Quá nhiều khóa lưu trữ; chưa tạo được bản cứu hộ.'};
let snapshot=null,generation=0;
function selected(){return [...unknown.querySelectorAll('input:checked')].map(x=>x.value)}
function render(report){
 rows.replaceChildren();for(const row of report.rows){const tr=document.createElement('tr');for(const value of [row.label,labels[row.status],row.count,row.bytes]){const td=document.createElement('td');td.textContent=String(value);td.style.overflowWrap='anywhere';tr.appendChild(td)}rows.appendChild(tr)}
 host.querySelector('[data-source]').textContent='Nguồn: '+report.format+' · '+report.bytes+' byte · fingerprint '+report.fingerprint;
 status.textContent=report.warning;
}
async function run(work){const stamp=++generation;refresh.disabled=true;download.disabled=true;file.disabled=true;status.textContent='Đang đọc và đối chiếu dữ liệu…';try{await work(stamp)}catch(error){if(stamp===generation){snapshot=null;status.textContent=errors[error.code]||'Không đọc được dữ liệu. Hãy thử lại; dữ liệu gốc được giữ nguyên.'}}finally{if(stamp===generation){refresh.disabled=false;file.disabled=false;download.disabled=!snapshot}}}
refresh.addEventListener('click',()=>run(async stamp=>{
 const discovery=core.discover(localStorage);unknown.replaceChildren();
 for(const key of discovery.unknown){const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.value=key;label.append(box,document.createTextNode(' Kèm nhóm chưa biết: '+key));label.style.display='block';label.style.overflowWrap='anywhere';unknown.appendChild(label)}
 host.querySelector('[data-excluded]').textContent=discovery.excluded?'Đã loại '+discovery.excluded+' khóa có tên liên quan đến đăng nhập/bảo mật.':'';
 const captured=await core.capture(localStorage),report=await core.preview(JSON.stringify(captured));if(stamp!==generation)return;snapshot=captured;render(report);
}));
unknown.addEventListener('change',()=>run(async stamp=>{const captured=await core.capture(localStorage,{unknownKeys:selected()}),report=await core.preview(JSON.stringify(captured));if(stamp!==generation)return;snapshot=captured;render(report)}));
download.addEventListener('click',()=>run(async stamp=>{
 if(!snapshot)return;const captured=await core.capture(localStorage,{unknownKeys:selected()});
 if(stamp!==generation)return;
 if(captured.fingerprint!==snapshot.fingerprint){snapshot=null;throw new core.RescueError('source_changed')}
 const url=URL.createObjectURL(new Blob([JSON.stringify(captured)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='pickleup-raw-rescue-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Đã yêu cầu tải bản cứu hộ. Kiểm tra tệp trong Downloads và giữ bản sao ngoài trình duyệt ở nơi an toàn. Không có dữ liệu được tải lên.';
}));
file.addEventListener('change',()=>run(async stamp=>{
 const chosen=file.files?.[0];snapshot=null;if(!chosen)return;
 try{if(chosen.size>core.MAX_BYTES)throw new core.RescueError('too_large');const report=await core.preview(await chosen.text());if(stamp===generation)render(report)}finally{file.value=''}
}));
})();
