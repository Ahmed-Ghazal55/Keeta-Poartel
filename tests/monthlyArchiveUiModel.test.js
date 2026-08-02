const assert=require("assert"), UI=require("../src/archive/monthlyArchiveUiModel");
const view=UI.createView({register:"R",city:"C",platform:"P",month:"2026-07",items:{performance_daily:[{}],validity_results:[{}]},warningCount:1},"monthly_archive_preview");
assert.equal(view.tabs.length,5); assert.equal(view.activeTab,"monthly_archive_preview"); assert.equal(view.performanceIncluded,true); assert.equal(view.validityIncluded,true); assert.equal(view.archiveCreationEnabled,false); assert.equal(UI.detailFor({id:"x"}).nonAuditing,true);
console.log("monthlyArchiveUiModel: 6/6 passed");
