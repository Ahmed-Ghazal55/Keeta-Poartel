const assert=require("assert"), Model=require("../src/archive/monthlyArchiveModel"), Profiles=require("../src/runtime/verificationProfiles"), Routing=require("../src/ui/sidebarRouting");
assert.equal(Model.ROUTES.AR2.subPage,"monthly_archive_preview"); assert.equal(Routing.resolveRoute("AR5").subPage,"archive_source_traceability");
const scenario=Profiles.resolveScenario({storageProfile:"prompt8_14_monthly_archive",verify:"8_14"}); assert.equal(scenario,"prompt8_14_monthly_archive");
const def=Profiles.getScenarioDefinition(scenario); assert(def.collections.dashboardUsers.length); assert(def.collections.assignments.length); assert.deepEqual(def.collections.auditLogs,[]);
console.log("monthlyArchiveRegression: 6/6 passed");
