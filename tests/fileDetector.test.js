const assert = require("assert");
const fs = require("fs");
const path = require("path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { readDelimitedText } = require("../src/import/csvReader.js");
const { detectFile } = require("../src/import/fileDetector.js");
const { readWorkbook } = require("../src/import/workbookReader.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function findFile(rootDir, predicate) {
  return fs.readdirSync(rootDir)
    .map((name) => path.join(rootDir, name))
    .filter((fullPath) => fs.statSync(fullPath).isFile())
    .find((fullPath) => predicate(path.basename(fullPath)));
}

function analyzeWorkbook(filePath) {
  const workbook = XLSX.read(fs.readFileSync(filePath), { type: "buffer", cellFormula: true });
  const summary = readWorkbook(workbook, {
    extension: path.extname(filePath),
    fileName: path.basename(filePath),
  });
  return detectFile({
    extension: path.extname(filePath),
    fileName: path.basename(filePath),
    rowCount: summary.totalRowCount,
    workbookSummary: summary,
  });
}

function analyzeCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const tableSummary = readDelimitedText(path.basename(filePath), text, {});
  return detectFile({
    extension: path.extname(filePath),
    fileName: path.basename(filePath),
    rowCount: tableSummary.rowCount,
    tableSummary,
  });
}

const monthlyMayDir = path.join(__dirname, "..", "data", "raw", "monthly_closing", "jeddah", "2026-05");
const monthlyJuneDir = path.join(__dirname, "..", "data", "raw", "monthly_closing", "jeddah", "2026-06");
const operationsJulyDir = path.join(__dirname, "..", "data", "raw", "operations", "jeddah", "2026-07");
const vehiclesDir = path.join(__dirname, "..", "data", "raw", "vehicles");

const expressCompanyInvoice = findFile(monthlyMayDir, (name) => name.startsWith("EXPRESS GATE Company ( Jeddah)#2026-05#"));
const internalSettlement = findFile(monthlyMayDir, (name) => name.includes("05-2026"));
const vdaCsv = findFile(operationsJulyDir, (name) => name.includes(" - VDA.csv"));
const vehicleWorkbook = findFile(vehiclesDir, (name) => name === "Updata_Vehicles (5).xlsx");
const albwabaVdaWorkbook = findFile(monthlyJuneDir, (name) => name.startsWith("Albwaba almoqbla Company ( Jedd"));

const results = [];

results.push(test("detects real company invoice workbook from sheet names", () => {
  const detected = analyzeWorkbook(expressCompanyInvoice);
  assert.strictEqual(detected.type, "company_invoice_workbook");
  assert.ok(detected.confidence >= 0.85, "company invoice confidence should be high");
  assert.strictEqual(detected.detectedCity, "جدة");
  assert.strictEqual(detected.detectedRegister, "EXPRESS");
}));

results.push(test("detects real internal settlement workbook", () => {
  const detected = analyzeWorkbook(internalSettlement);
  assert.strictEqual(detected.type, "internal_settlement_workbook");
  assert.ok(detected.confidence >= 0.85, "internal settlement confidence should be high");
  assert.strictEqual(detected.detectedMonth, "2026-05");
}));

results.push(test("detects real vehicle workbook", () => {
  const detected = analyzeWorkbook(vehicleWorkbook);
  assert.strictEqual(detected.type, "vehicle_workbook");
  assert.ok(detected.confidence >= 0.75, "vehicle workbook confidence should be usable");
}));

results.push(test("detects HR workbook from real header patterns", () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["الرقم الوظيفى", "رقم الهوية", "الاسم", "تاريخ التعين", "اسم السجل", "حالة الكفالة"],
    ["1001", "2451115800", "Hamza", "2026-01-01", "EXPRESS GATE Company", "Active"],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "HR Express");
  const summary = readWorkbook(workbook, { extension: ".xlsx", fileName: "HR_Riyadh.xlsx" });
  const detected = detectFile({
    extension: ".xlsx",
    fileName: "HR_Riyadh.xlsx",
    rowCount: summary.totalRowCount,
    workbookSummary: summary,
  });
  assert.strictEqual(detected.type, "hr_master_workbook");
  assert.strictEqual(detected.detectedCity, "الرياض");
}));

results.push(test("detects real VDA csv", () => {
  const detected = analyzeCsv(vdaCsv);
  assert.strictEqual(detected.type, "vda_csv");
  assert.ok(detected.confidence >= 0.60, "VDA csv confidence should be at least review level");
}));

results.push(test("detects Albwaba register from real workbook", () => {
  const detected = analyzeWorkbook(albwabaVdaWorkbook);
  assert.strictEqual(detected.detectedRegister, "ALBAWABA");
}));

results.push(test("unknown files stay below confidence threshold", () => {
  const tableSummary = readDelimitedText("mystery.csv", "A,B,C\n1,2,3\n4,5,6", {});
  const detected = detectFile({
    extension: ".csv",
    fileName: "mystery.csv",
    rowCount: tableSummary.rowCount,
    tableSummary,
  });
  assert.strictEqual(detected.type, "unknown");
  assert.ok(detected.confidence < 0.60, "unknown file confidence should stay low");
}));

const summary = {
  total: results.length,
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length,
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
