# HR Computed Fields Report

## Scope

Prompt 8 added user-facing wrapper functions for the HR computed columns required by the imported Google-Sheets logic.

## Files

- `src/hr/hrComputedFieldsService.js`
- `src/hr/hrComputedFields.js`
- `tests/hrComputedFieldsService.test.js`
- `tests/hrComputedFields.test.js`

## Identity rules

The HR side keeps the required identity split:

- rider/employee key: `رقم الهوية`
- dashboard/platform key: `Courier ID` / `User ID`

No matching is based on name only.

## Exposed wrapper functions

- `computeDriverCard(...)`
- `computeWorkApps(...)`
- `computeKeetaCityRegister(...)`
- `computeKeetaId(...)`
- `computeHungerId(...)`
- `computeAmazonId(...)`
- `computeNinjaId(...)`
- `computeJahezId(...)`
- `computeChefzId(...)`
- `computeHrDisplayRow(...)`

## Prompt 8 fallbacks implemented

Examples confirmed in code/tests:

- driver card missing: `لم يتم اصدار بطاقة سائق بعد`
- no linked work apps: `لا يعمل حاليا`
- no Keeta ID: `لا يوجد ايدي`
- Hunger issues explain the missing-ID reason when available
- Chefz active/blocked states are rendered with explicit text outcomes

## Data-source model

The wrapper layer can ingest normalized sources such as:

- driver cards
- Keeta Jeddah performance
- Keeta Riyadh performance
- Keeta IDs
- Hunger data/issues
- Amazon
- Ninja
- Jahez
- Chefz
- repository `riderPlatformAccounts`

## Verification

Automated coverage:

- `tests/hrComputedFieldsService.test.js`
- `tests/hrComputedFields.test.js`
- included in `npm run test:fleet`
- included in `npm run test:all`
