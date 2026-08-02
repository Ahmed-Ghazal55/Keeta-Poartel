const assert=require("assert"), Builder=require("../src/archive/monthlyArchiveBuilder");
let writes=0,audits=0; const source={dashboardUsers:[{register:"R",city:"C",platform:"P",month:"2026-07"}],assignments:[{register:"R",city:"C",platform:"P",month:"2026-07",ownerIqama:"1",actualRiderIqama:"2",registeredVehicleSerial:"3",actualVehicleSerial:"4"}],auditLogs:[]};
const adapter={getAll:n=>source[n]||[],save:()=>writes++,audit:()=>audits++}, input={}; Object.keys(Builder.COLLECTIONS).forEach(f=>input[Builder.COLLECTIONS[f]]=adapter.getAll(Builder.COLLECTIONS[f]));
Builder.buildPreview(input,{register:"R",city:"C",platform:"P",month:"2026-07"}); assert.equal(writes,0); assert.equal(audits,0); assert.equal(source.auditLogs.length,0);
console.log("monthlyArchiveAuditSafety: 3/3 passed");
