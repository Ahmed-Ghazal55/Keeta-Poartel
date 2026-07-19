(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./monthlyRulesDefaults.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.MonthlyRulesVersioning = factory(
    root.KeetaPortal.MonthlyRulesDefaults
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (MonthlyRulesDefaults) {
  "use strict";

  var clone = MonthlyRulesDefaults.clone;

  function compareRuleVersions(oldRules, newRules) {
    var changes = [];
    compareNode("", oldRules || {}, newRules || {}, changes);
    return {
      changeCount: changes.length,
      changedPaths: changes.map(function (item) { return item.path; }),
      changes: changes,
      previousVersionId: newRules && newRules.previousVersionId ? newRules.previousVersionId : ""
    };
  }

  function computeNextVersion(rule) {
    return Math.max(1, Number(rule && rule.version) || 0) + 1;
  }

  function compareNode(path, left, right, changes) {
    if (isPrimitive(left) && isPrimitive(right)) {
      if (!sameValue(left, right)) {
        changes.push({
          path: path || "root",
          before: left,
          after: right
        });
      }
      return;
    }

    if (Array.isArray(left) || Array.isArray(right)) {
      var leftSerialized = JSON.stringify(left == null ? [] : left);
      var rightSerialized = JSON.stringify(right == null ? [] : right);
      if (leftSerialized !== rightSerialized) {
        changes.push({
          path: path || "root",
          before: clone(left == null ? [] : left),
          after: clone(right == null ? [] : right)
        });
      }
      return;
    }

    var keys = uniqueKeys(left, right);
    keys.forEach(function (key) {
      compareNode(path ? path + "." + key : key, left ? left[key] : undefined, right ? right[key] : undefined, changes);
    });
  }

  function uniqueKeys(left, right) {
    var seen = {};
    return Object.keys(left || {}).concat(Object.keys(right || {})).filter(function (key) {
      if (seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    }).sort();
  }

  function isPrimitive(value) {
    return value == null || typeof value !== "object";
  }

  function sameValue(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  return {
    compareRuleVersions: compareRuleVersions,
    computeNextVersion: computeNextVersion
  };
});
