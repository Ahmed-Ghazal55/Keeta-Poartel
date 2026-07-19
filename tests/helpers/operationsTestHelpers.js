const { createMemoryStore } = require("../../src/data/memoryStore.js");
const { createDataStore } = require("../../src/data/dataStore.js");
const { createAuditLogService } = require("../../src/data/auditLog.js");

const CITY_JEDDAH = "\u062c\u062f\u0629";
const CITY_RIYADH = "\u0627\u0644\u0631\u064a\u0627\u0636";

function createRuntime(seed) {
  const memoryStore = createMemoryStore();
  const dataStore = createDataStore({
    primaryAdapter: memoryStore,
    fallbackAdapter: memoryStore,
  });
  const auditLog = createAuditLogService(dataStore);

  dataStore.seedCollections(Object.assign({
    assignments: [],
    assignmentHistory: [],
    auditLogs: [],
    dashboardUsers: [],
    externalRiders: [],
    hrProfiles: [],
    importBatches: [],
    operationalStatusReviews: [],
    riderOperationalProfiles: [],
    riderArchiveEvents: [],
    riderVehicleUsageHistory: [],
    riders: [],
    terminations: [],
  }, seed || {}));

  return { auditLog, dataStore };
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

function createOrganizationContext(overrides) {
  return Object.assign({
    cityScope: "all",
    selectedCities: [CITY_JEDDAH, CITY_RIYADH],
    registerScope: "all",
    selectedRegisters: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"],
    selectedDashboards: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"],
    workMode: "all",
  }, overrides || {});
}

function buildDashboardUser(overrides) {
  return Object.assign({
    id: "dashboard-user-1",
    dashboardUserId: "1001",
    userId: "1001",
    platform: "keeta",
    city: CITY_JEDDAH,
    register: "EXPRESS",
    dashboardName: "EXPRESS GATE Company",
    fullName: "Ahmed Salem",
    firstName: "Ahmed",
    lastName: "Salem",
    ownerIqama: "244400001",
    ownerName: "Ahmed Salem",
    ownerPhone: "966500000001",
    phoneNumber: "966500000001",
    vehicleType: "car",
    employmentStatus: "In Service",
    jobStatus: "working",
    activationStatus: "accepted",
    matchStatus: "unassigned",
    currentRiderId: "",
    currentRiderIqama: "",
    currentRiderName: "",
    currentAssignmentId: "",
    assignmentStatus: "",
    assignmentReadiness: "ready_for_assignment",
    assignmentReadinessIssues: [],
    assignmentReadinessReason: "ready_for_assignment",
    canAssign: true,
    canDismiss: true,
    canStop: false,
    canSwap: false,
    latestImportPresence: "present",
    lifecycleStatus: "ready_for_assignment",
    operationMode: "salary_tiers",
    reviewStatus: "needs_assignment",
    recommendedAction: "assign_rider",
    handoverDate: "",
    returnDate: "",
    sourceFile: "Dash_EXPRESS.csv",
    status: "needs_assignment",
  }, overrides || {});
}

function buildRider(overrides) {
  return Object.assign({
    id: "rider-1",
    primaryIqama: "299900001",
    displayName: "Rider One",
    normalizedName: "rider one",
    phones: ["966500000099"],
    cities: [CITY_JEDDAH],
    registers: ["EXPRESS"],
    platforms: ["keeta"],
    employmentType: "freelancer",
    currentWorkStatus: "working",
    hrProfileId: "",
    riskFlags: [],
    notes: "",
    firstSeenAt: "2026-07-01T00:00:00.000Z",
    lastSeenAt: "2026-07-01T00:00:00.000Z",
    city: CITY_JEDDAH,
    register: "EXPRESS",
    status: "active",
  }, overrides || {});
}

function buildAssignment(overrides) {
  return Object.assign({
    id: "assignment-1",
    assignmentId: "assignment-1",
    dashboardUserId: "1001",
    courierId: "1001",
    userId: "1001",
    riderId: "rider-1",
    riderIqama: "299900001",
    actualRiderIqama: "299900001",
    actualRiderName: "Rider One",
    actualRiderPhone: "966500000099",
    assignmentStatus: "active",
    city: CITY_JEDDAH,
    register: "EXPRESS",
    platform: "keeta",
    assignmentType: "first_assignment",
    operationMode: "salary_tiers",
    riderSource: "HR",
    assignmentStartDate: "2026-07-01",
    riderReceiveDate: "2026-07-01",
    firstOnlineDate: "2026-07-02",
    dashboardVehicle: "Registered Sedan",
    actualVehicle: "Toyota Yaris",
    vehicleType: "car",
    plateNumber: "JED-1001",
    vehicleSerial: "VH-1001",
    supervisor: "Lead A",
    startDate: "2026-07-01",
    endDate: "",
    status: "active",
    reason: "",
    note: "",
    createdBy: "ops-admin",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  }, overrides || {});
}

function buildVehicleUsage(overrides) {
  return Object.assign({
    id: "vehicle-usage-1",
    riderIqama: "299900001",
    riderName: "Rider One",
    riderSource: "HR",
    vehicleSource: "company",
    vehicleType: "car",
    vehicleSerial: "VH-1001",
    plateNumber: "JED-1001",
    vehicleRegister: "EXPRESS",
    city: CITY_JEDDAH,
    register: "EXPRESS",
    platform: "keeta",
    startDate: "2026-07-01",
    endDate: "",
    active: true,
    sourceBatchId: "batch-1",
    sourceOperation: "operations_assignment",
    createdBy: "ops-admin",
    updatedBy: "ops-admin",
    updatedAt: "2026-07-01T00:00:00.000Z",
    notes: "Toyota Yaris",
    sourceFile: "current_assignments.csv",
    status: "active",
  }, overrides || {});
}

module.exports = {
  CITY_JEDDAH,
  CITY_RIYADH,
  buildAssignment,
  buildDashboardUser,
  buildRider,
  buildVehicleUsage,
  createCitySupervisor,
  createOperationsAdmin,
  createOrganizationContext,
  createRuntime,
  createViewer,
};
