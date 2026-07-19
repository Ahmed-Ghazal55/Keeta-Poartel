# UI Refactor Implementation Plan

Date: 2026-07-14
Scope: phased implementation plan after Prompt 8.4 planning

## Starting assumptions

- Prompt `8.4-A` fixed audit-log integrity and that policy is now non-negotiable.
- Prompt `8.4` is planning only and does not perform the refactor.
- Safe mode remains available, but normal mode must be the primary supported path.
- Existing tests are already a required guardrail, not an optional extra.

## Pre-flight gate before Prompt 8.5

Required conditions:

- audit flood remains fixed
- `npm run test:audit` stays green
- `npm run test:ui` stays green
- `npm run test:all` stays green
- current planning docs from Prompt 8.4 are accepted as the implementation baseline

## Phase 8.5: App Shell Foundation

Goal:

Build the shared shell primitives before page-by-page cleanup.

Scope:

- `app-shell`
- `app-topbar`
- `app-context-bar`
- `app-filter-bar` frame
- `app-content`
- shared spacing and token baseline

Must preserve:

- current routing behavior
- runtime containment rules
- header height constraints
- audit-silent rendering

Definition of done:

- topbar, context bar, and content regions are structurally stable
- no page still depends on oversized landing-style hero scaffolding
- runtime widgets remain contained and single-instance

## Phase 8.6: Sidebar And Routing Cleanup

Goal:

Make navigation deterministic and route-driven.

Scope:

- sidebar accordion cleanup
- single active item behavior
- breadcrumb integration
- route metadata consolidation

Must preserve:

- existing subpage coverage
- page-scoped lazy loading
- no route-change audit side effects

Definition of done:

- each module child opens a clearly differentiated page or subpage
- labels, route ids, and page titles come from one authoritative map where possible

## Phase 8.7: Global Filter Framework

Goal:

Introduce a consistent filter system across modules without rerender storms.

Scope:

- page-local filter bar
- organization context consumption
- search, date, status, and module-specific filters
- reset and chip summaries
- debounce behavior

Must preserve:

- no audit on filter use
- no direct storage writes outside approved data paths

Definition of done:

- active page filters are consistent in behavior and layout
- switching filters updates only the active page view

## Phase 8.8: Table System And Row Actions

Goal:

Replace ad-hoc table rendering patterns with one shared operational table system.

Scope:

- sticky key columns
- pagination or load-more
- shared row action menu
- column visibility
- export entry points
- empty states

Must preserve:

- current business operations
- audit integrity
- existing row-level permissions

Definition of done:

- core modules use a consistent table primitive
- each row action opens the proper drawer or workflow

## Phase 8.9: Notifications Drawer And Issue Linking

Goal:

Make notifications useful, scoped, and non-destructive.

Scope:

- notification bell
- notification drawer
- issue linking
- severity grouping

Must preserve:

- notification viewing remains audit-silent
- issue derivation stays data-change driven

Definition of done:

- notifications open contextual destinations
- topbar notifications do not trigger layout or performance regressions

## Phase 8.10: Operations Pages Cleanup

Goal:

Align operations pages with the new shell and table system.

Scope:

- dashboard users
- working users
- working riders
- first assignment
- swaps
- status review
- terminations
- operations log

Must preserve:

- service-layer mutation paths
- audit allowlist
- import-backed dashboard user registry

Definition of done:

- operations pages are clearly differentiated
- details drawers and row actions are consistent
- Operations Log stays read-only

## Phase 8.11: HR And Fleet Cleanup

Goal:

Bring HR and fleet to the same page architecture.

Scope:

- HR master views
- sponsorship and external rider views
- documents and archive flows
- operating vehicles
- available and full vehicle views
- handover and matching
- fleet issues

Must preserve:

- entity links between riders, accounts, vehicles, and assignments
- source traceability back to imports when needed

Definition of done:

- HR and fleet pages use shared filters, tables, drawers, and issue surfacing

## Phase 8.12: Performance, Validity, And VDA Cleanup

Goal:

Turn wide imported reports into concise operational workflows.

Scope:

- daily performance
- overall performance
- VDA
- VDA Keeta
- face verification
- delivery experience
- needs-follow-up views

Must preserve:

- rules resolution behavior
- old-engine fallback safety
- performance caches and lazy loading

Definition of done:

- day-level detail is moved into drilldown rather than dominating the main page
- issue-focused triage becomes faster than scanning giant raw matrices

## Phase 8.13: Import Center Cleanup

Goal:

Make Import Center the clear home of raw preview, template understanding, and save history.

Scope:

- template downloads
- file detection summary
- auto-map confidence states
- mapping review
- validation summary
- raw preview
- import history

Must preserve:

- `importTemplateRegistry`
- batch persistence
- storage fallback behavior
- audit behavior for saved or rejected imports only

Definition of done:

- business pages no longer need to expose raw import mechanics
- import traceability is available through batch links and drawers

## Phase 8.14: Final UI Runtime Verification

Goal:

Validate the redesign under realistic runtime conditions before moving to Prompt 9.

Scope:

- normal mode verification
- safe mode verification
- startup profiler review
- route switching checks
- console error checks
- audit log integrity check

Definition of done:

- no fake audit logs
- no freezing during page switching
- no header or layering regressions
- tests and browser verification pass

## Recommended sequencing discipline

- Finish one shell-level phase before spreading changes across every module.
- Prefer shared primitives first, then module adoption.
- Re-run audit and UI tests after each phase, not only at the end.
- Keep each phase narrow enough that regressions can be isolated quickly.

## Explicit non-goals for 8.5 through 8.14

- no backend rewrite
- no production deployment decision
- no salary or monthly closing engine expansion before the scheduled prompt
- no shift scheduling engine build before Prompt 9
