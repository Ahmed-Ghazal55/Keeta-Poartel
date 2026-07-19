# RBAC Foundation Report

## Goal

Prompt 2 introduced a shared RBAC foundation so every future module can inherit:

- who the current user is
- which cities/registers they can access
- which actions are enabled or disabled
- which actions should create audit records

## Implemented RBAC Files

1. `src/auth/rbac.js`
- shared role/permission logic
- scope checks
- audit event builder
- row filtering

2. `src/auth/devSession.js`
- dev-only user switching
- local session persistence
- current user and scope summary helpers

3. `server/rbac.js`
- shared server-side reuse of the same RBAC logic

## Roles Added

- `super_admin`
- `operations_admin`
- `city_supervisor`
- `hr_officer`
- `fleet_officer`
- `finance_officer`
- `viewer`

## Permission Families Added

- `dashboard.view`
- `imports.create`
- `imports.review`
- `operations.view`
- `operations.assign`
- `operations.swap`
- `operations.terminate`
- `operations.editStatus`
- `performance.view`
- `performance.recalculate`
- `hr.view`
- `hr.edit`
- `fleet.view`
- `fleet.assign`
- `fleet.edit`
- `shifts.view`
- `shifts.generate`
- `shifts.export`
- `monthlyClosing.view`
- `monthlyClosing.analyze`
- `monthlyClosing.buildSettlement`
- `monthlyClosing.closeMonth`
- `monthlyClosing.reopenMonth`
- `reports.export`
- `settings.manage`
- `audit.view`

## Scope Model

Each dev user carries:

- `cityScope`
- `selectedCities`
- `registerScope`
- `selectedRegisters`
- extra `permissions`

This scope is used to:

1. clamp global organization context
2. filter operations rows
3. disable topbar actions
4. disable row actions
5. limit what the user sees in the organization selector

## Dev Login Foundation

Prompt 2 added a safe dev-only switcher in the settings shell.

Verified users:

- `super.admin`
- `ops.jeddah`
- `ops.riyadh`
- `finance.demo`
- `viewer.demo`

Behavior:

- chosen dev user is saved in browser local storage
- header updates immediately
- role and scope summary update immediately
- page action buttons update immediately

## UI Behaviors Verified

1. `super.admin`
- import/export enabled
- full org scope

2. `ops.jeddah`
- header scope narrowed to `جدة`
- import/export disabled
- rows limited to allowed city/registers
- HR edit action disabled

3. `viewer.demo`
- import/export disabled
- scope narrowed to `جدة` + `EXPRESS`
- edit/assign/swap/terminate/audit actions disabled

## Prompt 2 Bug Found And Fixed

Bug:
- scoped users initially saw no rows in operations workbench

Cause:
- user scope stored register codes like `EXPRESS`
- operations sample rows stored register labels like `Express`

Fix:
- added optional `registerMatcher` support inside `RBAC.filterRowsByUserScope`
- used label/code matching inside the UI row filter
- added regression coverage in `tests/rbac.test.js`

## Validation

Validated by:
- `tests/rbac.test.js`
- browser smoke scenarios for `ops.jeddah` and `viewer.demo`

## Current Status

RBAC foundation is ready for broader reuse in Prompt 3 and later module implementation.
