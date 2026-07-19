# File Detection Rules

Date: 2026-07-10
Workspace: `D:\keeta operations portal`

## Engine Files

- `src/import/importTypes.js`
- `src/import/fileDetector.js`
- `src/import/workbookReader.js`
- `src/import/csvReader.js`
- `src/import/headerMapper.js`

## Supported File Containers

- `.xlsx`
- `.xls`
- `.xlsm`
- `.csv`
- `.txt`
- `.json`
- `.zip` as reference only

## Registered Import Types

The Prompt 3 registry supports:

- `hr_master_workbook`
- `rider_master_workbook`
- `dashboard_users_workbook`
- `dashboard_users_csv`
- `opr_workbook`
- `opr_csv`
- `vehicle_workbook`
- `performance_daily_csv`
- `performance_daily_workbook`
- `performance_overall_csv`
- `performance_overall_workbook`
- `vda_csv`
- `vda_workbook`
- `vda_keeta_csv`
- `vda_keeta_workbook`
- `face_verification_csv`
- `face_verification_workbook`
- `delivery_experience_csv`
- `delivery_experience_workbook`
- `company_invoice_workbook`
- `internal_settlement_workbook`
- `monthly_closing_bundle`
- `shift_schedule_workbook`
- `shift_schedule_xlsm`
- `settings_workbook`
- `unknown`
- `zip_reference`

## Detection Strategy

Detection does not rely on the file name alone.

Each candidate type is scored using weighted signals:

- `extension`: 0.08
- `fileNameScore`: 0.16
- `sheetNamesScore`: 0.20
- `headersScore`: 0.28
- `sampleRowsScore`: 0.10
- `formulaScore`: 0.06
- `knownArabicTermsScore`: 0.06
- `knownEnglishTermsScore`: 0.06

Additional boost logic is applied for strong matches:

- extra boost for multiple file-name term hits
- extra boost for multiple sheet-name hits
- extra boost for dense header matches
- extra boost when required header families are fully satisfied

## Confidence States

- `confidence >= 0.85` -> `auto_detected`
- `0.60 <= confidence < 0.85` -> `needs_review`
- `confidence < 0.60` -> `manual_mapping_required`

If no type reaches review confidence, the result becomes `unknown`.

## City Detection

Cities are detected from:

- file name
- sheet names
- headers
- sample row values

Current normalized city outputs:

- `جدة`
- `الرياض`
- `multi`
- empty string when not detected

If multiple city signals are found, result becomes `multi`.

If no city signal is found, warning `city_not_detected` is added.

## Register Detection

Registers are detected from:

- file name
- sheet names
- headers
- sample row values

Primary signals prefer file and sheet names before row-value fallback.

Normalized register outputs:

- `EXPRESS`
- `ALBAWABA`
- `TOGARY`
- `PER_ORDER`
- `FR_3PL`
- `PER_ORDER_FR3PL`
- `MULTI`
- empty string when not detected

If multiple register signals are found, result becomes `MULTI`.

If no register signal is found, warning `register_not_detected` is added.

## Month Detection

Month detection uses:

- file name
- sheet names
- headers
- sample values

Supported month patterns include:

- `YYYY-MM`
- `YYYYMMDD`
- `MM-YYYY`
- compact year-month fragments embedded in file names

Output format is normalized to `YYYY-MM` plus a derived date range.

If month is expected for the detected type but not found, warning `month_not_detected` is added.

## Workbook-Aware Detection

`src/import/workbookReader.js` feeds detection with:

- sheet names
- best headers
- row counts
- sample rows
- formula function names
- merged-cell count
- hidden-sheet flags
- conditional-formatting count when metadata exists
- data-validation count when metadata exists

## Legacy Monthly Engine Boost

`src/import/fileDetector.js` also consults the older `MonthlyClosingEngine.detectMonthlyFileType()` when available.

Legacy detections are mapped into Prompt 3 types:

- `company_invoice` -> `company_invoice_workbook`
- `internal_settlement` -> `internal_settlement_workbook`
- `face_recognition` -> `face_verification_workbook`
- `company_vda` -> `vda_workbook`

This keeps Prompt 3 compatible with the real monthly-closing workbook family already reviewed in Prompt 0 and V9.

## Detection Output Shape

Each detected file returns:

- `type`
- `confidence`
- `confidenceState`
- `reasons`
- `warnings`
- `detectedCity`
- `detectedRegister`
- `detectedRegisterLabel`
- `detectedMonth`
- `dateRange`
- `detectedSheets`
- `detectedHeaders`
- `scoreBreakdown`
- `secondBest`

## Known Limitations

- Google Sheets exports do not always preserve conditional-format metadata in a way that SheetJS exposes reliably.
- Data validation metadata may also be absent in exported workbooks.
- `.zip` files are tracked only as references in Prompt 3 and are not unpacked.
- Ambiguous files are intentionally pushed into review instead of being auto-saved.
