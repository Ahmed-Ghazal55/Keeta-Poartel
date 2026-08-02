const assert = require("assert");

const HrViewModel = require("../src/hr/hrViewModel.js");
const SidebarRouting = require("../src/ui/sidebarRouting.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function buildPayload() {
  return {
    hrProfiles: [
      {
        id: "hr_1",
        iqama: "2444000011",
        fullNameArabic: "Ahmed Salem",
        city: "Jeddah",
        register: "EXPRESS",
        registerName: "EXPRESS GATE Company",
        nationality: "Egyptian",
        hrStatus: "active",
        kafalaStatus: "on_kafala",
        residencyStatus: "valid",
        licenseState: "valid",
        healthCardStatus: "valid"
      },
      {
        id: "hr_2",
        iqama: "2444000077",
        fullNameArabic: "Faisal Noor",
        city: "Jeddah",
        register: "EXPRESS",
        registerName: "EXPRESS GATE Company",
        nationality: "Sudanese",
        hrStatus: "inactive",
        kafalaStatus: "off_kafala",
        residencyStatus: "",
        licenseState: "",
        healthCardStatus: ""
      }
    ],
    dashboardUsers: [
      {
        dashboardUserId: "178200001",
        ownerIqama: "2444000011"
      }
    ],
    assignments: [
      {
        assignmentStatus: "active",
        dashboardUserId: "178200002",
        ownerIqama: "2444000011",
        actualRiderIqama: "2444000077"
      }
    ],
    assignmentHistory: [],
    riderOperationalProfiles: [],
    terminations: [],
    externalRiders: [
      {
        id: "external_1",
        iqama: "2999000011",
        fullName: "External Rider"
      }
    ]
  };
}

const results = [];

results.push(test("HR route aliases normalize to canonical cleanup tabs", () => {
  assert.strictEqual(HrViewModel.normalizeHrRoute("hr-master"), "hr_master");
  assert.strictEqual(HrViewModel.normalizeHrRoute("active-hr-riders"), "active_hr_riders");
  assert.strictEqual(HrViewModel.normalizeHrRoute("kafala-status"), "kafala_status");
  assert.strictEqual(HrViewModel.normalizeHrRoute("hr-archive"), "hr_archive");
  assert.strictEqual(SidebarRouting.resolveRoute("HR1").subPage, "hr_master");
  assert.strictEqual(SidebarRouting.resolveRoute("HR5").subPage, "documents");
}));

results.push(test("external riders do not become HR rows", () => {
  const rows = HrViewModel.buildHrRows(buildPayload());
  assert.strictEqual(rows.length, 2);
  assert.ok(!rows.some((row) => row.iqama === "2999000011"));
}));

results.push(test("HR filters and KPIs operate on filtered HR rows", () => {
  const rows = HrViewModel.buildHrRows(buildPayload());
  const filtered = HrViewModel.filterHrRows(rows, {
    employmentStatus: "active",
    register: "EXPRESS"
  }, "hr_master");
  const kpis = HrViewModel.buildHrKpis(filtered);
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(kpis.totalHrRiders, 1);
  assert.strictEqual(kpis.active, 1);
  assert.strictEqual(kpis.inactive, 0);
}));

results.push(test("owner and actual rider identities remain separate inside HR projections", () => {
  const rows = HrViewModel.buildHrRows(buildPayload());
  const ownerRow = rows.filter((row) => row.iqama === "2444000011")[0];
  const actualRow = rows.filter((row) => row.iqama === "2444000077")[0];
  assert.ok(ownerRow);
  assert.ok(actualRow);
  assert.strictEqual(ownerRow.linkedDashboardUserCount, 1);
  assert.strictEqual(ownerRow.currentActualAssignmentCount, 0);
  assert.strictEqual(actualRow.linkedDashboardUserCount, 0);
  assert.strictEqual(actualRow.currentActualAssignmentCount, 1);
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
