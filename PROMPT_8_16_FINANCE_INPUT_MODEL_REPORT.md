# Prompt 8.16 Finance Input Model Report

Date: 2026-08-05

`src/finance/financeInputStagingModel.js` is the canonical filename and delegates to the established browser-compatible model. The model defines all 15 requested families, eight supported staging/review states, scope/cycle, source evidence, dashboard/owner/actual-rider, assignment period, registered/actual vehicle, and explicit-import fields. Legacy family/status aliases normalize safely.

Every row is read-only/non-auditing, `amountPreviewAllowed=false`, `finalAmountCalculated=false`, and `calculatedAmount=null`. Staging runs disable auto-save, totals, settlement, payroll, reconciliation, and final close.

Source: repository inspection of `src/finance/financeInputModel.js` and `src/finance/financeInputStagingModel.js`; `tests/financeInputStagingModel.test.js`.
