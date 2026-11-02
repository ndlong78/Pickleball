/* Academy projection only. Never creates attempts from legacy latest scores. */
(function(root){
'use strict';
const VERSION='academy-80-v1',SCORES='pickleup_academy_v2',HISTORY='pickleup_academy_history_v44';
function instant(value){const fraction=value.match(/T\d{2}:\d{2}:\d{2}\.(\d+)/)?.[1]||'';return BigInt(Date.parse(value))*1000n+BigInt(fraction.slice(3,6).padEnd(3,'0')||'0')}
function project(projection,lessons,{now=new Date(),activityCore=root.PickleUpActivityCore}={}){
 const library=new Map(lessons.map(x=>[x.id,x])),events=projection?.events?.academy_attempts||[],records={},history=[];
 const cutoff=new Date(now).getTime();if(!Number.isFinite(cutoff))throw Error('invalid_date');
 for(const event of events){
  const lesson=library.get(event.lesson_id);
  if(!lesson||event.skill!==lesson.skill||event.level_band!==lesson.level||event.occurred_at===null||instant(event.occurred_at)>BigInt(cutoff)*1000n)continue;
  const item={id:event.lesson_id,skill:event.skill,level:event.level_band,score:event.score,date:event.occurred_at,eventId:event.id,account:true,pending:event.pending===true,comparisonKey:activityCore.comparisonKey('academy_attempts',event),currentContent:event.content_version===VERSION&&event.lesson_snapshot.title===lesson.title&&event.lesson_snapshot.assessment===lesson.assessment.instruction};
  history.push(item);
 }
 history.sort((a,b)=>instant(a.date)<instant(b.date)?-1:instant(a.date)>instant(b.date)?1:b.eventId.localeCompare(a.eventId));
 for(const item of history)records[item.id]={...item};
 const ordered=structuredClone(events).sort((a,b)=>a.occurred_at===null?(b.occurred_at===null?a.id.localeCompare(b.id):1):b.occurred_at===null?-1:instant(a.occurred_at)>instant(b.occurred_at)?-1:instant(a.occurred_at)<instant(b.occurred_at)?1:a.id.localeCompare(b.id));
 return {records,history,events:ordered};
}
function attempt(lesson,score,{eventId,occurredAt,conditions=null,activityCore=root.PickleUpActivityCore}){
 return activityCore.payload('academy_attempts',{client_event_id:eventId,lesson_id:lesson.id,skill:lesson.skill,level_band:lesson.level,score,occurred_at:occurredAt,content_version:VERSION,lesson_snapshot:{title:lesson.title,assessment:lesson.assessment.instruction},conditions});
}
const api={VERSION,SCORES,HISTORY,project,attempt};if(typeof module!=='undefined')module.exports=api;else root.PickleUpAcademySourceCore=api;
})(typeof window==='undefined'?globalThis:window);
