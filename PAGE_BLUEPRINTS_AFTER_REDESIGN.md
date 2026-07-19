# Page Blueprints After Redesign

Date: 2026-07-14
Scope: page-level planning blueprint after Prompt 8.4-A and before Prompt 8.5

## Shared page blueprint contract

Every operational page should be composed from the same structure:

1. `app-context-bar`
   - current organization scope
   - route breadcrumb when useful

2. `page-header`
   - page title
   - one-line purpose
   - page-local primary action only if needed

3. `filter-bar`
   - only filters relevant to the current page

4. `kpi-strip`
   - 2 to 6 compact cards

5. `primary-content`
   - one main table or primary board

6. `secondary-content`
   - optional summaries, issue panels, or side insights

7. `details-drawer`
   - record detail, history, issues, source trace, and action forms

## Global shell blueprint

### Topbar

- logo and company identity
- organization selector trigger
- compact runtime chips
- notification bell
- current user chip

### Sidebar

- modules only
- accordion groups when needed
- no city or register selection inside it

### Organization selector

- opens from topbar
- modal or drawer tree
- hierarchy:
  - all cities
  - city
  - register or dashboard
  - work mode

## Home dashboard blueprint

### Purpose

Give leadership and operations leads one fast operational summary without acting like a landing page.

### KPIs

- active city or organization scope
- total dashboard users
- currently working riders
- today issues requiring attention
- imported batches today
- last successful update

### Primary blocks

- operations health summary
- performance validity summary
- fleet availability summary
- monthly-rule active version summary

### Secondary blocks

- top open issues
- latest imports
- recent valid audit mutations

## Operations module blueprints

### Dashboard Users

Purpose:

Master view of dashboard-user records by city, register, work mode, status, and assignment state.

Filters:

- status
- city or context override only if allowed
- register
- work mode
- search by user id or iqama

KPIs:

- total dashboard users
- active users
- users needing first assignment
- users under review

Primary table:

- user id
- rider name
- city
- register
- work mode
- vehicle type
- assignment state
- operational state
- last activity
- actions

Drawer:

- identity
- assignment history
- platform account links
- related vehicle state
- issues
- source batch trace

### Working Users

Purpose:

Focus on users approved and operationally active on platform accounts.

KPIs:

- active today
- stopped recently
- per-order count
- salary-tier count

Primary table emphasizes live operational state and recent activity.

### Working Riders

Purpose:

Operational rider-centric view that merges rider identity with current dashboard-user working state.

Primary table emphasizes:

- rider
- linked dashboard user
- city
- register
- vehicle
- current shift indicator later
- current issues

### First Assignment

Purpose:

Show newly imported or newly approved users that still need operational placement.

KPIs:

- pending first assignment
- blocked by missing data
- blocked by vehicle mismatch

Primary table focuses on readiness and missing prerequisites.

Primary action:

- assign user

### Swaps

Purpose:

Manage dashboard-user or rider swaps with traceable workflow.

Primary table:

- source user
- target user or replacement
- city
- register
- reason
- status
- created at
- actions

Drawer:

- swap details
- affected entities
- approval note
- mutation history

### Status Review

Purpose:

Queue users needing manual state correction, verification, or follow-up.

This page should behave like a triage queue, not a generic list.

### Terminations

Purpose:

Track offboarding and operational removal cases.

Primary table emphasizes:

- rider or user identity
- city
- register
- termination reason
- effective date
- archive linkage

### Operations Log

Purpose:

Read-only timeline of real business mutations only.

Filters:

- module
- action type
- actor
- date range
- entity id search

Rules:

- no page-driven audit creation
- no inline mutation actions here

## Performance and validity module blueprints

### Daily Performance

Purpose:

Monitor current or imported-day operational outcomes quickly.

KPIs:

- valid riders
- invalid riders
- below target
- zero-cancellation achievers
- on-time or ATA pass rate

Primary table:

- rider
- city
- register
- total orders
- attendance compliance
- ATA status
- cancellation status
- validity result
- issues

Drawer:

- daily breakdown
- mandatory day compliance
- rule resolution source
- source import links

### Overall Performance

Purpose:

Month-to-date aggregate performance view.

KPIs:

- total orders
- riders above target
- riders at risk
- estimated incentive eligibility

Main table prioritizes monthly totals and risk states over raw daily columns.

### VDA

Purpose:

Show rider or user validity and document/verification exceptions in a focused queue.

### VDA Keeta

Purpose:

Platform-specific VDA monitoring with the same shell but scoped logic.

### Face Verification

Purpose:

Track facial verification failures, pending checks, and follow-up status.

### Delivery Experience

Purpose:

Highlight riders at risk due to delivery-experience metrics and quality rules.

### Needs Follow-up

Purpose:

Cross-performance triage list for all riders requiring action.

This page can aggregate issues from the performance module into one prioritized queue.

## Monthly Rules module blueprints

### Rules Registry

Purpose:

Manage rule versions by month, city, register, and platform.

KPIs:

- active rules
- draft rules
- locked rules
- scopes without active rules

Primary table:

- month
- platform
- city scope
- register scope
- status
- last updated
- actions

Drawer:

- version details
- cloned from
- change summary
- usage impact

### Mandatory Attendance

Purpose:

Show required attendance days and thresholds for the active rule scope.

### Car Incentives

Purpose:

Manage and review car-tier order thresholds and incentive values.

### Bike Incentives

Purpose:

Manage and review bike-tier order thresholds and incentive values.

### Quality Rules

Purpose:

Manage ATA, cancellation, minimum attendance, and related validity criteria.

## HR module blueprints

### Rider Master

Purpose:

Central rider profile registry and HR search surface.

Filters:

- sponsorship type
- status
- city
- document validity
- platform account state
- search by rider id, iqama, phone

KPIs:

- total riders
- internal sponsorship
- external riders
- document issues
- archived riders

Primary table:

- rider name
- rider code
- iqama
- sponsorship type
- city
- status
- document summary
- linked dashboard users
- actions

Drawer:

- identity block
- sponsorship
- documents
- platform accounts
- work history
- archive events
- source batch links

### Sponsorship Riders

Purpose:

Focused view for internal sponsorship riders and their readiness.

### External Riders

Purpose:

Focused view for external riders, vendors, and document dependencies.

### Licenses And Health Cards

Purpose:

Deadline-driven compliance view with issue-first presentation.

### Rider Archive

Purpose:

Historical rider timeline across prior work states and archive events.

## Fleet module blueprints

### Operating Vehicles

Purpose:

Current vehicles actively linked to operations.

KPIs:

- operating now
- available
- full capacity
- compliance issues

Primary table:

- plate
- vehicle id
- city
- model
- active assignments
- capacity state
- compliance state
- actions

Drawer:

- vehicle identity
- linked riders or users
- movement history
- capacity reviews
- compliance issues
- source trace

### Available Vehicles

Purpose:

Find immediately usable fleet inventory.

### Full Vehicles

Purpose:

Surface capacity saturation and need for redistribution.

### Vehicle Handover

Purpose:

Track handovers and fleet movement history as an operational workflow.

### Vehicle Matching

Purpose:

Validate actual assigned vehicle versus registered or expected vehicle.

### Fleet Issues

Purpose:

Central fleet exception queue.

## Shift scheduling module blueprints

### Create Distribution

Purpose:

Input or select the rider pool and scheduling constraints for a new distribution run.

### Distribution Results

Purpose:

Show final allocation result, totals, and balancing outcomes.

### Unassigned Riders

Purpose:

Explain why some riders were not placed.

### Shift Archive

Purpose:

Access previous distribution runs and exportable outputs.

## Monthly Closing and invoices module blueprints

### Upload Monthly Reports

Purpose:

Bring in company invoice and internal settlement batches.

### Invoice Analysis

Purpose:

Show totals, links, unmatched rows, and variance summaries.

### Company vs Internal Matching

Purpose:

A reconciliation workspace rather than a raw invoice dump.

### Final Settlement

Purpose:

Present final approved numbers, adjustments, and closing readiness.

### Monthly Archive

Purpose:

Access closed months with locked results and export history.

## Reports and export blueprint

This may remain a thin cross-module surface rather than a huge module if exports stay page-local.

Recommended structure:

- export center for prepared datasets
- saved operational reports later
- import batch export history

## Settings and admin blueprint

### System Settings

Purpose:

Expose storage mode, runtime health, and global configuration controls safely.

### City Settings

Purpose:

Manage supported cities and metadata later through approved services.

### Register Settings

Purpose:

Manage register definitions, dashboard labels, and organization metadata later.

### Operations Registry

Purpose:

Administrative reference views, not business mutation shortcuts.

## Cross-page drawer blueprint

Every major entity drawer should support a common section order when applicable:

1. summary
2. status and issues
3. linked entities
4. history or archive
5. source trace
6. audit timeline when relevant

## Blueprint rules that must survive implementation

- Do not put organization selection in the sidebar.
- Do not let a page default to a giant spreadsheet-like matrix if a drilldown can carry the detail.
- Do not add new business actions into the audit log page.
- Do not mix import mapping controls into normal operational pages.
- Keep one primary purpose per page.
