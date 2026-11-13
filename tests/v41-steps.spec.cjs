const {test,expect}=require("@playwright/test");
// Interact only after Academy handlers, guest sources and webfont layout settle;
// a late reflow or source event otherwise lands clicks on a moving layout.
async function settled(page){await page.evaluate(async()=>{await PICKLEUP_PAGE_LOADER.ensure('academy');await Promise.all([window.PICKLEUP_ACTIVITY?.ready,window.PICKLEUP_PLANS?.ready]);await document.fonts.ready;await new Promise(requestAnimationFrame)})}
for(const width of [390,820,1440]){
 test.describe("V4.1 step tracking "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("records individual steps, restores after reload, and resets without deleting scores",async({page})=>{
   await page.goto("/?page=academy");
   await settled(page);
   await expect(page.locator("#academyStepList input[type=checkbox]")).toHaveCount(6);
   await page.locator("#academyStepList input").nth(0).check();
   await page.locator("#academyStepList input").nth(2).check();
   await expect(page.locator("#academyStepsStatus")).toContainText("2/6");
   await page.locator("#academyScore").fill("13");
   await page.locator("#academySave").click();
   await page.reload();
   await settled(page);
   await expect(page.locator("#academyStepsStatus")).toContainText("2/6");
   await expect(page.locator("#academyStepList input").nth(0)).toBeChecked();
   await expect(page.locator("#academyScore")).toHaveValue("13");
   await page.locator("#academyResetSteps").click();
   await expect(page.locator("#academyStepsStatus")).toContainText("0/6");
   await expect(page.locator("#academyScore")).toHaveValue("13");
  });
 });
}
