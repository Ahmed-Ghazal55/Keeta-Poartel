const RBAC = require("../../src/auth/rbac.js");
const { createAuditLogService } = require("../../src/data/auditLog.js");
const { createDataStore } = require("../../src/data/dataStore.js");
const { createMemoryStore } = require("../../src/data/memoryStore.js");
const { createImportBatchService } = require("../../src/import/importBatchService.js");
const { createImportRegistry } = require("../../src/import/importRegistry.js");
const { readDelimitedText } = require("../../src/import/csvReader.js");
const { createDefaultMonthlyRule } = require("../../src/rules/monthlyRulesDefaults.js");
const { createMonthlyRulesService } = require("../../src/rules/monthlyRulesService.js");
const { createPerformanceRecalculationService } = require("../../src/performance/performanceRecalculationService.js");

const CITY_JEDDAH = "\u062c\u062f\u0629";
const CITY_RIYADH = "\u0627\u0644\u0631\u064a\u0627\u0636";

function createRuntime(seed) {
  const memoryStore = createMemoryStore();
  const dataStore = createDataStore({
    primaryAdapter: memoryStore,
    fallbackAdapter: memoryStore,
  });
  const auditLog = createAuditLogService(dataStore);
  const monthlyRulesService = createMonthlyRulesService({
    auditLog,
    dataStore,
    rbac: RBAC,
  });
  const performanceService = createPerformanceRecalculationService({
    auditLog,
    dataStore,
    monthlyRulesService,
    rbac: RBAC,
  });
  const importRegistry = createImportRegistry({ dataStore });
  const importBatchService = createImportBatchService({
    auditLog,
    dataStore,
    importRegistry,
    performanceRecalculationService: performanceService,
    rbac: RBAC,
  });

  dataStore.seedCollections(Object.assign({
    assignments: [],
    auditLogs: [],
    dashboardUsers: [],
    deliveryExperience: [],
    faceVerification: [],
    importBatches: [],
    monthlyRules: [],
    performanceDaily: [],
    performanceIssues: [],
    performanceMonthly: [],
    riders: [],
    validityResults: [],
    vdaResults: [],
  }, seed || {}));

  return {
    auditLog,
    dataStore,
    importBatchService,
    importRegistry,
    monthlyRulesService,
    performanceService,
  };
}

function createSuperAdmin(overrides) {
  return Object.assign({
    id: "super-admin",
    role: "super_admin",
    cityScope: "all",
    selectedCities: [CITY_JEDDAH, CITY_RIYADH],
    registerScope: "all",
    selectedRegisters: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"],
    permissions: [],
  }, overrides || {});
}

function createOperationsAdmin(overrides) {
  return Object.assign({
    id: "ops-admin",
    role: "operations_admin",
    cityScope: "all",
    selectedCities: [CITY_JEDDAH, CITY_RIYADH],
    registerScope: "all",
    selectedRegisters: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"],
    permissions: [],
  }, overrides || {});
}

function createCitySupervisor(city, registerCode, overrides) {
  return Object.assign({
    id: "city-supervisor",
    role: "city_supervisor",
    cityScope: "single",
    selectedCities: [city],
    registerScope: "single",
    selectedRegisters: [registerCode],
    permissions: [],
  }, overrides || {});
}

function createViewer(overrides) {
  return Object.assign({
    id: "viewer",
    role: "viewer",
    cityScope: "single",
    selectedCities: [CITY_JEDDAH],
    registerScope: "single",
    selectedRegisters: ["EXPRESS"],
    permissions: [],
  }, overrides || {});
}

function createFinanceOfficer(overrides) {
  return Object.assign({
    id: "finance",
    role: "finance_officer",
    cityScope: "all",
    selectedCities: [CITY_JEDDAH, CITY_RIYADH],
    registerScope: "all",
    selectedRegisters: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"],
    permissions: [],
  }, overrides || {});
}

function createRule(overrides) {
  return createDefaultMonthlyRule(Object.assign({
    id: "rule-jed-express-2026-07",
    month: "2026-07",
    city: CITY_JEDDAH,
    cityScope: "single",
    selectedCities: [CITY_JEDDAH],
    register: "EXPRESS",
    registerScope: "single",
    selectedRegisters: ["EXPRESS"],
    platform: "keeta",
    status: "active",
    version: 1,
    validDayRules: {
      enabled: true,
      validDayMode: "orders_or_hours",
      minOrdersCar: 18,
      minOrdersBike: 16,
      minWorkingHoursCar: 8,
      minWorkingHoursBike: 7,
    },
    mandatoryDaysRules: {
      enabled: true,
      mandatoryDates: ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05", "2026-07-06", "2026-07-07"],
      minRequiredValidMandatoryDays: 6,
      allowMissedMandatoryDays: 1,
    },
    orderRules: {
      enabled: true,
      mandatoryDayMinOrders: 6,
      regularDayMinOrders: 3,
    },
    faceVerificationRules: {
      enabled: true,
      passRateRequired: 80,
      skipCountsAsFail: true,
      excludeNoResultDays: true,
      allowExpectedProjection: true,
    },
    vdaRules: {
      enabled: true,
      requiredStatus: ["valid"],
      invalidStatuses: ["invalid"],
      affectsValidity: true,
      affectsSalaryEligibility: true,
    },
    deliveryExperienceRules: {
      enabled: true,
      minGrade: "B",
      gradeScores: {
        A: 2000,
        B: 1200,
        C: 600,
        D: 300,
      },
      affectsIncentive: true,
    },
    salaryEligibilityRules: {
      enabled: true,
      minimumValidDays: 6,
      minimumOrdersCar: 330,
      minimumOrdersBike: 350,
    },
  }, overrides || {}));
}

function buildDashboardUser(overrides) {
  return Object.assign({
    id: "dashboard-user-1",
    dashboardUserId: "1001",
    userId: "1001",
    platform: "keeta",
    city: CITY_JEDDAH,
    register: "EXPRESS",
    vehicleType: "car",
    ownerIqama: "2444000011",
    currentRiderId: "rider-1",
    status: "working",
  }, overrides || {});
}

function buildRider(overrides) {
  return Object.assign({
    id: "rider-1",
    primaryIqama: "2444000011",
    displayName: "Rider One",
    cities: [CITY_JEDDAH],
    registers: ["EXPRESS"],
    platforms: ["keeta"],
    city: CITY_JEDDAH,
    register: "EXPRESS",
    status: "active",
  }, overrides || {});
}

function buildAssignment(overrides) {
  return Object.assign({
    id: "assignment-1",
    dashboardUserId: "1001",
    riderId: "rider-1",
    riderIqama: "2444000011",
    city: CITY_JEDDAH,
    register: "EXPRESS",
    platform: "keeta",
    status: "active",
  }, overrides || {});
}

function buildDailyRow(overrides) {
  const date = (overrides && overrides.date) || "2026-07-01";
  const userId = (overrides && overrides.userId) || "1001";
  const register = (overrides && overrides.register) || "EXPRESS";
  return Object.assign({
    id: "performanceDaily::" + register + "::" + userId + "::" + date,
    riderId: "rider-1",
    dashboardUserId: userId,
    userId: userId,
    iqama: "2444000011",
    platform: "keeta",
    city: CITY_JEDDAH,
    register: register,
    vehicleType: "car",
    workMode: "salary_tiers",
    date: date,
    dateKey: date.replace(/-/g, ""),
    month: "2026-07",
    orders: 20,
    completedOrders: 20,
    deliveredTasks: 20,
    cancelledOrders: 0,
    rejectedOrders: 0,
    workingHours: 8.5,
    onlineHours: 8.5,
    attendanceStatus: "present",
    status: "active",
    sourceFile: "test",
  }, overrides || {});
}

function buildFaceRow(overrides) {
  const date = (overrides && overrides.date) || "2026-07-01";
  const userId = (overrides && overrides.userId) || "1001";
  const register = (overrides && overrides.register) || "EXPRESS";
  return Object.assign({
    id: "faceVerification::" + register + "::" + userId + "::" + date,
    riderId: "rider-1",
    userId: userId,
    dashboardUserId: userId,
    platform: "keeta",
    city: CITY_JEDDAH,
    register: register,
    status: "pass",
    result: "pass",
    date: date,
    dateKey: date.replace(/-/g, ""),
    month: "2026-07",
  }, overrides || {});
}

function buildVdaResult(overrides) {
  return Object.assign({
    id: "vdaResults::EXPRESS::1001::2026-07",
    riderId: "rider-1",
    userId: "1001",
    dashboardUserId: "1001",
    platform: "keeta",
    city: CITY_JEDDAH,
    register: "EXPRESS",
    status: "valid",
    month: "2026-07",
    vehicleType: "car",
    deliveredTasks: 340,
  }, overrides || {});
}

function buildDeliveryResult(overrides) {
  return Object.assign({
    id: "deliveryExperience::EXPRESS::1001::2026-07",
    riderId: "rider-1",
    userId: "1001",
    dashboardUserId: "1001",
    platform: "keeta",
    city: CITY_JEDDAH,
    register: "EXPRESS",
    vehicleType: "car",
    month: "2026-07",
    status: "review",
    level: "A",
    estimatedBonusAmount: 2000,
  }, overrides || {});
}

function buildPerformanceAnalysis(fileName, csvText) {
  const tableSummary = readDelimitedText(fileName, csvText, {});
  return {
    extension: ".csv",
    fileName,
    rowCount: tableSummary.rowCount,
    tableSummary,
  };
}

module.exports = {
  CITY_JEDDAH,
  CITY_RIYADH,
  buildAssignment,
  buildDashboardUser,
  buildDailyRow,
  buildDeliveryResult,
  buildFaceRow,
  buildPerformanceAnalysis,
  buildRider,
  buildVdaResult,
  createCitySupervisor,
  createFinanceOfficer,
  createOperationsAdmin,
  createRule,
  createRuntime,
  createSuperAdmin,
  createViewer,
};
