(function(root){
'use strict';
root.PICKLEUP_PURGE_CONFIG=Object.freeze({enabled:root.PickleUpStagingPilot?.available()===true});
function active(){try{const q=new URL(root.location.href).searchParams,v=q.getAll('maintenance');return root.PICKLEUP_PURGE_CONFIG?.enabled===true&&v.length===1&&v[0]==='account-cache'&&!q.has('pilot')&&['SYNC','ACTIVITY','PLAN','IMPORT'].every(k=>root['PICKLEUP_'+k+'_CONFIG']?.enabled===false)}catch(_){return false}}
function entry(){try{if(root.PICKLEUP_PURGE_CONFIG?.enabled!==true)return null;const url=new URL(root.location.href);url.search='?page=settings&maintenance=account-cache';url.hash='';return url.href}catch(_){return null}}
root.PickleUpAccountPurgeConfig=Object.freeze({active,entry});
})(window);
