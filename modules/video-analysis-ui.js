/* PickleUp V5.37 — video movement analysis UI (ADR-0006, AGENTS [PROD-11]).
 * The video never leaves the device and is never stored. Nothing here writes Web Storage, IDB or Cache Storage.
 * MediaPipe JS is self-hosted in vendor/mediapipe; the WASM binary and the model are downloaded
 * only after the user asks, and only used when their SHA-256 matches the pinned value. */
(function(root){
"use strict";
const core=root.PICKLEUP_VIDEO_CORE;
const build=root.PICKLEUP_BUILD||"";
const asset=file=>"./"+file+(build?"?v="+encodeURIComponent(build):"");
const ENGINE=Object.freeze({
 version:"@mediapipe/tasks-vision 1.2.3",
 bundle:"vendor/mediapipe/vision_bundle.js",
 loader:"vendor/mediapipe/vision_wasm_internal.js",
 wasm:{url:"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm/vision_wasm_internal.wasm",sha256:"IlvAbA9Rqc8x/qDp4LAkPp4B+17zMswaf6Zlbb39qr8=",bytes:14665716,type:"application/wasm"},
 model:{url:"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",sha256:"WZKeHR7pUodzXd2DOxnPSsRtKbx6/du/Z1PEWWkNV0o=",bytes:5777746,name:"pose_landmarker_lite"}
});
// A ready position is static: 5 fps gives enough frames while keeping slow phones under ~1 min for 15 s.
const LIMITS=Object.freeze({maxSeconds:15.5,maxBytes:300*1024*1024,fps:5,maxFrames:80,analysisWidth:640});
// Minimal module using a v128 instruction (same probe as wasm-feature-detect "simd").
const SIMD_PROBE=new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]);
const EDGES=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,31],[28,32]];
const state={engine:null,loading:null,delegate:null,loadMs:null,videoUrl:null,file:null,running:false,diag:{}};
const $=id=>document.getElementById(id);
const text=(el,value)=>{if(el)el.textContent=value==null?"":String(value)};

function simdSupported(){try{return typeof WebAssembly==="object"&&WebAssembly.validate(SIMD_PROBE)}catch(_){return false}}
function b64(buffer){let s="";const bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s)}

/** Download fully, then compare SHA-256 with the pinned value. Never returns unverified bytes. */
async function fetchVerified(spec,onProgress,signal){
 const response=await fetch(spec.url,{mode:"cors",credentials:"omit",cache:"force-cache",referrerPolicy:"no-referrer",signal});
 if(!response.ok)throw Error("Không tải được tệp phân tích (HTTP "+response.status+").");
 let buffer;
 if(response.body&&typeof response.body.getReader==="function"){
  const reader=response.body.getReader(),chunks=[];let received=0;
  for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.length;if(received>spec.bytes*1.1)throw Error("Tệp phân tích lớn bất thường; đã dừng.");onProgress(received)}
  buffer=new Uint8Array(received);let offset=0;for(const c of chunks){buffer.set(c,offset);offset+=c.length}
 }else{buffer=new Uint8Array(await response.arrayBuffer());onProgress(buffer.length)}
 const digest=b64(await crypto.subtle.digest("SHA-256",buffer));
 if(digest!==spec.sha256)throw Error("Tệp phân tích không khớp mã băm đã ghim; không chạy để giữ an toàn.");
 return buffer;
}

async function loadEngine(){
 if(state.engine)return state.engine;
 if(state.loading)return state.loading;
 const button=$("vaLoad"),bar=$("vaLoadProgress"),status=$("vaEngineStatus");
 if(!simdSupported()){text(status,"Trình duyệt này chưa hỗ trợ WebAssembly SIMD (cần Safari 16.4+, Chrome/Edge 91+ hoặc Firefox 89+).");return null}
 if(!root.crypto?.subtle){text(status,"Cần mở ứng dụng qua HTTPS để kiểm tra mã băm.");return null}
 const started=performance.now();
 if(button)button.disabled=true;
 if(bar){bar.hidden=false;bar.value=0}
 const total=ENGINE.wasm.bytes+ENGINE.model.bytes,got={wasm:0,model:0},abort=new AbortController();
 // One failed download cancels the other, and late progress never overwrites the final message.
 const progress=(key,n)=>{if(abort.signal.aborted)return;got[key]=n;if(bar)bar.value=Math.min(100,Math.round((got.wasm+got.model)/total*100));text(status,"Đang tải "+Math.round((got.wasm+got.model)/1048576)+" / "+Math.round(total/1048576)+" MB…")};
 state.loading=(async()=>{
  const guard=p=>p.catch(err=>{abort.abort();throw err});
  const [wasm,model]=await Promise.all([guard(fetchVerified(ENGINE.wasm,n=>progress("wasm",n),abort.signal)),guard(fetchVerified(ENGINE.model,n=>progress("model",n),abort.signal))]);
  abort.abort();
  text(status,"Đã kiểm tra mã băm. Đang khởi động…");
  const wasmUrl=URL.createObjectURL(new Blob([wasm],{type:ENGINE.wasm.type}));
  try{
   // import() resolves relative to this script (modules/), so pass an absolute document-relative URL.
   const vision=await import(new URL(asset(ENGINE.bundle),root.location.href).href);
   const fileset={wasmLoaderPath:new URL(asset(ENGINE.loader),root.location.href).href,wasmBinaryPath:wasmUrl};
   const options=delegate=>({baseOptions:{modelAssetBuffer:model,delegate},runningMode:"VIDEO",numPoses:1,minPoseDetectionConfidence:0.5,minPosePresenceConfidence:0.5,minTrackingConfidence:0.5});
   let engine=null,delegate="GPU";
   try{engine=await vision.PoseLandmarker.createFromOptions(fileset,options("GPU"))}
   catch(_){delegate="CPU";engine=await vision.PoseLandmarker.createFromOptions(fileset,options("CPU"))}
   state.engine=engine;state.delegate=delegate;state.loadMs=Math.round(performance.now()-started);
   text(status,"Bộ phân tích sẵn sàng ("+(delegate==="GPU"?"GPU":"CPU")+").");
   if(button){button.textContent="Bộ phân tích đã sẵn sàng";button.disabled=true}
   updateRunButton();
   return engine;
  }finally{URL.revokeObjectURL(wasmUrl)}
 })().catch(err=>{
  state.loading=null;
  if(button)button.disabled=false;
  text(status,err&&err.message?err.message:"Không khởi động được bộ phân tích.");
  return null;
 }).finally(()=>{if(bar)bar.hidden=true});
 return state.loading;
}

function updateRunButton(){const run=$("vaRun");if(run)run.disabled=!(state.engine&&state.file&&!state.running)}

function resetResult(){for(const id of ["vaResult","vaDiagnostics"]){const el=$(id);if(el)el.hidden=true}text($("vaCopyStatus"),"")}

function releaseVideo(){if(state.videoUrl){URL.revokeObjectURL(state.videoUrl);state.videoUrl=null}}

function waitFor(target,event,ms){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{cleanup();reject(Error("timeout"))},ms);
  const ok=()=>{cleanup();resolve()},bad=()=>{cleanup();reject(Error("error"))};
  function cleanup(){clearTimeout(timer);target.removeEventListener(event,ok);target.removeEventListener("error",bad)}
  target.addEventListener(event,ok,{once:true});target.addEventListener("error",bad,{once:true});
 });
}

async function onFile(event){
 const input=event.target,status=$("vaFileStatus"),video=$("vaVideo"),stage=$("vaStage");
 resetResult();releaseVideo();state.file=null;updateRunButton();
 const file=input.files&&input.files[0];
 if(!file){text(status,"");if(stage)stage.hidden=true;return}
 if(!/^video\//.test(file.type||"")){text(status,"Tệp này không phải video.");input.value="";return}
 if(file.size>LIMITS.maxBytes){text(status,"Video quá lớn (tối đa 300 MB). Hãy cắt ngắn còn 3–10 giây.");input.value="";return}
 state.videoUrl=URL.createObjectURL(file);
 video.src=state.videoUrl;
 try{await waitFor(video,"loadedmetadata",15000)}catch(_){releaseVideo();text(status,"Trình duyệt không mở được video này.");return}
 if(!(video.duration>0)||!Number.isFinite(video.duration)){releaseVideo();text(status,"Không đọc được độ dài video.");return}
 if(video.duration>LIMITS.maxSeconds){releaseVideo();text(status,"Video dài "+Math.round(video.duration)+" giây. Hãy cắt còn tối đa 15 giây.");return}
 state.file={name:file.name,bytes:file.size,type:file.type,duration:video.duration,width:video.videoWidth,height:video.videoHeight};
 if(stage)stage.hidden=false;
 text(status,"Video "+video.videoWidth+"×"+video.videoHeight+", "+video.duration.toFixed(1)+" giây."+(state.engine?"":" Hãy tải bộ phân tích ở bước 2."));
 updateRunButton();
}

function drawSkeleton(ctx,landmarks,w,h){
 ctx.lineWidth=Math.max(2,w/240);ctx.strokeStyle="#22c55e";ctx.fillStyle="#facc15";
 for(const [a,b] of EDGES){const p=landmarks[a],q=landmarks[b];if(!p||!q||(p.visibility??1)<0.5||(q.visibility??1)<0.5)continue;ctx.beginPath();ctx.moveTo(p.x*w,p.y*h);ctx.lineTo(q.x*w,q.y*h);ctx.stroke()}
 for(const i of [11,12,13,14,15,16,23,24,25,26,27,28]){const p=landmarks[i];if(!p||(p.visibility??1)<0.5)continue;ctx.beginPath();ctx.arc(p.x*w,p.y*h,Math.max(3,w/160),0,Math.PI*2);ctx.fill()}
}

const METRIC_LABELS=[["view","Góc quay",v=>({side:"Nghiêng",front:"Chính diện",oblique:"Chéo",unknown:"Không rõ"})[v]||v],["kneeAngle","Góc gối",v=>v+"°"],["hipAngle","Góc hông",v=>v+"°"],["stanceRatio","Độ rộng chân / vai",v=>v+"×"],["handHeight","Độ cao tay cầm vợt (0 = hông, 1 = vai)",v=>v]];

function renderResult(result){
 const box=$("vaResult"),list=$("vaFindings"),metrics=$("vaMetrics");
 list.replaceChildren();metrics.replaceChildren();
 if(result.status!=="ok"){
  text($("vaResultTitle"),"Chưa đủ dữ liệu để nhận xét");
  for(const reason of result.reasons){const li=document.createElement("li");li.textContent=reason;list.appendChild(li)}
  const li=document.createElement("li");li.textContent="Quay lại theo hướng dẫn ở bước 1 rồi thử lại.";list.appendChild(li);
 }else if(!result.findings.length){
  text($("vaResultTitle"),"Tư thế chuẩn bị ổn theo các ngưỡng hiện có");
  const li=document.createElement("li");li.textContent="Không thấy điểm cần chỉnh rõ rệt. Hãy giữ tư thế này khi di chuyển.";list.appendChild(li);
 }else{
  text($("vaResultTitle"),"Gợi ý chỉnh sửa");
  for(const f of result.findings){const li=document.createElement("li"),strong=document.createElement("strong"),p=document.createElement("span");strong.textContent=f.title;p.textContent=" "+f.detail;li.append(strong,p);list.appendChild(li)}
 }
 if(result.metrics)for(const [key,label,fmt] of METRIC_LABELS){
  const v=result.metrics[key];
  const tr=document.createElement("tr"),th=document.createElement("th"),td=document.createElement("td");
  th.scope="row";th.textContent=label;td.textContent=v==null?"Không đo được ở góc quay này":fmt(v);tr.append(th,td);metrics.appendChild(tr);
 }
 text($("vaDisclaimer"),result.disclaimer+" Số khung hình rõ: "+result.frames.valid+"/"+result.frames.total+".");
 box.hidden=false;
}

function renderDiagnostics(d){
 const list=$("vaDiagList");list.replaceChildren();
 for(const [k,v] of Object.entries(d)){const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=k;dd.textContent=String(v);list.append(dt,dd)}
 $("vaDiagnostics").hidden=false;
}

async function run(){
 if(state.running||!state.engine||!state.file)return;
 state.running=true;updateRunButton();resetResult();
 const video=$("vaVideo"),bar=$("vaRunProgress"),status=$("vaFileStatus"),view=$("vaCanvas");
 const work=document.createElement("canvas"),scale=Math.min(1,LIMITS.analysisWidth/video.videoWidth);
 work.width=Math.max(1,Math.round(video.videoWidth*scale));work.height=Math.max(1,Math.round(video.videoHeight*scale));
 const wctx=work.getContext("2d",{willReadFrequently:false});
 const frames=[],stamps=[],step=1/LIMITS.fps,started=performance.now();let detectMs=0,seekFails=0,lastTs=0;
 if(bar){bar.hidden=false;bar.value=0}
 try{
  video.pause();
  for(let t=0,i=0;t<video.duration&&i<LIMITS.maxFrames;t+=step,i++){
   video.currentTime=Math.min(t,Math.max(0,video.duration-0.001));
   try{await waitFor(video,"seeked",5000)}catch(_){seekFails++;continue}
   wctx.drawImage(video,0,0,work.width,work.height);
   const ts=Math.max(lastTs+1,Math.round(t*1000));lastTs=ts;
   const d0=performance.now();
   const r=state.engine.detectForVideo(work,ts);
   detectMs+=performance.now()-d0;
   const lm=r&&r.landmarks&&r.landmarks[0],w=r&&r.worldLandmarks&&r.worldLandmarks[0];
   frames.push({t:ts,landmarks:lm?lm.map(p=>({x:p.x,y:p.y,z:p.z,visibility:p.visibility})):[],world:w?w.map(p=>({x:p.x,y:p.y,z:p.z,visibility:p.visibility})):undefined});
   stamps.push(t);
   if(bar)bar.value=Math.round(t/video.duration*100);
   text(status,"Đang phân tích khung hình "+(i+1)+"…");
  }
  const size={width:video.videoWidth,height:video.videoHeight};
  const result=core.analyzeReadyPosition(frames,size);
  renderResult(result);
  const pick=core.representativeFrame(frames,size,result);
  if(pick>=0){
   video.currentTime=stamps[pick];await waitFor(video,"seeked",5000).catch(()=>{});
   view.width=work.width;view.height=work.height;
   const ctx=view.getContext("2d");ctx.drawImage(video,0,0,view.width,view.height);drawSkeleton(ctx,frames[pick].landmarks,view.width,view.height);
  }
  const totalMs=Math.round(performance.now()-started);
  state.diag={"Bộ phân tích":ENGINE.version+" · "+ENGINE.model.name,"Xử lý":state.delegate,"Tải + khởi động (ms)":state.loadMs,"Video":size.width+"×"+size.height+", "+state.file.duration.toFixed(1)+" s","Khung hình phân tích":frames.length+(seekFails?" (lỗi tua "+seekFails+")":""),"Khung hình rõ":result.frames.valid,"Nhận diện TB (ms/khung)":frames.length?Math.round(detectMs/frames.length):"-","Tổng thời gian (ms)":totalMs,"Phiên bản phân tích":result.version,"Trình duyệt":navigator.userAgent};
  renderDiagnostics(state.diag);
  text(status,"Xong trong "+(totalMs/1000).toFixed(1)+" giây.");
 }catch(err){
  text(status,"Phân tích thất bại: "+(err&&err.message?err.message:"lỗi không rõ")+".");
 }finally{
  if(bar)bar.hidden=true;
  state.running=false;updateRunButton();
 }
}

async function copyDiagnostics(){
 const lines=Object.entries(state.diag).map(([k,v])=>k+": "+v).join("\n");
 try{await navigator.clipboard.writeText(lines);text($("vaCopyStatus"),"Đã sao chép.")}
 catch(_){text($("vaCopyStatus"),"Không sao chép được; hãy chụp màn hình phần này.")}
}

function init(){
 const load=$("vaLoad");if(!load||load.dataset.bound)return;load.dataset.bound="1";
 load.addEventListener("click",()=>{loadEngine()});
 $("vaFile").addEventListener("change",onFile);
 $("vaRun").addEventListener("click",()=>{run()});
 $("vaCopyDiag").addEventListener("click",()=>{copyDiagnostics()});
 root.addEventListener("pagehide",releaseVideo);
 if(!simdSupported())text($("vaEngineStatus"),"Trình duyệt này chưa hỗ trợ WebAssembly SIMD (cần Safari 16.4+, Chrome/Edge 91+ hoặc Firefox 89+).");
}
root.PICKLEUP_VIDEO_UI=Object.freeze({ENGINE,LIMITS,loadEngine,isReady:()=>!!state.engine});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window);
