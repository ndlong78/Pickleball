/* Independent consent still required after explicit synthetic staging opt-in. */
(function(root){
 const enabled=root.PickleUpStagingPilot?.enabled('activity-events')===true;
 const auto=enabled&&root.PickleUpStagingPilot?.auto()===true;
 root.PICKLEUP_ACTIVITY_CONFIG=Object.freeze({enabled,auto,scope:enabled&&!auto?'staging-activity-events':null});
})(window);
