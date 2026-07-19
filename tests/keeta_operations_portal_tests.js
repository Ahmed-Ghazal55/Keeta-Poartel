const portal = require("../keeta_operations_portal_logic.js");

const result = portal.TestEngine.runAll();

console.log(JSON.stringify(result, null, 2));

if (result.summary.failed > 0) {
  process.exitCode = 1;
}
