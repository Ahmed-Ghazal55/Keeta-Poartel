# Project Architecture and Technical State

## Runtime

The active UI is Vanilla JavaScript and HTML. The entry document is `keeta_operations_portal_starter_v4.html`; feature extensions mount module-specific surfaces. Vite serves the UI at `127.0.0.1:4173`. `server/devServer.js` is a small Node HTTP development API at `127.0.0.1:4174`, exposing health, data, development auth, audit, and reset routes. Source: `README.md`, “Active runtime”; repository inspection of `package.json` and `server/devServer.js`.

## Data/storage

The browser uses DataStore/BrowserLocalStore and may mirror JSON collections to the local development API/data directory. This is a browser-local/API JSON data layer, not a relational production database. Source: `PROMPT_7_1_FINAL_REPORT.md`, “Storage clarification”; repository inspection of `src/data/` and `server/localDb.js`.

## Module boundaries

Domain code is organized under `src/operations`, `src/hr`, `src/riders`, `src/fleet`, `src/import`, `src/performance`, `src/archive`, `src/monthlyClosing`, `src/finance`, `src/audit`, `src/auth`, `src/runtime`, and `src/ui`. Tests are dependency-light Node assertions invoked by npm scripts. Source: repository inspection of `src/`, `tests/`, and `package.json`.

## Current safety architecture

Read models return cloned/read-only data and focus payloads. Mutation-capable services are separate. Audit policy forbids read-only navigation noise. Isolated verification profiles populate synthetic/demo collections without depending on private workbooks. Safe mode provides a reduced recovery surface. Source: `PROMPT_8_13_AUDIT_RUNTIME_SAFETY_REPORT.md`; `PROMPT_8_14_AUDIT_RUNTIME_SAFETY_REPORT.md`; `PROMPT_8_16_AUDIT_RUNTIME_SAFETY_REPORT.md`.

## Intentional prototype boundary

This repository is not production. React and Next.js are not the current UI stack. Express and NestJS are not the current server stack. PostgreSQL is not the current database. Production auth, deployment, monitoring, backups, privacy controls, and real-data migration remain future phases. The current choices keep the operational model demonstrable and testable while business identities and workflows stabilize. Source: `README.md`, “Demo scope / current limitations”; project roadmap requirements.

## Run and verify

Run `npm install`, then `npm run dev:api` and `npm run dev:ui` in separate terminals. Open the entry URL. Run `npm run test:all` for the complete suite or a focused script such as `npm run test:finance`. Finance demo URLs are documented in README. Source: `README.md`, “How to run locally”; `package.json`.
