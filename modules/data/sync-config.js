/* Explicit synthetic-data staging trial. This is not an authorization boundary. */
(function(root){
 'use strict';
 const enabled=root.PickleUpStagingPilot?.enabled('preferences-checkins')===true;
 root.PICKLEUP_SYNC_CONFIG=Object.freeze({enabled,scope:enabled?'staging-preferences-checkins':null});
})(window);
