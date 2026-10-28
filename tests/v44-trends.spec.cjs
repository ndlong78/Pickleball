const {test,expect}=require("@playwright/test");
for(const width of [390,820,1440]){
 test.describe("V4.4 score trends "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("records repeats, shows trend, survives reload and keeps prior latest score",async({page})=>{
   await page.goto("/?page=academy");
   for(const n of [6,9,12]){
    await page.locator("#academyScore").fill(String(n));
    await page.locator("#academySave").click();
   }
   await expect(page.locator("#academyTrendText")).toContainText("tăng 6 điểm");
   const history=await page.evaluate(()=>JSON.parse(localStorage.getItem("pickleup_academy_history_v44")||"[]"));
   expect(history).toHaveLength(3);
   expect(history.map(x=>x.score)).toEqual([6,9,12]);
   await page.reload();
   await expect(page.locator("#academyTrendText")).toContainText("tăng 6 điểm");
   await expect(page.locator("#academyScore")).toHaveValue("12");
  });
 });
}
test("V4.4 does not invent trend for preexisting V4.3 single-score data",async({page})=>{
 await page.goto("/?page=academy");
 await expect(page.locator("#academyWeek option")).toHaveCount(80);
   const id=await page.locator("#academyWeek").inputValue();
 await page.evaluate(id=>localStorage.setItem("pickleup_academy_v2",JSON.stringify({[id]:{score:5,date:new Date().toISOString()}})),id);
 await page.reload();
 await expect(page.locator("#academyRecommendReason")).toContainText("5/20");
 await expect(page.locator("#academyTrendText")).toContainText("chưa thể tính xu hướng");
});
