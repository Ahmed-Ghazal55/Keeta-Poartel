# Dashboard Users Row Actions Report

## Dropdown actions implemented
- `عرض التفاصيل`
- `تسكين لأول مرة`
- `تبديل مندوب`
- `إيقاف بدون بديل`
- `إقالة اليوزر`
- `عرض سجل الحركة`
- `عرض المندوب الفعلي`
- `عرض صاحب اليوزر`
- `فتح Resolver`
- `فتح Import Source Batch`
- `نسخ User ID`
- `أرشيف المندوب`

## Read-only guarantees
- Opening the dropdown does not create audit rows.
- Opening details/history/owner/rider/resolver/source-batch drawers does not create audit rows.
- Read-only actions are routed inside UI handlers only.

## Mutation guarantees
- Assignment still routes through `assignmentService.assignRider(...)`.
- Swap still routes through `swapService.swapRider(...)`.
- Stop/terminate still route through `terminationService.terminateUser(...)`.
- Confirmed business mutations remain service-layer audited rather than UI-audited.

## Browser verification
- The first row dropdown opened successfully.
- Visible item labels matched the Prompt 8.7 contract.
- During the same read-only browser session, the Operations tab badge remained:
  - `سجل العمليات 0`

## Supporting tests
- `tests/dashboardUserRowActions.test.js`
- `tests/dashboardUsersAuditSafety.test.js`
