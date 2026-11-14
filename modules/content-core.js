/* PickleUp V5.21 — Academy content contract shared by the CMS page, the build
   script and the app. Pure functions only: no DOM, storage or network. */
(function(root){
'use strict';
const SCHEMA=1;
const SKILLS=['serve','return','dink','volley','position','strategy'];
const LEVELS=['1.0–2.0','2.0–2.5','2.5–3.0','3.0–3.5','3.5–4.0','4.0–4.5','4.5–5.0'];
const STATUSES=['draft','review','published','retired'];
const ANGLES=['back','side','top','front'];
// Current ID space (DB domain pickleup_private.lesson_id). New IDs need the
// additive ID-space PR first; see docs/CONTENT_VERSIONING_CMS.md section 6.
const LESSON_ID=/^PU-(?:0(?:0[1-9]|[1-9][0-9])|[1-9][0-9]{2,3})$/;
const YOUTUBE_ID=/^[A-Za-z0-9_-]{11}$/;
// Per-attempt assessment versions are not stored yet, so a new assessment
// version would mix old and new scores. Lift only together with that change.
// Since V5.22.0 every score records its assessment version, so the test may change.
const MAX_ASSESSMENT_VERSION=999;
const LEGACY_KEYS=['id','week','level','advanced','focus','skill','skillName','title','goal','zone','setup','cues','mistakes','drills','assessment','warmup','testMinutes','cooldown','duration','diagram','coachNote'];
const META_KEYS=['status','revision','assessmentVersion','assessmentHash','media'];
const KNOWN=new Set([...LEGACY_KEYS,...META_KEYS]);
const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(isObject(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
// Fields whose change makes /20 scores incomparable (assessment contract).
function scoringFields(lesson){
 return {level:lesson.level,skill:lesson.skill,zone:lesson.zone,testMinutes:lesson.testMinutes,
  assessment:{attempts:lesson.assessment?.attempts,target:lesson.assessment?.target,instruction:lesson.assessment?.instruction},
  drills:Array.isArray(lesson.drills)?lesson.drills.map(d=>d?.minutes):null};
}
// FNV-1a 32-bit: change detection only, not a security boundary.
function hash(textValue){
 let h=0x811c9dc5;const bytes=new TextEncoder().encode(textValue);
 for(const b of bytes){h^=b;h=Math.imul(h,0x01000193)>>>0}
 return h.toString(16).padStart(8,'0');
}
const scoringHash=lesson=>hash(canonical(scoringFields(lesson)));
function withMeta(lesson){
 return {...lesson,status:'published',revision:1,assessmentVersion:1,assessmentHash:scoringHash(lesson),media:[]};
}
function youtubeId(input){
 const value=String(input||'').trim();
 if(YOUTUBE_ID.test(value))return value;
 let url;try{url=new URL(value)}catch(_){return null}
 if(url.protocol!=='https:')return null;
 const host=url.hostname.replace(/^www\.|^m\./,'');
 let id=null;
 if(host==='youtu.be')id=url.pathname.slice(1).split('/')[0];
 else if(['youtube.com','youtube-nocookie.com','music.youtube.com'].includes(host)){
  if(url.pathname==='/watch')id=url.searchParams.get('v');
  else{const m=url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);if(m)id=m[1]}
 }
 return id&&YOUTUBE_ID.test(id)?id:null;
}
function embedUrl(media){
 if(media?.kind!=='youtube'||!YOUTUBE_ID.test(media.id))return null;
 const params=new URLSearchParams({rel:'0',playsinline:'1',modestbranding:'1',autoplay:'1'});
 if(Number.isInteger(media.start)&&media.start>0)params.set('start',String(media.start));
 if(Number.isInteger(media.end)&&media.end>0)params.set('end',String(media.end));
 return 'https://www.youtube-nocookie.com/embed/'+media.id+'?'+params.toString();
}
function validateMedia(list,where,errors){
 if(!Array.isArray(list)){errors.push(where+': media phải là danh sách');return}
 if(list.length>6)errors.push(where+': tối đa 6 video mỗi bài');
 list.forEach((m,i)=>{
  const at=where+' video '+(i+1);
  if(!isObject(m)){errors.push(at+': không hợp lệ');return}
  for(const key of Object.keys(m))if(!['kind','id','angle','start','end','title'].includes(key))errors.push(at+': trường lạ "'+key+'"');
  if(m.kind!=='youtube')errors.push(at+': chỉ hỗ trợ YouTube');
  if(!YOUTUBE_ID.test(m.id||''))errors.push(at+': ID YouTube không hợp lệ');
  if(!ANGLES.includes(m.angle))errors.push(at+': góc quay phải là '+ANGLES.join('/'));
  if(m.start!==undefined&&!int(m.start,0,3600))errors.push(at+': giây bắt đầu không hợp lệ');
  if(m.end!==undefined&&(!int(m.end,1,3600)||(m.start||0)>=m.end))errors.push(at+': giây kết thúc phải lớn hơn giây bắt đầu');
  if(m.title!==undefined&&!text(m.title,120))errors.push(at+': tiêu đề video tối đa 120 ký tự');
 });
}
function validateLesson(l,errors){
 const where=(l&&typeof l.id==='string'?l.id:'Bài ?');
 if(!isObject(l)){errors.push('Bài không hợp lệ');return}
 for(const key of Object.keys(l))if(!KNOWN.has(key))errors.push(where+': trường lạ "'+key+'"');
 if(!LESSON_ID.test(l.id||''))errors.push(where+': ID phải có dạng PU-001…PU-999 hoặc PU-1000…PU-9999');
 if(!STATUSES.includes(l.status))errors.push(where+': trạng thái phải là '+STATUSES.join('/'));
 if(!int(l.revision,1,1e6))errors.push(where+': revision phải là số nguyên ≥ 1');
 if(!int(l.assessmentVersion,1,MAX_ASSESSMENT_VERSION))errors.push(where+': phiên bản đề phải là số nguyên từ 1 đến '+MAX_ASSESSMENT_VERSION);
 if(!SKILLS.includes(l.skill))errors.push(where+': kỹ năng không hợp lệ');
 if(!LEVELS.includes(l.level))errors.push(where+': cấp độ không hợp lệ');
 for(const [key,max]of [['title',160],['goal',600],['zone',200],['setup',400],['skillName',60]])if(!text(l[key],max))errors.push(where+': '+key+' trống hoặc quá dài');
 if(!Array.isArray(l.cues)||l.cues.length!==3||l.cues.some(c=>!text(c,200)))errors.push(where+': cần đúng 3 điểm cần nhớ, mỗi điểm ≤ 200 ký tự');
 if(!Array.isArray(l.mistakes)||l.mistakes.length<1||l.mistakes.length>6||l.mistakes.some(c=>!text(c,240)))errors.push(where+': lỗi thường gặp cần 1–6 mục');
 if(!Array.isArray(l.drills)||l.drills.length!==3)errors.push(where+': cần đúng 3 bài drill');
 else l.drills.forEach((d,i)=>{if(!isObject(d)||!int(d.minutes,1,30)||!text(d.name,160)||!text(d.instruction,800)||!text(d.check,300))errors.push(where+': drill '+(i+1)+' thiếu tên/thời lượng/hướng dẫn/cách kiểm tra')});
 if(!isObject(l.assessment)||l.assessment.attempts!==20||!int(l.assessment.target,1,20)||!text(l.assessment.instruction,600))errors.push(where+': đề kiểm tra cần 20 lượt, mục tiêu 1–20 và hướng dẫn');
 const minutes=(l.warmup||0)+(Array.isArray(l.drills)?l.drills.reduce((s,d)=>s+(d?.minutes||0),0):0)+(l.testMinutes||0)+(l.cooldown||0);
 if(l.duration!==60||minutes!==60)errors.push(where+': tổng buổi phải đúng 60 phút (hiện '+minutes+')');
 if(l.assessmentHash!==scoringHash(l))errors.push(where+': trường chấm điểm (đề, mục tiêu, vùng, thời lượng drill, kỹ năng, cấp độ) đã đổi mà chưa tăng phiên bản đề');
 validateMedia(l.media,where,errors);
}
function validate(doc,{previous=null}={}){
 const errors=[];
 if(!isObject(doc)||doc.schemaVersion!==SCHEMA||!Array.isArray(doc.lessons)||!doc.lessons.length)return ['Tệp nội dung không đúng định dạng (schemaVersion '+SCHEMA+')'];
 const seen=new Set();
 for(const l of doc.lessons){
  if(seen.has(l?.id))errors.push((l?.id||'?')+': trùng ID');
  seen.add(l?.id);validateLesson(l,errors);
 }
 if(previous&&Array.isArray(previous.lessons)){
  const now=new Map(doc.lessons.map(l=>[l?.id,l]));
  for(const old of previous.lessons){
   const cur=now.get(old.id);
   if(!cur){errors.push(old.id+': không được xóa bài (chuyển trạng thái retired)');continue}
   if(cur.revision<old.revision)errors.push(old.id+': revision không được giảm');
   if(cur.assessmentVersion<old.assessmentVersion)errors.push(old.id+': phiên bản đề không được giảm');
   // One published change of the test is exactly one new version; wording-only edits keep it.
   else if(cur.assessmentHash!==old.assessmentHash&&cur.assessmentVersion!==old.assessmentVersion+1)errors.push(old.id+': đề kiểm tra đổi thì phiên bản đề phải tăng đúng 1 (từ '+old.assessmentVersion+' lên '+(old.assessmentVersion+1)+')');
   else if(cur.assessmentHash===old.assessmentHash&&cur.assessmentVersion!==old.assessmentVersion)errors.push(old.id+': đề kiểm tra không đổi nên phiên bản đề phải giữ nguyên');
   if(canonical(cur)!==canonical(old)&&cur.revision===old.revision)errors.push(old.id+': nội dung đổi nhưng chưa tăng revision');
  }
 }
 return errors;
}
// CMS edit: bump revision on any change, and the assessment version when a
// scoring field changes. Validation then decides whether that is allowed.
function applyEdit(previous,edited){
 const next={...edited};
 const strip=l=>{const {revision,assessmentVersion,assessmentHash,...rest}=l;return rest};
 if(canonical(strip(previous))===canonical(strip(next)))return {...previous};
 next.revision=previous.revision+1;
 const h=scoringHash(next);
 if(h!==previous.assessmentHash){next.assessmentVersion=previous.assessmentVersion+1;next.assessmentHash=h}
 else{next.assessmentVersion=previous.assessmentVersion;next.assessmentHash=previous.assessmentHash}
 return next;
}
// Runtime lesson objects keep the legacy shape plus revision/version/media.
function runtime(lesson){const {assessmentHash,...rest}=lesson;return rest}
const stringify=doc=>JSON.stringify(doc,null,1)+'\n';
// curriculum.js is the single editable source: a fixed header and adapter
// around the JSON document. The CMS writes it; CI parses it back exactly.
const BEGIN='/*CONTENT-BEGIN*/',END='/*CONTENT-END*/';
const HEAD='/* PickleUp Academy content (schema 1). Edit lessons through cms/index.html;\n   keep the markers. scripts/check-content.cjs validates this file in CI. */\nwindow.PICKLEUP_CONTENT_DOC='+BEGIN+'\n';
const TAIL='\n'+END+';\nwindow.PICKLEUP_CURRICULUM=window.PICKLEUP_CONTENT_DOC.lessons.filter(function(l){return !l.advanced}).map(function(l){var o={};for(var k in l)if(k!=="assessmentHash")o[k]=l[k];return o});\n';
function renderCurriculum(doc){return HEAD+JSON.stringify(doc,null,1)+TAIL}
function parseCurriculum(source){
 if(typeof source!=='string'||!source.startsWith(HEAD)||!source.endsWith(TAIL))throw new Error('curriculum.js phải giữ nguyên phần đầu và phần adapter quanh dữ liệu');
 const doc=JSON.parse(source.slice(HEAD.length,source.length-TAIL.length));
 if(renderCurriculum(doc)!==source)throw new Error('curriculum.js chưa đúng định dạng chuẩn; xuất lại từ cms/');
 return doc;
}
const api=Object.freeze({SCHEMA,SKILLS,LEVELS,STATUSES,ANGLES,MAX_ASSESSMENT_VERSION,canonical,scoringHash,withMeta,youtubeId,embedUrl,validate,applyEdit,runtime,stringify,renderCurriculum,parseCurriculum});
root.PICKLEUP_CONTENT=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
