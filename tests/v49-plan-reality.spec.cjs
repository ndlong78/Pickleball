const {test,expect}=require("@playwright/test");
for(const width of [390,820,1440]){
 test.describe("PickleUp V4.9 plan versus actual "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("reports only manually confirmed days, updates live and survives reload",async({page})=>{
   await page.goto("/?page=progress");
   await expect(page.locator("#prWeeks .pr-week")).toHaveCount(8);
   await expect(page.locator("#prDone")).toHaveText("0/3");
   await page.evaluate(()=>{
    const c=window.PICKLEUP_WEEK_CHECKINS;
    const lesson=window.PICKLEUP_CURRICULUM.find(l=>l.id==="PU-001");
    localStorage.setItem("pickleup_academy_history_v44",JSON.stringify([{id:lesson.id,level:lesson.level,skill:lesson.skill,score:10,date:new Date().toISOString()}]));
   });
   await page.locator("#prRefresh").click();
   await expect(page.locator("#prDone")).toHaveText("0/3");
   const day=await page.evaluate(()=>{
    const d=new Date(),today=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
    return [...document.querySelectorAll("#wpDays .wp-day")].map(x=>x.dataset.date).filter(x=>x<=today).at(-1);
   });
   const card=page.locator('.wp-day[data-date="'+day+'"]');
   await card.locator(".wc-label input").fill("35");
   await card.locator('button[data-status="done"]').click();
   await expect(page.locator("#prDone")).toHaveText("1/3");
   await expect(page.locator("#prMinutes")).toHaveText("35 phút");
   await page.locator("#wgDays").selectOption("2");
   await page.locator("#wgSave").click();
   await expect(page.locator("#prDone")).toHaveText("1/2");
   await page.reload();
   await expect(page.locator("#prWeeks .pr-week")).toHaveCount(8);
   await expect(page.locator("#prDone")).toHaveText("1/2");
   await expect(page.locator("#prMinutes")).toHaveText("35 phút");
  });
 });
}
test("V4.9 uses past manually confirmed weeks only, labels historical target as reference",async({page})=>{
 await page.goto("/?page=progress");
 await expect(page.locator("#prWeeks .pr-week")).toHaveCount(8);
 await page.evaluate(()=>{
  const c=window.PICKLEUP_WEEK_CHECKINS,now=new Date();
  const t=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
  const monday=new Date(t);monday.setDate(t.getDate()-(t.getDay()+6)%7);
  let data=c.empty();
  for(const w of [1,2,3]){
   const day=new Date(monday);day.setDate(monday.getDate()-w*7);
   const id=[day.getFullYear(),String(day.getMonth()+1).padStart(2,"0"),String(day.getDate()).padStart(2,"0")].join("-");
   data=c.change(data,id,"done",30,null,now);
  }
  localStorage.setItem(c.KEY,JSON.stringify(data));
 });
 await page.locator("#prRefresh").click();
 await expect(page.locator("#prEvidence")).toContainText("3/4");
 await expect(page.locator("#prAdvice")).toContainText("giảm 1 ngày tập");
 await expect(page.locator("#prEvidence")).toContainText("không phải tỷ lệ hoàn thành kế hoạch cũ");
 await expect(page.locator("#prDone")).toHaveText("0/3");
});
