const {test,expect}=require("@playwright/test");
for(const width of [390,820,1440]){
 test.describe("V4.6 weekly goals "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("saves target, deduplicates dates and recommends same-lesson review",async({page})=>{
   await page.goto("/?page=progress");
   await expect(page.locator("#wgDays")).toBeVisible();
   await page.locator("#wgDays").selectOption("2");
   await page.locator("#wgSave").click();
   await expect(page.locator("#wgStatus")).toContainText("Đã lưu");
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
 await expect(page.locator("#wgDays")).toBeVisible();
 await page.locator("#wgDays").selectOption("4");
 await page.locator("#wgLevel").selectOption("2.0–2.5");
 await page.locator("#wgSave").click();
 await page.goto("/?page=settings");
 await expect(page.locator("#backupAll")).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("pickleup_weekly_goal_v46")));
 expect(saved).toEqual({days:4,level:"2.0–2.5"});
 await expect(page.locator("#backupAll")).toBeEnabled();
});
