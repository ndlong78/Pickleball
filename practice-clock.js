/* PickleUp V2.5 — countdown state machine, no dependencies. */
(function(root){
"use strict";
const stages=[
{key:"warmup",title:"Khởi động",minutes:10,description:"Làm nóng khớp, bước ngang nhẹ và đánh bóng ở tốc độ thấp."},
{key:"drill1",title:"Bài tập 1",minutes:12},
{key:"drill2",title:"Bài tập 2",minutes:12},
{key:"drill3",title:"Bài tập 3",minutes:15},
{key:"assessment",title:"Kiểm tra cuối buổi",minutes:6,description:"Thực hiện 20 lượt kiểm tra kỹ năng ưu tiên cao nhất."},
{key:"cooldown",title:"Thả lỏng",minutes:5,description:"Đi bộ nhẹ, thả lỏng cơ và ghi lại kết quả thực tế."}
];
function copy(s){return {...s}}
function create(planId){if(typeof planId!=="string"||!planId)throw Error("Thiếu mã giáo án.");return {planId,index:0,remaining:stages[0].minutes*60,running:false,deadline:null,ended:false}}
function valid(s){return !!s&&typeof s.planId==="string"&&s.planId.length>0&&Number.isInteger(s.index)&&s.index>=0&&s.index<=stages.length&&Number.isInteger(s.remaining)&&s.remaining>=0&&s.remaining<=900&&typeof s.running==="boolean"&&(s.deadline===null||Number.isFinite(s.deadline))&&typeof s.ended==="boolean"}
function readStored(data,planId,now=Date.now()){
 if(!valid(data)||data.planId!==planId)return create(planId);
 const state={...data};
 if(state.index===stages.length)return {...state,index:stages.length,remaining:0,running:false,deadline:null,ended:true};
 const limit=stages[state.index].minutes*60;
 state.remaining=Math.min(limit,state.remaining);
 if(state.running){if(!Number.isFinite(state.deadline)||state.deadline<=0)return create(planId);return tick(state,now)}
 return {...state,deadline:null,ended:false};
}
function seconds(s,now=Date.now()){
 if(!s.running||!Number.isFinite(s.deadline))return s.remaining;
 return Math.max(0,Math.ceil((s.deadline-now)/1000));
}
function tick(s,now=Date.now()){
 if(!s.running)return copy(s);
 const left=seconds(s,now);
 if(left===0)return {...s,running:false,deadline:null,remaining:0,ended:false};
 return {...s,remaining:left};
}
function start(s,now=Date.now()){
 if(s.index>=stages.length)return copy(s);
 const at=tick(s,now);
 if(at.running||at.remaining===0)return at;
 return {...at,running:true,deadline:now+at.remaining*1000};
}
function pause(s,now=Date.now()){const at=tick(s,now);return {...at,remaining:seconds(at,now),running:false,deadline:null}}
function step(s,direction,now=Date.now()){
 const at=pause(s,now),index=Math.max(0,Math.min(stages.length,at.index+direction));
 return {...at,index,remaining:index===stages.length?0:stages[index].minutes*60,ended:index===stages.length};
}
function reset(s){return create(s.planId)}
function fmt(seconds){const m=Math.floor(seconds/60),s=seconds%60;return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
root.PICKLEUP_PRACTICE_CLOCK={stages,create,readStored,valid,seconds,tick,start,pause,step,reset,fmt};
})(typeof window==="undefined"?globalThis:window);
