# Prompt 2 UI Smoke Review

Date: 2026-07-10
Target: `http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html`
Method: in-app browser smoke verification on the current local workspace build

## Result

Status: PASS with one implementation issue discovered during smoke, fixed in the same Prompt 2 pass.

## Checks Performed

1. Page load
- The page opened successfully at `http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html`.
- Title resolved to `Al Bawaba Al Muqbilah Operations Portal`.
- No fresh console `error` or `warn` entries were present during the smoke run.

2. CSS and JS load
- The redesigned top header rendered correctly.
- The sidebar modules rendered correctly.
- Prompt 2 browser runtime loaded and exposed current user state in the header.

3. Header and organization selector
- Header displayed current organization context and current user.
- The global organization selector opened as a modal.
- The modal displayed the expected hierarchy: city -> register/dashboard -> work mode.
- The current selection summary updated in the header after user-scope changes.

4. Settings shell
- `Dev Login` card rendered.
- `Audit Log` card rendered.
- Data layer summary panel rendered.

5. RBAC smoke: `ops.jeddah`
- Switched dev user through the UI to `ops.jeddah`.
- Header changed to `مشرف عمليات جدة`.
- Topbar import/export buttons became disabled, as expected for `city_supervisor`.
- Organization scope clamped to `جدة` plus the allowed registers.
- Organization selector visually marked out-of-scope options as disabled.
- Operations workbench showed only `جدة` rows on `Express` and `Albwaba`.
- The row action `تعديل بيانات المندوب الحالي` was disabled because `hr.edit` is not granted to `city_supervisor`.

6. RBAC smoke: `viewer.demo`
- Switched dev user through the UI to `viewer.demo`.
- Header changed to `مستخدم عرض فقط`.
- Header organization summary narrowed to `جدة` + `EXPRESS`.
- Operations workbench showed only `جدة` + `Express` rows.
- Viewer action restrictions were confirmed in the row action menu:
  - disabled: `تعديل بيانات اليوزر`
  - disabled: `تعديل بيانات المندوب الحالي`
  - disabled: `تسكين مندوب`
  - disabled: `تبديل مندوب`
  - disabled: `إيقاف بدون بديل`
  - disabled: `نقل إلى الإقالات`
  - disabled: `سجل العمليات`

7. Topbar import/export buttons
- Switched back to `super.admin`.
- `استيراد ملف` opened `Import Center` without console errors.
- `تصدير` switched to `Reports` and triggered quick export without console errors.

8. Legacy page availability
- `Validation` page opened successfully.
- `VDA` page opened successfully.
- No fresh console errors were introduced while opening these pages.

## Issue Found During Smoke

Issue:
- Scoped users such as `ops.jeddah` initially saw zero operations rows.

Root cause:
- RBAC user register scope used register codes such as `EXPRESS`, while sample operations rows used display labels such as `Express`.
- The row-scope filter compared codes against labels directly.

Fix applied:
- Added optional `registerMatcher` support to `src/auth/rbac.js`.
- Wired `keeta_operations_portal_ui_redesign.js` to map scoped register codes to UI register labels during row filtering.
- Added an RBAC regression test for code/label alias matching.

## Final Smoke Conclusion

Prompt 2 UI foundation is stable enough to proceed.

Confirmed:
- current page loads correctly
- Prompt 2 runtime is active
- Dev Login works
- RBAC header/page behavior works
- organization scope is enforced in the UI
- topbar actions do not introduce console errors
- legacy pages still open

Not covered in this smoke:
- real production authentication
- real server-backed import workflow
- production-grade API security
