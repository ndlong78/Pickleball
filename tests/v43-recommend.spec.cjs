const {test,expect}=require("@playwright/test");
test("V4.3 recommends starter lesson when no score exists",async({page})=>{
 await page.goto("/?page=academy");
 await expect(page.locator("#academyRecommendReason")).toContainText("Chưa có điểm kiểm tra");
 await expect(page.locator("#academyRecommendOpen")).toBeEnabled();
 await page.locator("#academyRecommendOpen").click();
 await expect(page.locator("#academyWeek option:checked")).toHaveCount(1);
});
test("V4.3 prioritizes a weak skill from recorded Academy assessments",async({page})=>{
 await page.goto("/?page=academy");
 const weak=await page.locator("#academyWeek option").nth(1).getAttribute("value");
 await page.locator("#academyWeek").selectOption(weak);
 await page.locator("#academyScore").fill("3");
 await page.locator("#academySave").click();
 await expect(page.locator("#academyRecommendReason")).toContainText("3/20");
 await page.locator("#academyRecommendOpen").click();
 await expect(page.locator("#academyWeek option:checked")).toHaveCount(1);
});
