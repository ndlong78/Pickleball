const {test,expect}=require("@playwright/test");
for(const width of [390,820,1440]){
 test.describe("V4.2 focused drills "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("navigates one step, persists position and shares checklist safely",async({page})=>{
   await page.goto("/?page=academy");
   await page.locator("#academyFocusToggle").click();
   await expect(page.locator("#academyFocusPanel")).toBeVisible();
   await expect(page.locator("#academyFocusPosition")).toHaveText("Bước 1/6");
   await page.locator("#academyFocusNext").click();
   await expect(page.locator("#academyFocusPosition")).toHaveText("Bước 2/6");
   await page.locator("#academyFocusDone").click();
   await expect(page.locator("#academyStepList input").nth(1)).toBeChecked();
   await page.reload();
   await page.locator("#academyFocusToggle").click();
   await expect(page.locator("#academyFocusPosition")).toHaveText("Bước 2/6");
   await expect(page.locator("#academyStepList input").nth(1)).toBeChecked();
   await page.locator("#academyFocusPrev").click();
   await expect(page.locator("#academyFocusPosition")).toHaveText("Bước 1/6");
  });
 });
}
