const {test,expect}=require("@playwright/test");
for(const width of [390,820,1440]){
 test.describe("V4.7 smart weekly plan "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("schedules practice and recovery, persists preferences and opens lesson",async({page})=>{
   await page.goto("/?page=progress");
   await expect(page.locator("#wpDays .wp-day")).toHaveCount(7);
   await page.locator("#wgDays").selectOption("4");
   await page.locator("#wgSave").click();
   await page.locator("#wpMinutes").selectOption("60");
   await page.locator("#wpGentle").check();
   await page.locator("#wpSave").click();
   await expect(page.locator("#wpStatus")).toContainText("Đã lưu");
   await expect(page.locator("#wpDays .wp-day:not(.wp-rest)")).toHaveCount(4);
   await expect(page.locator("#wpDays .wp-rest")).toHaveCount(3);
   await expect(page.locator("#wpSummary")).toContainText("120 phút");
   await expect(page.locator("#wpDays .wp-duration").first()).toContainText("30 phút");
   await page.reload();
   await expect(page.locator("#wpDays .wp-day")).toHaveCount(7);
   await expect(page.locator("#wpMinutes")).toHaveValue("60");
   await expect(page.locator("#wpGentle")).toBeChecked();
   const id=await page.locator("#wpDays a[data-lesson-id]").first().getAttribute("data-lesson-id");
   expect(id).toMatch(/^PU-0/);
   await page.locator("#wpDays a[data-lesson-id]").first().click();
   await expect(page.locator("#academyWeek option")).toHaveCount(80);
   await expect(page.locator("#academyWeek")).toHaveValue(id);
  });
 });
}
test("V4.7 plan follows a low score, but does not mark scheduled session complete automatically",async({page})=>{
 await page.goto("/?page=progress");
 await expect(page.locator("#wpDays .wp-day")).toHaveCount(7);
 await page.evaluate(()=>{
  const x=window.PICKLEUP_CURRICULUM.find(x=>x.id==="PU-001");
  const last=new Date();last.setDate(last.getDate()-1);
  localStorage.setItem("pickleup_academy_history_v44",JSON.stringify([{id:x.id,skill:x.skill,level:x.level,score:3,date:last.toISOString()}]));
 });
 await page.locator("#wpRefresh").click();
 await expect(page.locator("#wpDays .wp-reason").first()).toContainText("Ôn lại");
 expect(await page.locator("#wpDays .wp-recorded").count()).toBeLessThanOrEqual(1);
});
