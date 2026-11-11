/* Independent consent still required after explicit synthetic staging opt-in. */
(function(root){
 const enabled=root.PickleUpStagingPilot?.enabled('plans-selections')===true;
 root.PICKLEUP_PLAN_CONFIG=Object.freeze({enabled,scope:enabled?'staging-plans-selections':null});
})(window);
