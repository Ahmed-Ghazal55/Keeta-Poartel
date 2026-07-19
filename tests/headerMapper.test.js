const assert = require("assert");
const HeaderMapper = require("../src/import/headerMapper.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("maps user id aliases in English", () => {
  const mapped = HeaderMapper.mapHeaders(["User ID", "Full Name", "City"], ["userId"]);
  assert.strictEqual(mapped.byField.userId, "User ID");
}));

results.push(test("maps iqama aliases in Arabic", () => {
  const mapped = HeaderMapper.mapHeaders(["رقم بطاقة الهوية", "الاسم", "السجل"], ["iqama"]);
  assert.strictEqual(mapped.byField.iqama, "رقم بطاقة الهوية");
}));

results.push(test("maps city and register aliases", () => {
  const mapped = HeaderMapper.mapHeaders(["City", "Company", "Name"], ["city", "register"]);
  assert.strictEqual(mapped.byField.city, "City");
  assert.strictEqual(mapped.byField.register, "Company");
}));

results.push(test("supports mixed Arabic and English headers", () => {
  const mapped = HeaderMapper.mapHeaders(["معرّف السائق", "Mobile Number", "Vehicle Type"], ["userId", "phone", "vehicleType"]);
  assert.strictEqual(mapped.byField.userId, "معرّف السائق");
  assert.strictEqual(mapped.byField.phone, "Mobile Number");
  assert.strictEqual(mapped.byField.vehicleType, "Vehicle Type");
}));

results.push(test("findHeaderRow skips title rows and finds the actual header", () => {
  const matrix = [
    ["Face Recognition Summary - July (MTD: 1-30)", "", ""],
    ["Rider ID", "City", "Vehicle Type"],
    ["1782", "Jeddah", "Bike"],
  ];
  const found = HeaderMapper.findHeaderRow(matrix, { maxRows: 4 });
  assert.strictEqual(found.headerRowIndex, 1);
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
