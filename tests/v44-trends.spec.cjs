const {test,expect}=require("@playwright/test");
for(const width of [390,820,1440]){
 test.describe("V4.4 score trends "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("records repeats, shows trend, survives reload and keeps prior latest score",async({page})=>{
   await page.goto("/?page=academy");
   for(const n of [6,9,12]){
    await page.locator("#academyScore").fill(String(n));
    await page.locator("#academySave").click();
   }
   await expect(page.locator("#academyTrendText")).toContainText("tăng 6 điểm");
   const history=await page.evaluate(()=>JSON.parse(localStorage.getItem("pickleup_academy_history_v44")||"[]"));
   expect(history).toHaveLength(3);
   expect(history.map(x=>x.score)).toEqual([6,9,12]);
   await page.reload();
   await expect(page.locator("#academyTrendText")).toContainText("tăng 6 điểm");
   await expect(page.locator("#academyScore")).toHaveValue("12");
  });
 });
}
test("V4.4 does not invent trend for preexisting V4.3 single-score data",async({page})=>{
 await page.goto("/?page=academy");
 await expect(page.locator("#academyWeek option")).toHaveCount(80);
   const id=await page.locator("#academyWeek").inputValue();
 await page.evaluate(id=>localStorage.setItem("pickleup_academy_v2",JSON.stringify({[id]:{score:5,date:new Date().toISOString()}})),id);
 await page.reload();
 await expect(page.locator("#academyRecommendReason")).toContainText("5/20");
 await expect(page.locator("#academyTrendText")).toContainText("chưa thể tính xu hướng");
});
test.describe('network-gated hydration',()=>{
 test.use({serviceWorkers:'block'});
test('Academy score stays disabled until delayed feature hydration completes',async({page})=>{
 let intercepted=false,release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/modules/academy-page.js*',async route=>{intercepted=true;await gate;await route.continue()});
 const navigation=page.goto('/?page=academy');
 try{await expect.poll(()=>intercepted).toBe(true);await expect(page.locator('#academyScore')).toBeVisible();await expect(page.locator('#academyScore')).toBeDisabled();await expect(page.locator('#academySave')).toBeDisabled()}finally{release()}
 await navigation;
 await expect(page.locator('#academyScore')).toBeEnabled();
 await page.locator('#academyScore').fill('6');await page.locator('#academySave').click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pickleup_academy_history_v44'))[0].score)).toBe(6);
});

});
test("C1: guest scores record the assessment version and still compare with earlier scores of the same test",async({page})=>{
 await page.goto("/?page=academy");
 await expect(page.locator("#academyWeek option")).toHaveCount(80);
 const id=await page.locator("#academyWeek").inputValue();
 await page.evaluate(id=>{const x=PICKLEUP_CURRICULUM.find(l=>l.id===id);localStorage.setItem("pickleup_academy_history_v44",JSON.stringify([{id,skill:x.skill,level:x.level,score:5,date:"2026-01-01T00:00:00.000Z"}]))},id);
 await page.reload();
 await page.locator("#academyScore").fill("11");
 await page.locator("#academySave").click();
 await expect(page.locator("#academyTrendText")).toContainText("tăng 6 điểm");
 const stored=await page.evaluate(id=>({history:JSON.parse(localStorage.getItem("pickleup_academy_history_v44")),record:JSON.parse(localStorage.getItem("pickleup_academy_v2"))[id]}),id);
 expect(stored.history.map(x=>x.av)).toEqual([undefined,1]);
 expect(stored.record.av).toBe(1);
});
test.describe("C1 changed assessment",()=>{
 // The lesson override is injected at the network layer, so the service worker cache must not answer.
 test.use({serviceWorkers:"block"});
test("C1: after a lesson's test changes, earlier scores are labelled and kept out of the trend",async({page})=>{
 await page.route("**/curriculum.js*",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+";window.PICKLEUP_CURRICULUM[0].assessmentVersion=2;window.PICKLEUP_CONTENT_DOC.lessons[0].assessmentVersion=2;"})});
 await page.goto("/?page=academy");
 await expect(page.locator("#academyWeek option")).toHaveCount(80);
 const lesson=await page.evaluate(()=>{const x=PICKLEUP_CURRICULUM[0];return {id:x.id,skill:x.skill,level:x.level,target:x.assessment.target}});
 await page.evaluate(x=>{const row=(score,day)=>({id:x.id,skill:x.skill,level:x.level,score,date:"2026-01-0"+day+"T00:00:00.000Z",av:1});
  localStorage.setItem("pickleup_academy_history_v44",JSON.stringify([row(3,1),row(18,2)]));
  localStorage.setItem("pickleup_academy_v2",JSON.stringify({[x.id]:{score:18,date:"2026-01-02T00:00:00.000Z",skill:x.skill,level:x.level,av:1}}))},lesson);
 await page.reload();
 await page.locator("#academyWeek").selectOption(lesson.id);
 await expect(page.locator("#academyStatus")).toContainText("theo đề kiểm tra cũ");
 await expect(page.locator("#academyScore")).toHaveValue(String(lesson.target));
 await expect(page.locator("#academyTrendText")).not.toContainText("tăng 15");
 for(const n of [7,9]){await page.locator("#academyScore").fill(String(n));await page.locator("#academySave").click()}
 const history=await page.evaluate(()=>JSON.parse(localStorage.getItem("pickleup_academy_history_v44")));
 expect(history.map(x=>[x.score,x.av])).toEqual([[3,1],[18,1],[7,2],[9,2]]);
 await expect(page.locator("#academyStatus")).not.toContainText("theo đề kiểm tra cũ");
});
});
