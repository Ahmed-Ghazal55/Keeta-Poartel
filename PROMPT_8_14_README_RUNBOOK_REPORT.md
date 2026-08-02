# Prompt 8.14 README Runbook Report

Date: 2026-08-02

`README.md` now contains a presentation-safe **How to run locally** section for Windows/PowerShell and Ubuntu/Linux. It documents dependency installation, separate API and UI terminals, the canonical portal URL, Prompt 8.13 and 8.14 demo profiles, and the safe-mode URL.

Troubleshooting explicitly explains that `ERR_CONNECTION_REFUSED` means no UI process is listening on the requested port, tells the operator to keep `npm run dev:ui` open, covers port conflicts and the API health dependency, and identifies the current local/offline prototype boundary.
