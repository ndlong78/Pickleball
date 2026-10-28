const {test,expect}=require("@playwright/test");
for(const size of [
{name:"iPhone",width:390,height:844},
{name:"iPad portrait",width:820,height:1180},
{name:"iPad landscape",width:1180,height:820},
{name:"PC",width:1440,height:900}
]){
 test.describe("V3.3 "+size.name,()=>{
  test.use({viewport:{width:size.width,height:size.height}});
  test("records matching conditions and doubles situations",async({page})=>{
   await page.goto("/?page=coach");
   const points={serve:15,return:13,dink:12,volley:14,position:16,strategy:10};
   for(const [key,value] of Object.entries(points))await page.locator("#pc-"+key).fill(String(value));
   await page.locator("#pcGenerate").click();
   await page.locator("#pcOpenRun").click();
   await expect(page.locator("#pcRunPlayer")).toBeVisible();
   await page.locator("#pcRunNext").click();
   await page.locator("#pcAttemptHits").fill("10");
   await page.locator("#pcAttemptSave").click();
   await expect(page.locator("#pcRunMessage")).toContainText("chọn đủ");
   await page.locator("#pcAttemptFeed").selectOption("partner");
   await page.locator("#pcAttemptPace").selectOption("moderate");
   await page.locator("#pcAttemptTarget").selectOption("standard");
   await page.locator("#pcAttemptSave").click();
   await expect(page.locator("#pcRunMessage")).toContainText("Đã lưu");
   await page.locator("#pcAttemptHits").fill("15");
   await page.locator("#pcAttemptSave").click();
   await page.locator('#pageNavigation a[data-route="progress"]').click();
   await page.locator("#evalLevel").selectOption("1.0–2.0");
   await expect(page.locator("#evalTotals")).toContainText("2/2");
   await expect(page.locator("#evalComparison")).toContainText("+5/20");
   await page.locator('#pageNavigation a[data-route="matches"]').click();
   await page.locator("#matchMode").selectOption("doubles");
   await page.locator("#matchDoublesIssue").selectOption("middle");
   await page.locator("#matchOurs").fill("11");
   await page.locator("#matchTheirs").fill("9");
   await page.locator("#matchSave").click();
   await page.locator('#pageNavigation a[data-route="progress"]').click();
   await expect(page.locator("#evalDoubles")).toContainText("Bỏ khoảng giữa sân");
   await expect(page.locator("#pickleupMobileDock")).toBeVisible();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(overflow).toBeLessThanOrEqual(2);
  });
 });
}
