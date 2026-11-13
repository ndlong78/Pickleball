// V5.18 navigation: four primary tabs; the other routes live under "Thêm".
const SECONDARY=new Set(['journey','coach','matches','settings']);
async function navigate(page,route){
 if(SECONDARY.has(route)){
  const toggle=page.locator('#pageNavigation [data-nav-more-toggle]');
  if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 }
 await page.locator('#pageNavigation a[data-route="'+route+'"]').click();
}
module.exports={navigate,SECONDARY};
