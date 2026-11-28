/* PickleUp V5.37 — video movement analysis, pure logic (ADR-0006, AGENTS [PROD-11]).
 * Input: per-frame MediaPipe Pose landmarks (33 points). No DOM, no storage, no network.
 * Thresholds are initial proposals, NOT validated by a human coach: every result says so. */
(function(root){
"use strict";
const VERSION="ready-v1";
const L={nose:0,lShoulder:11,rShoulder:12,lElbow:13,rElbow:14,lWrist:15,rWrist:16,lHip:23,rHip:24,lKnee:25,rKnee:26,lAnkle:27,rAnkle:28};
const REQUIRED=[L.lShoulder,L.rShoulder,L.lHip,L.rHip,L.lKnee,L.rKnee,L.lAnkle,L.rAnkle];
const MIN_VISIBILITY=0.5,MIN_VALID_FRAMES=10,MIN_VALID_RATIO=0.6,MIN_BODY_HEIGHT=0.25;
const DISCLAIMER="Gợi ý tham khảo từ ngưỡng ban đầu, chưa được HLV kiểm chứng. Không phải điểm kiểm tra, DUPR hay xác nhận buổi tập.";
// Provisional thresholds (degrees / ratios). Change only with evidence; bump VERSION when they change.
const T=Object.freeze({kneeStraight:160,kneeSoft:150,kneeDeep:110,hipUpright:170,stanceNarrow:1.0,stanceWide:2.2,handLow:0.15});

const finite=n=>typeof n==="number"&&Number.isFinite(n);
function point(p){return p&&finite(p.x)&&finite(p.y)?p:null}
function visible(p){return !!point(p)&&(p.visibility===undefined||p.visibility>=MIN_VISIBILITY)}
function inFrame(p){return p.x>=-0.02&&p.x<=1.02&&p.y>=-0.02&&p.y<=1.02}
function sub(a,b){return {x:a.x-b.x,y:a.y-b.y,z:(a.z||0)-(b.z||0)}}
function len(v){return Math.hypot(v.x,v.y,v.z)}
/** Angle ABC in degrees (3D when z is present). Null when degenerate. */
function angle(a,b,c){
 if(!point(a)||!point(b)||!point(c))return null;
 const u=sub(a,b),v=sub(c,b),d=len(u)*len(v);
 if(!(d>1e-9))return null;
 const cos=Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y+u.z*v.z)/d));
 return Math.acos(cos)*180/Math.PI;
}
function median(values){
 const v=values.filter(finite).sort((a,b)=>a-b);
 if(!v.length)return null;
 const m=v.length>>1;
 return v.length%2?v[m]:(v[m-1]+v[m])/2;
}
function mean(values){const v=values.filter(finite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null}
const round=(n,d=0)=>finite(n)?Math.round(n*10**d)/10**d:null;
// Image coordinates are normalised to width and height separately; scale x by the aspect ratio.
function to2d(p,aspect){return {x:p.x*aspect,y:p.y,z:0}}

/** Front vs side view from the 2D shoulder width relative to the torso length. */
function viewOf(lm,aspect){
 const ls=to2d(lm[L.lShoulder],aspect),rs=to2d(lm[L.rShoulder],aspect),lh=to2d(lm[L.lHip],aspect),rh=to2d(lm[L.rHip],aspect);
 const torso=len(sub({x:(ls.x+rs.x)/2,y:(ls.y+rs.y)/2,z:0},{x:(lh.x+rh.x)/2,y:(lh.y+rh.y)/2,z:0}));
 if(!(torso>1e-6))return "unknown";
 const r=len(sub(ls,rs))/torso;
 return r<0.35?"side":r>0.55?"front":"oblique";
}

function frameQuality(frame){
 const lm=frame&&Array.isArray(frame.landmarks)?frame.landmarks:null;
 if(!lm||lm.length<33)return {ok:false,reason:"no_person"};
 if(!REQUIRED.every(i=>visible(lm[i])))return {ok:false,reason:"body_hidden"};
 if(!REQUIRED.every(i=>inFrame(lm[i])))return {ok:false,reason:"out_of_frame"};
 const top=Math.min(lm[L.lShoulder].y,lm[L.rShoulder].y),bottom=Math.max(lm[L.lAnkle].y,lm[L.rAnkle].y);
 if(bottom-top<MIN_BODY_HEIGHT)return {ok:false,reason:"too_far"};
 return {ok:true};
}

/** Per-frame metrics. World landmarks (metres, 3D) give view-independent angles; 2D falls back per view. */
function frameMetrics(frame,aspect){
 const lm=frame.landmarks,w=Array.isArray(frame.world)&&frame.world.length>=33?frame.world:null;
 const view=viewOf(lm,aspect);
 const P=w?(i=>w[i]):(i=>to2d(lm[i],aspect));
 const use3d=!!w;
 const knees=[[L.lHip,L.lKnee,L.lAnkle],[L.rHip,L.rKnee,L.rAnkle]].map(([a,b,c])=>visible(lm[a])&&visible(lm[b])&&visible(lm[c])?angle(P(a),P(b),P(c)):null);
 const hips=[[L.lShoulder,L.lHip,L.lKnee],[L.rShoulder,L.rHip,L.rKnee]].map(([a,b,c])=>angle(P(a),P(b),P(c)));
 const angleOk=use3d||view==="side";
 const shoulderW=len(sub(P(L.lShoulder),P(L.rShoulder))),ankleW=len(sub(P(L.lAnkle),P(L.rAnkle)));
 const stanceOk=use3d||view==="front";
 // Hand height: 0 at hip level, 1 at shoulder level, from image y (down is positive). Higher wrist = paddle hand.
 const hipY=(lm[L.lHip].y+lm[L.rHip].y)/2,shY=(lm[L.lShoulder].y+lm[L.rShoulder].y)/2,span=hipY-shY;
 const wrists=[L.lWrist,L.rWrist].filter(i=>visible(lm[i])).map(i=>(hipY-lm[i].y)/span);
 return {
  view,
  kneeAngle:angleOk?mean(knees):null,
  hipAngle:angleOk?mean(hips):null,
  stanceRatio:stanceOk&&shoulderW>1e-6?ankleW/shoulderW:null,
  handHeight:span>1e-6&&wrists.length?Math.max(...wrists):null
 };
}

function findingsFor(m){
 const out=[];
 if(finite(m.kneeAngle)){
  if(m.kneeAngle>T.kneeStraight)out.push({id:"knee_straight",severity:3,title:"Gối gần như thẳng",detail:`Góc gối khoảng ${round(m.kneeAngle)}°. Hạ thấp trọng tâm, gập gối nhiều hơn (gợi ý khoảng 130–150°) để phản xạ và bước nhanh hơn.`,metric:"kneeAngle",value:round(m.kneeAngle),target:"130–150°"});
  else if(m.kneeAngle>T.kneeSoft)out.push({id:"knee_soft",severity:1,title:"Có thể hạ thấp thêm một chút",detail:`Góc gối khoảng ${round(m.kneeAngle)}°. Gập gối thêm nhẹ giúp giữ thăng bằng khi đỡ bóng thấp.`,metric:"kneeAngle",value:round(m.kneeAngle),target:"130–150°"});
  else if(m.kneeAngle<T.kneeDeep)out.push({id:"knee_deep",severity:2,title:"Gối gập rất sâu",detail:`Góc gối khoảng ${round(m.kneeAngle)}°. Tư thế quá thấp dễ mỏi đùi; nâng lên một chút nếu thấy nặng.`,metric:"kneeAngle",value:round(m.kneeAngle),target:"130–150°"});
 }
 if(finite(m.hipAngle)&&m.hipAngle>T.hipUpright)out.push({id:"hip_upright",severity:2,title:"Thân trên đứng thẳng",detail:`Góc hông khoảng ${round(m.hipAngle)}°. Hơi gập hông, ngả nhẹ người về trước để trọng tâm dồn lên mũi chân.`,metric:"hipAngle",value:round(m.hipAngle),target:"dưới 170°"});
 if(finite(m.stanceRatio)){
  if(m.stanceRatio<T.stanceNarrow)out.push({id:"stance_narrow",severity:2,title:"Hai chân hẹp hơn vai",detail:`Khoảng cách hai chân bằng ${round(m.stanceRatio,1)} lần độ rộng vai. Mở rộng tới khoảng 1.2–1.8 lần để vững hơn.`,metric:"stanceRatio",value:round(m.stanceRatio,1),target:"1.2–1.8×"});
  else if(m.stanceRatio>T.stanceWide)out.push({id:"stance_wide",severity:1,title:"Hai chân mở rất rộng",detail:`Khoảng cách hai chân bằng ${round(m.stanceRatio,1)} lần độ rộng vai. Thu hẹp một chút để bước sang hai bên nhanh hơn.`,metric:"stanceRatio",value:round(m.stanceRatio,1),target:"1.2–1.8×"});
 }
 if(finite(m.handHeight)&&m.handHeight<T.handLow)out.push({id:"hands_low",severity:3,title:"Tay cầm vợt thấp",detail:"Tay cầm vợt đang ngang hoặc dưới hông. Đưa vợt lên trước bụng hoặc ngực để kịp phản xạ ở bếp (vợt lên).",metric:"handHeight",value:round(m.handHeight,2),target:"từ 0.3 trở lên (0 = hông, 1 = vai)"});
 return out.sort((a,b)=>b.severity-a.severity).slice(0,2);
}

const REASONS={no_person:"Không nhận ra người trong khung hình.",body_hidden:"Không thấy đủ vai, hông, gối và cổ chân.",out_of_frame:"Một phần cơ thể nằm ngoài khung hình.",too_far:"Người đứng quá xa máy quay."};

/**
 * Analyse a clip of a ready position.
 * @param {Array<{t:number,landmarks:Array,world?:Array}>} frames
 * @param {{width:number,height:number}} size video size in pixels
 */
function analyzeReadyPosition(frames,size){
 const list=Array.isArray(frames)?frames:[];
 const aspect=size&&size.width>0&&size.height>0?size.width/size.height:1;
 const reasons={};let valid=[];
 for(const f of list){const q=frameQuality(f);if(q.ok)valid.push(f);else reasons[q.reason]=(reasons[q.reason]||0)+1}
 const summary={total:list.length,valid:valid.length};
 const base={version:VERSION,skill:"position",disclaimer:DISCLAIMER,frames:summary};
 if(valid.length<MIN_VALID_FRAMES||valid.length<list.length*MIN_VALID_RATIO){
  const top=Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([k])=>REASONS[k]).filter(Boolean);
  return {...base,status:"insufficient",reasons:top.length?top:["Clip quá ngắn hoặc quá ít khung hình rõ."],metrics:null,findings:[]};
 }
 const per=valid.map(f=>frameMetrics(f,aspect));
 const views=per.map(x=>x.view),view=["side","front","oblique","unknown"].sort((a,b)=>views.filter(v=>v===b).length-views.filter(v=>v===a).length)[0];
 const metrics={view,kneeAngle:round(median(per.map(x=>x.kneeAngle)),1),hipAngle:round(median(per.map(x=>x.hipAngle)),1),stanceRatio:round(median(per.map(x=>x.stanceRatio)),2),handHeight:round(median(per.map(x=>x.handHeight)),2)};
 const findings=findingsFor(metrics);
 return {...base,status:"ok",reasons:[],metrics,findings};
}

/** Index of the valid frame whose metrics are closest to the clip medians (for the skeleton preview). */
function representativeFrame(frames,size,result){
 if(!result||result.status!=="ok")return -1;
 const aspect=size&&size.width>0&&size.height>0?size.width/size.height:1;
 let best=-1,score=Infinity;
 (frames||[]).forEach((f,i)=>{
  if(!frameQuality(f).ok)return;
  const m=frameMetrics(f,aspect);
  const s=["kneeAngle","hipAngle"].reduce((acc,k)=>acc+(finite(m[k])&&finite(result.metrics[k])?Math.abs(m[k]-result.metrics[k]):0),0);
  if(s<score){score=s;best=i}
 });
 return best;
}

const api=Object.freeze({VERSION,DISCLAIMER,THRESHOLDS:T,LANDMARKS:L,angle,median,viewOf,frameQuality,frameMetrics,analyzeReadyPosition,representativeFrame});
root.PICKLEUP_VIDEO_CORE=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window==="undefined"?globalThis:window);
