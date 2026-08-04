# Project Module Status Matrix

| Module | Current status | Completed capabilities | Not yet implemented | Next planned work |
|---|---|---|---|---|
| App shell / sidebar / topbar | Prototype stable | Routed shells, compact header, containment | Broad redesign, production framework | Maintain |
| Settings / storage / safe mode | Prototype complete | Browser/API JSON storage, reset/recovery, safe mode | Production persistence/ops | Hardening later |
| Import Center | Complete foundation | Routes, templates, preview, validation, batches, traceability | Production ingestion/orchestration | Finance routes, then backend |
| Dashboard Users | Complete foundation | Lifecycle, delta, readiness, actions | Production synchronization | Maintain |
| Current Assignments | Complete foundation | First assignment, swap, stop, history, usage links | Production scheduling | Maintain |
| Operations actions/drawers | Complete foundation | Read-only drawers and service-led actions | Broader workflow automation | Maintain |
| Notifications | Complete foundation | Drawer, derived cards, click-through, state | Production delivery channels | Later |
| HR Master | Complete foundation | Normalize/validate/view/cross-link | Production HRIS | Later |
| External Riders | Complete foundation | Separate master/import/resolver source | Production governance | Later |
| Rider resolver | Complete foundation | HR-first/source-explicit resolution | Enterprise MDM | Later |
| Fleet / vehicles | Complete foundation | Serial-led vehicle model, usage/history | Production telematics | Later |
| Performance | Complete foundation | Date/assignment attribution, rules, issues | Final finance consumption | 8.17+ preview |
| Validity | Complete foundation | Canonical states and evidence | Final payable rules | 8.17+ preview |
| Monthly Archive | Complete foundation | Immutable filtered preview/traceability | Explicit production archive creation | 8.19+ |
| Monthly Closing Preparation | Complete foundation | Readiness, rider periods, evidence, blockers | Final closing workflow | 8.19 |
| Finance/Settlement staging | Prompt 8.16 complete, reverified in this run | Required inputs, staged evidence, issues, traceability, future boundary | Money calculation/reconciliation | 8.17 |
| Payroll/Final settlement | Not implemented | Boundary/placeholders only | Payroll and final settlement | 8.17 preview, later finalization |
| Reports/export | Partial | Read-only pipeline/dependency model | Management export cleanup | 8.20 |
| Auth/RBAC | Prototype foundation | Development session and permission model | Production identity/security | 8.21 |
| Backend/API | Local dev only | Node JSON API on 4174 | Express/Nest/production services | After prototype / 8.22 plan |
| Database migration | Not started | JSON/local storage only | PostgreSQL relational design/migration | After prototype |
| Deployment | Not started | Local runbook | CI/CD, hosting, monitoring | After prototype |
| Shift Scheduler / Prompt 9 | Not started in this prompt chain | Separate pre-existing files are out of scope | Scheduler implementation/integration | Only after safe core closing foundation |

Sources: `PROMPT_8_7_FINAL_REPORT.md` through `PROMPT_8_16_FINAL_REPORT.md`; `README.md`; repository inspection of `src/` and `server/`. Shift Scheduler status source note: project conversation context; unrelated modified scheduler files exist but are not part of this prompt chain.
