# Prompt 8.10 KPI And Status Cleanup Report

## KPI sets preserved

- Dashboard Users KPI set preserved:
  - `إجمالي يوزرات الداشبورد`
  - `جديد`
  - `جاهز للتسكين`
  - `مسكن`
  - `قيد المراجعة`
  - `مرفوض`
  - `مقال / مختفي`
  - `يحتاج مراجعة`
- Current Assignments KPI set preserved:
  - `إجمالي التسكينات الحالية`
  - `نشط`
  - `يحتاج تسكين`
  - `بالطلب`
  - `راتب`
  - `خارجي`
  - `بديل`
  - `موقوف`
  - `تبديلات هذا الشهر`
  - `إقالات هذا الشهر`
  - `مركبة شركة`
  - `مركبة خاصة`

## Cleanup completed

- KPI labels were stabilized and kept non-duplicated across tabs.
- Dashboard KPI cards now derive from visible filtered dashboard rows.
- Current Assignments KPI cards now derive from visible filtered assignment rows.
- Non-dashboard/non-assignment special tabs no longer display misleading KPI groups.

## Status/color consistency

- `good`/green: active, ready, valid
- `warn`/yellow-orange: pending, review, warning
- `bad`/red: rejected, dismissed, blocking, critical
- `blue`/neutral: informational status such as platform/mode grouping

## Browser spot checks

- `dashboard_users`: KPI group visible and stable
- `needs_assignment`: KPI group visible and filtered to one seeded row in the isolated browser scenario
- `current_assignments`: KPI group visible and matched the filtered assignment state
