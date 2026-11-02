/* Self-assessment is a distinct scale2 event, never six measured /20 scores. */
(function(){
'use strict';
const data=window.PICKLEUP_ACTIVITY,$=id=>document.getElementById(id);
const criteria=[['serve','Giao bóng','Thường lỗi hoặc chưa biết luật','Giao hợp lệ ổn định','Giao sâu, chọn hướng và thay đổi nhịp'],['return','Trả giao bóng','Khó trả bóng đều','Trả được và tiến lên đúng lúc','Trả sâu, gây áp lực có chủ đích'],['dink','Dinking','Chưa giữ được bóng thấp','Duy trì dink qua lưới','Điều hướng dink và tạo cơ hội'],['volley','Volley','Phản xạ chậm, dễ lỗi','Đỡ volley ổn định','Chọn vị trí, block và counter'],['position','Vị trí sân','Chưa biết đứng và xoay người','Biết giữ vị trí với đồng đội','Di chuyển đồng bộ và đọc khoảng trống'],['strategy','Chiến thuật','Tập trung đưa bóng qua lưới','Biết khi nào lên lưới và giữ rally','Biết xây dựng điểm, thay đổi quyết định']];
let token=data.token(),dirty=false,saving=false,feedbackVersion=null;
const version=()=>data.isAccount()?data.getState().snapshot?.cursor?.localVersion||'unavailable':'guest';
const fields=$('assessmentFields');fields.replaceChildren();
for(const [key,name,...labels]of criteria){const label=document.createElement('label'),select=document.createElement('select');select.id='assess-'+key;label.htmlFor=select.id;label.textContent=name;labels.forEach((text,value)=>select.append(new Option(text,String(value))));select.addEventListener('change',()=>{dirty=true});label.append(select);fields.append(label)}
function show(record){
 if(!record){$('assessResult').textContent='Chưa có tự đánh giá trong nguồn dữ liệu này.';return}
 const values=criteria.map(c=>Number(record.answers?.[c[0]])||0),total=values.reduce((a,b)=>a+b,0),weak=criteria.filter((c,i)=>values[i]===Math.min(...values)).map(c=>c[1]),suggested=total<=3?'1.0–2.0':total<=7?'2.0–2.5':'2.5–3.0';
 $('assessResult').textContent='Điểm tự đánh giá: '+total+'/12. Nhóm giáo án gợi ý: '+suggested+'. Nên ưu tiên: '+weak.join(', ')+'. Đây chỉ là gợi ý nội bộ, không tương đương DUPR hoặc cấp độ thi đấu chính thức.';
}
function render(){
 if(token!==data.token()){token=data.token();dirty=false;saving=false;feedbackVersion=null;for(const [key]of criteria)$('assess-'+key).value='0';$('assessResult').textContent=''}
 if(!dirty&&!saving){const record=data.assessments('self')[0]||null;for(const [key]of criteria)$('assess-'+key).value=String(record?.answers?.[key]??0);if(feedbackVersion===null||feedbackVersion!==version()){feedbackVersion=null;show(record)}}
 if(data.isAccount()&&data.getView().mode!=='account')$('assessResult').textContent=data.notice();
 for(const control of [...fields.querySelectorAll('select'),$('assessBtn')])control.disabled=saving||!data.canWrite();
}
const history=document.createElement('div');history.id='selfAssessmentHistory';$('assessResult').after(history);PickleUpActivityHistory.mount(history,{kind:'skill_assessments',type:'self'});
$('assessBtn').addEventListener('click',async()=>{
 if(saving||!data.canWrite())return;const stamp=data.token(),answers=Object.fromEntries(criteria.map(c=>[c[0],Number($('assess-'+c[0]).value)]));saving=true;render();$('assessResult').textContent='Đang lưu tự đánh giá…';
 try{
  if(data.isAccount())await data.saveAssessment('self',answers);
  else localStorage.setItem('pickleup_assessment_v1',JSON.stringify({schemaVersion:1,answers,date:new Date().toISOString()}));
  if(stamp!==data.token())return;dirty=false;feedbackVersion=version();show({answers});if(data.isAccount())$('assessResult').textContent+=' Đã lưu lượt mới trên thiết bị · chờ đồng bộ.';
 }catch(e){if(stamp===data.token()){feedbackVersion=version();$('assessResult').textContent=data.isAccount()?PickleUpActivityHistory.error(e):'Không thể lưu trên trình duyệt. Hãy kiểm tra cài đặt lưu trữ.'}}
 finally{if(stamp===data.token()){saving=false;render()}}
});
document.addEventListener('pickleup:activity-data',render);render();
})();
