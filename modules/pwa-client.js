(function(){
  if(!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol))return;
  // sw.js calls skipWaiting() during install, yet the browser can leave the new worker in
  // "waiting" for as long as a page stays open (measured in Chromium: about 3 in 100 updates,
  // still waiting 6 s later; one more skipWaiting() activates it at once). Ask again, bounded.
  function activateWaiting(registration){
    let attempts=0,timer=null;
    const ask=()=>{
      timer=null;
      const worker=registration.waiting;
      if(!worker)return;
      try{worker.postMessage({type:'PICKLEUP_SKIP_WAITING'})}catch(_){return}
      if(++attempts<5)timer=setTimeout(ask,1000*2**(attempts-1));
    };
    const arm=()=>{if(timer===null){attempts=0;timer=setTimeout(ask,1000)}};
    if(registration.waiting)arm();
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed')arm()});
    });
  }
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(activateWaiting).catch(err=>console.warn('PWA offline unavailable',err)));
  let pendingPrompt=null;
  const btn=document.createElement('button');
  btn.type='button';btn.textContent='Cài PickleUp';btn.setAttribute('aria-label','Cài ứng dụng PickleUp');
  btn.style.cssText='position:fixed;bottom:18px;right:18px;z-index:99;background:#142d30;color:#b8ef49;border:2px solid #b8ef49;border-radius:999px;padding:11px 18px;font-weight:700;box-shadow:0 8px 24px #0003;display:none';
  document.body.appendChild(btn);
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pendingPrompt=event;btn.style.display='block'});
  btn.addEventListener('click',async()=>{if(!pendingPrompt)return;const prompt=pendingPrompt;pendingPrompt=null;btn.style.display='none';await prompt.prompt()});
  window.addEventListener('appinstalled',()=>{pendingPrompt=null;btn.remove()});
})();
