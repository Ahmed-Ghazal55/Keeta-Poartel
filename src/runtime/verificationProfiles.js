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
    PROMPT_8_10_OPS_CLEANUP: "prompt8_10_ops_cleanup"
  };

  var SCENARIO_SIGNATURES = {};
  SCENARIO_SIGNATURES[SCENARIOS.PROMPT_8_9_B_OPS_NOTIFICATIONS] = "2026.07.prompt8_9_b_ops_notifications.v1";
  SCENARIO_SIGNATURES[SCENARIOS.PROMPT_8_10_OPS_CLEANUP] = "2026.07.prompt8_10_ops_cleanup.v1";

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
    if (key !== SCENARIOS.PROMPT_8_9_B_OPS_NOTIFICATIONS && key !== SCENARIOS.PROMPT_8_10_OPS_CLEANUP) {
      return null;
    }
    return {
      id: key,
      label: key === SCENARIOS.PROMPT_8_10_OPS_CLEANUP
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
      collections: key === SCENARIOS.PROMPT_8_10_OPS_CLEANUP
        ? buildPrompt810Collections()
        : buildPrompt89BCollections()
    };
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
