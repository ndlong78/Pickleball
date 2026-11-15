/* Importer gate. V5.33 (plan C): on the main host in the default mode a signed-in user may import this device's legacy
   data after an explicit preview and confirmation. Nothing is imported automatically; other hosts and the operator
   ?pilot=/?maintenance= URLs keep it off. */
window.PICKLEUP_IMPORT_CONFIG=Object.freeze({enabled:window.PickleUpStagingPilot?.auto?.()===true});
