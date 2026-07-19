# Prompt 8.5-B Normalizer Report

## Scope reviewed
- `src/import/importNormalizer.js`

## External Riders behavior
- Iqama normalization is enforced before identity resolution.
- Phone and app phone normalization are preserved through the lifecycle import path.
- IBAN is normalized and stored on the operational profile / external rider master.
- Timestamp parsing is supported and stored as normalized source timestamp.
- `Email Address` remains the actor/creator metadata field and is not treated as rider email.
- HR-first resolution is applied through `resolveRiderIdentity(...)`.
- If the iqama already exists in HR:
  - `externalRiders` is not created
  - `riderOperationalProfiles` is created/updated
  - warning emitted: `hr_rider_not_saved_as_external:<iqama>`
- If the iqama does not exist in HR:
  - `externalRiders` is created/updated
  - `riderOperationalProfiles` is created/updated
- Invalid or missing iqama values are surfaced through validator blocking instead of silently saving bad rows.

## Current Assignments behavior
- Register, city, and platform are normalized before persistence.
- `userId`, `ownerIqama`, and `actualRiderIqama` are normalized explicitly.
- Rider source is derived with HR-first resolution:
  - HR first
  - External second
  - Unknown only when neither master exists
- `operationMode` normalization now supports direct Arabic:
  - `راتب` -> `salary`
  - `بالطلب` -> `per_order`
  - `خارجي` -> `external`
  - `بديل` -> `replacement`
- `assignmentStatus` normalization now supports direct Arabic:
  - `نشط` -> `active`
  - `موقوف` -> `stopped`
  - `تبديل` -> `swapped`
  - `إقالة` / `اقالة` -> `dismissed`
- Assignment dates are parsed for:
  - `assignmentStartDate`
  - `riderReceiveDate`
  - `firstOnlineDate`
- Vehicle fields, supervisor, and notes are mapped into normalized assignment outputs.
- Current assignments output only approved lifecycle entities:
  - `assignments`
  - `riderOperationalProfiles`
  - `riderVehicleUsageHistory`

## Result
- Lifecycle imports no longer depend on legacy encoded Arabic-only normalization branches.
- The external/current-assignment normalizer contract now matches the 8.5-B lifecycle model.

## Verification
- `tests/externalRidersImport.test.js` passed.
- `tests/currentAssignmentsImport.test.js` passed.
- `tests/importValidator.test.js` passed.
