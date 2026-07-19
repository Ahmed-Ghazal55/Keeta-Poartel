# CONDITIONAL_FORMAT_RULES_MAP

Last updated: 2026-07-10  
Scope: business meaning encoded in workbook conditional formatting

## 1. Core rule

In these workbooks, color is often business logic.

The portal must translate each meaningful conditional-format rule into one or more of:

- normalized status fields
- warning badges
- blocking validation issues
- operational queues
- threshold alerts

## 2. Operations workbook rules

### `VDA`

Observed direct rules:

- `COUNTIF(I:I,I1)>1`
- `COUNTIF(D:D,D1)>1`
- full-row states like:
  - `($A1="مقال")`
  - `($A1="مقيد هيئة النقل")`
  - `($A1="لا يعمل حاليا")`
  - `($A1="ايقاف - مطلوب الاقالة")`

Business meaning:

- duplicate identities or duplicated rider keys
- rider lifecycle state overrides VDA visibility and payout eligibility

Portal translation:

- duplicate-rider validation issue
- status badge
- disqualification / review warning

### `Per Order Mode`

Observed direct rules:

- duplicate checks on ID and linked fields
- status-driven row coloring by values like `شغال` and `مقيد بالايام`

Business meaning:

- this sheet behaves like an operational sub-register, not just an export

Portal translation:

- separate work-mode dimension
- same status filters used in main operations module

### `EXPRESS OPR` and `Albwaba OPR`

Observed direct rules:

- duplicate row keys
- full-row states:
  - `مقال`
  - `مقيد بالايام`
  - `مقيد هيئة النقل`

Business meaning:

- OPR status is operational truth for the user account, not a display-only note

Portal translation:

- account status entity
- duplicate-account blocker
- filter chips by status

## 3. HR and archive rules

### `ارشيف البوابه واكسبرس `

Observed evidence:

- `1728` conditional-format ranges
- examples include:
  - `"انتهت"`
  - `"قاربت على الانتهاء"`
  - contains `اجازه`
  - non-blank action highlighting

Business meaning:

- archive rows still carry active compliance logic
- expiry, leave, and action states remain relevant historically

Portal translation:

- historical HR status timeline
- expiry severity levels
- leave state
- archive filters by last-known operational/compliance state

### `HR شركة البوابة المقبله`

Observed direct rules:

- leave-dependent formatting such as `$U...="اجازه"`
- expiry-linked formatting such as `$M...="انتهت"`

Business meaning:

- HR row severity depends on both document validity and leave state

Portal translation:

- compliance badges
- leave state field
- action-priority queue

### `HR اكبريس جايت`

Observed direct rules:

- `"لا يوجد"` checks on linked values
- `$U2="اجازه"`
- `$M2="انتهت"`
- explicit cell state on expiry columns

Business meaning:

- missing linked data, leave, and expired documents are all actionable

Portal translation:

- missing-link warning
- leave badge
- expired-document alert

### `HR مؤسسة البوابة`

Observed direct rules:

- contains text `"لا"` on support columns
- contains text `"لم"` on issue fields
- contains text `"صغير"` on size/type notes
- duplicate identity checks

Business meaning:

- small but still rule-driven compliance dataset

Portal translation:

- same normalized issue vocabulary across all HR registers

### `مناديب لم تعمل`

Observed rule:

- duplicate detection only

Business meaning:

- generated queue of inactive riders should still be deduplicated before import

Portal translation:

- inactive rider pool with duplicate warning

### `رخص النقل`

Observed rule:

- duplicate detection on generated action queue

Business meaning:

- transport-license tasks are derived from HR filters and must remain traceable

Portal translation:

- task queue with source lineage to HR profile

## 4. Fleet rules

### `Operating Vehicles`

Observed direct rules:

- register-number coloring on ownership column
- `COUNTIF(F:F,F1)>1`
- `COUNTIF(E:E,E1)>1`

Business meaning:

- duplicate plate/serial/OPC issues
- company ownership classification by register number

Portal translation:

- duplicate-vehicle blocker
- ownership badge

### `Update Branches`

Observed direct rules:

- `$AD2="To be Submitted"`
- `COUNTIF(B:B,B1)>1`
- `COUNTIF(O:O,O1)>1`

Business meaning:

- submission workflow state
- duplicate vehicle or identity collisions in assignment review

Portal translation:

- fleet review queue:
  - needs_submission
  - duplicate_conflict
  - review_pending

### `Update VehicleS` and `VehicleS`

Observed direct rules:

- `$N1="تفريغ السعة"`
- `REGEXMATCH($L1, "اختلاط المدينة")`
- `$O1>1`
- city tags like `Jeddah` and `Riyad`

Business meaning:

- release-capacity action
- city mismatch
- occupancy pressure

Portal translation:

- fleet issue types:
  - `capacity_release_required`
  - `city_mismatch`
  - `over_occupancy`
  - `manual_review`

### `Branches`

Observed direct rules:

- `$Q1="مش تبع الشركة مطلوب التغيير"`
- `$M1="To be Submitted"`
- duplicate checks on IDs and Iqama
- contains text `Yearly`

Business meaning:

- account/register mismatch
- document/workflow state
- card/contract type cues

Portal translation:

- branch-compliance status
- submission state
- driver-card or contract-type badge

## 5. Shift workbook

`Keeta Shifts Scheduling Tool V1.2 (3-Shifts) - AD (2).xlsm` does not expose meaningful visible conditional-format rules in the analyzed sheet.

But formula outcomes still imply threshold states:

- insufficient total capacity
- mismatch between required and assigned combinations
- imbalance across shifts

Portal translation:

- scheduler warnings should be generated from computed metrics, not cell color

## 6. Implementation rule

For every conditional-format family, Prompt 2 and later should define:

1. source dataset
2. normalized rule code
3. severity
4. blocking or non-blocking behavior
5. target UI badge / queue / alert mapping

Without this step, the portal would lose critical operational meaning during import.
