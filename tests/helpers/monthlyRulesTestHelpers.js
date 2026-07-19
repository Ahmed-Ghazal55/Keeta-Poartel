const RBAC = require("../../src/auth/rbac.js");
const { createAuditLogService } = require("../../src/data/auditLog.js");
const { createDataStore } = require("../../src/data/dataStore.js");
const { createMemoryStore } = require("../../src/data/memoryStore.js");
const { createDefaultMonthlyRule } = require("../../src/rules/monthlyRulesDefaults.js");
const { createMonthlyRulesService } = require("../../src/rules/monthlyRulesService.js");

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
    auditLogs: [],
    monthlyRules: [],
  }, seed || {}));

  return {
    auditLog,
    dataStore,
    service: createMonthlyRulesService({
      auditLog,
      dataStore,
      rbac: RBAC,
    }),
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
    status: "draft",
    version: 1,
    notes: "seed test rule",
  }, overrides || {}));
}

module.exports = {
  CITY_JEDDAH,
  CITY_RIYADH,
  createCitySupervisor,
  createOperationsAdmin,
  createRule,
  createRuntime,
  createSuperAdmin,
  createViewer,
};
