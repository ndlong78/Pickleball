/* Run: node --test tests/page-catalog.test.js */
const test=require("node:test"),assert=require("node:assert/strict");
global.window=globalThis;
require("../modules/page-catalog.js");
const pages=globalThis.PICKLEUP_PAGES;
test("seven named route pages with unique identities",()=>{
 assert.deepEqual(pages.map(p=>p.id),["home","coach","court","academy","progress","matches","settings"]);
 assert.equal(new Set(pages.map(p=>p.id)).size,7);
});
test("every interface module belongs to exactly one page",()=>{
 const all=pages.flatMap(p=>p.sections);
 assert.equal(new Set(all).size,all.length);
 for(const name of ["personalCoach","advancedCoach","pcOnCourt","academy","dashboard","trainingHistory","trainingEvaluation","matchJournal","tacticalReport","backup","selfAssessment","stageAssessment"])assert.ok(all.includes(name),name);
});
test("home and every page has clear navigation metadata",()=>{
 for(const page of pages){assert.ok(page.title&&page.description&&page.icon,page.id);assert.ok(page.sections.length>0,page.id)}
 assert.ok(pages.find(p=>p.id==="home").sections.includes("homeShortcuts"));
});
