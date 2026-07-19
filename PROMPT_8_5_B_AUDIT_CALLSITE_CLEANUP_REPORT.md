# Prompt 8.5-B Audit Callsite Cleanup Report

## Scope reviewed
- `keeta_operations_portal_ui_redesign.js`
- `src/audit/auditPolicy.js`

## Legacy UI-only audit callsites still present
- `open_import_center`
- `export_report`
- `open_archive`
- `import_file`
- mock edit/save audit helpers in the operations shell

## Decision taken
- These callsites were not removed in this continuation run.
- They were left in place because Prompt 8.5-B required continuity/safety, not broad UI surgery.
- Current behavior is protected by audit policy rather than by deleting shared UI hooks mid-shell.

## Why this is acceptable right now
- `src/audit/auditPolicy.js` allows only approved business event types.
- Forbidden source patterns block UI/read-only/runtime sources such as:
  - render
  - route
  - search
  - filter
  - notification
  - topbar
  - runtime
  - browser verification
- During browser verification:
  - opening Import Center did not increase visible operations-log count
  - navigation back and forth did not increase visible operations-log count
  - the operations shell still reported `سجل العمليات 0`

## Result
- Audit flood protection remains intact.
- No functional evidence was found that these legacy UI callsites are creating phantom audit rows under the current policy.

## Recommended next handling
- Keep these UI-only calls policy-blocked until the Prompt 8.6 shell cleanup pass, where they can be removed in a safer focused UI hardening step.
