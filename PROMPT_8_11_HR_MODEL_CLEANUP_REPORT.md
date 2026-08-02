# Prompt 8.11 HR Model Cleanup Report

Date: 2026-07-19

## Files
- `src/hr/hrViewModel.js`
- `src/ui/sidebarRouting.js`
- `src/runtime/verificationProfiles.js`

## Completed model cleanup
- Added canonical HR tabs:
  - `hr_master`
  - `active_hr_riders`
  - `inactive_hr_riders`
  - `documents`
  - `kafala_status`
  - `hr_archive`
- Added alias normalization for legacy or sidebar route keys
- Added HR filters for:
  - `register`
  - `city`
  - `employmentStatus`
  - `kafalaStatus`
  - `nationality`
  - `documentStatus`
  - `query`
- Added HR KPI helpers based on filtered rows
- Added focus helpers by `iqama` / person identity
- Preserved owner vs actual rider separation
- Preserved external-rider exclusion from HR master rows

## Important fixes preserved
- `"inactive"` is no longer misread as `"active"`
- Arabic kafala parsing keeps `على الكفالة` separate from `خارج الكفالة`

## Test proof
- `npm run test:hr` passed on 2026-07-19
- `tests/hrViewModelCleanup.test.js` passed

## Result
- HR model cleanup is complete for Prompt 8.11
