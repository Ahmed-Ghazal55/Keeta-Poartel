(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.RuntimeVerificationProfiles = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SCENARIOS = {
    PROMPT_8_9_B_OPS_NOTIFICATIONS: "prompt8_9_b_ops_notifications",
    PROMPT_8_10_OPS_CLEANUP: "prompt8_10_ops_cleanup",
    PROMPT_8_10_B_ROW_ACTIONS: "prompt8_10_b_row_actions",
    PROMPT_8_11_HR_FLEET_CLEANUP: "prompt8_11_hr_fleet_cleanup",
    PROMPT_8_11_B_HR_FLEET_CLICKTHROUGH: "prompt8_11_b_hr_fleet_clickthrough",
    PROMPT_8_12_PERFORMANCE_VALIDITY: "prompt8_12_performance_validity",
    PROMPT_8_13_IMPORT_PIPELINE: "prompt8_13_import_pipeline",
    PROMPT_8_14_MONTHLY_ARCHIVE: "prompt8_14_monthly_archive"
  };

  var SCENARIO_SIGNATURES = {};
  SCENARIO_SIGNATURES[SCENARIOS.PROMPT_8_9_B_OPS_NOTIFICATIONS] = "2026.07.prompt8_9_b_ops_notifications.v1";
  SCENARIO_SIGNATURES[SCENARIOS.PROMPT_8_10_OPS_CLEANUP] = "2026.07.prompt8_10_ops_cleanup.v1";
  SCENARIO_SIGNATURES[SCENARIOS.PROMPT_8_10_B_ROW_ACTIONS] = "2026.07.prompt8_10_b_row_actions.v1";
  SCENARIO_SIGNATURES[SCENARIOS.PROMPT_8_11_HR_FLEET_CLEANUP] = "2026.07.prompt8_11_hr_fleet_cleanup.v1";
  SCENARIO_SIGNATURES[SCENARIOS.PROMPT_8_11_B_HR_FLEET_CLICKTHROUGH] = "2026.07.prompt8_11_b_hr_fleet_clickthrough.v1";
  SCENARIO_SIGNATURES[SCENARIOS.PROMPT_8_12_PERFORMANCE_VALIDITY] = "2026.07.prompt8_12_performance_validity.v1";
  SCENARIO_SIGNATURES[SCENARIOS.PROMPT_8_13_IMPORT_PIPELINE] = "2026.08.prompt8_13_import_pipeline.v1";
  SCENARIO_SIGNATURES[SCENARIOS.PROMPT_8_14_MONTHLY_ARCHIVE] = "2026.08.prompt8_14_monthly_archive.v1";

  function resolveScenario(options) {
    options = options || {};
    var profile = normalizeStorageProfile(options.storageProfile);
    var verify = normalizeText(options.verify).toLowerCase();
    if (profile === SCENARIOS.PROMPT_8_9_B_OPS_NOTIFICATIONS) {
      return SCENARIOS.PROMPT_8_9_B_OPS_NOTIFICATIONS;
    }
    if ((verify === "8_9_b" || verify === "8_9_b_final") && profile.indexOf("prompt8_9_b") === 0) {
      return SCENARIOS.PROMPT_8_9_B_OPS_NOTIFICATIONS;
    }
    if (profile === SCENARIOS.PROMPT_8_10_OPS_CLEANUP) {
      return SCENARIOS.PROMPT_8_10_OPS_CLEANUP;
    }
    if ((verify === "8_10" || verify === "prompt_8_10") && profile.indexOf("prompt8_10") === 0) {
      return SCENARIOS.PROMPT_8_10_OPS_CLEANUP;
    }
    if (profile === SCENARIOS.PROMPT_8_10_B_ROW_ACTIONS) {
      return SCENARIOS.PROMPT_8_10_B_ROW_ACTIONS;
    }
    if ((verify === "8_10_b" || verify === "prompt_8_10_b") && profile.indexOf("prompt8_10_b") === 0) {
      return SCENARIOS.PROMPT_8_10_B_ROW_ACTIONS;
    }
    if (profile === SCENARIOS.PROMPT_8_11_HR_FLEET_CLEANUP) {
      return SCENARIOS.PROMPT_8_11_HR_FLEET_CLEANUP;
    }
    if ((verify === "8_11_b" || verify === "prompt_8_11_b") && profile.indexOf("prompt8_11_b") === 0) {
      return SCENARIOS.PROMPT_8_11_B_HR_FLEET_CLICKTHROUGH;
    }
    if ((verify === "8_11" || verify === "prompt_8_11") && profile.indexOf("prompt8_11") === 0) {
      return SCENARIOS.PROMPT_8_11_HR_FLEET_CLEANUP;
    }
    if ((verify === "8_12" || verify === "prompt_8_12") && profile.indexOf("prompt8_12") === 0) {
      return SCENARIOS.PROMPT_8_12_PERFORMANCE_VALIDITY;
    }
    if ((verify === "8_13" || verify === "prompt_8_13") && profile.indexOf("prompt8_13") === 0) {
      return SCENARIOS.PROMPT_8_13_IMPORT_PIPELINE;
    }
    if ((verify === "8_14" || verify === "prompt_8_14") && profile.indexOf("prompt8_14") === 0) {
      return SCENARIOS.PROMPT_8_14_MONTHLY_ARCHIVE;
    }
    return "";
  }

  function getScenarioSignature(scenarioId) {
    return SCENARIO_SIGNATURES[normalizeText(scenarioId)] || "";
  }

  function applyScenarioToCollections(baseCollections, scenarioId) {
    var definition = getScenarioDefinition(scenarioId);
    if (!definition) {
      return cloneValue(baseCollections || {});
    }
    var next = cloneValue(baseCollections || {});
    Object.keys(definition.collections).forEach(function (entityName) {
      var records = cloneValue(definition.collections[entityName]);
      if (definition.replaceEntities.indexOf(entityName) >= 0) {
        next[entityName] = records;
        return;
      }
      next[entityName] = mergeRecordLists(next[entityName], records);
    });
    return next;
  }

  function getScenarioDefinition(scenarioId) {
    var key = normalizeText(scenarioId);
    if (
      key !== SCENARIOS.PROMPT_8_9_B_OPS_NOTIFICATIONS &&
      key !== SCENARIOS.PROMPT_8_10_OPS_CLEANUP &&
      key !== SCENARIOS.PROMPT_8_10_B_ROW_ACTIONS &&
      key !== SCENARIOS.PROMPT_8_11_HR_FLEET_CLEANUP &&
      key !== SCENARIOS.PROMPT_8_11_B_HR_FLEET_CLICKTHROUGH &&
      key !== SCENARIOS.PROMPT_8_12_PERFORMANCE_VALIDITY &&
      key !== SCENARIOS.PROMPT_8_13_IMPORT_PIPELINE &&
      key !== SCENARIOS.PROMPT_8_14_MONTHLY_ARCHIVE
    ) {
      return null;
    }
    return {
      id: key,
      label: key === SCENARIOS.PROMPT_8_14_MONTHLY_ARCHIVE
        ? "Prompt 8.14 Monthly Archive"
        : key === SCENARIOS.PROMPT_8_13_IMPORT_PIPELINE
        ? "Prompt 8.13 Import Pipeline"
        : key === SCENARIOS.PROMPT_8_12_PERFORMANCE_VALIDITY
        ? "Prompt 8.12 Performance Validity"
        : key === SCENARIOS.PROMPT_8_11_B_HR_FLEET_CLICKTHROUGH
        ? "Prompt 8.11-B HR Fleet Click-Through"
        : key === SCENARIOS.PROMPT_8_11_HR_FLEET_CLEANUP
        ? "Prompt 8.11 HR Fleet Cleanup"
        : key === SCENARIOS.PROMPT_8_10_B_ROW_ACTIONS
          ? "Prompt 8.10-B Row Actions"
          : key === SCENARIOS.PROMPT_8_10_OPS_CLEANUP
          ? "Prompt 8.10 Operations Cleanup"
          : "Prompt 8.9-B Operations Notifications",
      replaceEntities: [
        "deliveryExperience",
        "faceVerification",
        "importBatches",
        "notifications",
        "operationalStatusReviews",
        "performanceDaily",
        "performanceIssues",
        "performanceMonthly",
        "riderVehicleUsageHistory",
        "validityResults",
        "vdaResults",
        "vehicleAssignments",
        "vehicleCapacityReviews",
        "vehicleComplianceIssues",
        "vehicleMovementEvents",
        "vehicles"
      ],
      signature: getScenarioSignature(key),
      collections: key === SCENARIOS.PROMPT_8_14_MONTHLY_ARCHIVE
        ? buildPrompt814Collections()
        : key === SCENARIOS.PROMPT_8_13_IMPORT_PIPELINE
        ? buildPrompt813Collections()
        : key === SCENARIOS.PROMPT_8_12_PERFORMANCE_VALIDITY
        ? buildPrompt812Collections()
        : key === SCENARIOS.PROMPT_8_11_HR_FLEET_CLEANUP || key === SCENARIOS.PROMPT_8_11_B_HR_FLEET_CLICKTHROUGH
        ? buildPrompt811Collections()
        : key === SCENARIOS.PROMPT_8_10_B_ROW_ACTIONS
          ? buildPrompt810BCollections()
          : key === SCENARIOS.PROMPT_8_10_OPS_CLEANUP
          ? buildPrompt810Collections()
          : buildPrompt89BCollections()
    };
  }

  function buildPrompt814Collections() {
    var collections = buildPrompt813Collections();
    collections.auditLogs = [];
    collections.performanceIssues = (collections.performanceIssues || []).map(function (item) {
      return Object.assign({}, item, { status: item.severity === "critical" ? "resolved" : item.status });
    });
    collections.importBatches = (collections.importBatches || []).map(function (item) {
      return Object.assign({}, item, { sourceFileName: item.sourceFileName || item.fileName || "verification-source.xlsx", month: item.month || "2026-07" });
    });
    return collections;
  }

  function buildPrompt810Collections() {
    var collections = buildPrompt89BCollections();
    collections.dashboardUsers = collections.dashboardUsers.concat([
      {
        id: "dash_user_10",
        userId: "1782000010101001",
        dashboardUserId: "1782000010101001",
        city: "جدة",
        register: "EXPRESS",
        status: "working",
        employmentStatus: "In Service",
        activationStatus: "Accepted",
        reviewStatus: "needs_review",
        lifecycleStatus: "pending_review",
        assignmentReadiness: "needs_manual_review",
        assignmentReadinessIssues: ["user_pending_review"],
        assignmentReadinessReason: "user_pending_review",
        fullName: "Review Pending User",
        ownerName: "Review Pending User",
        ownerIqama: "2444101010",
        phoneNumber: "966500101010",
        vehicleType: "bike",
        vehicleSerial: "JED-BIKE-1010",
        plateNumber: "JED-1010",
        platform: "keeta",
        latestImportPresence: "present",
        operationMode: "per_order",
        updatedAt: "2026-07-16T03:12:00.000Z"
      }
    ]);
    collections.hrProfiles = collections.hrProfiles.concat([
      {
        id: "hr_profile_10",
        employeeId: "EMP-1010",
        iqama: "2444101010",
        fullNameArabic: "Review Pending User",
        nationality: "Egyptian",
        branch: "جدة",
        city: "جدة",
        register: "EXPRESS",
        registerName: "EXPRESS GATE Company",
        employmentType: "sponsorship",
        hrStatus: "active",
        professionAtIqama: "Courier",
        jobTitle: "Rider",
        startDate: "2026-06-10",
        residencyExpiry: "2027-07-10",
        residencyStatus: "سارية",
        sponsorId: "1010101011",
        licenseType: "عمومي",
        licenseTypeSecondary: "عمومي",
        kafalaStatus: "على الكفالة",
        licenseState: "سارية",
        notes: "Prompt 8.10 seeded review-state owner profile.",
        updatedAt: "2026-07-16T03:12:00.000Z"
      }
    ]);
    collections.assignmentHistory = [
      {
        id: "history_prompt_8_10_swap_1",
        dashboardUserId: "1782916129257495",
        action: "swap",
        actionDate: "2026-07-15",
        previousRiderIqama: "2444000077",
        newRiderIqama: "2444000011",
        city: "جدة",
        register: "EXPRESS",
        reason: "Prompt 8.10 seeded swap record"
      }
    ];
    collections.terminations = [
      {
        id: "termination_prompt_8_10_1",
        dashboardUserId: "1782999000777001",
        riderIqama: "2444000011",
        city: "جدة",
        register: "EXPRESS",
        reason: "Prompt 8.10 seeded termination sample",
        statusAfter: "terminated",
        terminationDate: "2026-07-16"
      }
    ];
    return collections;
  }

  function buildPrompt810BCollections() {
    var collections = buildPrompt810Collections();
    collections.importBatches = collections.importBatches.concat([
      {
        id: "batch_prompt_8_10_b_dashboard_1",
        city: "Ø¬Ø¯Ø©",
        register: "ALBAWABA",
        platform: "keeta",
        status: "saved",
        importType: "dashboard_users",
        fileType: "dashboard_users_workbook",
        templateId: "dashboard_users",
        month: "2026-07",
        targetEntity: "dashboardUsers",
        confidence: 0.99,
        sourceFileName: "prompt-8-10-b-dashboard-users.xlsx",
        fileName: "prompt-8-10-b-dashboard-users.xlsx",
        savedRecordCount: 1,
        warnings: ["new_users_detected"],
        createdAt: "2026-07-16T03:11:00.000Z",
        updatedAt: "2026-07-16T03:11:00.000Z"
      },
      {
        id: "batch_prompt_8_10_b_assignments_1",
        city: "Ø¬Ø¯Ø©",
        register: "EXPRESS",
        platform: "keeta",
        status: "saved",
        importType: "current_assignments",
        fileType: "current_assignments_workbook",
        templateId: "dashboard_users",
        month: "2026-07",
        targetEntity: "assignments",
        confidence: 0.97,
        sourceFileName: "prompt-8-10-b-current-assignments.xlsx",
        fileName: "prompt-8-10-b-current-assignments.xlsx",
        savedRecordCount: 2,
        warnings: [],
        createdAt: "2026-07-16T03:12:00.000Z",
        updatedAt: "2026-07-16T03:12:00.000Z"
      }
    ]);
    collections.dashboardUsers = collections.dashboardUsers.map(function (item) {
      if (item.id === "dash_user_3") {
        return mergeObjects({}, item, {
          lastSeenImportBatchId: "batch_prompt_8_10_b_dashboard_1",
          sourceBatchId: "batch_prompt_8_10_b_dashboard_1",
          sourceFile: "prompt-8-10-b-dashboard-users.xlsx",
          sourceImportType: "dashboard_users",
          sourceTemplateId: "dashboard_users"
        });
      }
      return item;
    });
    collections.assignments = collections.assignments.map(function (item) {
      if (item.id === "assignment_seed_1" || item.id === "assignment_seed_3") {
        return mergeObjects({}, item, {
          sourceBatchId: "batch_prompt_8_10_b_assignments_1",
          sourceFile: "prompt-8-10-b-current-assignments.xlsx",
          sourceImportBatchId: "batch_prompt_8_10_b_assignments_1"
        });
      }
      return item;
    });
    return collections;
  }

  function buildPrompt811Collections() {
    var collections = buildPrompt810BCollections();
    collections.externalRiders = [
      {
        id: "external_rider_11_1",
        iqama: "2999000011",
        fullName: "Bashir Ali",
        contactPhone: "966512340011",
        city: "Jeddah",
        register: "EXPRESS",
        riderType: "external",
        status: "active",
        updatedAt: "2026-07-18T22:00:00.000Z"
      }
    ];
    collections.riderOperationalProfiles = [
      {
        id: "operational_profile_11_1",
        iqama: "2999000011",
        preferredCity: "Jeddah",
        preferredRegister: "EXPRESS",
        riderSource: "external",
        contactPhone: "966512340011",
        updatedAt: "2026-07-18T22:00:00.000Z"
      }
    ];
    collections.assignments = collections.assignments.map(function (item) {
      if (item.id === "assignment_seed_3") {
        return mergeObjects({}, item, {
          actualVehicle: "Bike",
          actualVehicleType: "bike",
          ownerIqama: "2444000077",
          plateNumber: "JED-9090",
          riderIqama: "2999000011",
          riderSource: "external",
          riderId: "",
          vehicleSerial: "JED-BIKE-9009"
        });
      }
      return item;
    });
    collections.dashboardUsers = collections.dashboardUsers.map(function (item) {
      if (item.id === "dash_user_7") {
        return mergeObjects({}, item, {
          currentRiderId: "",
          currentRiderIqama: "2999000011",
          currentRiderName: "Bashir Ali",
          ownerIqama: "2444000077",
          plateNumber: "JED-7007",
          vehicleSerial: "JED-CAR-7007"
        });
      }
      return item;
    });
    collections.riderVehicleUsageHistory = [
      {
        id: "vehicle_usage_11_1",
        riderIqama: "2999000011",
        actualRiderIqama: "2999000011",
        dashboardUserId: "1782999000777001",
        city: "Jeddah",
        vehicleRegister: "EXPRESS",
        vehicleSerial: "JED-BIKE-9009",
        plateNumber: "JED-9090",
        status: "active",
        usageStartDate: "2026-07-15",
        notes: "Actual bike used by external rider"
      }
    ];
    collections.vehicles = [
      {
        id: "vehicle_11_car_7007",
        vehicleSerial: "JED-CAR-7007",
        plateNumber: "JED-7007",
        currentCity: "Jeddah",
        currentBranch: "EXPRESS",
        register: "EXPRESS",
        vehicleType: "car",
        movementStatus: "active",
        vehicleCompanyStatus: "company",
        updatedAt: "2026-07-18T21:00:00.000Z"
      },
      {
        id: "vehicle_11_bike_9009",
        vehicleSerial: "JED-BIKE-9009",
        plateNumber: "JED-9090",
        currentCity: "Jeddah",
        currentBranch: "EXPRESS",
        register: "EXPRESS",
        vehicleType: "bike",
        movementStatus: "active",
        vehicleCompanyStatus: "private",
        updatedAt: "2026-07-18T21:10:00.000Z"
      },
      {
        id: "vehicle_11_bike_excluded",
        vehicleSerial: "JED-BIKE-4040",
        plateNumber: "JED-4040",
        currentCity: "Jeddah",
        currentBranch: "EXPRESS",
        register: "EXPRESS",
        vehicleType: "bike",
        movementStatus: "maintenance",
        vehicleCompanyStatus: "company",
        updatedAt: "2026-07-18T21:20:00.000Z"
      }
    ];
    collections.vehicleAssignments = [
      {
        id: "vehicle_assignment_11_1",
        dashboardUserId: "1782999000777001",
        vehicleSerial: "JED-CAR-7007",
        registeredVehicleOnDashboard: "Car / JED-CAR-7007 / JED-7007",
        actualUsedVehicle: "Bike / JED-BIKE-9009 / JED-9090",
        actualUsedVehicleSerial: "JED-BIKE-9009",
        registeredVehicleSerial: "JED-CAR-7007",
        matchStatus: "warning",
        capacityStatus: "in_use",
        warnings: ["registered_vehicle_differs_from_actual"],
        blockingIssues: [],
        city: "Jeddah",
        register: "EXPRESS"
      }
    ];
    collections.vehicleCapacityReviews = [
      {
        id: "vehicle_capacity_11_1",
        vehicleSerial: "JED-CAR-7007",
        reviewStatus: "available",
        vehicleCompanyStatus: "company",
        updatedAt: "2026-07-18T21:40:00.000Z"
      },
      {
        id: "vehicle_capacity_11_2",
        vehicleSerial: "JED-BIKE-9009",
        reviewStatus: "over_capacity",
        vehicleCompanyStatus: "private",
        warnings: ["vehicle_capacity_exceeded"],
        updatedAt: "2026-07-18T21:41:00.000Z"
      },
      {
        id: "vehicle_capacity_11_3",
        vehicleSerial: "JED-BIKE-4040",
        reviewStatus: "maintenance",
        vehicleCompanyStatus: "company",
        updatedAt: "2026-07-18T21:42:00.000Z"
      }
    ];
    collections.vehicleComplianceIssues = [
      {
        id: "vehicle_issue_11_1",
        vehicleSerial: "JED-BIKE-9009",
        issueType: "vehicle_capacity_exceeded",
        message: "Actual vehicle capacity exceeded for current rider distribution.",
        severity: "high",
        blocking: false,
        dashboardUserId: "1782999000777001",
        city: "Jeddah",
        register: "EXPRESS"
      },
      {
        id: "vehicle_issue_11_2",
        vehicleSerial: "JED-BIKE-4040",
        issueType: "vehicle_status_excluded",
        message: "Vehicle is under maintenance and should not be assigned.",
        severity: "medium",
        blocking: true,
        dashboardUserId: "",
        city: "Jeddah",
        register: "EXPRESS"
      }
    ];
    collections.vehicleMovementEvents = [
      {
        id: "vehicle_movement_11_1",
        vehicleSerial: "JED-BIKE-9009",
        plateNumber: "JED-9090",
        branch: "EXPRESS",
        eventType: "handed_over",
        currentUserIqama: "2999000011",
        currentUserName: "Bashir Ali",
        eventDate: "2026-07-15",
        platform: "keeta",
        dashboardUserId: "1782999000777001"
      }
    ];
    return collections;
  }

  function buildPrompt812Collections() {
    var collections = buildPrompt811Collections();
    collections.dashboardUsers = collections.dashboardUsers.concat([
      { id: "dash_perf_split", dashboardUserId: "8121001", userId: "8121001", ownerIqama: "2444812001", ownerName: "Performance Owner", city: "Jeddah", register: "EXPRESS", platform: "keeta", vehicleType: "car", vehicleSerial: "REG-CAR-812", plateNumber: "REG-812" },
      { id: "dash_perf_missing", dashboardUserId: "8121999", userId: "8121999", ownerIqama: "2444812999", ownerName: "Unassigned Owner", city: "Jeddah", register: "EXPRESS", platform: "keeta", vehicleType: "bike", vehicleSerial: "REG-BIKE-999", plateNumber: "REG-999" }
    ]);
    collections.assignments = collections.assignments.concat([
      { id: "assignment_812_external", dashboardUserId: "8121001", assignmentStartDate: "2026-07-01", assignmentEndDate: "2026-07-15", actualRiderIqama: "2999812001", actualRiderName: "External Split Rider", riderSource: "external", city: "Jeddah", register: "EXPRESS", platform: "keeta", actualVehicleSerial: "ACT-BIKE-812", actualVehiclePlate: "ACT-812", status: "ended" },
      { id: "assignment_812_hr", dashboardUserId: "8121001", assignmentStartDate: "2026-07-16", actualRiderIqama: "2444812016", actualRiderName: "HR Split Rider", riderSource: "hr", city: "Jeddah", register: "EXPRESS", platform: "keeta", actualVehicleSerial: "ACT-CAR-816", actualVehiclePlate: "ACT-816", status: "active" }
    ]);
    collections.performanceDaily = [
      { id: "perf_daily_external", dashboardUserId: "8121001", userId: "8121001", ownerIqama: "2444812001", actualRiderIqama: "2999812001", actualRiderName: "External Split Rider", actualRiderSource: "external", assignmentId: "assignment_812_external", date: "2026-07-10", performanceDate: "2026-07-10", month: "2026-07", city: "Jeddah", register: "EXPRESS", platform: "keeta", vehicleType: "bike", completedOrders: 22, validDayStatus: "valid", registeredVehicleSerial: "REG-CAR-812", actualVehicleSerial: "ACT-BIKE-812" },
      { id: "perf_daily_hr", dashboardUserId: "8121001", userId: "8121001", ownerIqama: "2444812001", actualRiderIqama: "2444812016", actualRiderName: "HR Split Rider", actualRiderSource: "hr", assignmentId: "assignment_812_hr", date: "2026-07-20", performanceDate: "2026-07-20", month: "2026-07", city: "Jeddah", register: "EXPRESS", platform: "keeta", vehicleType: "car", completedOrders: 24, validDayStatus: "valid", registeredVehicleSerial: "REG-CAR-812", actualVehicleSerial: "ACT-CAR-816" }
    ];
    collections.validityResults = [
      { id: "validity_812_external", dashboardUserId: "8121001", userId: "8121001", riderId: "rider::2999812001", iqama: "2999812001", ownerIqama: "2444812001", actualRiderIqama: "2999812001", actualRiderName: "External Split Rider", actualRiderSource: "external", assignmentId: "assignment_812_external", city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", vehicleType: "bike", status: "eligible", canonicalStatus: "valid", registeredVehicleSerial: "REG-CAR-812", actualVehicleSerial: "ACT-BIKE-812", reasons: [], dailySummary: { validDaysCount: 1 }, mandatorySummary: { valid: 1, required: 1, met: true }, projectionSummary: { canStillQualify: true } },
      { id: "validity_812_hr", dashboardUserId: "8121001", userId: "8121001", riderId: "rider::2444812016", iqama: "2444812016", ownerIqama: "2444812001", actualRiderIqama: "2444812016", actualRiderName: "HR Split Rider", actualRiderSource: "hr", assignmentId: "assignment_812_hr", city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", vehicleType: "car", status: "under_review", canonicalStatus: "warning", registeredVehicleSerial: "REG-CAR-812", actualVehicleSerial: "ACT-CAR-816", reasons: ["Face report pending"], dailySummary: { validDaysCount: 1 }, mandatorySummary: { valid: 1, required: 1, met: true }, projectionSummary: { canStillQualify: true } }
    ];
    collections.performanceIssues = [
      { id: "issue_812_missing_assignment", sourceModule: "performance", entityType: "performance_issue", entityId: "8121999", dashboardUserId: "8121999", ownerIqama: "2444812999", actualRiderIqama: "", assignmentId: "", issueType: "missing_assignment", issueCode: "performance_assignment_unresolved", severity: "critical", message: "Performance row has no assignment for the report date.", month: "2026-07", city: "Jeddah", register: "EXPRESS", platform: "keeta", linkedPage: "performance-shell", linkedSubPage: "issues", linkedFilters: { dashboardUserId: "8121999", month: "2026-07" }, linkedDrawer: { entityId: "8121999", mode: "details" }, resolved: false }
    ];
    collections.vdaResults = [{ id: "vda_812", dashboardUserId: "8121001", riderId: "rider::2999812001", iqama: "2999812001", city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", status: "valid" }];
    collections.faceVerification = [{ id: "face_812", dashboardUserId: "8121001", riderId: "rider::2444812016", iqama: "2444812016", city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", status: "under_review" }];
    collections.deliveryExperience = [{ id: "delivery_812", dashboardUserId: "8121001", riderId: "rider::2999812001", iqama: "2999812001", city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", status: "pass", grade: "A" }];
    return collections;
  }

  function buildPrompt813Collections() {
    var collections = buildPrompt812Collections();
    collections.auditLogs = [];
    collections.importBatches = [
      {
        id: "batch_prompt_8_13_daily_1", batchId: "batch_prompt_8_13_daily_1", importType: "daily_performance", fileType: "performance_daily_csv", templateId: "daily_performance", sourceModule: "performance", sourceFileName: "prompt-8-13-daily-performance.csv", targetEntity: "performanceDaily", status: "saved",
        rowCount: 4, readyCount: 2, warningCount: 1, invalidCount: 1, savedRecordCount: 4, city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", createdAt: "2026-08-02T08:00:00.000Z", createdBy: "prompt-8-13-verifier", sourceFingerprint: "p813-daily-safe-v1",
        previewRows: [
          { sourceRowNumber: 2, date: "2026-07-10", userId: "8121001", ownerIqama: "2444812001", actualRiderIqama: "2999812001", registeredVehicleSerial: "REG-CAR-812", actualVehicleSerial: "ACT-BIKE-812", city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", completedOrders: 22, validationStatus: "ready" },
          { sourceRowNumber: 3, date: "2026-07-20", userId: "8121001", ownerIqama: "2444812001", actualRiderIqama: "2444812016", registeredVehicleSerial: "REG-CAR-812", actualVehicleSerial: "ACT-CAR-816", city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", completedOrders: 24, validationStatus: "ready" },
          { sourceRowNumber: 4, date: "2026-07-21", userId: "8121999", ownerIqama: "2444812999", actualRiderIqama: "", city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", completedOrders: 8, validationStatus: "blocked" },
          { sourceRowNumber: 5, date: "2026-07-22", userId: "8121001", ownerIqama: "2444812001", actualRiderIqama: "2444812016", city: "Riyadh", register: "EXPRESS", platform: "keeta", month: "2026-07", completedOrders: 10, validationStatus: "warning" }
        ]
      },
      { id: "batch_prompt_8_13_dashboard_1", batchId: "batch_prompt_8_13_dashboard_1", importType: "dashboard_users", fileType: "dashboard_users_workbook", templateId: "dashboard_users", sourceModule: "operations", sourceFileName: "prompt-8-13-dashboard-users.xlsx", targetEntity: "dashboardUsers", status: "saved", rowCount: 2, readyCount: 2, warningCount: 0, invalidCount: 0, savedRecordCount: 2, city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", createdAt: "2026-08-02T07:00:00.000Z", createdBy: "prompt-8-13-verifier", sourceFingerprint: "p813-dashboard-safe-v1" }
    ];
    collections.dashboardUsers = collections.dashboardUsers.map(function (item) {
      return item.dashboardUserId === "8121001" ? mergeObjects({}, item, { sourceBatchId: "batch_prompt_8_13_dashboard_1", lastSeenImportBatchId: "batch_prompt_8_13_dashboard_1", sourceTemplateId: "dashboard_users", sourceImportType: "dashboard_users" }) : item;
    });
    collections.assignments = collections.assignments.map(function (item) {
      return item.dashboardUserId === "8121001" ? mergeObjects({}, item, { sourceBatchId: "batch_prompt_8_13_dashboard_1", sourceImportBatchId: "batch_prompt_8_13_dashboard_1", sourceTemplateId: "dashboard_users", sourceImportType: "dashboard_users" }) : item;
    });
    return collections;
  }

  function buildPrompt89BCollections() {
    return {
      assignments: [
        {
          id: "assignment_seed_1",
          dashboardUserId: "1782916129257495",
          riderId: "rider_1",
          riderIqama: "2444000011",
          city: "جدة",
          register: "EXPRESS",
          platform: "keeta",
          assignmentType: "first_assignment",
          startDate: "2026-07-01",
          status: "active",
          updatedAt: "2026-07-16T03:04:00.000Z"
        },
        {
          id: "assignment_seed_3",
          dashboardUserId: "1782999000777001",
          riderId: "rider_1",
          riderIqama: "2444000011",
          city: "جدة",
          register: "EXPRESS",
          platform: "keeta",
          assignmentType: "swap",
          startDate: "2026-07-15",
          status: "active",
          updatedAt: "2026-07-16T03:05:00.000Z"
        }
      ],
      dashboardUsers: [
        {
          id: "dash_user_1",
          userId: "1782916129257495",
          dashboardUserId: "1782916129257495",
          city: "جدة",
          register: "EXPRESS",
          status: "working",
          employmentStatus: "In Service",
          activationStatus: "Accepted",
          reviewStatus: "ok",
          lifecycleStatus: "active_assigned",
          assignmentReadiness: "already_assigned",
          fullName: "Ahmed Salem",
          ownerName: "Ahmed Salem",
          ownerIqama: "2444000011",
          phoneNumber: "966501112233",
          vehicleType: "car",
          vehicleSerial: "JED-CAR-1001",
          plateNumber: "JED-1001",
          platform: "keeta",
          currentRiderId: "rider_1",
          currentRiderIqama: "2444000011",
          currentRiderName: "Ahmed Salem",
          currentAssignmentId: "assignment_seed_1",
          assignmentStatus: "active",
          latestImportPresence: "present",
          operationMode: "salary_tiers",
          updatedAt: "2026-07-16T03:04:00.000Z"
        },
        {
          id: "dash_user_3",
          userId: "1782999000333001",
          dashboardUserId: "1782999000333001",
          city: "جدة",
          register: "ALBAWABA",
          status: "new",
          employmentStatus: "In Service",
          activationStatus: "Accepted",
          reviewStatus: "needs_assignment",
          lifecycleStatus: "new",
          assignmentReadiness: "ready_for_assignment",
          assignmentReadinessIssues: ["new_user_needs_assignment", "accepted_user_without_assignment"],
          assignmentReadinessReason: "new_user_needs_assignment",
          fullName: "Salem Nasser",
          ownerName: "Salem Nasser",
          ownerIqama: "2444000033",
          phoneNumber: "966501110033",
          vehicleType: "car",
          vehicleSerial: "JED-CAR-NEW3",
          plateNumber: "JED-3003",
          platform: "keeta",
          latestImportPresence: "present",
          operationMode: "salary_tiers",
          firstSeenAt: "2026-07-14T09:00:00.000Z",
          lastSeenAt: "2026-07-16T03:00:00.000Z",
          updatedAt: "2026-07-16T03:00:00.000Z"
        },
        {
          id: "dash_user_7",
          userId: "1782999000777001",
          dashboardUserId: "1782999000777001",
          city: "جدة",
          register: "EXPRESS",
          status: "working",
          employmentStatus: "In Service",
          activationStatus: "Accepted",
          reviewStatus: "ok",
          lifecycleStatus: "active_assigned",
          assignmentReadiness: "already_assigned",
          fullName: "Faisal Noor",
          ownerName: "Faisal Noor",
          ownerIqama: "2444000077",
          phoneNumber: "966501110077",
          vehicleType: "car",
          vehicleSerial: "JED-CAR-7007",
          plateNumber: "JED-7007",
          platform: "keeta",
          currentRiderId: "rider_1",
          currentRiderIqama: "2444000011",
          currentRiderName: "Ahmed Salem",
          currentAssignmentId: "assignment_seed_3",
          assignmentStatus: "active",
          latestImportPresence: "present",
          operationMode: "salary_tiers",
          updatedAt: "2026-07-16T03:05:00.000Z"
        }
      ],
      hrProfiles: [
        {
          id: "hr_profile_1",
          employeeId: "EMP-1001",
          iqama: "2444000011",
          fullNameArabic: "Ahmed Salem",
          nationality: "Egyptian",
          branch: "جدة",
          city: "جدة",
          register: "EXPRESS",
          registerName: "EXPRESS GATE Company",
          employmentType: "sponsorship",
          hrStatus: "active",
          professionAtIqama: "Courier",
          jobTitle: "Rider",
          startDate: "2026-01-10",
          residencyExpiry: "2027-02-01",
          residencyStatus: "سارية",
          sponsorId: "1010101010",
          licenseType: "عمومي",
          licenseTypeSecondary: "عمومي",
          kafalaStatus: "على الكفالة",
          licenseState: "سارية",
          notes: "Prompt 8.9-B seeded owner profile.",
          updatedAt: "2026-07-16T03:04:00.000Z"
        },
        {
          id: "hr_profile_7",
          employeeId: "EMP-1007",
          iqama: "2444000077",
          fullNameArabic: "Faisal Noor",
          nationality: "Sudanese",
          branch: "جدة",
          city: "جدة",
          register: "EXPRESS",
          registerName: "EXPRESS GATE Company",
          employmentType: "sponsorship",
          hrStatus: "active",
          professionAtIqama: "Courier",
          jobTitle: "Rider",
          startDate: "2026-06-20",
          residencyExpiry: "2027-09-01",
          residencyStatus: "سارية",
          sponsorId: "7070707070",
          licenseType: "عمومي",
          licenseTypeSecondary: "عمومي",
          kafalaStatus: "على الكفالة",
          licenseState: "سارية",
          notes: "Prompt 8.9-B seeded owner profile.",
          updatedAt: "2026-07-16T03:05:00.000Z"
        }
      ],
      importBatches: [
        {
          id: "batch_prompt_8_9_b_1",
          city: "جدة",
          register: "EXPRESS",
          platform: "keeta",
          status: "saved",
          importType: "dashboard_users",
          fileType: "dashboard_users_workbook",
          templateId: "dashboard_users",
          month: "2026-07",
          targetEntity: "dashboardUsers",
          confidence: 0.99,
          sourceFileName: "prompt-8-9-b-dashboard-users.xlsx",
          fileName: "prompt-8-9-b-dashboard-users.xlsx",
          savedRecordCount: 2,
          warnings: ["partial_headers", "new_users_detected"],
          createdAt: "2026-07-16T03:10:00.000Z",
          updatedAt: "2026-07-16T03:10:00.000Z"
        }
      ],
      notifications: [],
      operationalStatusReviews: [],
      performanceDaily: [],
      performanceIssues: [],
      performanceMonthly: [],
      deliveryExperience: [],
      faceVerification: [],
      riders: [
        {
          id: "rider_1",
          primaryIqama: "2444000011",
          displayName: "Ahmed Salem",
          normalizedName: "ahmed salem",
          cities: ["جدة"],
          registers: ["EXPRESS"],
          platforms: ["keeta"],
          currentWorkStatus: "working",
          city: "جدة",
          register: "EXPRESS",
          status: "active"
        }
      ],
      riderVehicleUsageHistory: [],
      validityResults: [],
      vdaResults: [],
      vehicleAssignments: [],
      vehicleCapacityReviews: [],
      vehicleComplianceIssues: [],
      vehicleMovementEvents: [],
      vehicles: []
    };
  }

  function mergeRecordLists(existing, overrides) {
    var next = Array.isArray(existing) ? existing.slice() : [];
    var indexById = {};
    next.forEach(function (record, index) {
      indexById[normalizeText(record && record.id)] = index;
    });
    (overrides || []).forEach(function (record) {
      var id = normalizeText(record && record.id);
      if (!id) {
        next.push(record);
        return;
      }
      if (typeof indexById[id] === "number") {
        next[indexById[id]] = mergeObjects(next[indexById[id]], record);
        return;
      }
      indexById[id] = next.length;
      next.push(record);
    });
    return next;
  }

  function mergeObjects() {
    var result = {};
    Array.prototype.slice.call(arguments).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        result[key] = source[key];
      });
    });
    return result;
  }

  function cloneValue(value) {
    if (!value || typeof value !== "object") {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeStorageProfile(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).trim();
  }

  return {
    SCENARIOS: SCENARIOS,
    applyScenarioToCollections: applyScenarioToCollections,
    getScenarioDefinition: getScenarioDefinition,
    getScenarioSignature: getScenarioSignature,
    resolveScenario: resolveScenario
  };
});
