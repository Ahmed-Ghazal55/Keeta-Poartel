# Prompt 8.14 Monthly Snapshot Builder Report

Date: 2026-08-02

`src/archive/monthlyArchiveBuilder.js` builds a cloned, read-only preview filtered by register, city, platform, and month/cycle. It includes available Operations history, rider, HR/external, fleet/usage, Performance/Validity, issues, Import Center batches, and audit-reference families. Rows receive non-auditing focus metadata. Missing prerequisites become findings; no source collection is saved or mutated and no payroll, invoice, deduction, settlement, close, or cycle-reset logic exists.
