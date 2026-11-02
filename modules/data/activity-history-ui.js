/* Paginated raw account history. Never runs a legacy capped validator on account events. */
(function(root){
'use strict';
const data=root.PICKLEUP_ACTIVITY,core=root.PickleUpActivitySourceCore;
const names=core.NAMES;
const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el};
function error(e){return ({quota_exceeded:'Không đủ dung lượng. Chưa lưu; hãy giữ dữ liệu nhập và xuất cache đang có.',account_changed:'Tài khoản hoặc nguồn đã đổi. Dữ liệu cũ giữ riêng.',local_conflict:'Dữ liệu đã đổi. Đọc lại và xem mục cần xử lý.',needs_review:'Cần xem và xử lý trong Dữ liệu.',invalid_activity:'Dữ liệu không hợp lệ. Kiểm tra lại trước khi lưu.',source_unavailable:'Chưa thể lưu vào nguồn này. Kiểm tra kho hoạt động trong Dữ liệu.'})[e?.code]||'Chưa lưu được. Giữ dữ liệu nhập và kiểm tra kho hoạt động trong Dữ liệu.'}
function mount(legacyHost,{kind,type=null}={}){
 const host=node('div');host.dataset.activityHistory=type||kind;legacyHost.after(host);
 let page=0,busy=false,token=data.token();const status=node('p',''),count=node('p',''),navigation=node('div'),prev=node('button','Trước'),next=node('button','Sau'),position=node('span'),list=node('ul');
 host.classList.add('activity-history');status.setAttribute('role','status');status.setAttribute('aria-live','polite');list.className='academy-attempt-list';prev.type=next.type='button';navigation.className='sync-actions';navigation.append(prev,position,next);host.replaceChildren(count,navigation,list,status);
 function render(){
  if(token!==data.token()){token=data.token();page=0;busy=false;status.textContent=''}
  legacyHost.hidden=data.isAccount();host.hidden=!data.isAccount();if(host.hidden){list.replaceChildren();count.textContent='';position.textContent='';return}
  if(data.getView().mode!=='account'){list.replaceChildren();count.textContent=data.notice();prev.disabled=next.disabled=true;position.textContent='Chưa đọc được lịch sử';return}
  const events=data.events(kind).filter(x=>!type||x.assessment_type===type),pages=Math.max(1,Math.ceil(events.length/20));page=Math.min(page,pages-1);
  count.textContent=events.length+' lượt trong cache tài khoản · giữ đủ lịch sử, kể cả ngày chưa rõ hoặc tương lai.';position.textContent='Trang '+(page+1)+'/'+pages;prev.disabled=page===0;next.disabled=page===pages-1;
  const records=new Map(data.getState().snapshot.records.filter(r=>r.kind===kind).map(r=>[r.id,r]));list.replaceChildren();
  for(const event of events.slice(page*20,(page+1)*20)){
   const item=node('li'),date=event.occurred_at===null?'Chưa rõ ngày':new Date(event.occurred_at).toLocaleString('vi-VN'),future=event.occurred_at!==null&&Date.parse(event.occurred_at)>Date.now();
   const title=kind==='match_records'?(event.mode==='doubles'?'Đánh đôi':'Đánh đơn')+' · '+event.ours+'–'+event.theirs:(event.assessment_type==='self'?'Tự đánh giá 0–2':event.assessment_type==='stage'?'Kiểm tra cơ bản /20':'Kiểm tra nâng cao /20')+(event.level_band?' · '+event.level_band:'');
   item.append(node('strong',title),node('p',date+(records.get(event.id)?.reviewRequired?' · cần xử lý trong Dữ liệu':event.pending?' · chờ đồng bộ':'')+(future?' · ngày tương lai, chưa phân tích':'')));
   if(kind==='skill_assessments')item.append(node('p',Object.entries(event.scores).map(([key,value])=>(names[key]||key)+': '+value+'/'+event.scale).join(' · ')));
   else{item.append(node('p','Trọng tâm: '+(core.FOCUS_LABELS[event.focus]||event.focus)+(event.doubles_issue?' · Đánh đôi: '+(root.PICKLEUP_PRACTICE_CONDITIONS?.DOUBLES[event.doubles_issue]||event.doubles_issue):'')));if(event.note)item.append(node('p',event.note))}
   const row=records.get(event.id),stamp=token,remove=node('button','Xóa lượt này');remove.type='button';remove.dataset.eventId=event.id;remove.disabled=busy||!data.canWrite()||!row||row.reviewRequired;
   remove.addEventListener('click',async()=>{
    if(busy||stamp!==data.token()||!confirm('Xóa riêng lượt này? Sự kiện đã xóa không có thao tác khôi phục; thay đổi sẽ chờ đồng bộ.')||stamp!==data.token())return;
    busy=true;status.textContent='Đang lưu thao tác xóa…';render();
    try{await data.deleteEvent(kind,event.id,row.localRevision);if(stamp===data.token())status.textContent='Đã lưu thao tác xóa trên thiết bị. Kiểm tra đồng bộ trong Dữ liệu.'}
    catch(e){if(stamp===data.token())status.textContent=error(e)}finally{if(stamp===data.token()){busy=false;render()}}
   });item.append(remove);list.append(item);
  }
 }
 prev.addEventListener('click',()=>{page--;render()});next.addEventListener('click',()=>{page++;render()});document.addEventListener('pickleup:activity-data',render);render();return {render};
}
root.PickleUpActivityHistory={mount,error};
})(window);
