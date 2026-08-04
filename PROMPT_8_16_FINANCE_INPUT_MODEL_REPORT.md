# Prompt 8.16 Finance Input Model Report

Date: 2026-08-04

`src/finance/financeInputModel.js` defines all 14 canonical families, seven staging statuses, canonical source/scope/identity/period/vehicle/raw-amount fields, and a read-only staging-run contract. `amountRaw` remains an inert string and `calculatedAmount` is always null. Auto-save, totals, reconciliation, settlement, and payroll flags are false; Monthly Closing Preparation is cloned and never mutated.
