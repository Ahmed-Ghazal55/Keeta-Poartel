const fs = require("fs");
const path = require("path");

const MONTHLY_DATA_ROOT = path.join(__dirname, "..", "data", "raw", "monthly_closing");
const XLSX = require("../vendor/xlsx.full.min.js");
const { MonthlyClosingEngine } = require("../src/lib/monthlyClosingEngine.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function walkFiles(rootDir) {
  const files = [];

  function walk(directory) {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        return;
      }
      files.push(absolutePath);
    });
  }

  walk(rootDir);
  return files;
}

const MONTHLY_FILES = walkFiles(MONTHLY_DATA_ROOT);

function findFile(description, predicate) {
  const filePath = MONTHLY_FILES.find((absolutePath) => predicate(path.basename(absolutePath)));
  if (!filePath) {
    throw new Error(`Missing required sample file: ${description}`);
  }
  return filePath;
}

function loadWorkbook(filePath) {
  const buffer = fs.readFileSync(filePath);
  return XLSX.read(buffer, { type: "buffer" });
}

function sheetRows(workbook, sheetName) {
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: "",
    raw: true,
  });
}

function valueAt(row, index) {
  return Object.values(row)[index];
}

const tests = [];

function test(name, handler) {
  tests.push({ name, handler });
}

test("detectMonthlyFileType recognizes real monthly workbook families", () => {
  const companyFile = findFile(
    "Express May company invoice",
    (name) => name.startsWith("EXPRESS GATE Company ( Jeddah)#2026-05#") && name.toLowerCase().endsWith(".xlsx")
  );
  const faceFile = findFile(
    "Express June face workbook",
    (name) => name.startsWith("EXPRESS GATE FR full data 30 Jun") && name.toLowerCase().endsWith(".xlsx")
  );
  const internalFile = findFile(
    "May internal settlement workbook",
    (name) => name.includes("05-2026") && name.toLowerCase().endsWith(".xlsx")
  );

  const companyWorkbook = loadWorkbook(companyFile);
  const faceWorkbook = loadWorkbook(faceFile);
  const internalWorkbook = loadWorkbook(internalFile);

  const companyDetection = MonthlyClosingEngine.detectMonthlyFileType(
    path.basename(companyFile),
    companyWorkbook.SheetNames,
    []
  );
  const faceDetection = MonthlyClosingEngine.detectMonthlyFileType(
    path.basename(faceFile),
    faceWorkbook.SheetNames,
    []
  );
  const internalDetection = MonthlyClosingEngine.detectMonthlyFileType(
    path.basename(internalFile),
    internalWorkbook.SheetNames,
    []
  );

  assert(companyDetection.type === "company_invoice", "company invoice workbook should be detected");
  assert(companyDetection.month === "2026-05", "company invoice month should be detected from file name");
  assert(companyDetection.register === "Express", "company invoice register should be inferred from file name");
  assert(faceDetection.type === "face_recognition", "face workbook should be detected");
  assert(internalDetection.type === "internal_settlement", "internal settlement workbook should be detected");
});

test("normalizeInternalSettlementWorkbook parses the real May settlement workbook", () => {
  const internalFile = findFile(
    "May internal settlement workbook",
    (name) => name.includes("05-2026") && name.toLowerCase().endsWith(".xlsx")
  );
  const workbook = loadWorkbook(internalFile);
  const normalized = MonthlyClosingEngine.normalizeInternalSettlementWorkbook(workbook, XLSX);

  assert(normalized.express.length === 86, "Express sheet row count should match the sample workbook");
  assert(normalized.albwaba.length === 107, "Albwaba sheet row count should match the sample workbook");
  assert(normalized.fr3pl.length === 5, "FR 3PL row count should match the sample workbook");
  assert(normalized.vda.length === 5105, "VDA row count should match the sample workbook");
  assert(normalized.shortVda.length === 14, "Short VDA row count should match the sample workbook");
  assert(normalized.vdaReport.length === 204, "VDA_Report row count should match the sample workbook");
  assert(normalized.deliveryExperience.length === 193, "Delivery Experience row count should match the sample workbook");
  assert(normalized.transforms.length === 7, "all required internal settlement tabs should be tracked");
});

test("normalizeCompany invoice sheets parses the real Express May company invoice", () => {
  const companyFile = findFile(
    "Express May company invoice",
    (name) => name.startsWith("EXPRESS GATE Company ( Jeddah)#2026-05#") && name.toLowerCase().endsWith(".xlsx")
  );
  const workbook = loadWorkbook(companyFile);
  const partnerRows = sheetRows(workbook, workbook.SheetNames[0]);
  const courierRows = sheetRows(workbook, workbook.SheetNames[1]);
  const partners = MonthlyClosingEngine.normalizeCompanyPartnerInvoice(partnerRows);
  const couriers = MonthlyClosingEngine.normalizeCompanyCourierInvoice(courierRows);

  assert(partnerRows.length === 1, "partner invoice sample should contain one partner summary row");
  assert(courierRows.length === 90, "courier invoice sample should contain ninety rider rows");
  assert(partners.length === 1, "partner invoice normalization should keep the sample row");
  assert(couriers.length === 90, "courier invoice normalization should keep the sample riders");
  assert(couriers[0].register === "Express", "register should be inferred from company invoice partner name");
  assert(typeof couriers[0].deliveredOrders === "number", "courier delivered orders should be numeric");
});

test("normalizeFaceRecognitionWorkbook parses the real Express June face workbook", () => {
  const faceFile = findFile(
    "Express June face workbook",
    (name) => name.startsWith("EXPRESS GATE FR full data 30 Jun") && name.toLowerCase().endsWith(".xlsx")
  );
  const workbook = loadWorkbook(faceFile);
  const normalized = MonthlyClosingEngine.normalizeFaceRecognitionWorkbook(workbook, XLSX);

  assert(normalized.partnerSummary.length === 0, "partner summary sample should currently be empty in this workbook copy");
  assert(normalized.courierSummary.length === 71, "courier summary count should match the sample workbook");
  assert(normalized.dailyRows.length === 1965, "daily face rows should match the sample workbook");
  assert(normalized.courierSummary[0].riderId, "face normalization should keep rider ids");
  assert(normalized.dailyRows[0].dateKey, "face normalization should derive daily date keys");
});

test("normalizeCompanyDailyVdaRows parses the real Express daily VDA workbook", () => {
  const vdaFile = findFile(
    "Express June daily VDA workbook",
    (name) => name.startsWith("EXPRESS GATE Company ( Jeddah) (36)") && name.toLowerCase().endsWith(".xlsx")
  );
  const workbook = loadWorkbook(vdaFile);
  const rows = sheetRows(workbook, workbook.SheetNames[0]);
  const normalized = MonthlyClosingEngine.normalizeCompanyDailyVdaRows(rows);

  assert(rows.length === 1970, "raw VDA row count should match the workbook");
  assert(normalized.length === 1970, "normalized VDA row count should match the workbook");
  assert(normalized[0].register === "Express", "VDA register should be inferred from the workbook");
  assert(typeof normalized[0].deliveredTasks === "number", "delivered tasks should be numeric");
});

test("buildFinalMonthlySettlement carries work days and zeros invalid incentives", () => {
  const companyCouriers = [
    {
      register: "Express",
      riderId: "KT-1",
      partnerId: "P1",
      partnerName: "Express",
      city: "Jeddah",
      fullName: "Ahmed",
      iqama: "123",
      isValid: false,
      reason: "VDA",
      validDays: 4,
      onlineHours: 10,
      deliveredOrders: 100,
      deliveryDistance: 300,
      pricingPerOrder: 650,
      distanceSurcharge: 120,
      capacityIncentive: 80,
      deliveryExperienceIncentive: 50,
      vehicle: "Bike",
      experienceLevel: "B",
      estimatedBonusAmount: 50,
      deduction: 20,
      foodCompensation: 10,
    },
  ];

  const internal = {
    express: [],
    albwaba: [],
    fr3pl: [
      {
        register: "Express",
        riderId: "KT-1",
        iqama: "123",
        daysWorked: 20,
        loans: 30,
        violations: 40,
        vehicleType: "bike",
        phone: "050",
        replacementType: "",
      },
    ],
    vdaReport: [],
    shortVda: [],
    deliveryExperience: [],
  };

  const comparison = MonthlyClosingEngine.matchCompanyVsInternal(companyCouriers, []);
  const settlement = MonthlyClosingEngine.buildFinalMonthlySettlement({
    city: "Jeddah",
    month: "2026-05",
    monthDays: 31,
    companyCouriers,
    internal,
    comparison,
  });

  const row = settlement.rows[0];
  assert(settlement.summary.total === 1, "synthetic settlement should produce one row");
  assert(valueAt(row, 15) === 20, "settlement rows should expose days worked for the salary bridge");
  assert(valueAt(row, 23) === 0, "invalid riders should not receive capacity incentive");
  assert(valueAt(row, 24) === 0, "invalid riders should not receive delivery experience incentive");
});

test("real Express monthly comparison produces settlement rows with work days", () => {
  const companyFile = findFile(
    "Express May company invoice",
    (name) => name.startsWith("EXPRESS GATE Company ( Jeddah)#2026-05#") && name.toLowerCase().endsWith(".xlsx")
  );
  const internalFile = findFile(
    "May internal settlement workbook",
    (name) => name.includes("05-2026") && name.toLowerCase().endsWith(".xlsx")
  );
  const companyWorkbook = loadWorkbook(companyFile);
  const internalWorkbook = loadWorkbook(internalFile);
  const companyCouriers = MonthlyClosingEngine.normalizeCompanyCourierInvoice(
    sheetRows(companyWorkbook, companyWorkbook.SheetNames[1])
  );
  const internal = MonthlyClosingEngine.normalizeInternalSettlementWorkbook(internalWorkbook, XLSX);
  const comparison = MonthlyClosingEngine.matchCompanyVsInternal(
    companyCouriers,
    internal.express.concat(internal.albwaba)
  );
  const settlement = MonthlyClosingEngine.buildFinalMonthlySettlement({
    city: "",
    month: "2026-05",
    monthDays: 31,
    companyCouriers,
    internal,
    comparison,
  });

  assert(comparison.summary.total === 90, "comparison should cover the full Express company invoice sample");
  assert(comparison.summary.matched > 0, "sample comparison should include at least one direct match");
  assert(comparison.summary.different > 0, "sample comparison should include at least one difference");
  assert(comparison.summary.missingInternal > 0, "sample comparison should include riders missing internally");
  assert(settlement.summary.total === 90, "real settlement should preserve all Express company invoice riders");
  assert(settlement.rows.every((row) => Number(valueAt(row, 15)) >= 0), "every settlement row should expose work days");
  assert(settlement.summary.totalNet > 0, "real settlement should compute a positive total net amount");
});

test("exportMonthlyReports and buildMonthlyArchive create the expected monthly bundle", () => {
  const context = {
    city: "Jeddah",
    month: "2026-05",
    status: "Matched",
    companyCouriers: [{ riderId: "KT-1", deliveredOrders: 10 }],
    comparison: { items: [{ riderId: "KT-1", fullName: "Ahmed", register: "Express", matchStatus: "matched", ordersDiff: 0, distanceDiff: 0, incentivesDiff: 0, grossDiff: 0, reasons: [] }], summary: { total: 1, matched: 1, different: 0, missingInternal: 0 } },
    settlement: { rows: [{ id: "KT-1", net: 100 }], summary: { total: 1, totalNet: 100 } },
    validationWarnings: [],
    internal: { express: [{ riderId: "KT-1" }], albwaba: [] },
  };

  const files = MonthlyClosingEngine.exportMonthlyReports(context);
  const archive = MonthlyClosingEngine.buildMonthlyArchive(context);

  assert(files.length === 4, "monthly exports should include four bundle files");
  assert(files.some((file) => file.fileName === "final_monthly_settlement.csv"), "settlement export should be present");
  assert(files.some((file) => file.fileName === "monthly_matching_report.csv"), "matching export should be present");
  assert(files.some((file) => file.fileName === "monthly_closing_summary.json"), "summary export should be present");
  assert(archive.root.indexOf("monthly_archive/2026-05/") === 0, "archive root should be month based");
  assert(archive.folders.length === 6, "archive structure should expose the expected folders");
});

const results = [];

for (const item of tests) {
  try {
    item.handler();
    results.push({ name: item.name, status: "passed" });
  } catch (error) {
    results.push({ name: item.name, status: "failed", error: error.message });
  }
}

const summary = {
  total: results.length,
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length,
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
