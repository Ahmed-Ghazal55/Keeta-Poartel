(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.DataRepositories = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createRepositories(dataStore) {
    return {
      assignments: repositoryFor(dataStore, "assignments"),
      assignmentHistory: repositoryFor(dataStore, "assignmentHistory"),
      auditLogs: repositoryFor(dataStore, "auditLogs"),
      auditLogsQuarantine: repositoryFor(dataStore, "auditLogsQuarantine"),
      cities: repositoryFor(dataStore, "cities"),
      dashboardUsers: repositoryFor(dataStore, "dashboardUsers"),
      deliveryExperience: repositoryFor(dataStore, "deliveryExperience"),
      externalRiders: repositoryFor(dataStore, "externalRiders"),
      faceVerification: repositoryFor(dataStore, "faceVerification"),
      finalMonthlySettlement: repositoryFor(dataStore, "finalMonthlySettlement"),
      hrProfiles: repositoryFor(dataStore, "hrProfiles"),
      importBatches: repositoryFor(dataStore, "importBatches"),
      internalSettlement: repositoryFor(dataStore, "internalSettlement"),
      invoiceCourierDetail: repositoryFor(dataStore, "invoiceCourierDetail"),
      invoicePartnerSummary: repositoryFor(dataStore, "invoicePartnerSummary"),
      monthlyClosingBatches: repositoryFor(dataStore, "monthlyClosingBatches"),
      monthlyRules: repositoryFor(dataStore, "monthlyRules"),
      notifications: repositoryFor(dataStore, "notifications"),
      operationalStatusReviews: repositoryFor(dataStore, "operationalStatusReviews"),
      permissions: repositoryFor(dataStore, "permissions"),
      performanceDaily: repositoryFor(dataStore, "performanceDaily"),
      performanceIssues: repositoryFor(dataStore, "performanceIssues"),
      performanceMonthly: repositoryFor(dataStore, "performanceMonthly"),
      registers: repositoryFor(dataStore, "registers"),
      riderArchiveEvents: repositoryFor(dataStore, "riderArchiveEvents"),
      riderIdentities: repositoryFor(dataStore, "riderIdentities"),
      riderOperationalProfiles: repositoryFor(dataStore, "riderOperationalProfiles"),
      riderPlatformAccounts: repositoryFor(dataStore, "riderPlatformAccounts"),
      riderVehicleUsageHistory: repositoryFor(dataStore, "riderVehicleUsageHistory"),
      riders: repositoryFor(dataStore, "riders"),
      roles: repositoryFor(dataStore, "roles"),
      sessions: repositoryFor(dataStore, "sessions"),
      shiftSchedules: repositoryFor(dataStore, "shiftSchedules"),
      statusReviews: repositoryFor(dataStore, "statusReviews"),
      terminations: repositoryFor(dataStore, "terminations"),
      users: repositoryFor(dataStore, "users"),
      validityResults: repositoryFor(dataStore, "validityResults"),
      vdaResults: repositoryFor(dataStore, "vdaResults"),
      vehicles: repositoryFor(dataStore, "vehicles")
      ,
      vehicleAssignments: repositoryFor(dataStore, "vehicleAssignments"),
      vehicleCapacityReviews: repositoryFor(dataStore, "vehicleCapacityReviews"),
      vehicleComplianceIssues: repositoryFor(dataStore, "vehicleComplianceIssues"),
      vehicleImportSnapshots: repositoryFor(dataStore, "vehicleImportSnapshots"),
      vehicleMovementEvents: repositoryFor(dataStore, "vehicleMovementEvents")
    };
  }

  function repositoryFor(dataStore, entityName) {
    return {
      all: function () {
        return dataStore.getAll(entityName);
      },
      findById: function (id) {
        return dataStore.findById(entityName, id);
      },
      query: function (filters) {
        return dataStore.query(entityName, filters);
      },
      remove: function (id) {
        return dataStore.remove(entityName, id);
      },
      replaceAll: function (records) {
        return dataStore.save(entityName, records);
      },
      upsert: function (record) {
        return dataStore.upsert(entityName, record);
      }
    };
  }

  return {
    createRepositories: createRepositories
  };
});
