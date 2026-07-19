# IMPLEMENTATION_SEQUENCE

Last updated: 2026-07-10  
Roadmap basis: `C:\Users\italm\Downloads\KEETA_PROMPT_ROADMAP_V10.md`

## 1. Governance note

This file now reflects Prompt 0 completion status only.

It does **not** assume that any previous UI work inside the repo automatically counts as approved completion of Prompt 1.

## 2. Prompt-by-prompt status after this review

| Prompt | Title | Status after Prompt 0 review | Decision |
| --- | --- | --- | --- |
| 0 | Current State Review + Deep Workbook Analysis | Complete | Locked after the reports updated in this pass |
| 1 | UI Shell + Brand Identity | Safe to start | Existing UI files may be reused, but Prompt 1 still needs explicit acceptance criteria |
| 2 | Data Model + Storage + Import Registry | Ready for planning, not execution yet | Start after Prompt 1 sign-off or in parallel only if UI scope is intentionally postponed |
| 3 | Master Data + Operations Module | Not started in governed sequence | Depends on Prompt 2 data foundations |
| 4 | Monthly Rules Manager | Not started | Depends on Prompt 2 entities and Prompt 3 identity model |
| 5 | Performance + VDA + Face + Delivery Experience | Partially represented in code/tests, not productized in final flow | Rebuild on normalized imports |
| 6 | Fleet / Vehicle Module | Prototype logic exists, governed implementation not started | Rebuild on shared data model |
| 7 | Shift Scheduler | Reference workbook exists, governed implementation not started | Rebuild after rider/register model is stable |
| 8 | Monthly Closing + Final Settlement | Engine and tests exist, governed workflow not started | Rewire after import registry and master entities |
| 9 | Full Archive + Rider History | Not started | Depends on historical event storage |
| 10 | Cleanup + Release Hardening | Not started | Final step only |

## 3. Safe order from this point

### Recommended default order

1. Prompt 1
2. Prompt 2
3. Prompt 3
4. Prompt 4
5. Prompt 5
6. Prompt 6
7. Prompt 7
8. Prompt 8
9. Prompt 9
10. Prompt 10

### Why this order still holds

- Prompt 0 established the truth model
- Prompt 1 should freeze shell and navigation language before more page logic is attached
- Prompt 2 must build storage and import lineage before operations/HR/fleet pages start consuming real data

## 4. What Prompt 1 should do now

Prompt 1 should focus on:

- header / brand identity
- sidebar information architecture
- page shells only
- preserving all existing logic bindings

Prompt 1 should not:

- invent final data flow
- hardcode rules into UI components
- replace workbook-derived logic with visual-only assumptions

## 5. What Prompt 2 must produce

Prompt 2 minimum outputs:

1. core entities for city/register/platform/rider/account/status
2. import registry metadata layer
3. storage structure for batches, datasets, and conflicts
4. "latest import" resolution rules by city/register/month/dataset role
5. automated tests for dataset detection and import persistence

## 6. What must not happen before Prompt 2

- direct page-by-page parsing of workbook sheets without import lineage
- separate ad hoc lookup logic copied into multiple modules
- mixing Jeddah and Riyadh or multi-register imports silently
- treating conditional formatting as unimportant decoration

## 7. Decision point

If the team wants to stay strictly aligned with the roadmap:

- Prompt 1 can start safely now
- Prompt 2 should start immediately after Prompt 1 acceptance

If the team wants to skip visual work temporarily:

- Prompt 2 can start from an architecture perspective
- but that would be a roadmap decision, not an automatic consequence of repo contents
