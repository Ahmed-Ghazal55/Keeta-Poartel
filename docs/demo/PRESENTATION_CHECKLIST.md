# Presentation Checklist

## Before the presentation

- Confirm Node.js dependencies are installed with `npm install`.
- Start the API in Terminal 1 with `npm run dev:api`.
- Start the UI in Terminal 2 with `npm run dev:ui`.
- Keep both terminals open during the presentation.
- Open the intended verification/demo URL rather than a private-data profile.
- Base URL: <http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html>.
- Confirm the browser shows no `ERR_CONNECTION_REFUSED` message.

## Demo walkthrough

- Check Import Center route, template, preview, validation, and batch focus.
- Check Operations dashboard users/current assignments and source-batch focus.
- Check HR and Fleet read-only cross-links.
- Check Performance and Validity routes.
- Check Monthly Archive preview and source traceability.
- Open Monthly Closing Preparation with `?storageProfile=prompt8_15_monthly_closing_prep&verify=8_15`; show Overview, Readiness, Rider Periods, Evidence Matrix, Issues, and Future Finance Boundary.
- Confirm the archive reference, HR/external rider split, registered/actual vehicle split, import evidence, and disabled final-close boundary are visible.
- Check safe mode with `?safe=1&storageProfile=prompt8_15_monthly_closing_prep&verify=8_15`.
- Open Finance Staging with `?storageProfile=prompt8_16_finance_staging&verify=8_16`; show Finance Overview, Finance Input Staging, Required Inputs, Finance Issues, Source Traceability, and Future Finance Boundary.
- Confirm Finance Staging is input-readiness only: raw placeholders may be visible, but no totals, payable amount, reconciliation, payroll, settlement, VAT, or final close exists.
- Check Finance Staging safe mode with `?safe=1&storageProfile=prompt8_16_finance_staging&verify=8_16`.

## Final safety checks

- Run `npm run test:all` before presenting.
- Never show private workbook files unless the user explicitly approved them for that audience.
- Do not show real HR, rider, workbook, invoice, private, upload, environment, or local database files.
- Never add HR, rider, invoice, workbook, `.env`, local DB, backup, or raw export data to Git.
- Present payroll, finance, production auth, relational database migration, and final monthly closing as planned future architecture—not completed features.
