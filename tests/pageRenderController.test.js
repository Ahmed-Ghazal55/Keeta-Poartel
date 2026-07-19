const assert = require("assert");
const { createPageRenderController } = require("../src/ui/pageRenderController.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function createFakeWindow() {
  const timers = [];
  return {
    clearTimeout(id) {
      if (timers[id - 1]) {
        timers[id - 1].cleared = true;
      }
    },
    getTimers() {
      return timers.slice();
    },
    setTimeout(callback, delay) {
      timers.push({ callback, cleared: false, delay });
      return timers.length;
    }
  };
}

function createFakeDocument(activeLookup) {
  return {
    getElementById(id) {
      if (!Object.prototype.hasOwnProperty.call(activeLookup, id)) {
        return null;
      }
      return {
        classList: {
          contains(className) {
            return className === "active" ? !!activeLookup[id] : false;
          }
        },
        id
      };
    }
  };
}

const results = [];

results.push(test("renders only when one of the tracked pages is active", () => {
  const windowObject = createFakeWindow();
  const activeLookup = { "page-operations-shell": false };
  const documentObject = createFakeDocument(activeLookup);
  let renderCount = 0;
  const controller = createPageRenderController({
    debounceMs: 25,
    documentObject,
    onRender() {
      renderCount += 1;
    },
    pageId: "operations-shell",
    windowObject
  });

  controller.requestRender({ reason: "init" });
  windowObject.getTimers()[0].callback();
  assert.strictEqual(renderCount, 0);
  assert.strictEqual(controller.isDirty(), true);

  activeLookup["page-operations-shell"] = true;
  assert.strictEqual(controller.flush(), true);
  assert.strictEqual(renderCount, 1);
  assert.strictEqual(controller.isDirty(), false);
}));

results.push(test("collapses repeated render requests into the latest scheduled timer", () => {
  const windowObject = createFakeWindow();
  const documentObject = createFakeDocument({ "page-fleet-shell": true });
  let renderCount = 0;
  const controller = createPageRenderController({
    debounceMs: 50,
    documentObject,
    onRender() {
      renderCount += 1;
    },
    pageId: "fleet-shell",
    windowObject
  });

  controller.requestRender({ reason: "search-a" });
  controller.requestRender({ reason: "search-b" });
  const timers = windowObject.getTimers();
  assert.strictEqual(timers.length, 2);
  assert.strictEqual(timers[0].cleared, true);
  assert.strictEqual(timers[1].delay, 50);

  timers[1].callback();
  assert.strictEqual(renderCount, 1);
}));

results.push(test("normalizes page ids with and without the page- prefix", () => {
  const windowObject = createFakeWindow();
  const documentObject = createFakeDocument({
    "page-archive-shell": true,
    "page-hr-shell": false
  });
  let lastPageId = "";
  const controller = createPageRenderController({
    debounceMs: 0,
    documentObject,
    onRender(meta) {
      lastPageId = meta.activePageId;
    },
    pageIds: ["archive-shell", "page-hr-shell"],
    windowObject
  });

  controller.requestRender({ immediate: true, reason: "route" });
  assert.strictEqual(lastPageId, "page-archive-shell");
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
