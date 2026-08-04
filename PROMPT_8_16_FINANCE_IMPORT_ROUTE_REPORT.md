# Prompt 8.16 Finance Import Route Report

Date: 2026-08-05

Read-only route placeholders exist for `company_invoice_import`, `platform_invoice_import`, `internal_settlement_import`, `rider_payout_input_import`, `deduction_input_import`, and `adjustment_input_import`. Import Center metadata exposes bounded placeholder requirements while route opening remains non-auditing and does not auto-save, reconcile invoices, calculate amounts, or display private workbook contents by default. Earlier route aliases remain available for compatibility.

Source: repository inspection of `src/finance/financeInputRegistry.js` and `src/import/importCenterViewModel.js`; `tests/financeImportRoutes.test.js`.
