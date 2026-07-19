# Face / VDA / Delivery Rules Integration

Date: 2026-07-12

## Adapter files

- `src/performance/faceVerificationAdapter.js`
- `src/performance/vdaAdapter.js`
- `src/performance/deliveryExperienceAdapter.js`

## Face verification integration

- Uses `getFaceVerificationPolicy(rules)`.
- Supports active monthly-rule thresholds.
- Falls back to legacy face summarization when needed.
- Returns:
  - `status`
  - `passRate`
  - `passRateRequired`
  - `projectedPassRate`
  - `policy`
  - `reasons`

## VDA integration

- Uses `getVdaPolicy(rules)`.
- Accepts direct normalized statuses from imported monthly data.
- Falls back to legacy `VdaEngine.evaluateRiderVda(...)` if a normalized status is missing.
- Returns:
  - `status`
  - `normalizedStatus`
  - `affectsValidity`
  - `affectsSalaryEligibility`
  - `policy`
  - `reasons`

## Delivery experience integration

- Uses `getDeliveryExperiencePolicy(rules)`.
- Selects the rider/user row for the month.
- Applies monthly-rule `gradeScores` before imported `estimatedBonusAmount`.
- Falls back to legacy incentive maps if rule scores are absent.
- Returns:
  - `status`
  - `level`
  - `incentive`
  - `affectsIncentive`
  - `policy`
  - `reasons`

## Eligibility effects

- Face failure blocks salary eligibility.
- Invalid VDA can block salary eligibility and overall validity.
- Delivery experience failure can block incentive eligibility.

These behaviors are covered in `monthlyValidityEngine.test.js` plus adapter-specific tests.
