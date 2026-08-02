const assert=require("assert"), Builder=require("../src/archive/monthlyArchiveBuilder");
const cases={dashboard_users:"operations-shell",assignments:"operations-shell",validity_results:"performance-shell",issues:"performance-shell",hr_profiles:"hr-shell",external_riders:"rider-master",vehicles:"fleet-shell",vehicle_usage_history:"fleet-shell",import_batches:"import-center"};
Object.keys(cases).forEach(f=>{const link=Builder.traceabilityFor(f,{id:"x",sourceBatchId:"b",assignmentId:"a",actualRiderIqama:"r",registeredVehicleSerial:"rv",actualVehicleSerial:"av"});assert.equal(link.page,cases[f]);assert.equal(link.readOnly,true);assert.equal(link.nonAuditing,true);});
console.log("monthlyArchiveTraceability: 27/27 passed");
