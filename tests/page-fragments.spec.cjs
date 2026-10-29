const {test,expect}=require("@playwright/test");
for(const screen of [
 {name:"iPhone",width:390,height:844},
 {name:"iPad portrait",width:820,height:1180},
 {name:"iPad landscape",width:1180,height:820},
 {name:"Desktop",width:1440,height:900}
]){
 test.describe("V3.7 fragments - "+screen.name,()=>{
  test.use({viewport:{width:screen.width,height:screen.height}});
  test("Home starts without feature fragments; visiting pages hydrates each once",async({page})=>{
   await page.goto("/?page=home");
   await expect(page.locator("#weekList .week").first()).toBeVisible();
   expect(await page.locator("#mount-coach > section").count()).toBe(0);
   expect(await page.locator("#mount-matches > section").count()).toBe(0);
   await page.locator('#pageNavigation a[data-route="coach"]').click();
   await expect(page.locator("#personalCoach")).toBeVisible();
   await expect(page.locator("#pcInputs input")).toHaveCount(6);
   await page.locator("#pc-serve").fill("12");
   await page.evaluate(()=>window.__coachSection=document.getElementById("personalCoach"));
   await page.locator('#pageNavigation a[data-route="court"]').click();
   await expect(page.locator("#pcOnCourt")).toBeVisible();
   await expect(page.locator("#personalCoach")).toBeHidden();
   await page.locator('#pageNavigation a[data-route="coach"]').click();
   await expect(page.locator("#pc-serve")).toHaveValue("12");
   expect(await page.evaluate(()=>window.__coachSection===document.getElementById("personalCoach"))).toBe(true);
   const resourceCount=await page.evaluate(()=>performance.getEntriesByType("resource").filter(x=>x.name.includes("/pages/coach.html?v=5.1.0")).length);
   expect(resourceCount).toBe(1);
   await expect(page.locator("#pickleupMobileDock")).toBeVisible();
  });
  test("direct deep link fetches only requested page and works after Back",async({page})=>{
   await page.goto("/?page=matches#matchJournal");
   await expect(page.locator("#matchJournal")).toBeVisible();
   await expect(page.locator("#matchFocus option")).toHaveCount(11);
   expect(await page.locator("#mount-coach > section").count()).toBe(0);
   await page.locator('#pageNavigation a[data-route="progress"]').click();
   await expect(page.locator("#dashboard")).toBeVisible();
   await page.goBack();
   await expect(page.locator("#matchJournal")).toBeVisible();
   await expect(page.locator('#pageNavigation a[data-route="matches"]')).toHaveAttribute("aria-current","page");
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(overflow).toBeLessThanOrEqual(2);
  });
 });
}
