# Prompt 8.5 Contract Completion Matrix

Date: 2026-07-15
Status scale:

- `Implemented`
- `Partially Implemented`
- `Documented Only`
- `Missing`
- `Blocked`

## Contract matrix

| Area | Status | What exists now | Main gaps |
|---|---|---|---|
| A) HR Master | Partially Implemented | HR workbook import, `hrProfiles`, rider normalization, HR tests, HR remains the current master identity source for sponsored riders | HR-first lookup is only helper-level for the new lifecycle design; external separation is not wired end-to-end in live services |
| B) External Riders Master | Documented Only | `LifecycleRegistry` defines the concept; `RiderIdentityResolver` describes HR-first then external fallback | No entity schema, no import type, no template, no normalizer, no repository contract, no tests |
| C) Rider Operational Profile | Documented Only | Helper ID builder exists in `RiderIdentityResolver`; lifecycle notes describe shared operational fields | No entity schema, no save pipeline, no UI/editor, no service ownership, no tests |
| D) Dashboard Users | Partially Implemented | Template exists; import works; first/last names import separately; `fullName` derived; snapshot delta detects new/missing/changed rows; status reviews created | No explicit `ready_for_assignment` lifecycle contract; no `lifecycleStatus` field; missing-user handling is review-oriented, not the full requested lifecycle model |
| E) Current Assignments | Partially Implemented | Assignment, swap, and termination services exist; assignment history exists; date fields `startDate`/`endDate` exist; `AssignmentPeriodResolver` helper exists | No template/import type; no owner-vs-actual rider schema split; no `operationMode`; no receive/first-online dates; resolver not wired into performance |
| F) Vehicle Usage History | Missing | Fleet module has vehicle movement events and fleet validation | No rider vehicle usage period entity, no open/close usage history, no date-range link for future deductions |
| G) Performance Pipeline | Partially Implemented | Daily, overall, VDA, face, delivery, validity entities exist; recalculation engine works; performance tests pass | Daily is not derived from overall; actual-rider attribution by date is not wired; `AssignmentPeriodResolver` is unused; vehicle usage by date is missing |
| H) Monthly Archive | Documented Only | Finance placeholders and `monthlyClosingBatches` exist; lifecycle registry mentions immutable archive concept | No `monthlyArchiveSnapshots` entity, no freeze contract, no current-vs-archive split implementation, no assignment/performance split snapshot logic |
| I) Page-scoped Import Routing | Partially Implemented | Page-level import buttons exist; Import Center preview/save flow exists; target entities are mutated only on save; lifecycle registry defines intended page routes | Lifecycle routes are not consumed by UI; page-owned imports mostly just forward to global import center; no dedicated external riders/current assignments page import workflows |

## Additional contract-specific notes

### HR Master

- Sponsored/company riders are handled today through the HR import path.
- The system is still missing the live cross-entity enforcement layer that would prevent future HR vs External duplication in the new 8.5 lifecycle.

### External Riders exact template contract

- Required exact external riders columns are not yet represented in the live template registry.
- `iqama` cannot function as a real external-rider master key yet because the target entity is absent.

### Dashboard Users exact contract

- Exact Prompt 8 dashboard columns exist in the current template.
- Lifecycle fields requested by 8.5 do not yet exist as first-class schema fields.

### Current Assignments exact contract

- Actual rider assignment exists operationally.
- Owner-vs-actual separation is not yet modeled at the data-contract level required by Prompt 8.5.

### Monthly archive

- Current finance and closing placeholders do not yet equal an immutable operational snapshot model.

## Overall contract verdict

- Fully implemented areas: none
- Strong partials: HR Master, Dashboard Users, Current Assignments, Performance Pipeline
- Documented but not wired: External Riders, Rider Operational Profile, Monthly Archive
- Missing: Rider Vehicle Usage History

Prompt 8.5 should be classified as `incomplete` and requires a targeted follow-up fix prompt before Prompt 8.6.
