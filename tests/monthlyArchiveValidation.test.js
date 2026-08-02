const assert=require("assert"), Builder=require("../src/archive/monthlyArchiveBuilder");
let result=Builder.validatePreview({scope:{},items:{}}); assert.equal(result.status,"blocked"); assert(result.findings.some(x=>x.code==="missing_register"));
result=Builder.validatePreview({scope:{register:"R",city:"C",platform:"P",month:"2026-07"},items:{dashboard_users:[{}],assignments:[{ownerIqama:"",actualRiderIqama:"",registeredVehicleSerial:"",actualVehicleSerial:""}],performance_daily:[{}],validity_results:[{}],import_batches:[{}],issues:[{severity:"critical",status:"open"}]}});
["performance_without_assignment","validity_prerequisites_missing","import_source_traceability_missing","registered_vehicle_missing","actual_vehicle_missing","actual_rider_missing","owner_profile_missing","unresolved_critical_issue"].forEach(code=>assert(result.findings.some(x=>x.code===code),code));
console.log("monthlyArchiveValidation: 10/10 passed");
