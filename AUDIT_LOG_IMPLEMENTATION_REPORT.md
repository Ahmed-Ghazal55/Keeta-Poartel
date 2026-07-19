# Audit Log Implementation Report

## Goal

Prompt 2 introduced a shared audit trail foundation for important operational actions, even while most UI actions are still shell-level or simulated.

## Implemented Files

1. `src/data/auditLog.js`
- creates normalized audit events
- appends and lists recent events from the data store

2. `src/auth/rbac.js`
- builds shared audit event payload shape

3. `server/routes/audit.routes.js`
- supports dev API read/write for audit events

4. `server/authDev.js`
- records dev login events

## Event Shape

Current event structure includes:

- `id`
- `timestamp`
- `userId`
- `action`
- `entity`
- `entityId`
- `city`
- `register`
- `before`
- `after`
- `source`
- `note`

## UI Actions Currently Writing Audit Events

From the browser shell:

- dev login
- dev logout
- topbar export trigger
- import file selection
- edit user mock save
- edit rider mock save
- assign rider simulation
- swap rider simulation
- terminate/stop simulation
- resignation simulation

From the dev API:

- login route
- audit POST route

## UI Display

Prompt 2 settings shell displays:

- latest 10 audit events
- latest activity count badge

This provides enough visibility for manual review during development.

## Current Limitations

1. Audit entries are still development-oriented
- some actions are UI simulations, not final production writes

2. No immutable tamper protection
- expected at this stage

3. No external user identity proof
- current auth is dev-only

## Validation

Validated by:
- `tests/apiSmoke.test.js`
- browser smoke for login switch and export/import header actions

## Current Status

The audit layer is ready to be reused by future CRUD, import, fleet, HR, and monthly-closing flows.
