# Prompt 8.10-B Action Set Report

## Verified row

- Current Assignments row:
  - `dashboardUserId = 1782916129257495`

## Browser-visible dropdown result

- The dropdown opened visibly from the real row action trigger.
- Verified internal action ids present in the visible menu model:
  - `linked-dashboard-user`
  - `linked-current-assignment`
  - `details`
  - `assign`
  - `swap`
  - `stop`
  - `terminate`
  - `history`
  - `actual-rider-details`
  - `owner-details`
  - `resolver`
  - `source-batch`
  - `copy`
  - `rider-archive`

## Required functional mapping

- `details` = `عرض التفاصيل`
- `assign` = `تسكين لأول مرة`
- `swap` = `تبديل مندوب`
- `stop` = `إيقاف بدون بديل`
- `terminate` = `إقالة اليوزر`
- `history` = `عرض سجل الحركة`
- `actual-rider-details` = `عرض المندوب الفعلي`
- `owner-details` = `عرض صاحب اليوزر`
- `resolver` = `فتح Resolver`
- `source-batch` = `فتح Import Source Batch`

## Read-only safety

- Opening the dropdown is non-auditing.
- Opening detail/linked read-only actions is non-auditing.
- Notification-linked focus and import routing are non-auditing.

## Mutation-path safety

- Assign/swap/termination actions still rely on service-layer workflows.
- No direct UI mutation path replaced those services.
