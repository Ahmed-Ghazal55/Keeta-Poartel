# Invoice Template Reference Notes

## Scope in Prompt 8

Prompt 8 does not start monthly closing or salary-settlement logic.

Invoice handling in this stage is limited to:

- template registration
- file detection
- raw archive direction
- normalized preview direction

## Reference files

- `Albwaba almoqbla Company ( Jeddah )#2026-06#نظام الشرائح الفاتورة1783758916807.xlsx`
- `EXPRESS GATE Company ( Jeddah)#2026-06#نظام الشرائح الفاتورة1783758851765.xlsx`

## Current registry status

Registered templates:

- `company_invoice`
- `internal_settlement`

`company_invoice` is treated as a real import/archive template.

`internal_settlement` remains a structured placeholder for a later finance prompt.

## Important rule

The original company invoice workbook should be preserved as received from the company before any later internal settlement logic is applied.

## Out of scope for Prompt 8

- monthly closing
- payroll settlement
- final finance reconciliation
