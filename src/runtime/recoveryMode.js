(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.RecoveryMode = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createRecoveryController(options) {
    options = options || {};
    var timeoutMs = Number(options.timeoutMs) || 5000;
    var onTrigger = typeof options.onTrigger === "function" ? options.onTrigger : function () {};
    var setTimeoutImpl = options.setTimeoutImpl || (typeof window !== "undefined" ? window.setTimeout.bind(window) : setTimeout);
    var clearTimeoutImpl = options.clearTimeoutImpl || (typeof window !== "undefined" ? window.clearTimeout.bind(window) : clearTimeout);
    var timerId = null;
    var triggered = false;

    function arm() {
      disarm();
      triggered = false;
      timerId = setTimeoutImpl(function () {
        triggered = true;
        onTrigger({
          message: "startup_slow",
          timeoutMs: timeoutMs
        });
      }, timeoutMs);
    }

    function disarm() {
      if (timerId != null) {
        clearTimeoutImpl(timerId);
        timerId = null;
      }
    }

    return {
      arm: arm,
      disarm: disarm,
      hasTriggered: function () {
        return triggered;
      }
    };
  }

  function shouldTriggerRecovery(elapsedMs, timeoutMs) {
    return Number(elapsedMs) >= Number(timeoutMs || 5000);
  }

  return {
    createRecoveryController: createRecoveryController,
    shouldTriggerRecovery: shouldTriggerRecovery
  };
});
