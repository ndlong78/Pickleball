const {test,expect}=require("@playwright/test");
for(const width of [390,820,1440]){
 test.describe("V4.8 manual training check-ins "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("only explicit attendance counts; supports edit, delete, reload",async({page})=>{
   await page.goto("/?page=progress");
   await expect(page.locator("#wpDays .wp-day")).toHaveCount(7);
   await expect(page.locator("#wcDone")).toHaveText("0");
   await page.evaluate(()=>{
    const x=window.PICKLEUP_CURRICULUM.find(x=>x.id==="PU-001");
    localStorage.setItem("pickleup_academy_history_v44",JSON.stringify([{id:x.id,level:x.level,skill:x.skill,score:15,date:new Date().toISOString()}]));
   });
   await page.locator("#wpRefresh").click();
   await expect(page.locator("#wcDone")).toHaveText("0");
   const day=await page.evaluate(()=>{
    const n=new Date(),today=[n.getFullYear(),String(n.getMonth()+1).padStart(2,"0"),String(n.getDate()).padStart(2,"0")].join("-");
    return [...document.querySelectorAll("#wpDays .wp-day")].map(x=>x.dataset.date).filter(x=>x<=today).at(-1);
   });
   expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
   let card=page.locator('.wp-day[data-date="'+day+'"]');
   await card.locator(".wc-label input").fill("40");
   await card.locator('button[data-status="done"]').click();
   await expect(page.locator("#wcDone")).toHaveText("1");
   await expect(page.locator("#wcMinutes")).toHaveText("40 phút");
   await page.reload();
   await expect(page.locator("#wcDone")).toHaveText("1");
   card=page.locator('.wp-day[data-date="'+day+'"]');
   await card.locator('button[data-status="skipped"]').click();
   await expect(page.locator("#wcDone")).toHaveText("0");
   await expect(page.locator("#wcSkipped")).toHaveText("1");
   await card.locator('button[data-status="clear"]').click();
   await expect(page.locator("#wcSkipped")).toHaveText("0");
  });
 });
}
test("V4.8 future days cannot be marked and future records do not inflate totals",async({page})=>{
 await page.goto("/?page=progress");
 await expect(page.locator("#wpDays .wp-day")).toHaveCount(7);
 await page.evaluate(()=>localStorage.setItem("pickleup_week_checkins_v48",JSON.stringify({schemaVersion:1,entries:{"2030-01-01":{status:"done",minutes:100,lessonId:null,updatedAt:"2026-10-29T00:00:00Z"}}})));
 await page.reload();
 await expect(page.locator("#wcDone")).toHaveText("0");
});
