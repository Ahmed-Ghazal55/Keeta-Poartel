const assert = require("assert");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { readDelimitedText } = require("../src/import/csvReader.js");
const ImportNormalizer = require("../src/import/importNormalizer.js");
const {
  buildDashboardUser
} = require("./helpers/operationsTestHelpers.js");

const DASHBOARD_HEADERS = [
  "Courier ID",
  "Courier qualification type",
  "First Name",
  "Last Name",
  "ID Number",
  "Phone Number",
  "Email",
  "Vehicle",
  "Employment Status",
  "Review Status",
  "Document change status",
  "Please note",
  "Settlement mode",
  "Operations  city",
  "register"
];

const SUPER_ADMIN = {
  id: "ops-admin",
  permissions: [],
  role: "super_admin",
  selectedCities: ["جدة", "الرياض"],
  selectedRegisters: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"]
};

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function createStore(seed) {
  const memoryStore = createMemoryStore();
  const dataStore = createDataStore({
    primaryAdapter: memoryStore,
    fallbackAdapter: memoryStore
  });
  const collections = Object.assign({
    assignments: [],
    dashboardUsers: [],
    externalRiders: [],
    hrProfiles: [],
    operationalStatusReviews: [],
    riderOperationalProfiles: [],
    riders: []
  }, seed || {});

  Object.keys(collections).forEach((entityName) => {
    dataStore.save(entityName, collections[entityName]);
  });

  return dataStore;
}

function csvEscape(value) {
  const text = String(value == null ? "" : value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildDashboardAnalysis(fileName, rows) {
  const csv = [DASHBOARD_HEADERS.join(",")]
    .concat(rows.map((row) => DASHBOARD_HEADERS.map((header) => csvEscape(row[header] || "")).join(",")))
    .join("\n");
  const tableSummary = readDelimitedText(fileName, csv, {});
  return {
    extension: ".csv",
    fileName,
    rowCount: tableSummary.rowCount,
    tableSummary
  };
}

function normalizeBatch(options) {
  const importRecord = {
    id: options.batchId || "batch-dashboard-users-1",
    analysis: buildDashboardAnalysis(options.fileName || "Dash_EXPRESS.csv", options.rows),
    city: options.city || "جدة",
    register: options.register || "EXPRESS",
    sourceFileName: options.fileName || "Dash_EXPRESS.csv",
    type: "dashboard_users_csv"
  };
  return ImportNormalizer.normalizeImportRecord(importRecord, {
    dataStore: options.dataStore,
    user: SUPER_ADMIN
  });
}

function outputFor(outputs, entityName) {
  return outputs.filter((item) => item.entityName === entityName)[0];
}

function dashboardRow(overrides) {
  return Object.assign({
    "Courier ID": "1782916129257495",
    "Courier qualification type": "Car - External",
    "First Name": "Ahmed",
    "Last Name": "Salem",
    "ID Number": "244400001",
    "Phone Number": "966500000001",
    "Email": "ahmed@example.com",
    "Vehicle": "Car",
    "Employment Status": "In Service",
    "Review Status": "Accepted",
    "Document change status": "No Change",
    "Please note": "",
    "Settlement mode": "Salary Tiers",
    "Operations  city": "جدة",
    "register": "EXPRESS"
  }, overrides || {});
}

const results = [];

results.push(test("existing dashboard user updates preserve firstSeenAt and refresh lastSeenAt", () => {
  const dataStore = createStore({
    dashboardUsers: [buildDashboardUser({
      id: "dash-existing-1",
      dashboardUserId: "1782916129257495",
      firstSeenAt: "2026-07-01T08:00:00.000Z",
      lastSeenAt: "2026-07-10T08:00:00.000Z",
      ownerIqama: "244400001",
      ownerPhone: "966500000000",
      phoneNumber: "966500000000"
    })],
    hrProfiles: [{ id: "hr-1", iqama: "244400001", fullNameArabic: "Ahmed Salem" }]
  });

  const outputs = normalizeBatch({
    batchId: "batch-dashboard-update",
    dataStore,
    rows: [dashboardRow({ "Phone Number": "966500000009" })]
  });
  const dashboardUsersOutput = outputFor(outputs, "dashboardUsers");
  const user = dashboardUsersOutput.records[0];

  assert.strictEqual(user.firstSeenAt, "2026-07-01T08:00:00.000Z");
  assert.strictEqual(user.phoneNumber, "966500000009");
  assert.notStrictEqual(user.lastSeenAt, "2026-07-10T08:00:00.000Z");
  assert.strictEqual(user.latestImportPresence, "present");
  assert.strictEqual(user.sourceBatchId, "batch-dashboard-update");
}));

results.push(test("new accepted dashboard user is marked new and ready_for_assignment with derived full name", () => {
  const dataStore = createStore();
  const outputs = normalizeBatch({
    batchId: "batch-dashboard-new",
    dataStore,
    rows: [dashboardRow({
      "Courier ID": "1782999000333001",
      "First Name": "Salem",
      "Last Name": "Nasser",
      "ID Number": "2444000033",
      "Phone Number": "966501110033"
    })]
  });
  const user = outputFor(outputs, "dashboardUsers").records[0];

  assert.strictEqual(user.lifecycleStatus, "new");
  assert.strictEqual(user.assignmentReadiness, "ready_for_assignment");
  assert.strictEqual(user.firstName, "Salem");
  assert.strictEqual(user.lastName, "Nasser");
  assert.strictEqual(user.fullName, "Salem Nasser");
}));

results.push(test("pending review dashboard user becomes pending_review", () => {
  const dataStore = createStore({
    hrProfiles: [{ id: "hr-pending", iqama: "2444000044", fullNameArabic: "Hassan Omar" }]
  });
  const outputs = normalizeBatch({
    batchId: "batch-dashboard-pending",
    dataStore,
    rows: [dashboardRow({
      "Courier ID": "1782999000444001",
      "First Name": "Hassan",
      "Last Name": "Omar",
      "ID Number": "2444000044",
      "Review Status": "Pending Review"
    })]
  });
  const user = outputFor(outputs, "dashboardUsers").records[0];

  assert.strictEqual(user.lifecycleStatus, "pending_review");
  assert.strictEqual(user.assignmentReadiness, "under_review");
}));

results.push(test("rejected dashboard user becomes rejected", () => {
  const dataStore = createStore();
  const outputs = normalizeBatch({
    batchId: "batch-dashboard-rejected",
    dataStore,
    rows: [dashboardRow({
      "Courier ID": "1782999000555001",
      "First Name": "Khaled",
      "Last Name": "Amin",
      "ID Number": "2444000055",
      "Document change status": "Rejected",
      "Review Status": "Rejected"
    })]
  });
  const user = outputFor(outputs, "dashboardUsers").records[0];

  assert.strictEqual(user.lifecycleStatus, "rejected");
  assert.strictEqual(user.assignmentReadiness, "rejected");
}));

results.push(test("missing dashboard users are preserved and marked missing_from_latest_snapshot", () => {
  const dataStore = createStore({
    dashboardUsers: [
      buildDashboardUser({
        id: "dash-present",
        dashboardUserId: "1782916129257495",
        ownerIqama: "244400001"
      }),
      buildDashboardUser({
        id: "dash-missing",
        dashboardUserId: "1782999000666001",
        currentAssignmentId: "assignment-old",
        lifecycleStatus: "active_assigned",
        ownerIqama: "2444000066"
      })
    ],
    hrProfiles: [
      { id: "hr-1", iqama: "244400001", fullNameArabic: "Ahmed Salem" },
      { id: "hr-2", iqama: "2444000066", fullNameArabic: "Yousef Samir" }
    ]
  });

  const outputs = normalizeBatch({
    batchId: "batch-dashboard-missing",
    dataStore,
    rows: [dashboardRow()]
  });
  const dashboardUsers = outputFor(outputs, "dashboardUsers").records;
  const missingUser = dashboardUsers.filter((item) => item.dashboardUserId === "1782999000666001")[0];

  assert.ok(missingUser);
  assert.strictEqual(missingUser.id, "dash-missing");
  assert.strictEqual(missingUser.currentAssignmentId, "assignment-old");
  assert.strictEqual(missingUser.latestImportPresence, "missing");
  assert.strictEqual(missingUser.missingFromLatestImport, true);
  assert.strictEqual(missingUser.lifecycleStatus, "missing_from_latest_snapshot");
  assert.strictEqual(missingUser.needsReview, true);
}));

const summary = {
  total: results.length,
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
