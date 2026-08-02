const assert = require("assert");
const Model = require("../src/archive/monthlyArchiveModel");
assert.equal(Model.ITEM_FAMILIES.length, 19);
const run = Model.createArchiveRun({ status: "previewed", items: { assignments: [{ userId: "u1" }] } });
assert.equal(run.archiveType, "monthly_snapshot"); assert.equal(run.snapshotCounts.assignments, 1); assert.equal(run.immutable, true);
assert.deepEqual(Model.identityOf({ userId:"u", ownerIqama:"o", actualRiderIqama:"a", vehicleSerial:"r", actualVehicleSerial:"v" }), { dashboardUserId:"u", courierId:"", ownerIqama:"o", ownerName:"", actualRiderIqama:"a", actualRiderName:"", actualRiderSource:"unknown", assignmentId:"", registeredVehicleSerial:"r", registeredVehiclePlate:"", actualVehicleSerial:"v", actualVehiclePlate:"" });
assert.equal(Model.createRunContract().implementedCreate, false);
console.log("monthlyArchiveModel: 4/4 passed");
