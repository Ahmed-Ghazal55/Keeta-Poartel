const assert = require("assert");
const DetailsDrawer = require("../src/ui/detailsDrawer.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("details drawer renders summary badges and sections", () => {
  const html = DetailsDrawer.renderDetailsDrawer({
    summary: {
      title: "1782916129257495",
      subtitle: "جدة / EXPRESS",
      badges: [
        { label: "Working", tone: "success" },
        { label: "Needs review", tone: "warning" }
      ]
    },
    sections: [
      {
        title: "بيانات اليوزر",
        fields: [
          { label: "User ID", value: "1782916129257495", ltr: true },
          { label: "المدينة", value: "جدة" }
        ]
      }
    ]
  });

  assert.ok(html.includes("ui-details-summary__title"));
  assert.ok(html.includes("ui-details-badge is-success"));
  assert.ok(html.includes("ui-detail-field__value is-ltr"));
  assert.ok(html.includes("بيانات اليوزر"));
}));

results.push(test("details drawer shows fallback for empty sections", () => {
  const html = DetailsDrawer.renderDetailsDrawer({
    sections: [{ title: "Warnings / Issues", contentHtml: "" }]
  });

  assert.ok(html.includes("Warnings / Issues"));
  assert.ok(html.includes("ui-details-empty"));
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
