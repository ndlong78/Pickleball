const {test,expect}=require("@playwright/test");
for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1440,height:900}]){
 test.describe("V4 Academy learning journey "+viewport.width,()=>{
  test.use({viewport});
  test("remembers lesson and suggests a lesson without recorded results",async({page})=>{
   await page.goto("/?page=academy");
   await expect(page.locator("#academyProgressText")).toContainText("/80");
   await page.locator("#academyWeek").selectOption({index:3});
   const lesson=await page.locator("#academyWeek").inputValue();
   await page.reload();
   await expect(page.locator("#academyWeek")).toHaveValue(lesson);
   await page.locator("#academyNext").click();
   await expect(page.locator("#academyProgressText")).toContainText("0/80");
   await page.locator("#academyScore").fill("12");
   await page.locator("#academySave").click();
   await expect(page.locator("#academyProgressText")).toContainText("1/80");
   await page.locator("#academyNext").click();
   await expect(page.locator("#academyProgressText")).toContainText("1/80");
   await page.locator("#academyResume").click();
   await expect(page.locator("#academyWeek option:checked")).toHaveCount(1);
  });
 });
}
