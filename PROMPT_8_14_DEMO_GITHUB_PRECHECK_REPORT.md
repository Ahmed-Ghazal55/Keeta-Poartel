# Prompt 8.14 Demo and GitHub Precheck Report

Date: 2026-08-02

## Git state

- Branch: `main`
- Remote: `origin` exists for `https://github.com/Ahmed-Ghazal55/Keeta-Poartel.git`
- Worktree: dirty before Prompt 8.14, containing preserved Prompt 8.10-B through 8.13 work plus known reference-file CRLF noise.
- No destructive Git action was performed.

## Package scripts before changes

- `dev`: missing
- `dev:ui`: missing
- `dev:api`: present as `node ./server/devServer.js`
- Full test scripts were present.

## README before changes

The README described the workspace and direct Windows test commands but did not explain how to start the UI/API, diagnose port 4173 refusal, or present the prototype safely. Its final line also contained stale NUL/encoding debris.

## Ignore protections

`.gitignore` protects `node_modules`, artifacts, uploads, private data, local DB/backups, spreadsheet/CSV/ZIP files, environment files, and logs.

## Root private-business-file inventory

Counts only: 12 `.xlsx`, 1 `.xlsm`, and 4 `.csv` root-level business files. Contents were not printed. Two root-level logs were also present. These extensions are ignored and must not be staged. The precheck found the `.xlsm` gap and added `*.xlsm` to `.gitignore`.

## Phase A decision

Proceed with scoped run-script, README, checklist, verification, and safe publish preparation before Monthly Archive work.
