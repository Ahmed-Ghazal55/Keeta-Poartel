# Keeta Operations Portal — Full Context Handoff

## 1. Project identity

Keeta Operations Portal is a local ERP-like operations prototype for logistics/delivery companies. It is initially Keeta-oriented but its scope model is designed for more platforms, registers, cities, and monthly cycles. It is a working repository with browser UI, local API/storage, domain modules, tests, verification profiles, and phase reports—not a production deployment. Source: `README.md`, sections “Active runtime” and “Demo scope / current limitations”; `PROMPT_8_16_FINAL_REPORT.md`, section “Outcome”.

## 2. Business reason for the project

Delivery operations need one traceable view of platform accounts, the people who own them, the people who actually work them, vehicles, performance evidence, monthly history, and later financial inputs. Spreadsheet-led workflows make scope and identity mistakes easy. The portal creates explicit operational identities, dated assignments, evidence provenance, review states, and safe phase boundaries. Source: `PROMPT_8_12_PERFORMANCE_ATTRIBUTION_REPORT.md`, section “Completed”; `PROMPT_8_13_IMPORT_BATCH_TRACEABILITY_REPORT.md`; project conversation context for the original business motivation.

## 3. Company/logistics context

The governing dimensions are register, city, platform, and month/cycle. Known register/company separation includes EXPRESS; Albawaba / AlBawwabah / ALBAWABA; and Al Togary / البوابة التجارية. Aliases may be normalized only through an explicit compatibility rule; records from distinct registers, cities, or platforms must not be mixed. Source note: project conversation context; the exact alias list is not independently verified in repo reports. Scope validation is evidenced by `PROMPT_8_14_ARCHIVE_VALIDATION_REPORT.md` and `PROMPT_8_15_CLOSING_VALIDATION_REPORT.md`.

## 4. Original problem

The platform Dashboard User/Courier ID is not the same thing as the human working it. One person can own an account while an HR or external rider works it during a dated assignment. The registered vehicle can also differ from the actual used vehicle. Without these separations, performance, validity, archive, closing, and settlement preparation can be attributed to the wrong person or asset. The project therefore treats missing assignment evidence as unresolved instead of defaulting to the owner. Source: `PROMPT_8_12_PERFORMANCE_ATTRIBUTION_REPORT.md`, sections “Completed” and “Result”; `PROMPT_8_15_RIDER_PERIOD_SPLIT_REPORT.md`.

## 5. Current technical stack

The UI is Vanilla JavaScript and HTML-based. The entry file is `keeta_operations_portal_starter_v4.html`, with feature extension scripts and domain modules under `src/`. Vite serves the UI on port 4173. The development API is `server/devServer.js` on port 4174. Storage is a browser-local/API JSON data layer built around DataStore/BrowserLocalStore and local dev API mirroring. Tests are Node-based scripts orchestrated by `package.json`. Source: `README.md`, “Active runtime”; `PROMPT_7_1_FINAL_REPORT.md`, “Storage clarification”; repository inspection.

React, Next.js, NestJS, Express migration, and PostgreSQL are not the current stack. Source: repository inspection; `README.md`, “Demo scope / current limitations”.

## 6. Why the current stack is intentionally local/prototype

The current architecture lets the team stabilize business rules, identities, import contracts, audit behavior, and cross-module traceability before committing to production infrastructure. It supports isolated demos, deterministic synthetic fixtures, safe mode, and fast regression tests. Backend framework, relational database, production auth, deployment, monitoring, and backups are intentionally deferred. These are planned capabilities, not defects in the prototype. Source: `README.md`, “Demo scope / current limitations”; `PROMPT_8_14_README_RUNBOOK_REPORT.md`.

## 7. What has been built so far

The repository includes an operational shell; local storage/API; development RBAC/session foundations; safe mode and runtime containment; centralized Import Center; Dashboard Users lifecycle and delta; Current Assignments with first assignment, swap, termination, and history; notifications; HR Master; External Riders; rider resolver; Fleet and vehicle usage; monthly rules; Performance/Validity attribution; report-pipeline dependencies; Monthly Archive preview; Monthly Closing Preparation; and Finance Input Staging. Source: `PROMPT_8_7_FINAL_REPORT.md` through `PROMPT_8_16_FINAL_REPORT.md`; repository inspection of `src/`.

## 8. Phase-by-phase timeline

Prompt 7 established rule-driven Performance/Validity. Prompt 7.1 stabilized the shell, templates, and local persistence. Prompt 8’s requested final report is absent, but later files show Operations foundations. Prompt 8.4-A introduced audit safety; the specifically requested `PROMPT_8_4_A_FINAL_REPORT.md` is not present, while `PROMPT_8_4_A_AUDIT_LOG_HOTFIX_FINAL_REPORT.md` exists. Prompt 8.5-B added lifecycle/import/attribution foundations; requested `PROMPT_8_5_FINAL_REPORT.md` is missing. Prompts 8.6–8.11-B built resolver, dashboard users, assignments, notifications, Operations cleanup, and HR/Fleet links. Prompt 8.12 cleaned Performance/Validity. Prompt 8.13 centralized Import/report pipeline. Prompt 8.14 added Monthly Archive and runbook. Prompt 8.15 added Monthly Closing Preparation. Prompt 8.16 adds finance-input staging and this standing handoff layer. Source: `PROJECT_PHASE_TIMELINE.md` and its cited reports. Missing sources: source report not found in current repo.

## 9. Core business rules

Never mix register/city/platform/month scope without an explicit compatibility rule. Keep Dashboard User/Courier ID, owner, actual rider, HR rider, and External Rider distinct. Performance and all downstream monthly preparation follow the actual rider working in the relevant assignment period. Keep HR and external sources explicit; External Riders Master must not duplicate HR. Use vehicle serial as primary and plate as secondary; keep registered and actual used vehicles separate. Read-only inspection does not audit. Source: `PROJECT_BUSINESS_RULES_CATALOG.md`; `PROMPT_8_12_PERFORMANCE_ATTRIBUTION_REPORT.md`; `PROMPT_8_15_AUDIT_RUNTIME_SAFETY_REPORT.md`.

## 10. Data identity rules

Scope fields are `register`, `city`, `platform`, `month`, `cycleStartDate`, and `cycleEndDate`. Person/account fields include `dashboardUserId`/`courierId`, `ownerIqama`, `actualRiderIqama`, `actualRiderSource`, `assignmentId`, `periodStart`, and `periodEnd`. Vehicle fields include `registeredVehicleSerial` and `actualVehicleSerial`. Evidence fields include `sourceModule`, `sourceBatchId`, `sourceFileName`, and `sourceRowNumber`. No builder may collapse these distinctions. Source: `PROJECT_DATA_MODEL_AND_IDENTITY_RULES.md`; repository inspection of `src/monthlyClosing/monthlyClosingPreparationModel.js` and `src/finance/financeInputModel.js`.

## 11. Module-by-module current status

Operations, Import, HR/External Riders, resolver, Fleet, Performance/Validity, Archive, Closing Preparation, and Finance Staging have prototype foundations and focused tests. Reports/export and Auth/RBAC are partial foundations. Payroll/final settlement, final invoice reconciliation, production backend/database/auth/deployment, and Shift Scheduler are not implemented in this prompt chain. Source: `PROJECT_MODULE_STATUS_MATRIX.md`.

## 12. Import/report pipeline

Import Center centralizes route definitions, template metadata, normalization, bounded preview, validation, batch history, and source focus. It preserves scope and identity fields. Preview and review are read-only; only explicit approved save may persist through existing services. The report pipeline describes dependencies/readiness rather than performing final accounting. Finance import routes are placeholder metadata with no save, reconciliation, or calculation implementation. Source: `PROMPT_8_13_IMPORT_CENTER_MODEL_REPORT.md`; `PROMPT_8_13_TEMPLATE_NORMALIZATION_REPORT.md`; `PROMPT_8_13_REPORT_PIPELINE_REPORT.md`; repository inspection of `src/finance/financeInputRegistry.js`.

## 13. Operations lifecycle

Dashboard Users retain lifecycle state across snapshots: new/ready, pending review, rejected, missing from latest snapshot, and other operational statuses. Current Assignments supports first assignment, swaps, stops/termination, assignment history, and vehicle usage periods through services. Read-only drawers and navigation remain non-auditing. Source: `PROMPT_8_7_FINAL_REPORT.md`, “Behavior outcome”; `PROMPT_8_8_FINAL_REPORT.md`, “Assignment action workflows”.

## 14. HR and rider resolver model

HR Master and External Riders are separate sources. The shared resolver exposes operational rider context for assignment workflows and preserves source. An owner does not become actual rider merely because assignment evidence is absent. External Rider import/workflow is supported as a separate master. Source: `PROMPT_8_6_FINAL_REPORT.md`, “Scope completed”; `PROMPT_8_11_HR_MODEL_CLEANUP_REPORT.md`.

## 15. Fleet and vehicle model

Fleet models normalize/validate vehicles, compute fields, match identities, track capacity and movement/usage, and cross-link Operations. Explicit vehicle serial/plate evidence takes precedence over broad associations. The monthly evidence path keeps registered vehicle and actual used vehicle separate. Source: `PROMPT_8_11_B_FINAL_REPORT.md`, “Root causes”; `PROMPT_8_15_RIDER_PERIOD_SPLIT_REPORT.md`.

## 16. Performance and validity model

Monthly rules drive daily performance, mandatory days, adapters, validity, and projections. Prompt 8.12 made attribution date- and assignment-scoped, made unresolved assignment safe, retained rider source, and separated registered/actual vehicles. Validity results expose canonical, explainable states; any legacy salary/incentive projections remain distinct from validity evidence and are not Finance Staging final money. Source: `PROMPT_7_FINAL_REPORT.md`; `PROMPT_8_12_PERFORMANCE_ATTRIBUTION_REPORT.md`; `PROMPT_8_12_VALIDITY_CLEANUP_REPORT.md`.

## 17. Archive and monthly closing preparation

Monthly Archive builds a cloned, scope-filtered, immutable preview containing Operations, rider, fleet, Performance/Validity, issue, import batch, and audit-reference families. Monthly Closing Preparation consumes archive output, builds readiness and rider-period splits, validates blockers/warnings, and provides six read-only tabs and cross-module evidence links. Neither layer mutates sources or calculates finance. Source: `PROMPT_8_14_MONTHLY_SNAPSHOT_BUILDER_REPORT.md`; `PROMPT_8_15_CLOSING_READINESS_BUILDER_REPORT.md`; `PROMPT_8_15_CLOSING_UI_REPORT.md`.

## 18. Finance/payroll boundary

Finance Input Staging defines required families for company/platform invoices, internal settlement, rider payout, salary rules, orders, bonuses, deductions, vehicle/gas/advance/penalty/adjustment evidence, and future VAT/payroll placeholders. It identifies available, missing, warning, blocked, future-required, not-applicable, under-review, and scope-mismatch states. It preserves closing scope, rider periods, actual rider/source, vehicles, and source batches. `amountPreviewAllowed` and `finalAmountCalculated` are false. No final payroll, settlement, invoice reconciliation, VAT/ZATCA, payable total, or final close exists. Source: repository inspection of `src/finance/`; `PROMPT_8_16_FINAL_REPORT.md`, “Outcome”.

## 19. Audit and safety policy

Page load, boot, tab/filter/scope changes, preview/build, validation, issue/drawer inspection, import-route open, and cross-module focus must not create audit rows. Future explicit imports/saves and governed closing actions may audit at service boundaries. Safe mode must remain responsive and contained. Private workbooks, CSVs, rider/HR data, identities, phone numbers, IBANs, `.env`, logs, databases, backups, uploads, runtime state, and artifacts must not be published. Source: `PROMPT_8_16_AUDIT_RUNTIME_SAFETY_REPORT.md`; `PROMPT_8_16_GITHUB_PUBLISH_REPORT.md`.

## 20. Demo/run instructions

From Ubuntu/Linux project root, run `npm install`, then `npm run dev:api` and `npm run dev:ui` in separate terminals. Open `http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html`. Finance verification uses `?storageProfile=prompt8_16_finance_staging&verify=8_16`; prepend `?safe=1&...` for safe mode as shown in README. Run `npm run test:all` before presentation. Source: `README.md`, “How to run locally” and “Useful demo URLs”; `docs/demo/PRESENTATION_CHECKLIST.md`.

## 21. GitHub/repo state

The current branch is `main` with origin configured to the repository documented in publish reports. Prompt 8.16 was previously published in commits `627e5ed` and `1a4ec76`. At the start of this handoff run, unrelated Shift Scheduler/capacity/reference/runtime files were modified and deliberately left untouched. Final publish state for this run must be read from `PROMPT_8_16_GITHUB_PUBLISH_REPORT.md`. Source: repository `git log/status` inspection; existing `PROMPT_8_16_GITHUB_PUBLISH_REPORT.md`.

## 22. Known limitations and future work

This remains a local prototype. Real finance computation, final payroll/settlement, invoice reconciliation, VAT/ZATCA, final close, production exports, production authentication, backend migration, PostgreSQL, deployment, monitoring, backups, and real-data migration remain. Some legacy prototype modules/tests may contain historical salary/settlement logic, but Prompt 8.16 does not invoke it. Source: `PROMPT_8_16_TEST_RESULTS.md`; `README.md`, “Demo scope / current limitations”.

## 23. Final target state

The final product is an ERP-like operations portal for multi-register, multi-city, multi-platform logistics companies, covering account lifecycle, actual rider assignments, HR/external sources, fleet usage, imports/report pipeline, performance/validity, archive, monthly closing, finance/settlement staging, governed reports, and a later production backend/database/auth/deployment stack. Source note: project conversation context; aligned with `PROJECT_ROADMAP_TO_FINAL_STATE.md`.

## 24. How future AI agents should continue

Read `PROJECT_AI_TRANSFER_BRIEF.md`, this document, the latest final/test/browser/publish reports, README, and affected code/tests. Reconcile claims with repository evidence. Preserve unrelated dirty changes. Use synthetic verification data. Maintain the identity and vehicle separations. Update the four standing status documents and include the Project Context Snapshot in every final report. Do not broaden scope into a later prompt. Proceed to 8.17 only after the current release gates are green. Source: `FUTURE_REPORTING_STANDARD.md`; repository safety rules reflected in prior precheck/publish reports.
