const {test,expect}=require('@playwright/test'),virtual=require('./helpers/virtual-origin.cjs');
test.use({serviceWorkers:'block',trace:'off',screenshot:'off',video:'off'});
const A='11111111-1111-4111-8111-111111111111',origin='https://pickleup-staging.home-309.workers.dev',url=origin+'/?page=settings';
const status='#accountPanel > [role=status]',del='[data-account-delete]',delStatus='[data-delete-status]';
// Mock adapter only: real auth-ui.js and settings page; the server contract is covered by pgTAP and the real-Auth browser run.
async function setup(context,replies){
 await virtual.serve(context,origin);
 await context.route('**/modules/auth-config.js*',r=>r.fulfill({contentType:'text/javascript',body:'window.PICKLEUP_AUTH_CONFIG={enabled:true,allowSignup:true,url:"https://rfeoeagklmaqmkcdhprb.supabase.co",publishableKey:"sb_publishable_synthetic"}'}));
 await context.route('https://rfeoeagklmaqmkcdhprb.supabase.co/**',r=>r.abort());
 await context.exposeBinding('DELETE_CALL',(_,call)=>{const reply=call.name==='deleteAccount'?replies.shift():null;return reply});
 await context.route('**/modules/auth-adapter.js*',r=>r.fulfill({contentType:'text/javascript',body:`(()=>{
  let owner='${A}';const listeners=new Set(),state=()=>({status:owner?'authenticated':'guest',user:owner?{id:owner,email:'fixture@example.invalid'}:null,error:null});
  const change=id=>{owner=id;for(const fn of [...listeners])fn(state())};window.DELETE_LOG=[];
  const empty=async()=>({status:'auth_required'});
  const auth={ready:Promise.resolve(),getGeneration:()=>0,subscribe(fn){listeners.add(fn);fn(state());return ()=>listeners.delete(fn)},syncRpc:empty,importRpc:empty,eventRpc:empty,planRpc:empty,privateRead:async()=>({status:'ok'}),
   requestOtp:async(email,signup)=>{DELETE_LOG.push(['otp',email,signup]);return {error:null}},
   verify:async(email,code)=>{DELETE_LOG.push(['verify',email,code]);if(code==='000000')return {error:'Mã sai hoặc đã hết hạn. Kiểm tra mã hoặc yêu cầu mã mới.'};change(owner);return {error:null}},
   deleteAccount:async id=>{DELETE_LOG.push(['delete',id]);return await DELETE_CALL({name:'deleteAccount'})},
   logout:async()=>{DELETE_LOG.push(['logout']);change(null);return {}}};
  window.PickleUpAuth={getShared:async()=>auth};
 })();`}));
}
async function open(page){await page.goto(url);await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('settings'));await expect(page.locator(status)).toContainText('Đã đăng nhập');await page.locator(del+' summary').click()}
const log=page=>page.evaluate(()=>DELETE_LOG);
for(const width of [390,1440])test('account deletion form: emailed code, phrase gate, refusal keeps the account, success signs out '+width,async({page,context})=>{
 await page.setViewportSize({width,height:900});await setup(context,[{status:'reauth_required'},{status:'deleted'}]);await open(page);
 await expect(page.locator(del)).toBeVisible();await expect(page.locator('[data-delete-confirm]')).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('[data-delete-send]').click();await expect(page.locator(delStatus)).toContainText('Mã xác nhận xóa đã được gửi');await expect(page.locator('[data-delete-send]')).toBeDisabled();
 expect(await log(page)).toEqual([['otp','fixture@example.invalid',false]]);
 await page.locator('[data-delete-otp]').fill('123456');await page.locator('[data-delete-phrase]').fill('XÓA');await expect(page.locator('[data-delete-confirm]')).toBeDisabled();
 await page.locator('[data-delete-phrase]').fill('xoa tai khoan');await expect(page.locator('[data-delete-confirm]')).toBeEnabled();
 await page.locator('[data-delete-otp]').fill('000000');await page.locator('[data-delete-confirm]').click();await expect(page.locator(delStatus)).toContainText('Tài khoản chưa bị xóa');
 expect((await log(page)).filter(e=>e[0]==='delete')).toEqual([]);
 await page.locator('[data-delete-otp]').fill('123456');await page.locator('[data-delete-phrase]').fill('XÓA TÀI KHOẢN');await page.locator('[data-delete-confirm]').click();
 await expect(page.locator(delStatus)).toContainText('Máy chủ cần mã vừa nhận');await expect(page.locator(status)).toContainText('Đã đăng nhập');
 await page.locator('[data-delete-otp]').fill('654321');await page.locator('[data-delete-confirm]').click();
 await expect(page.locator(status)).toContainText('Đã xóa tài khoản fixture@example.invalid');await expect(page.locator(del)).toBeHidden();
 expect((await log(page)).map(e=>e[0])).toEqual(['otp','verify','verify','delete','verify','delete','logout']);
 expect((await log(page)).filter(e=>e[0]==='delete').every(e=>e[1]===A)).toBe(true);
});
