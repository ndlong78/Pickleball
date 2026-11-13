/* Validate the Academy content source (curriculum.js) for CI and the CMS flow.
 * Usage: node scripts/check-content.cjs [--previous <base curriculum.js>] */
const fs=require('node:fs'),path=require('node:path');
const core=require('../modules/content-core.js');
const root=path.resolve(__dirname,'..');
function read(file){return core.parseCurriculum(fs.readFileSync(file,'utf8'))}
function check({file=path.join(root,'curriculum.js'),previousFile=null}={}){
 let doc;try{doc=read(file)}catch(error){return {ok:false,errors:[error.message]}}
 let previous=null;
 // The first CMS release replaces the legacy generator, which has no markers.
 if(previousFile&&fs.existsSync(previousFile)){try{previous=read(previousFile)}catch(_){previous=null}}
 const errors=core.validate(doc,{previous});
 return {ok:!errors.length,errors,lessons:doc.lessons.length,compared:!!previous};
}
module.exports={check,read};
if(require.main===module){
 const args=process.argv.slice(2),i=args.indexOf('--previous');
 const result=check({previousFile:i>=0?args[i+1]:null});
 if(!result.ok){for(const e of result.errors)console.error('✗ '+e);process.exit(1)}
 console.log('Nội dung Học viện hợp lệ: '+result.lessons+' bài'+(result.compared?' · đã đối chiếu với bản trước':''));
}
