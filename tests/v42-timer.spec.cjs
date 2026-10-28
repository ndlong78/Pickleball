const {test,expect}=require("@playwright/test");
for(const width of [390,820,1440]){
 test.describe("V4.2 focus countdown "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("starts pauses resets and never auto-advances",async({page})=>{
   await page.goto("/?page=academy");
   await page.locator("#academyFocusToggle").click();
   await expect(page.locator("#academyTimerClock")).toHaveText("10:00");
   await page.locator("#academyTimerStart").click();
   await expect(page.locator("#academyTimerStart")).toHaveText("Tạm dừng");
   await expect(page.locator("#academyFocusPosition")).toHaveText("Bước 1/6");
   await page.locator("#academyTimerStart").click();
   await expect(page.locator("#academyTimerStart")).toHaveText("Bắt đầu");
   await page.locator("#academyFocusNext").click();
   await expect(page.locator("#academyFocusPosition")).toHaveText("Bước 2/6");
   await page.locator("#academyTimerReset").click();
   await expect(page.locator("#academyTimerClock")).toContainText(":00");
  });
 });
}
