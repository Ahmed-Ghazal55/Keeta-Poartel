# Project Business Rules Catalog

## Scope and separation

- Every operational/reporting record must retain register, city, platform, and month/cycle scope. Cross-scope data is blocked unless an explicit compatibility rule exists.
- Known register/company labels include EXPRESS; Albawaba / AlBawwabah / ALBAWABA; and Al Togary / البوابة التجارية. Spelling aliases may normalize to a canonical register, but records may not be silently mixed.
- The platform model is Keeta-oriented today but should permit additional delivery platforms.

Source note: project conversation context; register aliases are not independently verified in repo reports. Scope enforcement is supported by `PROMPT_8_14_ARCHIVE_VALIDATION_REPORT.md` and `PROMPT_8_15_CLOSING_VALIDATION_REPORT.md`.

## Identity

- Dashboard User/Courier ID, account owner, actual rider, HR rider, and External Rider are distinct concepts.
- Performance and downstream monthly evidence use the actual rider working during the dated assignment period. Missing assignment evidence stays unresolved; the owner must not be promoted to actual rider.
- HR and External Riders are separate sources. External Riders Master must not duplicate an HR rider.
- Rider source must remain explicit (`hr`, `external`, or unresolved/unknown).

Source: `PROMPT_8_12_PERFORMANCE_ATTRIBUTION_REPORT.md`, section “Completed”; `PROMPT_8_6_FINAL_REPORT.md`, “Scope completed”; `PROMPT_8_15_RIDER_PERIOD_SPLIT_REPORT.md`.

## Vehicles

- Vehicle serial is the primary identity; plate is secondary descriptive/matching evidence.
- Registered vehicle belongs to the dashboard-user context; actual used vehicle belongs to an assignment/usage period. They must remain separate even when equal.
- Vehicle deductions and gas-card requirements are conditional evidence requirements, never inferred final money.

Source: `PROMPT_8_14_ARCHIVE_MODEL_REPORT.md`; `PROMPT_8_15_RIDER_PERIOD_SPLIT_REPORT.md`; `PROMPT_8_16_FINANCE_INPUT_VALIDATION_REPORT.md`.

## Imports and evidence

- Template selection, normalization, preview, validation, batch history, and focus are read-only.
- Only an explicit approved save may persist supported import entities and audit.
- Source batch, source file, row number, scope, and linked entity identity must survive normalization.
- Private workbook contents are not a default UI or reporting surface.

Source: `PROMPT_8_13_IMPORT_CENTER_MODEL_REPORT.md`; `PROMPT_8_13_TEMPLATE_NORMALIZATION_REPORT.md`; `PROMPT_8_13_IMPORT_BATCH_TRACEABILITY_REPORT.md`.

## Performance, archive, closing, and finance

- Performance attribution is date-scoped and assignment-led.
- Archive preview clones and filters sources and does not mutate them.
- Monthly Closing Preparation consumes archive output and remains read-only.
- Finance staging consumes Monthly Closing Preparation, identifies evidence readiness, and never calculates totals, payable amounts, payroll, invoice reconciliation, VAT/ZATCA, or final close.
- Deferred placeholders are intentional readiness markers, not completed finance features.

Source: `PROMPT_8_12_PERFORMANCE_ATTRIBUTION_REPORT.md`; `PROMPT_8_14_MONTHLY_SNAPSHOT_BUILDER_REPORT.md`; `PROMPT_8_15_CLOSING_READINESS_BUILDER_REPORT.md`; `PROMPT_8_16_FINAL_REPORT.md`.

## Audit and privacy

- Page loads, tabs, filters, previews, validation, drawers, read-only focus links, and safe-mode boot do not audit.
- Explicit future imports/saves and later close actions may audit through service-layer policy.
- Do not publish real rider identities, phone numbers, IBANs, workbook/CSV rows, `.env`, local DB, uploads, logs, backups, or browser artifacts.

Source: `PROMPT_8_15_AUDIT_RUNTIME_SAFETY_REPORT.md`; `PROMPT_8_16_AUDIT_RUNTIME_SAFETY_REPORT.md`; `PROMPT_8_16_GITHUB_PUBLISH_REPORT.md`.
