const {test,expect}=require("@playwright/test");
for(const width of [390,820,1440]){
 test.describe("V4.6 weekly goals "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("saves target, deduplicates dates and recommends same-lesson review",async({page})=>{
   await page.goto("/?page=progress");
   await expect(page.locator("#wgDays")).toBeEnabled();
   await page.locator("#wgDays").selectOption("2");
   await page.locator("#wgSave").click();
   await expect(page.locator("#wgStatus")).toContainText("Đã lưu");
   expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("pickleup_weekly_goal_v46")))).toEqual({days:2,level:"1.0–2.0"});
   await page.evaluate(()=>{
    const now=new Date(),a=new Date(now);a.setHours(12,0,0,0);
    const b=new Date(a);b.setDate(a.getDate()-1);
    const rows=[
     {id:"PU-001",skill:"serve",level:"1.0–2.0",score:18,date:b.toISOString()},
     {id:"PU-001",skill:"serve",level:"1.0–2.0",score:14,date:a.toISOString()},
     {id:"PU-001",skill:"serve",level:"1.0–2.0",score:10,date:a.toISOString()}
    ];
    localStorage.setItem("pickleup_academy_history_v44",JSON.stringify(rows));
   });
   await page.locator("#wgRefresh").click();
   await expect(page.locator("#wgRecorded")).toHaveText(/^[12]$/);
   await expect(page.locator("#wgRecommendation")).toContainText("giảm ít nhất 3");
   await expect(page.locator("#wgOpen")).toContainText("tuần 1");
   await page.reload();
   await expect(page.locator("#wgChart .wg-bar-item")).toHaveCount(8);
   await expect(page.locator("#wgDays")).toHaveValue("2");
  });
 });
}
test("V4.6 settings exports and restores optional weeklyGoal",async({page})=>{
 await page.goto("/?page=progress");
 await expect(page.locator("#wgDays")).toBeEnabled();
 await page.locator("#wgDays").selectOption("4");
 await page.locator("#wgLevel").selectOption("2.0–2.5");
 await page.locator("#wgSave").click();
 await page.goto("/?page=settings");
 await expect(page.locator("#backupAll")).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("pickleup_weekly_goal_v46")));
 expect(saved).toEqual({days:4,level:"2.0–2.5"});
 await expect(page.locator("#backupAll")).toBeEnabled();
});

// Hold the UI script rather than sleeping: reproduce the fragment/script race.
test("weekly goal controls wait for hydration and preserve legacy storage",async({page})=>{
 await page.addInitScript(()=>{
  if(!localStorage.getItem("pickleup_weekly_goal_v46")){
   localStorage.setItem("pickleup_weekly_goal_v46",JSON.stringify({days:4,level:"2.0–2.5"}));
   localStorage.setItem("pickleup_academy_v2",JSON.stringify({legacy:"untouched"}));
  }
 });
 let release;
 const gate=new Promise(resolve=>{release=resolve});
 await page.route("**/modules/weekly-goals-ui.js*",async route=>{
  await gate;await route.continue();
 });
 try{
  await page.goto("/?page=progress",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#wgDays")).toBeVisible();
  for(const id of ["wgDays","wgLevel","wgSave","wgRefresh"])
   await expect(page.locator("#"+id)).toBeDisabled();
 }finally{release()}
 await expect(page.locator("#wgDays")).toBeEnabled();
 await expect(page.locator("#wgDays")).toHaveValue("4");
 await expect(page.locator("#wgLevel")).toHaveValue("2.0–2.5");
 await page.locator("#wgDays").selectOption("2");
 await page.locator("#wgSave").click();
 await expect(page.locator("#wgStatus")).toContainText("Đã lưu");
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("pickleup_weekly_goal_v46")))).toEqual({days:2,level:"2.0–2.5"});
 await page.reload();
 await expect(page.locator("#wgDays")).toBeEnabled();
 await expect(page.locator("#wgDays")).toHaveValue("2");
 await expect(page.locator("#wgLevel")).toHaveValue("2.0–2.5");
 expect(await page.evaluate(()=>localStorage.getItem("pickleup_academy_v2"))).toBe('{"legacy":"untouched"}');
});
