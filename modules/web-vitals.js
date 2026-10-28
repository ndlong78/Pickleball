/* PickleUp V3.6 — local-only navigation and rendering measurements.
 * LCP/CLS/FCP describe the initial document only, not client-side routes.
 * Interaction latency is an estimate, not a certified CrUX INP score. */
(function(root){
"use strict";
const initial={
  startedAt:typeof performance!=="undefined"?performance.timeOrigin:0,
  fcp:null,lcp:null,cls:0,inpEstimate:null,
  longTasks:0,observerSupport:{},
  initialPage:null
};
const routes=[];
const MAX_ROUTES=30;
let routeSequence=0,visible=true,metricVersion=0;
const listeners=new Set();
const perf=root.performance||performance;
function notify(){
 metricVersion++;
 for(const fn of listeners)try{fn()}catch(_){}
}
function supported(type,handler,opts={}){
 if(typeof root.PerformanceObserver!=="function"){initial.observerSupport[type]=false;return}
 try{
  const observer=new root.PerformanceObserver(list=>{for(const entry of list.getEntries())handler(entry)});
  observer.observe({type,buffered:true,...opts});
  initial.observerSupport[type]=true;
 }catch(_){initial.observerSupport[type]=false}
}
function finite(x){return typeof x==="number"&&Number.isFinite(x)?x:null}
supported("paint",entry=>{
 if(entry.name==="first-contentful-paint"){
  initial.fcp=finite(entry.startTime);notify();
 }
});
supported("largest-contentful-paint",entry=>{
 if(!visible)return;
 initial.lcp=finite(entry.startTime);notify();
});
supported("layout-shift",entry=>{
 if(entry.hadRecentInput||!visible)return;
 initial.cls=Number((initial.cls+(finite(entry.value)||0)).toFixed(4));notify();
});
const interactions=new Map();
supported("event",entry=>{
 if(!entry.interactionId||!Number.isFinite(entry.duration))return;
 const prev=interactions.get(entry.interactionId)||0;
 interactions.set(entry.interactionId,Math.max(prev,entry.duration));
 // Closest practical estimate: p98 interaction latency, bounded in memory.
 if(interactions.size>300){
  const first=interactions.keys().next().value;
  interactions.delete(first);
 }
 const times=[...interactions.values()].sort((a,b)=>a-b);
 initial.inpEstimate=times[Math.min(times.length-1,Math.max(0,Math.ceil(times.length*0.98)-1))];
 notify();
},{durationThreshold:40});
supported("longtask",entry=>{if(entry.duration>=50){initial.longTasks++;notify()}});
function afterPaint(fn){
 const raf=typeof root.requestAnimationFrame==="function"?root.requestAnimationFrame.bind(root):cb=>Promise.resolve().then(cb);
 raf(()=>raf(fn));
}
function trackRoute(page,loaded){
 const token=++routeSequence,started=perf.now(),record={
  page,at:new Date().toISOString(),loadedMs:null,paintMs:null,
  newScripts:null,initial:routes.length===0,completed:false
 };
 if(record.initial)initial.initialPage=page;
 routes.push(record);if(routes.length>MAX_ROUTES)routes.shift();
 notify();
 Promise.resolve(loaded).then(result=>{
  if(token!==routeSequence)return;
  record.loadedMs=Math.max(0,Math.round(perf.now()-started));
  record.newScripts=Number.isInteger(result?.scripts)?result.scripts:null;
  afterPaint(()=>{
   if(token!==routeSequence)return;
   record.paintMs=Math.max(0,Math.round(perf.now()-started));
   record.completed=true;
   notify();
  });
 }).catch(()=>{
  if(token!==routeSequence)return;
  record.failed=true;notify();
 });
 return record;
}
function collect(){
 const last=routes.map(r=>({...r}));
 return {
  initial:{...initial,observerSupport:{...initial.observerSupport}},
  routes:last,
  availableMetrics:Object.keys(initial.observerSupport).filter(k=>initial.observerSupport[k]),
  version:metricVersion
 };
}
function subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn)}
function reportResourceSummary(){
 const entries=perf.getEntriesByType?.("resource")||[];
 const own=entries.filter(e=>{try{return new URL(e.name,root.location.href).origin===root.location.origin}catch(_){return false}});
 return {requests:own.length,transferBytes:own.reduce((n,r)=>n+(finite(r.transferSize)||0),0),
  decodedBytes:own.reduce((n,r)=>n+(finite(r.decodedBodySize)||0),0)};
}
root.addEventListener?.("visibilitychange",()=>{
 visible=!root.document?.hidden;
 if(!visible)notify();
});
root.PICKLEUP_METRICS={trackRoute,collect,subscribe,reportResourceSummary};
})(window);
