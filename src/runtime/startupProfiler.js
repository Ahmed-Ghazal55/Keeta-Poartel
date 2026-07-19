(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.StartupProfiler = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createStartupProfiler(options) {
    options = options || {};
    var nowProvider = typeof options.nowProvider === "function"
      ? options.nowProvider
      : resolveNowProvider();
    var warnHandler = typeof options.warnHandler === "function"
      ? options.warnHandler
      : defaultWarnHandler;
    var state = {
      events: [],
      totalStartedAt: nowProvider()
    };

    function record(name, durationMs, meta) {
      var event = buildEvent(name, durationMs, meta || {});
      state.events.push(event);
      if (event.level !== "normal") {
        warnHandler(event);
      }
      return event;
    }

    function step(name, handler, meta) {
      var startedAt = nowProvider();
      try {
        var result = handler();
        if (result && typeof result.then === "function") {
          return result.then(function (value) {
            record(name, nowProvider() - startedAt, meta);
            return value;
          }).catch(function (error) {
            record(name, nowProvider() - startedAt, mergeObjects({}, meta || {}, {
              failed: true,
              message: error && error.message ? error.message : "step_failed"
            }));
            throw error;
          });
        }
        record(name, nowProvider() - startedAt, meta);
        return result;
      } catch (error) {
        record(name, nowProvider() - startedAt, mergeObjects({}, meta || {}, {
          failed: true,
          message: error && error.message ? error.message : "step_failed"
        }));
        throw error;
      }
    }

    function finalize(meta) {
      var totalMs = nowProvider() - state.totalStartedAt;
      record("startup.total", totalMs, mergeObjects({ phase: "total" }, meta || {}));
      return getSummary();
    }

    function getSummary() {
      return {
        blocking: state.events.filter(function (item) { return item.level === "blocking"; }).length,
        events: state.events.slice(),
        heavy: state.events.filter(function (item) { return item.level === "heavy"; }).length,
        long: state.events.filter(function (item) { return item.level === "long"; }).length,
        total: state.events.length
      };
    }

    return {
      finalize: finalize,
      getSummary: getSummary,
      record: record,
      step: step
    };
  }

  function buildEvent(name, durationMs, meta) {
    durationMs = Number(durationMs) || 0;
    return mergeObjects({
      durationMs: Number(durationMs.toFixed(2)),
      level: resolveLevel(durationMs),
      name: name || "unknown",
      recordedAt: new Date().toISOString()
    }, meta || {});
  }

  function resolveLevel(durationMs) {
    if (durationMs >= 1000) {
      return "blocking";
    }
    if (durationMs >= 200) {
      return "heavy";
    }
    if (durationMs >= 50) {
      return "long";
    }
    return "normal";
  }

  function resolveNowProvider() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return function () {
        return performance.now();
      };
    }
    return function () {
      return Date.now();
    };
  }

  function defaultWarnHandler(event) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("[KeetaStartupProfiler]", event.level, event.name, event.durationMs + "ms");
    }
  }

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  return {
    createStartupProfiler: createStartupProfiler,
    resolveLevel: resolveLevel
  };
});
