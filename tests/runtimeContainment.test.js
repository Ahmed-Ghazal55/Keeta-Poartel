const assert = require("assert");
const {
  RUNTIME_WIDGET_IDS,
  dedupeRuntimeWidgets
} = require("../src/ui/runtimeContainment.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function createNode(id) {
  return {
    children: [],
    id,
    parentNode: null,
    appendChild(child) {
      if (!child) {
        return child;
      }
      if (child.parentNode) {
        child.parentNode.removeChild(child);
      }
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    contains(node) {
      if (!node) {
        return false;
      }
      if (node === this) {
        return true;
      }
      return this.children.some((child) => child.contains(node));
    },
    removeChild(child) {
      this.children = this.children.filter((item) => item !== child);
      if (child) {
        child.parentNode = null;
      }
      return child;
    }
  };
}

function createFakeDocument(map) {
  return {
    getElementById(id) {
      return map[id] && map[id][0] ? map[id][0] : null;
    },
    querySelectorAll(selector) {
      if (!selector || selector.charAt(0) !== "#") {
        return [];
      }
      return (map[selector.slice(1)] || []).slice();
    }
  };
}

const results = [];

results.push(test("moves runtime widgets into the dedicated topbar host when they exist elsewhere", () => {
  const host = createNode("appTopbarRuntime");
  const outsideParent = createNode("legacyHost");
  const runtimeStrip = createNode("topbarRuntimeStrip");
  outsideParent.appendChild(runtimeStrip);

  const doc = createFakeDocument({
    appTopbarRuntime: [host],
    topbarRuntimeStrip: [runtimeStrip]
  });

  const summary = dedupeRuntimeWidgets(doc);
  assert.strictEqual(summary.hostFound, true);
  assert.strictEqual(summary.movedCount, 1);
  assert.strictEqual(host.children[0], runtimeStrip);
}));

results.push(test("removes duplicate runtime widgets and keeps the in-host node", () => {
  const host = createNode("appTopbarRuntime");
  const outsideParent = createNode("legacyHost");
  const inHostUser = createNode("topbarCurrentUserChip");
  const duplicateUser = createNode("topbarCurrentUserChip");
  host.appendChild(inHostUser);
  outsideParent.appendChild(duplicateUser);

  const doc = createFakeDocument({
    appTopbarRuntime: [host],
    topbarCurrentUserChip: [inHostUser, duplicateUser]
  });

  const summary = dedupeRuntimeWidgets(doc);
  assert.strictEqual(summary.removedCount, 1);
  assert.strictEqual(host.children.length, 1);
  assert.strictEqual(host.children[0], inHostUser);
}));

results.push(test("runtime containment defaults cover the expected widget ids", () => {
  assert.ok(RUNTIME_WIDGET_IDS.indexOf("topbarRuntimeStrip") >= 0);
  assert.ok(RUNTIME_WIDGET_IDS.indexOf("topbarCurrentUserChip") >= 0);
  assert.ok(RUNTIME_WIDGET_IDS.indexOf("topbarStorageModeChip") >= 0);
  assert.ok(RUNTIME_WIDGET_IDS.indexOf("topbarNotificationHost") >= 0);
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
