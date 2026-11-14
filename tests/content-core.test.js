const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const core=require('../modules/content-core.js'),{check}=require('../scripts/check-content.cjs');
const source=fs.readFileSync(path.join(__dirname,'../curriculum.js'),'utf8');
const doc=()=>core.parseCurriculum(source);
// The published library stays 80 lessons until the coach publishes drafts; drafts only add to the file.
const live=()=>{const d=doc();return {...d,lessons:d.lessons.filter(l=>l.status==='published')}};
test('curriculum.js is the canonical, valid content source; 80 lessons are published',()=>{
 const d=doc();
 assert.equal(live().lessons.length,80);
 assert.equal(d.lessons.slice(0,80).every((l,i)=>l.id==='PU-'+String(i+1).padStart(3,'0')),true);
 assert.deepEqual(core.validate(d),[]);
 assert.equal(core.renderCurriculum(d),source);
 assert.equal(check().ok,true);
 assert.ok(d.lessons.every(l=>core.STATUSES.includes(l.status)&&l.revision>=1&&l.assessmentVersion>=1&&Array.isArray(l.media)));
 // Drafts written for coach review: both 4.0–5.0 bands, never published by this file.
 const drafts=d.lessons.filter(l=>l.status==='draft');
 assert.equal(drafts.every(l=>['4.0–4.5','4.5–5.0'].includes(l.level)&&l.advanced===true&&l.revision===1&&l.assessmentVersion===1&&/không phải chứng nhận trình độ\.$/.test(l.assessment.instruction)),true);
});
test('runtime globals keep the legacy shape without leaking the change-detection hash',()=>{
 const context={};context.window=context;require('node:vm').runInNewContext(source+fs.readFileSync(path.join(__dirname,'../advanced-curriculum.js'),'utf8'),context);
 assert.equal(context.PICKLEUP_CURRICULUM.length,80);
 assert.equal(context.PICKLEUP_ADVANCED_CURRICULUM.length,44);
 assert.ok(context.PICKLEUP_CURRICULUM.every(l=>!('assessmentHash' in l)));
 assert.equal(JSON.stringify(context.PICKLEUP_CURRICULUM.slice(0,36).map(l=>l.id)),JSON.stringify(doc().lessons.filter(l=>!l.advanced).map(l=>l.id)));
});
test('wording, cues and videos bump only the revision; scoring edits are blocked for now',()=>{
 const d=doc(),before=d.lessons[0];
 const edited=core.applyEdit(before,{...before,cues:['Một','Hai','Ba'],media:[{kind:'youtube',id:'dQw4w9WgXcQ',angle:'side',start:5,end:30}]});
 assert.equal(edited.revision,before.revision+1);
 assert.equal(edited.assessmentVersion,1);
 d.lessons[0]=edited;assert.deepEqual(core.validate(d,{previous:doc()}),[]);
 const scoring=core.applyEdit(before,{...before,assessment:{...before.assessment,target:before.assessment.target+1}});
 assert.equal(scoring.assessmentVersion,2);
 d.lessons[0]=scoring;assert.deepEqual(core.validate(d,{previous:doc()}),[]);
 // A changed test must be exactly one new version; an unchanged test keeps its version.
 d.lessons[0]={...scoring,assessmentVersion:3};assert.match(core.validate(d,{previous:doc()}).join('\n'),/phải tăng đúng 1/);
 d.lessons[0]={...before,revision:before.revision+1,title:before.title+' x',assessmentVersion:before.assessmentVersion+1};assert.match(core.validate(d,{previous:doc()}).join('\n'),/phải giữ nguyên/);
 d.lessons[0]={...scoring,assessmentVersion:1000};assert.match(core.validate(d).join('\n'),/từ 1 đến 999/);
 const sneaky={...before,assessment:{...before.assessment,instruction:'Khác'}};
 d.lessons[0]=sneaky;assert.match(core.validate(d).join('\n'),/chưa tăng phiên bản đề/);
 assert.deepEqual(core.applyEdit(before,{...before}),before);
});
test('history guard: lessons cannot be removed and versions cannot go back',()=>{
 const prev=doc(),d=doc();
 d.lessons=d.lessons.slice(1);
 assert.match(core.validate(d,{previous:prev}).join('\n'),/không được xóa bài/);
 const e=doc();e.lessons[1]={...e.lessons[1],title:'Đổi tên'};
 assert.match(core.validate(e,{previous:prev}).join('\n'),/chưa tăng revision/);
});
test('validation rejects unknown keys, bad videos, duplicate IDs and wrong session totals',()=>{
 const base=doc().lessons[0];
 const cases=[
  [{...base,extra:1},/trường lạ/],
  [{...base,media:[{kind:'youtube',id:'bad',angle:'back'}]},/ID YouTube/],
  [{...base,media:[{kind:'vimeo',id:'dQw4w9WgXcQ',angle:'back'}]},/chỉ hỗ trợ YouTube/],
  [{...base,media:[{kind:'youtube',id:'dQw4w9WgXcQ',angle:'back',start:30,end:10}]},/kết thúc/],
  [{...base,cues:['a','b']},/3 điểm cần nhớ/],
  [{...base,id:'PU-000'},/PU-001…PU-999/],[{...base,id:'PU-0081'},/PU-001…PU-999/],[{...base,id:'PU-81'},/PU-001…PU-999/]
 ];
 for(const [lesson,pattern]of cases){const d=doc();d.lessons[0]=lesson;assert.match(core.validate(d).join('\n'),pattern)}
 const dup=doc();dup.lessons[1]={...dup.lessons[1],id:dup.lessons[0].id};assert.match(core.validate(dup).join('\n'),/trùng ID/);
});
test('YouTube links are parsed strictly and embeds use the privacy domain',()=>{
 const id='dQw4w9WgXcQ';
 for(const url of [id,'https://youtu.be/'+id,'https://www.youtube.com/watch?v='+id+'&t=5','https://m.youtube.com/shorts/'+id,'https://www.youtube-nocookie.com/embed/'+id])assert.equal(core.youtubeId(url),id,url);
 for(const bad of ['http://youtu.be/'+id,'https://evil.example/watch?v='+id,'javascript:alert(1)','https://youtu.be/short','"><img>'])assert.equal(core.youtubeId(bad),null,bad);
 const src=core.embedUrl({kind:'youtube',id,angle:'back',start:5,end:20});
 assert.match(src,/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
 assert.match(src,/start=5/);assert.match(src,/end=20/);
 assert.equal(core.embedUrl({kind:'youtube',id:'x"onerror',angle:'back'}),null);
});
test('the content file must keep its exact header, adapter and formatting',()=>{
 assert.throws(()=>core.parseCurriculum(source.replace('window.PICKLEUP_CURRICULUM=','window.X=')),/adapter/);
 assert.throws(()=>core.parseCurriculum(source.replace('"schemaVersion": 1','"schemaVersion":1')),/định dạng chuẩn/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pu-content-'));const file=path.join(dir,'curriculum.js');
 fs.writeFileSync(file,'window.PICKLEUP_CURRICULUM=[]');
 assert.equal(check({previousFile:file}).ok,true,'legacy base without markers is ignored');
});
test('C3b: the adapter publishes only published lessons; drafts, review and retired stay in the file',()=>{
 const d=live(),draft=core.newLesson(d,{level:'4.0–4.5',skill:'strategy',focus:'tactical-choice'});
 const fill=l=>({...l,title:'T',goal:'G',zone:'Z',setup:'S',cues:['a','b','c'],mistakes:['m'],drills:l.drills.map(x=>({...x,name:'n',instruction:'i',check:'c'})),assessment:{...l.assessment,instruction:'A'}});
 const ready=fill(draft);ready.assessmentHash=core.scoringHash(ready);
 d.lessons.push(ready);d.lessons[1]={...d.lessons[1],status:'retired',revision:d.lessons[1].revision+1};d.lessons[40]={...d.lessons[40],status:'review',revision:d.lessons[40].revision+1};
 assert.deepEqual(core.validate(d,{previous:live()}),[]);
 const vm=require('node:vm'),context={window:{}};context.window.window=context.window;
 vm.runInNewContext(core.renderCurriculum(d),context);
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','advanced-curriculum.js'),'utf8'),context.window);
 const ids=context.window.PICKLEUP_CURRICULUM.map(l=>l.id);
 assert.equal(ids.length,78);
 for(const hidden of ['PU-002','PU-041','PU-081'])assert.equal(ids.includes(hidden),false,hidden);
 assert.equal(context.window.PICKLEUP_ADVANCED_CURRICULUM.every(l=>l.advanced&&l.status==='published'),true);
 assert.equal(context.window.PICKLEUP_CURRICULUM.some(l=>'assessmentHash' in l),false);
});
test('C3b: new lessons take the next id, start at version 1 and follow the level structure',()=>{
 const d=live(),low=core.newLesson(d,{level:'2.0–2.5',skill:'dink',focus:'third-drop'}),high=core.newLesson(d,{level:'4.5–5.0',skill:'volley',focus:'counter-volley'});
 assert.equal(low.id,'PU-081');assert.equal(low.week,81);assert.equal('advanced' in low,false);assert.equal('focus' in low,false);
 assert.equal(high.advanced,true);assert.equal(high.focus,'counter-volley');assert.deepEqual(high.drills.map(x=>x.minutes),[12,12,15]);
 const fill=l=>{const x={...l,title:'T',goal:'G',zone:'Z',setup:'S',cues:['a','b','c'],mistakes:['m'],drills:l.drills.map(y=>({...y,name:'n',instruction:'i',check:'c'})),assessment:{...l.assessment,instruction:'A'}};x.assessmentHash=core.scoringHash(x);return x};
 const errors=x=>core.validate({...d,lessons:[...d.lessons,x]},{previous:live()}).join('\n');
 assert.equal(errors(fill(high)),'');
 assert.match(errors({...fill(high),revision:2}),/bắt đầu ở revision 1/);
 assert.match(errors({...fill(high),advanced:undefined}),/advanced=true/);
 assert.match(errors({...fill(high),focus:'made-up'}),/focus/);
 assert.match(errors({...fill(low),advanced:true,focus:'third-drop'}),/dưới 3\.0/);
 assert.match(errors({...fill(high),week:5}),/week/);
 const reused={...fill(high),id:'PU-090',week:90},prior={...live(),lessons:[...live().lessons,{...fill(high),id:'PU-095',week:95}]};
 assert.match(core.validate({...d,lessons:[...prior.lessons,reused]},{previous:prior}).join('\n'),/lớn hơn mã lớn nhất/);
});
test('C3b: the current file must use the status-filtering adapter; only a base file may use the earlier one',()=>{
 const current=core.renderCurriculum(live());
 assert.match(current,/l\.status==="published"/);
 const legacy=current.replace('return !l.advanced&&l.status==="published"}','return !l.advanced}');
 assert.notEqual(legacy,current);
 assert.throws(()=>core.parseCurriculum(legacy),/bản mới nhất/);
 assert.equal(core.parseCurriculum(legacy,{previous:true}).lessons.length,80);
 assert.equal(core.renderCurriculum(core.parseCurriculum(legacy,{previous:true})),current);
});
