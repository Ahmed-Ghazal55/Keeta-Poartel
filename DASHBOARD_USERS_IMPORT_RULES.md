# Dashboard Users Import Rules

## Supported Import Types

- `dashboard_users_workbook`
- `dashboard_users_csv`

## Primary Target

- `dashboardUsers`

## Secondary Target

- `operationalStatusReviews`

## Import Flow

1. Detect file type through Prompt 3 registry and detector.
2. Map headers using `src/import/headerMapper.js`.
3. Normalize current dashboard rows into Prompt 5 dashboard user records.
4. Load existing `dashboardUsers` from `DataStore`.
5. Compare current scoped snapshot with previous scoped snapshot.
6. Mark:
   - new users
   - changed users
   - missing users
   - duplicate dashboard user ids
7. Build `operationalStatusReviews`.
8. Save both entities through `importBatchService`.
9. Record audit events.

## Stable Identity Rules

- logical dashboard key: `dashboardUserId`
- persisted fallback id: reuse existing record `id` when the same `dashboardUserId` already exists
- new persisted id fallback: `dashboardUsers::<platform>::<dashboardUserId>`

## Platform Detection

Current rule order:

- `ninja` if file context contains `ninja`
- `jahez` if file context contains `jahez`
- `chefz` if file context contains `chefz` or `chefs`
- `hungerstation` if file context contains `hunger`
- `amazon` if file context contains `amazon`
- `keeta` if file context contains `dashboard`, `dash`, `keeta`, or `تشغيل`
- otherwise `unknown`

## Real Header Mapping Confirmed

Validated on real file:

- `تشغيل كيتا جدة شهر يوليو - Dash_EXPRESS.csv`

Confirmed mapped fields:

- `userId`
- `personalName`
- `familyName`
- `fullName`
- `iqama`
- `phone`
- `email`
- `vehicleType`
- `status`
- `reviewStatus`
- `documentChangeStatus`
- `notes`
- `settlementMode`
- `qualificationType`
- `register`
- `licenseType`
- `driverCard`

## Snapshot Diff Rules

Tracked field change detection currently includes:

- `jobStatus`
- `vehicleType`
- `vehicleSerial`
- `plateNumber`
- `city`
- `register`
- `ownerIqama`
- `ownerPhone`
- `activationStatus`

## Missing User Rule

If a dashboard user existed in the previous scoped snapshot but is absent in the latest scoped snapshot:

- `missingFromLatestImport = true`
- `reviewStatus = missing_from_latest_import`
- `recommendedAction = review_termination`

No automatic termination is created during import.

## Audit Rules

Dashboard import save records:

- `dashboard_users_import_processed`
- `dashboard_user_created`
- `dashboard_user_updated`
- `dashboard_user_missing_from_latest_import`
- `status_review_created`

## Current Limits

- `dashboardName` currently falls back to the normalized register label.
- city detection still depends on batch defaults or mapped city where provided.
- platform detection is filename/context based and should be expanded if new dashboard families are introduced.
