const {test}=require('node:test'),assert=require('node:assert/strict');
global.window=global;require('../curriculum.js');require('../advanced-curriculum.js');
const lesson=require('../modules/academy-lesson-core.js');
const basic=window.PICKLEUP_CURRICULUM,advanced=window.PICKLEUP_ADVANCED_CURRICULUM;
const all=[...basic,...(Array.isArray(advanced)?advanced:[])];
test('every Academy lesson yields three cues, mistakes and a full 60-minute plan in six parts',()=>{
 assert.equal(basic.length>=36,true);
 for(const x of all){
  const view=lesson.summary(x);
  assert.equal(view.cues.length,3,x.id);
  assert.ok(view.mistakes.length>=1,x.id);
  assert.equal(view.minutes,60,x.id);
  assert.equal(view.parts,6,x.id);
 }
});
test('rule reminders follow the six skills and open only for beginner levels',()=>{
 for(const skill of ['serve','return','dink','volley','position','strategy'])assert.ok(lesson.RULES[skill].items.length>=2,skill);
 assert.equal(lesson.ruleHint({skill:'dink',level:'1.0–2.0'}).open,true);
 assert.equal(lesson.ruleHint({skill:'volley',level:'2.0–2.5'}).open,true);
 assert.equal(lesson.ruleHint({skill:'volley',level:'2.5–3.0'}).open,false);
 assert.equal(lesson.ruleHint({skill:'strategy',level:'3.5–4.0'}).open,false);
 assert.match(lesson.ruleHint({skill:'strategy',level:'1.0–2.0'}).items.join(' '),/0-0-2/);
 assert.match(lesson.ruleHint({skill:'volley',level:'1.0–2.0'}).items.join(' '),/Kitchen/);
});
test('unknown or missing lessons fail safe without throwing',()=>{
 assert.equal(lesson.ruleHint({skill:'unknown'}),null);
 assert.equal(lesson.ruleHint(null),null);
 assert.equal(lesson.summary(null),null);
 assert.equal(lesson.minutes({}),21);
 const copy=lesson.ruleHint({skill:'serve',level:'1.0–2.0'});copy.items.push('x');
 assert.equal(lesson.RULES.serve.items.includes('x'),false);
});
