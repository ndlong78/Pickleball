(function(){
'use strict';
const levels=[
['1.0–2.0','Làm quen','Luật chơi, cầm vợt, giao bóng cơ bản','8 tuần'],
['2.0–2.5','Nền tảng','Trả giao bóng, độ sâu và di chuyển','12 tuần'],
['2.5–3.0','Kiểm soát','Dink, volley và phối hợp đánh đôi','16 tuần'],
['3.0–3.5','Chiến thuật','Third-shot, reset và chuyển tiếp','20 tuần'],
['3.5–4.0','Thi đấu','Đọc trận, phối hợp và giữ nhịp','24 tuần'],
['4.0–4.5','Nâng cao','Counterattack, speed-up chọn lọc','24 tuần'],
['4.5–5.0','Chuyên sâu','Điều chỉnh trận đấu và hiệu suất','32 tuần']
];
const root=document.getElementById('levelCards');
root.innerHTML=levels.map(x=>'<article class="level"><strong>'+x[0]+'</strong><h3>'+x[1]+'</h3><p>'+x[2]+'</p><small>Giáo án dự kiến: '+x[3]+'</small></article>').join('');
function download(name,payload){const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
const status=document.getElementById('backupStatus');
const core=window.PickleUpBackupV1,storage=window.PickleUpLegacyStorage;
// Fixed messages only; never echo a parser/storage exception or private payload.
let busy=false;
const errors={source_changed:'Dữ liệu đang đổi ở tab khác. Đóng tab khác rồi tạo lại bản sao lưu.',credentials_detected:'Có dấu hiệu thông tin đăng nhập trong nội dung. Không xuất/nhập tệp; giữ dữ liệu riêng tư và kiểm tra trước.',invalid_data:'Có dữ liệu khách lỗi hoặc không hợp lệ. Dùng Bản cứu hộ nguyên trạng để giữ raw; chưa ghi hoặc bỏ dữ liệu nào.',invalid_json:'Tệp không phải JSON hợp lệ.',too_large:'Tệp hoặc nhật ký phục hồi vượt giới hạn; chưa ghi dữ liệu.',storage_unavailable:'Không đọc/ghi được lưu trữ; chưa xác nhận khôi phục.',rolled_back:'Khôi phục bị lỗi; đã quay lại dữ liệu trước đó. Chưa nhập tệp.',recovery_required:'Chưa quay lại được đầy đủ. Nhật ký bản cũ được giữ; đóng các tab khác và tải lại để phục hồi.',locks_unavailable:'Trình duyệt chưa hỗ trợ khóa khôi phục an toàn. Chưa ghi dữ liệu; vẫn có thể xuất bản cứu hộ.',busy:'Tab khác đang khôi phục. Đóng tab đó hoặc đợi hoàn tất rồi tải lại.'};
function controls(value){busy=value;document.getElementById('backupAll').disabled=value;document.getElementById('restoreFile').disabled=value}
document.getElementById('backupAll').addEventListener('click',()=>{
 if(busy)return;
 try{
  const data=core.capture(localStorage,window,storage.FIELDS);
  download('pickleup-backup-'+new Date().toISOString().slice(0,10)+'.json',data);
  status.textContent='Đã yêu cầu tải backup V1 của dữ liệu khách. Kiểm tra tệp trong Downloads và giữ riêng tư ngoài trình duyệt.';
 }catch(error){status.textContent=errors[error.code]||'Chưa tạo được backup V1. Dùng Bản cứu hộ nguyên trạng; dữ liệu gốc được giữ nguyên.'}
});
document.getElementById('restoreFile').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file||busy)return;
 controls(true);
 try{
  if(file.size>core.MAX_BYTES)throw new core.BackupError('too_large');
  const data=core.parse(await file.text(),window);
  if(!confirm('Đóng các tab PickleUp khác trước khi khôi phục dữ liệu khách. Các phần có trong tệp sẽ thay thế dữ liệu hiện tại; phần vắng mặt giữ nguyên. Không nhập vào tài khoản. Tiếp tục?'))return;
  await storage.restore(core.patch(data,storage.FIELDS));
  status.textContent='Khôi phục thành công. Đang cập nhật giao diện.';
  location.reload();
 }catch(error){status.textContent=errors[error.code]||'Không thể khôi phục tệp này. Dữ liệu chưa được xác nhận thay đổi; giữ bản cứu hộ.'}
 finally{event.target.value='';controls(false)}
});
controls(false);
})();
