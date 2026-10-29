const {test,expect}=require("@playwright/test");
for(const size of [390,820,1180,1440]){
 test.describe("PickleUp V5.0 journey "+size,()=>{
  test.use({viewport:{width:size,height:900}});
  test("lazy page, navigation, saved goal, explicit check-in, resume and academy route",async({page})=>{
   await page.goto("/?page=journey");
   await expect(page.locator("#journeyFlow")).toBeVisible();
   await expect(page.locator("#jGoalState")).toContainText("mặc định");
   await expect(page.locator("#jProgress")).toHaveText("0/3");
   await expect(page.locator('#pageNavigation a[data-route="journey"]')).toHaveAttribute("aria-current","page");
   await page.evaluate(()=>localStorage.setItem("pickleup_weekly_goal_v46",JSON.stringify({days:2,level:"1.0–2.0"})));
   await page.locator("#jRefresh").click();
   await expect(page.locator("#jProgress")).toHaveText("0/2");
   await expect(page.locator("#jGoalState")).toContainText("Mục tiêu: 2");
   await page.locator("#jTodayMinutes").fill("40");
   await page.locator("#jDone").click();
   await expect(page.locator("#jProgress")).toHaveText("1/2");
   await expect(page.locator("#jMinutes")).toHaveText("40 phút");
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("pickleup_week_checkins_v48")));
   expect(saved.entries[Object.keys(saved.entries)[0]].minutes).toBe(40);
   await page.reload();
   await expect(page.locator("#jProgress")).toHaveText("1/2");
   await page.locator("#jLessonOpen").click();
   await expect(page).toHaveURL(/page=academy/);
   await expect(page.locator("#academyWeek")).toHaveValue(/^PU-0/);
   await page.locator('#pageNavigation a[data-route="journey"]').click();
   await expect(page.locator("#journeyFlow")).toBeVisible();
   await page.locator("#jClear").click();
   await expect(page.locator("#jProgress")).toHaveText("0/2");
   const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(horizontal).toBeLessThanOrEqual(3);
  });
 });
}
test("V5.0 Academy score cannot confirm a session",async({page})=>{
 await page.goto("/?page=journey");
 await expect(page.locator("#jProgress")).toHaveText("0/3");
 await page.evaluate(()=>{
  localStorage.setItem("pickleup_academy_v2",JSON.stringify({"PU-001":{score:18,date:new Date().toISOString()}}));
 });
 await page.locator("#jRefresh").click();
 await expect(page.locator("#jProgress")).toHaveText("0/3");
});

for(const width of [390,820,1180,1440]){
 test.describe("V5.1 after-session "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("manual confirmation, edit, reload and clear preserve old storage",async({page})=>{
   await page.goto("/?page=journey");
   await expect(page.locator("#jGoalState")).toContainText("mặc định");
   await expect(page.locator("#jPostSession")).toBeHidden();
   await page.evaluate(()=>localStorage.setItem("pickleup_academy_last_lesson_v4","PU-001"));
   await page.locator("#jRefresh").click();
   await page.locator("#jTodayMinutes").fill("35");
   await page.locator("#jDone").click();
   await expect(page.locator("#jPostSession")).toBeVisible();
   await expect(page.locator("#jPostMinutes")).toHaveText("35 phút thực tế hôm nay");
   await expect(page.locator("#jPostLesson")).toContainText("Tuần 1");
   await expect(page.locator("#jPostWeek")).toContainText("1/3");
   await page.evaluate(()=>localStorage.setItem("pickleup_academy_last_lesson_v4","PU-002"));
   await page.reload();
   await expect(page.locator("#jPostLesson")).toContainText("Tuần 1");
   await page.locator("#jTodayMinutes").fill("60");
   await page.locator("#jDone").click();
   await expect(page.locator("#jPostMinutes")).toContainText("60 phút");
   await expect(page.locator("#jPostWeek")).toContainText("1/3");
   await expect(page.locator("#jPostAction")).toContainText("nghỉ ngơi");
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(3);
   await page.locator("#jPostAction").click();
   await expect(page).toHaveURL(/page=progress#weeklyReality/);
   await page.goBack();
   await expect(page.locator("#jPostSession")).toBeVisible();
   await page.locator("#jSkipped").click();
   await expect(page.locator("#jPostSession")).toBeHidden();
   await page.locator("#jClear").click();
   await expect(page.locator("#jProgress")).toHaveText("0/3");
   expect(await page.evaluate(()=>localStorage.getItem("pickleup_academy_last_lesson_v4"))).toBe("PU-002");
  });
 });
}
