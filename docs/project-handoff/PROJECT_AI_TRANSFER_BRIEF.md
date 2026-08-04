# AI Transfer Brief

## One-paragraph project summary

Keeta Operations Portal is a local Vanilla-JavaScript ERP-like logistics prototype that preserves register/city/platform/month scope and separates platform account, owner, actual dated rider, HR/external source, registered vehicle, and actual used vehicle across Operations, Import, Performance/Validity, Archive, Closing Preparation, and Finance Input Staging.

## Current status

Prompt 8.16 finance staging and the standing handoff package are implemented; verification/publish status must be read from `PROMPT_8_16_FINAL_REPORT.md`.

## Latest completed prompt

Prompt 8.16 — Settlement / Finance Input Staging Foundation.

## Current prompt

Prompt 8.16 closeout/context handoff.

## Next prompt after this

Prompt 8.17 — Payroll / Rider Settlement Preview Foundation.

## Non-negotiable rules

Do not mix scope. Do not substitute owner for actual rider. Keep HR/external explicit. Vehicle serial is primary; keep registered/actual vehicles separate. Read-only navigation must not audit. Never expose private data. Do not calculate final money unless a later prompt explicitly authorizes it.

## Current tech stack

Vanilla JavaScript/HTML; `keeta_operations_portal_starter_v4.html`; Vite 4173; Node dev API `server/devServer.js` on 4174; browser-local/API JSON storage. React/Next/Nest/PostgreSQL are not current.

## Key source files/directories

`src/operations/`, `src/hr/`, `src/riders/`, `src/fleet/`, `src/import/`, `src/performance/`, `src/archive/`, `src/monthlyClosing/`, `src/finance/`, `src/audit/`, `src/runtime/`, `server/`, `tests/`, `README.md`.

## How to run

Run `npm run dev:api` and `npm run dev:ui`, then open the README demo URL. Run `npm run test:all` before handoff.

## What not to do

Do not start Prompt 9, final payroll/settlement, final invoice reconciliation, VAT/ZATCA, final close, production migration/auth/deployment, destructive cleanup, or broad shell redesign without explicit scope.

## What to review first

Read this file, `PROJECT_FULL_CONTEXT_HANDOFF.md`, the latest final/test/browser/publish reports, `README.md`, then the affected source modules and tests.

## How to decide the next prompt

Proceed to 8.17 only when the current final report records green focused/full tests, browser normal/safe proof, zero read-only audits/errors/overflow, safe import placeholders, and successful publish or documented manual action.

Source: `PROMPT_8_16_FINAL_REPORT.md`; `README.md`; the other files in this handoff directory.
