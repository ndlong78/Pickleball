/* Independent consent still required after explicit synthetic staging opt-in. */
(function(root){
 const enabled=root.PickleUpStagingPilot?.enabled('activity-events')===true;
 root.PICKLEUP_ACTIVITY_CONFIG=Object.freeze({enabled,scope:enabled?'staging-activity-events':null});
})(window);
