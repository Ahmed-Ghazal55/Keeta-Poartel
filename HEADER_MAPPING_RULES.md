# Header Mapping Rules

Date: 2026-07-10
Workspace: `D:\keeta operations portal`

## Engine File

- `src/import/headerMapper.js`

## Goal

Prompt 3 adds a bilingual header-mapping layer so the import pipeline can read Arabic and English exports without hard-coding one exact header row per file.

## Supported Canonical Fields

The mapper currently resolves these canonical fields:

- `userId`
- `iqama`
- `fullName`
- `phone`
- `vehicleType`
- `vehicleSerial`
- `status`
- `city`
- `register`
- `month`
- `date`
- `deliveredTasks`
- `onlineHours`
- `vda`
- `iban`
- `partnerId`
- `partnerName`
- `notes`

## Important Alias Families

Examples included in the mapper:

- `userId`: `user id`, `rider id`, `courier id`, `معرف`, `معرّف السائق`, `رقم اليوزر`
- `iqama`: `iqama`, `national id`, `رقم الهوية`, `الإقامة`, `رقم الاقامة`
- `fullName`: `name`, `full name`, `اسم المندوب`, `الاسم`, `اسم صاحب الايدي`
- `phone`: `phone`, `mobile`, `رقم الهاتف`, `الجوال`
- `vehicleType`: `vehicle`, `vehicle type`, `المركبة`, `نوع المركبة`
- `status`: `status`, `job status`, `الحالة`, `حالة التفعيل`
- `city`: `city`, `branch`, `operation city`, `المدينة`
- `register`: `register`, `dashboard`, `company`, `السجل`, `الشركة`, `3pl name`

## Header Row Detection

Prompt 3 does not assume the first row is always the real header row.

`findHeaderRow()` scores the first candidate rows by:

- how many known fields were mapped
- how many short header-like cells exist in the row

The best row is used as the effective header row.

This is important because several real exports include:

- title rows above the headers
- partially merged labels
- Google Sheets style wrapper rows

## Mapping Output

`mapHeaders(headers, requiredFields)` returns:

- `headers`
- `byField`
- `byHeader`
- `mappedFields`
- `mappedCount`
- `coverage`
- `missingRequired`
- `unknownHeaders`

This output is reused by:

- file detection
- import preview
- validation
- normalization

## Row Extraction

`rowsFromMatrix(matrix, headerRowIndex)` converts a matrix into row objects keyed by the detected headers.

Empty rows are skipped automatically.

## Value Access

`getValue(row, mapping, fieldName)` reads a canonical field from a row using the resolved header mapping instead of relying on raw source header text.

## Prompt 3 Coverage Result

The automated tests confirmed:

- English `userId` aliases resolve correctly
- Arabic `iqama` aliases resolve correctly
- city and register aliases resolve correctly
- mixed Arabic and English headers are supported
- title rows can be skipped to find the actual header row

## Current Limitation

Header mapping is intentionally permissive but still basic:

- it does not yet learn new aliases at runtime
- it does not yet expose a persistent alias administration UI
- it does not yet map every possible monthly-closing special column

Those can be extended safely in later prompts without changing the current import contract.
