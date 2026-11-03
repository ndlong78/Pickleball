'use strict';
const WHEN='2026-01-01T10:00:00Z',SKILLS=['serve','return','dink','volley','position','strategy'];
function payload(){return {source:'basic',schema_version:1,level_band:'1.0–2.0',plan_snapshot:{id:'synthetic-plan',version:'2.4',createdAt:WHEN,level:'1.0–2.0',scores:Object.fromEntries(SKILLS.map(k=>[k,12])),exercises:SKILLS.slice(0,3).map((skill,i)=>({id:skill+'-1',skill,name:'Synthetic drill',setup:'Synthetic',instructions:'Synthetic',measure:'Synthetic',mistake:'Synthetic',skillName:skill,minutes:[12,12,15][i],baseline:12,target:15})),minutes:{warmup:10,drills:[12,12,15],assessment:6,cooldown:5},checkpoint:{skill:'serve',baseline:12,target:15,attempts:20},completedAt:null,checkScore:null}}}
function command(){return {id:crypto.randomUUID(),operationId:crypto.randomUUID(),value:payload()}}
module.exports={payload,command,WHEN};
