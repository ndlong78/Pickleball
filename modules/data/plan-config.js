/* Independent consent still required after explicit synthetic staging opt-in. */
(function(root){
 const enabled=root.PickleUpStagingPilot?.enabled('plans-selections')===true;
 const auto=enabled&&root.PickleUpStagingPilot?.auto()===true;
 root.PICKLEUP_PLAN_CONFIG=Object.freeze({enabled,auto,scope:enabled&&!auto?'staging-plans-selections':null});
})(window);
