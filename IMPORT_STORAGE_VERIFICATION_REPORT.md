# Import Storage Verification Report

Date: 2026-07-12

## Verified Scenario

Browser verification was executed against:

- UI preview server: `http://127.0.0.1:4173/`
- Dev API / Node local DB: `http://127.0.0.1:4174/api`

Uploaded Excel file:

- `D:\keeta operations portal\data\raw\monthly_closing\jeddah\2026-05\EXPRESS GATE Company ( Jeddah)#2026-05#نظام الشرائح الفاتورة1781618262314.xlsx`

## Verified Results

1. File upload worked through Import Center.
2. File detection worked.
   - detected type: `Company Invoice Workbook`
   - detected scope: `جدة / EXPRESS / 2026-05`
3. Template matching worked.
   - preview badge: `Company Invoice · 55%`
   - save was initially disabled because review was required.
4. Preview rendered successfully.
   - preview rows shown: `20`
5. Validation warnings appeared.
   - warning count: `1`
   - observed warning: unknown vehicle type
6. Manual review was applied successfully.
7. Save completed successfully.
8. Related import tables refreshed after save.
   - history row status changed to `saved`
9. Browser persistence worked after refresh.
   - `importBatches` in browser local storage after reload: `1`
   - `invoiceCourierDetail` in browser local storage after reload: `90`
10. Node local DB persistence worked.
   - `data/local-db/importBatches.json`: `1` row
   - `data/local-db/invoiceCourierDetail.json`: `90` rows
11. Settings displayed storage mode correctly.
   - status observed: `Node Local DB`
12. No browser console errors or page errors were observed during the verification run.

## Storage Mode Clarification

- Browser shell still uses `DataStore + BrowserLocalStore` as the live UI store.
- When Dev API is available, the new storage bridge mirrors the saved collections into `data/local-db` JSON files.
- When Dev API is unavailable, the shell falls back cleanly and reports fallback mode in Settings.

## Supporting Automated Coverage

- `npm run test:data` passed
- `npm run test:import` passed
- `npm run test:ui` passed
- `npm run test:all` passed
