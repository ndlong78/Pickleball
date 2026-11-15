/* Explicit synthetic-data staging trial. This is not an authorization boundary. */
(function(root){
 'use strict';
 const enabled=root.PickleUpStagingPilot?.enabled('preferences-checkins')===true;
 const auto=enabled&&root.PickleUpStagingPilot?.auto()===true;
 root.PICKLEUP_SYNC_CONFIG=Object.freeze({enabled,auto,scope:enabled&&!auto?'staging-preferences-checkins':null});
})(window);
