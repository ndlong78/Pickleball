const {test,expect}=require('@playwright/test');
test.use({trace:'off',screenshot:'off',video:'off',serviceWorkers:'block'});
test('guest settings works without configuration and preserves local training',async({page})=>{
 await page.goto('/?page=settings');
 await expect(page.locator('#accountPanel')).toBeVisible();
 await expect(page.locator('#accountPanel [role=status]')).toContainText('Chế độ khách');
 await expect(page.locator('#accountPanel form')).toBeHidden();
 await expect(page.locator('#accountPanel')).toContainText('không nhập hoặc đồng bộ');
});
test.describe('mock Auth transport, real SDK; no credential artifacts',()=>{

 test('OTP, session restore, sibling tab logout under Pages prefix',async({page,context})=>{
  await context.route('**/modules/auth-config.js*',r=>r.fulfill({contentType:'text/javascript',body:'window.PICKLEUP_AUTH_CONFIG={enabled:true,url:"http://127.0.0.1:54321",publishableKey:"sb_publishable_fixture"}'}));
  const user={id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-29T00:00:00Z'};
  await context.route('http://127.0.0.1:54321/**',async r=>{
   const path=new URL(r.request().url()).pathname;
   if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
   if(path.endsWith('/logout'))return r.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*'}});
   let body={};
   if(path.endsWith('/verify'))body={access_token:'fixture-access',refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user};
   if(path.endsWith('/user'))body=user;
   if(path.endsWith('/pull_changes'))body={status:'ok',changes:[],high_water:'0'};
   return r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('/Pickleball/?page=settings');
  await page.locator('#accountPanel input[name=email]').fill(user.email);
  await page.locator('#accountPanel button[name=send]').click();
  await expect(page.locator('#accountPanel [role=status]')).toContainText('mã đã được gửi');
  await page.locator('#accountPanel input[name=otp]').fill('123456');
  await page.locator('#accountPanel button[name=verify]').click();
  await expect(page.locator('#accountPanel [role=status]')).toContainText('Đã đăng nhập');
  await page.reload();
  await expect(page.locator('#accountPanel [role=status]')).toContainText('Đã đăng nhập');
  const tab=await context.newPage();await tab.goto('/Pickleball/?page=settings');
  await expect(tab.locator('#accountPanel [role=status]')).toContainText('Đã đăng nhập');
  await page.locator('[data-logout]').click();
  await expect(tab.locator('#accountPanel [role=status]')).toContainText('Chế độ khách');
 });
});
