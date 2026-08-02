# Prompt 8.10-B Notification Route Regression Report

## Verification date

- 2026-07-19

## Panel proof

- Notification panel opened in normal mode.
- A screenshot was captured with live notification items visible.
- Artifact:
  - `artifacts/prompt-8-10-b/prompt-8-10-b-notification-regression.png`

## Dashboard Users notification

- Clicked notification:
  - `dashboard_issue_1782999000333001_new_user_needs_assignment`
- Result:
  - active page: `page-operations-shell`
  - active subpage: `needs_assignment`
  - city filter: `جدة`
  - register filter: `ALBAWABA`
  - readiness filter: `ready_for_assignment`
  - query: `1782999000333001 2444000033`
  - highlighted row present for `1782999000333001`

## Current Assignments notification

- Clicked notification:
  - `assignment_issue_1782916129257495_assignment_duplicate_active_rider`
- Result:
  - active page: `page-operations-shell`
  - active subpage: `current_assignments`
  - city filter: `جدة`
  - register filter: `EXPRESS`
  - query: `1782916129257495 2444000011 JED-CAR-1001 assignment_seed_1`
  - highlighted current-assignment row present

## Import Center notification

- Clicked notification:
  - `import_warning_batch_prompt_8_10_b_dashboard_1`
- Result:
  - active page: `page-import-center`
  - focused import history row:
    - `batch_prompt_8_10_b_dashboard_1`

## Audit safety follow-up

- After the read-only notification route proof, Operations `audit_log` was opened from sidebar route `OP8`.
- Result:
  - active page: `page-operations-shell`
  - active subpage: `audit_log`
  - empty audit state message was visible:
    - `لا توجد سجلات Audit ضمن الفلترة الحالية.`
- This confirms the browser proof paths did not generate phantom audit entries.

## Console result

- Normal mode console errors observed through browser dev logs:
  - none
