const {test,expect}=require("@playwright/test");
for(const size of [
 {name:"iPhone",width:390,height:844},
 {name:"iPad portrait",width:820,height:1180},
 {name:"iPad landscape",width:1180,height:820},
 {name:"Desktop",width:1440,height:900}
]){
 test.describe("V3.2 "+size.name,()=>{
  test.use({viewport:{width:size.width,height:size.height}});
  test("match report connects to advanced training only after an explicit tap",async({page})=>{
   await page.goto("/");
   const scores={third:14,reset:12,movement:13,counter:16,doubles:15,decision:11};
   for(const [key,value] of Object.entries(scores))await page.locator("#acInput-"+key).fill(String(value));
   await page.locator("#matchFocus").selectOption("counter-volley");
   await page.locator("#matchOurs").fill("11");
   await page.locator("#matchTheirs").fill("9");
   await page.locator("#matchSave").click();
   await expect(page.locator("#tacticalRecommendation")).toContainText("Counter volley");
   await expect(page.locator("#acCoachMatchFocus")).toHaveValue("");
   await page.locator("#tacticalRecommendation button").click();
   await expect(page.locator("#acCoachMatchFocus")).toHaveValue("counter");
   await page.locator("#acCoachCreate").click();
   await expect(page.locator("#acCoachPlan")).toContainText("Counter volley");
   const plan=await page.evaluate(()=>JSON.parse(localStorage.getItem("pickleup_advanced_plans_v31")).at(-1));
   expect(plan.matchFocus).toBe("counter");
   expect(plan.scores.counter).toBe(16);
   await expect(page.locator("#pickleupMobileDock")).toBeVisible();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(overflow).toBeLessThanOrEqual(2);
  });
 });
}
