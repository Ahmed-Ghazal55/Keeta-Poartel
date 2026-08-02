# Presentation Checklist

## Before the presentation

- Confirm Node.js dependencies are installed with `npm install`.
- Start the API in Terminal 1 with `npm run dev:api`.
- Start the UI in Terminal 2 with `npm run dev:ui`.
- Keep both terminals open during the presentation.
- Open the intended verification/demo URL rather than a private-data profile.
- Confirm the browser shows no `ERR_CONNECTION_REFUSED` message.

## Demo walkthrough

- Check Import Center route, template, preview, validation, and batch focus.
- Check Operations dashboard users/current assignments and source-batch focus.
- Check HR and Fleet read-only cross-links.
- Check Performance and Validity routes.
- Check Monthly Archive preview and source traceability.
- Check safe mode with `?safe=1` added to the chosen URL.

## Final safety checks

- Run `npm run test:all` before presenting.
- Never show private workbook files unless the user explicitly approved them for that audience.
- Never add HR, rider, invoice, workbook, `.env`, local DB, backup, or raw export data to Git.
- Present payroll, finance, production auth, relational database migration, and final monthly closing as planned future architecture—not completed features.
