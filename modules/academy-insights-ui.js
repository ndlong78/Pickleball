/* PickleUp V4.5 Stable — stage / skill / lesson history; local-only, accessible. */
(function(){
"use strict";
const core=window.PICKLEUP_ACADEMY_INSIGHTS,historyCore=window.PICKLEUP_ACADEMY_TRENDS,lessons=window.PICKLEUP_CURRICULUM||[];
const byId=id=>document.getElementById(id),level=byId("aiLevel"),skill=byId("aiSkill"),lesson=byId("aiLesson");
if(!core||!historyCore||!level||!skill||!lesson)return;
const historyKey="pickleup_academy_history_v44",scoresKey="pickleup_academy_v2";
function load(){
 let scores={};try{const v=JSON.parse(localStorage.getItem(scoresKey)||"{}");if(v&&typeof v==="object"&&!Array.isArray(v))scores=v}catch(_){}
 let history=[];try{history=historyCore.readHistory(localStorage.getItem(historyKey))}catch(_){}
 return {scores,history};
}
function element(tag,cls,value){
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(value!==undefined)el.textContent=String(value);
 return el;
}
function chooseSkill(preserve){
 const old=skill.value,available=[...new Set(lessons.filter(x=>x.level===level.value).map(x=>x.skill))];
 const values=load();
 const best=available.find(k=>core.gather(lessons,values.scores,values.history,level.value,k).length>0)||available[0]||"";
 const fragment=document.createDocumentFragment();
 available.forEach(k=>{const option=element("option","",core.SKILLS[k]||k);option.value=k;fragment.appendChild(option)});
 skill.replaceChildren(fragment);
 skill.value=preserve&&available.includes(old)?old:best;
 chooseLesson(preserve,values);
}
function chooseLesson(preserve,values=load()){
 const old=lesson.value;
 const result=core.analyze(lessons,values.scores,values.history,level.value,skill.value);
 const fragment=document.createDocumentFragment();
 if(!result.lessons.length){
  const option=element("option","","Chưa có giáo án được ghi điểm");option.value="";fragment.append(option);
 }else{
  result.lessons.forEach(group=>{
   const option=element("option","","Tuần "+group.lesson.week+" · "+group.lesson.title+" ("+group.count+" lượt)");
   option.value=group.id;fragment.append(option);
  });
 }
 lesson.replaceChildren(fragment);
 lesson.value=preserve&&result.lessons.some(group=>group.id===old)?old:(result.lesson?.id||"");
 draw(values);
}
function draw(values=load()){
 const result=core.analyze(lessons,values.scores,values.history,level.value,skill.value,lesson.value);
 byId("aiCount").textContent=String(result.count);
 byId("aiAverage").textContent=result.mean===null?"—":result.mean.toFixed(1)+"/20";
 byId("aiDelta").textContent=result.delta===null?"Chưa đủ dữ liệu":(result.delta>0?"+":"")+result.delta+" điểm";
 byId("aiStatus").textContent=result.status;
 byId("aiAdvice").textContent=result.advice;
 byId("aiChartSummary").textContent=result.lesson
  ?"Đang xem "+result.lessonCount+" lượt của riêng tuần "+result.lesson.week+" · "+result.lesson.title+
   ". Biểu đồ tối đa 12 lượt; biến động dựa trên tối đa 6 lượt gần nhất cùng giáo án."
  :"Chưa có điểm ở kỹ năng và cấp độ đã chọn.";
 const link=byId("aiOpenLesson");link.dataset.lessonId=result.lesson?.id||"";
 link.textContent=result.lesson?"Luyện tiếp: Tuần "+result.lesson.week+" · "+result.lesson.title:"Mở Học viện để bắt đầu";
 const chart=byId("aiChart");
 if(!result.chart.length){chart.replaceChildren(element("p","sub","Chưa có điểm. Lưu kết quả trong Học viện để xem biểu đồ."));return}
 const list=element("ol","ai-plot");
 result.chart.forEach((p,index)=>{
  const item=element("li","ai-column"),bar=element("div","ai-column-bar");
  bar.style.height=Math.max(2,p.score*5)+"%";
  const legend="Lượt "+(index+1)+": Tuần "+p.week+", "+p.score+"/20"+(p.legacy?" (điểm cũ)":"");
  bar.title=legend;item.setAttribute("aria-label",legend);
  item.append(element("strong","ai-column-value",p.score+"/20"),bar,element("span","ai-column-label","#"+(index+1)));
  list.appendChild(item);
 });
 chart.replaceChildren(list);
}
level.addEventListener("change",()=>chooseSkill(false));
skill.addEventListener("change",()=>chooseLesson(false));
lesson.addEventListener("change",()=>draw());
byId("aiRefresh").addEventListener("click",()=>chooseSkill(true));
byId("aiOpenLesson").addEventListener("click",()=>{
 const id=byId("aiOpenLesson").dataset.lessonId;
 if(!id)return;
 try{localStorage.setItem("pickleup_academy_last_lesson_v4",id)}catch(_){}
 document.dispatchEvent(new CustomEvent("pickleup:academy-request-lesson",{detail:{id}}));
});
window.addEventListener("storage",event=>{if([historyKey,scoresKey].includes(event.key))chooseSkill(true)});
document.addEventListener("pickleup:score-saved",()=>chooseSkill(true));
chooseSkill(false);
})();
