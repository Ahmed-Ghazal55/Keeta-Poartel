# Performance Engine Old Rules Map

Date: 2026-07-12

## Goal

Document which legacy settings still exist, how Prompt 7 reads them, and where fallback is applied.

## Legacy-to-Prompt-7 map

| Legacy source | Legacy purpose | Prompt 7 bridge | Current status |
| --- | --- | --- | --- |
| `keeta_operations_portal_logic.js` -> `Config.salary.validityDaysRequired` | Minimum valid days for salary logic | `buildFallbackRulesFromLegacyConfig()` -> `attendanceRules.minimumValidDays` and `salaryEligibilityRules.minimumValidDays` | Preserved and wrapped |
| `keeta_operations_portal_logic.js` -> `Config.salary.minimumOrders.car/bike` | Salary order thresholds | `buildFallbackRulesFromLegacyConfig()` -> `salaryEligibilityRules.minimumOrdersCar/Bike` | Preserved and wrapped |
| `keeta_operations_portal_logic.js` -> `Config.salary.experienceLevels` | Delivery experience incentive mapping | `buildFallbackRulesFromLegacyConfig()` -> `deliveryExperienceRules.legacyIncentiveByLevel` | Preserved and wrapped |
| `src/lib/faceVerificationEngine.js` | Legacy face pass-rate summary | `src/performance/faceVerificationAdapter.js` | Preserved and used as fallback summarizer |
| `src/lib/vdaEngine.js` | Legacy VDA validity evaluator | `src/performance/vdaAdapter.js` | Preserved and used when monthly-rule status is missing |
| `src/lib/deliveryExperienceEngine.js` | Legacy delivery ranking / incentive rows | `src/performance/deliveryExperienceAdapter.js` | Preserved and used when row selection must fall back |

## Fallback behavior

- No active matching rule:
  - `resolvePerformanceRules()` returns `legacy_fallback`.
  - `fallbackUsed = true`
  - `fallbackParts = ["all"]`

- Partial active rule:
  - Missing sections are filled from the fallback rule.
  - Example: if `deliveryExperienceRules` are missing, only that section falls back while the rest uses the active monthly rule.

## Explicitly preserved legacy behavior

- Hard-coded legacy engines were not removed.
- Prompt 7 only added adapters and wrappers around them.
- `npm run test` and `npm run test:all` confirm V4 / V6 / V9 continued to pass after integration.
