"use strict";

const path = require("path");
const entitySchemas = require("../src/data/entitySchemas.js");
const { createLocalDb } = require("./localDb.js");
const { seedCoreCollections } = require("./authDev.js");

const DEFAULT_DATA_DIR = path.join(__dirname, "..", "data", "local-db");
const DEFAULT_RESETTABLE_ENTITIES = [
  "importBatches",
  "dashboardUsers",
  "hrProfiles",
  "riders",
  "riderIdentities",
  "riderPlatformAccounts",
  "riderArchiveEvents",
  "vehicles",
  "vehicleAssignments",
  "vehicleCapacityReviews",
  "vehicleComplianceIssues",
  "vehicleImportSnapshots",
  "vehicleMovementEvents",
  "assignments",
  "assignmentHistory",
  "statusReviews",
  "operationalStatusReviews",
  "terminations",
  "performanceDaily",
  "performanceMonthly",
  "validityResults",
  "performanceIssues",
  "monthlyRules",
  "deliveryExperience",
  "faceVerification",
  "vdaResults",
  "shiftSchedules",
  "auditLogs",
  "notifications"
];

function resetLocalDb(options) {
  options = options || {};
  const localDb = options.localDb || createLocalDb({
    backupRoot: options.backupRoot,
    dataDir: options.dataDir || DEFAULT_DATA_DIR
  });
  const entityNames = uniqueEntityNames(options.entityNames && options.entityNames.length
    ? options.entityNames
    : DEFAULT_RESETTABLE_ENTITIES);
  const backupDirectory = options.backupBeforeReset === false ? "" : localDb.backup();

  entityNames.forEach((entityName) => {
    if (!entitySchemas.hasEntitySchema(entityName)) {
      throw new Error("Unknown entity schema for reset: " + entityName);
    }
    localDb.writeCollection(entityName, []);
  });

  if (options.reseedCoreCollections !== false) {
    seedCoreCollections(localDb);
  }

  return {
    backupDirectory,
    clearedEntities: entityNames,
    dataDir: localDb.dataDir,
    mode: "node_local_db",
    ok: true,
    reseededCoreCollections: options.reseedCoreCollections !== false,
    status: "completed"
  };
}

function parseCliArgs(argv) {
  const args = argv || process.argv.slice(2);
  return {
    backupBeforeReset: args.indexOf("--no-backup") < 0,
    dataDir: readArgValue(args, "--data-dir") || DEFAULT_DATA_DIR,
    reseedCoreCollections: args.indexOf("--no-reseed") < 0
  };
}

function readArgValue(args, flagName) {
  const index = args.indexOf(flagName);
  if (index < 0 || index + 1 >= args.length) {
    return "";
  }
  return args[index + 1];
}

function uniqueEntityNames(entityNames) {
  const seen = {};
  return (entityNames || []).filter((entityName) => {
    const key = String(entityName || "");
    if (!key || seen[key]) {
      return false;
    }
    seen[key] = true;
    return true;
  });
}

if (require.main === module) {
  const result = resetLocalDb(parseCliArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  DEFAULT_DATA_DIR,
  DEFAULT_RESETTABLE_ENTITIES,
  parseCliArgs,
  resetLocalDb
};
