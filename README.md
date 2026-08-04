# Keeta Operations Portal

Local operations portal prototype for Keeta-focused logistics workflows.

## Active runtime

- `keeta_operations_portal_starter_v4.html`
- Vanilla JavaScript UI and feature extensions
- Browser-local/API JSON data layer
- Local development API on port 4174
- Vite UI server on port 4173

## How to run locally

Install a current Node.js LTS release first, then install the project dependencies.

### Windows / PowerShell

```powershell
cd "C:\path\to\keeta operations portal"
npm install

# Terminal 1 — API server
npm run dev:api

# Terminal 2 — UI server
npm run dev:ui
```

Open:

<http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html>

### Ubuntu / Linux

```bash
cd "$HOME/Projects/keeta operations portal"
npm install

# Terminal 1 — API server
npm run dev:api

# Terminal 2 — UI server
npm run dev:ui
```

Open:

<http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html>

`npm run dev` is a shortcut for `npm run dev:ui`.

### Useful demo URLs

- Import Center verification:
  <http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html?storageProfile=prompt8_13_import_pipeline&verify=8_13>
- Monthly Archive verification:
  <http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html?storageProfile=prompt8_14_monthly_archive&verify=8_14>
- Monthly Closing Preparation verification:
  <http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html?storageProfile=prompt8_15_monthly_closing_prep&verify=8_15>
- Monthly Closing Preparation safe mode:
  <http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html?safe=1&storageProfile=prompt8_15_monthly_closing_prep&verify=8_15>

### Troubleshooting

- `ERR_CONNECTION_REFUSED` on `127.0.0.1:4173` means the UI server is not running or a different port is open. Run `npm run dev:ui`, keep that terminal open, and reload the page.
- If port 4173 is busy, stop the old process or start Vite on another port and open the matching URL.
- If API status is unavailable, run `npm run dev:api` in a separate terminal. The development API uses port 4174.
- The project is still a local/offline prototype. PostgreSQL or another relational database, a production backend framework, production authentication, finance, payroll, and final monthly closing are planned for later phases.

## Demo scope / current limitations

- The current UI is Vanilla JavaScript backed by browser-local and local API JSON storage.
- Auth/RBAC exists as a tested foundation; final production authentication and authorization are later work.
- Relational database and backend-framework migration are intentionally deferred.
- Payroll, finance, invoice reconciliation, salary deductions, and final monthly closing are intentionally not implemented.
- Use isolated `storageProfile` verification/demo URLs for presentations.
- Real HR, rider, workbook, invoice, and operational exports must stay out of GitHub. Never move ignored private data into tracked paths for a demo.

See [the presentation checklist](docs/demo/PRESENTATION_CHECKLIST.md) before presenting.

## Workspace layout

```text
.
|-- data/
|-- docs/
|-- server/
|-- src/
|-- storage/
|-- tests/
|-- vendor/
`-- keeta_operations_portal_starter_v4.html
```

## Tests

Run the full test matrix from the workspace root:

```bash
npm run test:all
```

Focused suites are also available through the scripts in `package.json`.
