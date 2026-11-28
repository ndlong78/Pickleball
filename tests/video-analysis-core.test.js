const test=require("node:test"),assert=require("node:assert/strict");
const core=require("../modules/video-analysis-core.js");
const {LANDMARKS:L}=core;
const rad=d=>d*Math.PI/180;

/* Synthetic ready-position skeleton with known joint angles.
 * Body frame: f forward, l lateral (left +), y down. Hip centre at origin. */
function pose({knee=140,hip=150,stance=1.5,hand=0.5,view="side",scale=0.35,visibility=1,aspect=16/9}={}){
 const a1=rad((180-knee)/2),b=rad(180-hip)-a1,shoulderHalf=0.2,ankleHalf=stance*shoulderHalf;
 const body={};
 const put=(i,f,l,y)=>{body[i]={f,l,y}};
 for(const [side,s] of [["l",1],["r",-1]]){
  const hipL=ankleHalf*s,kneeY=0.45*Math.cos(a1),ankleY=kneeY+0.45*Math.cos(a1);
  put(L[side+"Hip"],0,hipL,0);
  put(L[side+"Knee"],0.45*Math.sin(a1),hipL,kneeY);
  put(L[side+"Ankle"],0,ankleHalf*s,ankleY);
  put(L[side+"Shoulder"],0.5*Math.sin(b),shoulderHalf*s,-0.5*Math.cos(b));
 }
 const shY=-0.5*Math.cos(b),wristY=0-hand*(0-shY);
 for(const [side,s] of [["l",1],["r",-1]]){put(L[side+"Wrist"],0.3,0.15*s,wristY);put(L[side+"Elbow"],0.2,0.2*s,(wristY+shY)/2)}
 put(L.nose,0.55*Math.sin(b),0,shY-0.2);
 const world=[],landmarks=[];
 for(let i=0;i<33;i++){
  const p=body[i]||{f:0,l:0,y:0};
  const w=view==="side"?{x:p.f,y:p.y,z:p.l}:{x:p.l,y:p.y,z:-p.f};
  world.push({...w,visibility});
  landmarks.push({x:0.5+w.x*scale/aspect,y:0.45+w.y*scale,z:0,visibility});
 }
 return {landmarks,world};
}
const SIZE={width:1920,height:1080};
const clip=(n,opts,mut)=>Array.from({length:n},(_,i)=>{const f={t:i*100,...pose(opts)};return mut?mut(f,i):f});
const ids=r=>r.findings.map(f=>f.id);

test("angle helper returns the joint angle in degrees and null when degenerate",()=>{
 assert.equal(Math.round(core.angle({x:1,y:0},{x:0,y:0},{x:0,y:1})),90);
 assert.equal(Math.round(core.angle({x:1,y:0,z:0},{x:0,y:0,z:0},{x:-1,y:0,z:0})),180);
 assert.equal(core.angle({x:0,y:0},{x:0,y:0},{x:1,y:1}),null);
 assert.equal(core.angle(null,{x:0,y:0},{x:1,y:1}),null);
});

test("synthetic skeleton reproduces the requested knee and hip angles from world landmarks",()=>{
 const r=core.analyzeReadyPosition(clip(20,{knee:140,hip:150,stance:1.5,hand:0.5}),SIZE);
 assert.equal(r.status,"ok");
 assert.ok(Math.abs(r.metrics.kneeAngle-140)<0.5,String(r.metrics.kneeAngle));
 // Hips wider than shoulders add a small lateral component to the shoulder-hip-knee angle.
 assert.ok(Math.abs(r.metrics.hipAngle-150)<2.5,String(r.metrics.hipAngle));
 const square=core.analyzeReadyPosition(clip(20,{knee:140,hip:150,stance:1.0}),SIZE);
 assert.ok(Math.abs(square.metrics.hipAngle-150)<0.5,String(square.metrics.hipAngle));
 assert.ok(Math.abs(r.metrics.stanceRatio-1.5)<0.05,String(r.metrics.stanceRatio));
 assert.ok(Math.abs(r.metrics.handHeight-0.5)<0.02,String(r.metrics.handHeight));
 assert.equal(r.metrics.view,"side");
});

test("a good athletic ready position yields no corrections but keeps the disclaimer",()=>{
 const r=core.analyzeReadyPosition(clip(20,{knee:140,hip:150,stance:1.5,hand:0.5}),SIZE);
 assert.deepEqual(r.findings,[]);
 assert.match(r.disclaimer,/chưa được HLV kiểm chứng/);
 assert.equal(r.version,"ready-v1");
 assert.equal(r.skill,"position");
});

test("straight knees and low hands are reported, most severe first, at most two",()=>{
 const r=core.analyzeReadyPosition(clip(20,{knee:172,hip:176,stance:0.8,hand:0.05}),SIZE);
 assert.equal(r.findings.length,2);
 assert.deepEqual(ids(r).sort(),["hands_low","knee_straight"]);
 assert.ok(r.findings[0].severity>=r.findings[1].severity);
 for(const f of r.findings){assert.ok(f.title&&f.detail&&f.target);assert.equal(typeof f.value,"number")}
});

test("each threshold band maps to its own finding",()=>{
 assert.deepEqual(ids(core.analyzeReadyPosition(clip(15,{knee:155,hip:150}),SIZE)),["knee_soft"]);
 assert.deepEqual(ids(core.analyzeReadyPosition(clip(15,{knee:100,hip:150}),SIZE)),["knee_deep"]);
 assert.deepEqual(ids(core.analyzeReadyPosition(clip(15,{knee:140,hip:175,stance:1.0}),SIZE)),["hip_upright"]);
 assert.deepEqual(ids(core.analyzeReadyPosition(clip(15,{knee:140,hip:150,stance:0.8}),SIZE)),["stance_narrow"]);
 assert.deepEqual(ids(core.analyzeReadyPosition(clip(15,{knee:140,hip:150,stance:2.6}),SIZE)),["stance_wide"]);
});

test("without world landmarks only view-appropriate 2D metrics are reported",()=>{
 const noWorld=f=>({t:f.t,landmarks:f.landmarks});
 const side=core.analyzeReadyPosition(clip(15,{knee:172,hip:150,view:"side"},noWorld),SIZE);
 assert.equal(side.metrics.view,"side");
 assert.ok(side.metrics.kneeAngle>165);
 assert.equal(side.metrics.stanceRatio,null,"stance width is not observable from the side");
 const front=core.analyzeReadyPosition(clip(15,{knee:172,hip:150,stance:0.8,view:"front"},noWorld),SIZE);
 assert.equal(front.metrics.view,"front");
 assert.equal(front.metrics.kneeAngle,null,"knee flexion is not observable head-on in 2D");
 assert.ok(Math.abs(front.metrics.stanceRatio-0.8)<0.05);
 assert.deepEqual(ids(front),["stance_narrow"]);
});

test("clips with hidden or tiny bodies are refused instead of guessed",()=>{
 const hidden=core.analyzeReadyPosition(clip(20,{},f=>{f.landmarks[L.lAnkle].visibility=0.1;return f}),SIZE);
 assert.equal(hidden.status,"insufficient");
 assert.deepEqual(hidden.findings,[]);
 assert.equal(hidden.metrics,null);
 assert.match(hidden.reasons[0],/cổ chân/);
 const far=core.analyzeReadyPosition(clip(20,{scale:0.1}),SIZE);
 assert.equal(far.status,"insufficient");
 assert.match(far.reasons[0],/quá xa/);
 const few=core.analyzeReadyPosition(clip(5,{}),SIZE);
 assert.equal(few.status,"insufficient");
 assert.equal(core.analyzeReadyPosition([],SIZE).status,"insufficient");
 assert.equal(core.analyzeReadyPosition(null,SIZE).status,"insufficient");
 assert.equal(core.analyzeReadyPosition([{t:0,landmarks:[]}],SIZE).reasons[0].length>0,true);
});

test("a minority of bad frames does not change the result; medians resist jitter",()=>{
 let seed=7;const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647-0.5);
 const frames=clip(30,{knee:172,hip:150},(f,i)=>{
  for(const p of f.world){p.x+=rnd()*0.01;p.y+=rnd()*0.01;p.z+=rnd()*0.01}
  if(i%6===0)f.landmarks[L.rKnee].visibility=0.2;
  return f;
 });
 const r=core.analyzeReadyPosition(frames,SIZE);
 assert.equal(r.status,"ok");
 assert.equal(r.frames.total,30);
 assert.equal(r.frames.valid,25);
 assert.equal(ids(r)[0],"knee_straight");
});

test("representative frame is a valid frame close to the medians",()=>{
 const frames=clip(12,{knee:150},(f,i)=>i===0?{t:0,landmarks:[]}:f);
 const r=core.analyzeReadyPosition(frames,SIZE);
 const i=core.representativeFrame(frames,SIZE,r);
 assert.ok(i>=1&&i<12);
 assert.equal(core.representativeFrame(frames,SIZE,{status:"insufficient"}),-1);
});

test("thresholds are frozen and exposed for review",()=>{
 assert.ok(Object.isFrozen(core.THRESHOLDS));
 assert.equal(core.THRESHOLDS.kneeStraight,160);
});
