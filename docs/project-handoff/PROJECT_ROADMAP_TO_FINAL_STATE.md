# Project Roadmap to Final State

## Remaining local prototype sequence

1. **8.16 — Settlement / Finance Input Staging Foundation:** completed in the current codebase; read-only and non-calculating.
2. **8.17 — Payroll / Rider Settlement Preview Foundation:** next. Preview only; preserve attribution and explain every rule/evidence dependency.
3. **8.18 — Company Invoice / Internal Settlement Preview:** compare evidence without final reconciliation.
4. **8.19 — Final Monthly Closing Draft Workflow:** draft workflow and explicit gates, not an unreviewed production close.
5. **8.20 — Reports / Export / Management Dashboard Cleanup:** bounded exports and management views.
6. **8.21 — Auth / Users / Roles / Security Hardening:** strengthen the prototype security model.
7. **8.22 — Backend / Database Migration Plan or Release Candidate Hardening:** document migration or stabilize a release candidate.
8. **Prompt 9 — Shift Scheduler:** begin only after core operations/closing foundations are safe.

Source note: project conversation context; this forward sequence is not independently recorded in older repo reports.

## After local prototype completion

- Select and migrate to a production backend/API framework.
- Design and migrate to a relational database such as PostgreSQL.
- Implement production authentication, permissions, secrets, and privacy controls.
- Plan real-data mapping, cleansing, reconciliation, dry runs, rollback, and acceptance.
- Add deployment, CI/CD, monitoring, backups, retention, incident response, and disaster recovery.
- Perform security/privacy review, load testing, audit review, and operational training.

These are future deliverables; Express/Nest, PostgreSQL, deployment, and production auth are not present now. Source: `README.md`, “Demo scope / current limitations”; repository inspection.

## Final target

The target is an ERP-like operations portal for logistics delivery companies supporting multiple registers, cities, and platforms; dashboard-user lifecycle; actual-rider assignment; HR/external riders; fleet registration and actual usage; imports/report pipeline; performance and validity; monthly archive; monthly closing; finance/settlement staging; governed reports; and later production backend, relational database, authentication, deployment, monitoring, and backup operations. Source note: project conversation context, aligned with capabilities evidenced across Prompt 7–8.16 reports.
