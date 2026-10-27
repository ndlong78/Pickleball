(function(){
  if(!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol))return;
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('PWA offline unavailable',err)));
  let pendingPrompt=null;
  const btn=document.createElement('button');
  btn.type='button';btn.textContent='Cài PickleUp';btn.setAttribute('aria-label','Cài ứng dụng PickleUp');
  btn.style.cssText='position:fixed;bottom:18px;right:18px;z-index:99;background:#142d30;color:#b8ef49;border:2px solid #b8ef49;border-radius:999px;padding:11px 18px;font-weight:700;box-shadow:0 8px 24px #0003;display:none';
  document.body.appendChild(btn);
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pendingPrompt=event;btn.style.display='block'});
  btn.addEventListener('click',async()=>{if(!pendingPrompt)return;const prompt=pendingPrompt;pendingPrompt=null;btn.style.display='none';await prompt.prompt()});
  window.addEventListener('appinstalled',()=>{pendingPrompt=null;btn.remove()});
})();
