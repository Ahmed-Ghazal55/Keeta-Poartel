(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../import/importTypes.js"), require("./riderNormalizer.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.HrValidator = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.HrRiderNormalizer
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, HrRiderNormalizer) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;

  function validateHrBundle(bundle, options) {
    options = options || {};
    var profiles = bundle.hrProfiles || bundle.rawProfiles || [];
    var platformAccounts = bundle.riderPlatformAccounts || bundle.platformAccountsRaw || [];
    var issues = [];
    var iqamaBySheet = {};
    var iqamaProfiles = {};
    var phoneToIqamas = {};
    var accountToIqamas = {};

    profiles.forEach(function (profile) {
      var iqama = HrRiderNormalizer.normalizeIqama(profile.iqama);
      var phone = HrRiderNormalizer.normalizePhone(profile.phone);
      var sheetKey = [profile.sourceSheet || "sheet", iqama].join("::");
      if (!iqama) {
        issues.push(issue("missing_iqama", "medium", "Profile is missing iqama.", profile));
      } else {
        iqamaBySheet[sheetKey] = (iqamaBySheet[sheetKey] || 0) + 1;
        iqamaProfiles[iqama] = iqamaProfiles[iqama] || [];
        iqamaProfiles[iqama].push(profile);
      }
      if (!normalizeText(profile.fullNameArabic || profile.fullNameEnglish)) {
        issues.push(issue("missing_name", "high", "Profile is missing rider name.", profile));
      }
      if (!phone) {
        issues.push(issue("missing_phone", "medium", "Profile is missing phone.", profile));
      } else if (phone.length < 12) {
        issues.push(issue("invalid_phone", "medium", "Phone number is not normalized to Saudi format.", profile));
      } else if (iqama) {
        phoneToIqamas[phone] = phoneToIqamas[phone] || [];
        if (phoneToIqamas[phone].indexOf(iqama) < 0) {
          phoneToIqamas[phone].push(iqama);
        }
      }
      if (!profile.city) {
        issues.push(issue("unknown_city", "medium", "City could not be normalized.", profile));
      }
      if (!profile.register) {
        issues.push(issue("unknown_register", "medium", "Register could not be normalized.", profile));
      }
      if (!profile.employmentType || profile.employmentType === "unknown") {
        issues.push(issue("employment_type_unknown", "low", "Employment type is unknown.", profile));
      }
      if (!profile.hrStatus || profile.hrStatus === "under_review") {
        issues.push(issue("status_unknown", "low", "HR status needs review.", profile));
      }
      if (looksExpired(profile.licenseExpiry) || /expired|انته/.test(normalizeText(profile.licenseType).toLowerCase())) {
        issues.push(issue("expired_license", "medium", "License appears expired or invalid.", profile));
      }
      if (looksExpired(profile.healthCardExpiry) || /expired|انته/.test(normalizeText(profile.healthCardExpiry).toLowerCase())) {
        issues.push(issue("expired_health_card", "medium", "Health card appears expired.", profile));
      }
    });

    Object.keys(iqamaBySheet).forEach(function (key) {
      if (iqamaBySheet[key] > 1) {
        issues.push(issue("duplicate_iqama_same_sheet", "high", "The same iqama appears more than once in the same sheet.", { sheetKey: key }));
      }
    });

    Object.keys(iqamaProfiles).forEach(function (iqama) {
      if (iqamaProfiles[iqama].length > 1) {
        issues.push(issue("duplicate_iqama_multiple_profiles", "medium", "The same iqama appears across multiple profiles.", { iqama: iqama }));
      }
    });

    Object.keys(phoneToIqamas).forEach(function (phone) {
      if ((phoneToIqamas[phone] || []).length > 1) {
        issues.push(issue("same_phone_multiple_iqamas", "high", "The same phone is linked to multiple iqamas.", { phone: phone }));
      }
    });

    platformAccounts.forEach(function (account) {
      var platform = normalizeText(account.platform).toLowerCase();
      var userId = normalizeText(account.userId || account.dashboardUserId);
      var iqama = HrRiderNormalizer.normalizeIqama(account.iqama);
      if (!platform || platform === "unknown") {
        issues.push(issue("unknown_platform", "medium", "Platform account could not be classified.", account));
      }
      if (userId && iqama) {
        var accountKey = [platform, userId].join("::");
        accountToIqamas[accountKey] = accountToIqamas[accountKey] || [];
        if (accountToIqamas[accountKey].indexOf(iqama) < 0) {
          accountToIqamas[accountKey].push(iqama);
        }
      }
    });

    Object.keys(accountToIqamas).forEach(function (key) {
      if ((accountToIqamas[key] || []).length > 1) {
        issues.push(issue("same_user_id_multiple_iqamas", "high", "One platform user ID is linked to multiple iqamas.", { accountKey: key }));
      }
    });

    if (options.mode === "save") {
      var validIdentityCount = profiles.filter(function (profile) {
        return HrRiderNormalizer.normalizeIqama(profile.iqama) || HrRiderNormalizer.normalizePhone(profile.phone);
      }).length;
      if (!validIdentityCount) {
        issues.push(issue("no_valid_identity_keys", "blocking", "Official HR import cannot be saved without at least one valid identity key.", {}));
      }
    }

    return {
      issues: issues,
      blockingIssues: issues.filter(function (item) { return item.severity === "blocking"; }),
      summary: summarizeIssues(issues)
    };
  }

  function looksExpired(value) {
    var text = normalizeText(value);
    if (!text) {
      return false;
    }
    if (/expired|منتهي|انتهت/.test(text.toLowerCase())) {
      return true;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return false;
    }
    return text < new Date().toISOString().slice(0, 10);
  }

  function issue(code, severity, message, meta) {
    return {
      code: code,
      severity: severity,
      message: message,
      meta: meta || {}
    };
  }

  function summarizeIssues(issues) {
    return (issues || []).reduce(function (memo, item) {
      memo.total += 1;
      memo[item.severity] = (memo[item.severity] || 0) + 1;
      return memo;
    }, { total: 0, blocking: 0, high: 0, medium: 0, low: 0, info: 0 });
  }

  return {
    validateHrBundle: validateHrBundle
  };
});
