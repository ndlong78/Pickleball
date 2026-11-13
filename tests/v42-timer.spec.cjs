const {test,expect}=require("@playwright/test");
for(const width of [390,820,1440]){
 test.describe("V4.2 focus countdown "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("starts pauses resets and never auto-advances",async({page})=>{
   // Timer behavior must not depend on the optional third-party font network.
   // Slow-font navigation has its own controlled regression in page-routing.
   await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:'/* timer fixture uses the system font */'}));
   await test.step('load the Academy handlers before interacting',async()=>{
    await page.goto("/?page=academy");
    // Late source events (guest activity/plan readiness) may re-render the lesson
    // and reset an in-flight timer; interact only after both sources settle.
    await page.evaluate(async()=>{await PICKLEUP_PAGE_LOADER.ensure('academy');await Promise.all([window.PICKLEUP_ACTIVITY?.ready,window.PICKLEUP_PLANS?.ready])});
   });
   await test.step('start and pause without advancing the step',async()=>{
   await page.locator("#academyFocusToggle").click();
   await expect(page.locator("#academyTimerClock")).toHaveText("10:00");
   await page.locator("#academyTimerStart").click();
   await expect(page.locator("#academyTimerStart")).toHaveText("Tạm dừng");
   await expect(page.locator("#academyFocusPosition")).toHaveText("Bước 1/6");
   await page.locator("#academyTimerStart").click();
   await expect(page.locator("#academyTimerStart")).toHaveText("Bắt đầu");
   });
   await test.step('leaving focus pauses the countdown',async()=>{
   await page.locator("#academyTimerStart").click();
   await page.locator("#academyFocusToggle").click();
   await page.locator("#academyFocusToggle").click();
   await expect(page.locator("#academyTimerStart")).toHaveText("Bắt đầu");
   });
   await test.step('only an explicit next action advances and reset restores time',async()=>{
   await page.locator("#academyFocusNext").click();
   await expect(page.locator("#academyFocusPosition")).toHaveText("Bước 2/6");
   await page.locator("#academyTimerReset").click();
   await expect(page.locator("#academyTimerClock")).toContainText(":00");
   });
  });
 });
}
