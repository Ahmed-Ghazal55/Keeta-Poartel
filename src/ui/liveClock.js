(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.LiveClock = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createLiveClockController(options) {
    options = options || {};
    var intervalMs = Number(options.intervalMs) || 1000;
    var nowProvider = typeof options.nowProvider === "function" ? options.nowProvider : function () {
      return new Date();
    };
    var onTick = typeof options.onTick === "function" ? options.onTick : function () {};
    var timerId = null;
    var lastDataUpdate = options.lastDataUpdate || "";

    function snapshot() {
      return {
        currentTime: formatClockStamp(nowProvider()),
        lastDataUpdate: lastDataUpdate || "-"
      };
    }

    function tick() {
      var next = snapshot();
      onTick(next);
      return next;
    }

    return {
      getSnapshot: snapshot,
      setLastDataUpdate: function (value) {
        lastDataUpdate = value || "";
        return tick();
      },
      start: function () {
        if (timerId) {
          return timerId;
        }
        tick();
        timerId = setInterval(tick, intervalMs);
        return timerId;
      },
      stop: function () {
        if (timerId) {
          clearInterval(timerId);
          timerId = null;
        }
      },
      tick: tick
    };
  }

  function formatClockStamp(dateLike) {
    var value = dateLike instanceof Date ? dateLike : new Date(dateLike);
    var hours24 = value.getHours();
    var meridiem = hours24 >= 12 ? "م" : "ص";
    var hours12 = hours24 % 12 || 12;
    return [
      value.getFullYear(),
      "-",
      pad(value.getMonth() + 1),
      "-",
      pad(value.getDate()),
      " ",
      pad(hours12),
      ":",
      pad(value.getMinutes()),
      ":",
      pad(value.getSeconds()),
      " ",
      meridiem
    ].join("");
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  return {
    createLiveClockController: createLiveClockController,
    formatClockStamp: formatClockStamp
  };
});
