# Prompt 4 Final Report

## What Was Implemented

Prompt 4 added a working HR + Rider Master foundation on top of the existing offline portal:

- HR workbook normalization
- rider matching and deduplication
- HR validation rules
- archive event generation
- import pipeline integration
- Prompt 4 UI shells
- Prompt 4 tests
- Prompt 4 reporting

## Files Created

- `keeta_operations_portal_hr_extension.js`
- `tests/hrNormalizer.test.js`
- `tests/riderMatching.test.js`
- `tests/hrValidator.test.js`
- `tests/hrImportIntegration.test.js`
- `tests/riderArchive.test.js`
- `HR_WORKBOOK_ANALYSIS.md`
- `HR_RIDER_MASTER_IMPLEMENTATION_REPORT.md`
- `RIDER_MATCHING_RULES.md`
- `HR_VALIDATION_RULES.md`
- `RIDER_ARCHIVE_DESIGN.md`
- `HR_IMPORT_TEST_RESULTS.md`
- `PROMPT_4_FINAL_REPORT.md`

## Files Updated

- `src/import/importTypes.js`
- `src/import/importNormalizer.js`
- `src/import/importValidator.js`
- `src/import/importBatchService.js`
- `src/hr/riderNormalizer.js`
- `src/data/entitySchemas.js`
- `src/data/repositories.js`
- `src/auth/rbac.js`
- `keeta_operations_portal_starter_v4.html`
- `keeta_operations_portal_ui_redesign.js`
- `package.json`

## How `البوابة المقبلة.xlsx` Was Analyzed

The workbook was reviewed with the existing project import stack and the Prompt 4 HR stack:

- sheet inventory through `xlsx`
- workbook summary through `src/import/workbookReader.js`
- file detection through `src/import/fileDetector.js`
- logical role classification through `src/hr/riderNormalizer.js`
- issue counting through `src/hr/hrValidator.js`

Detected result:

- type: `hr_master_workbook`
- confidence: `0.8066`
- city scope: `multi`
- register scope: `MULTI`

Important workbook facts:

- it contains official HR sheets, archive sheets, support/compliance sheets, and platform sheets together
- it is a valid real baseline for Prompt 4
- `شفز` is unusable because the exported sheet is `#REF!`
- month detection is noisy because of Google Sheets serial/date values and should not be trusted here

## How `hrProfiles` Are Generated

1. HR-like sheets are classified as `hr_master` or `archive`.
2. Raw rows are normalized using iqama, names, city, register, status, employment type, and platform hints.
3. Duplicate raw HR rows are merged by stable identity keys.
4. Health card and license support sheets enrich the final profile.
5. Risk flags like `expired_health_card` are added when detected.

Current baseline output:

- `719` `hrProfiles`

## How `riders` Are Generated

1. The system builds normalized `hrProfiles`.
2. Platform sheets are normalized into raw platform accounts.
3. Matching logic compares iqama, phone, name similarity, and platform user ID context.
4. One stable rider record is created or matched for each person.
5. The rider then becomes the parent for identities, platform accounts, and archive events.

Current baseline output:

- `569` `riders`

## How One Iqama Can Link To Multiple Platforms

Prompt 4 intentionally separates:

- person-level record: `riders`
- identity-level links: `riderIdentities`
- account-level links: `riderPlatformAccounts`

This allows the same iqama to own:

- multiple Keeta IDs
- multiple Jahez accounts
- Ninja or Hungerstation accounts
- future additional platform accounts

without duplicating the rider as a person.

## How Duplicates Are Detected

- same iqama -> strongest same-rider signal
- same phone plus similar name -> possible same rider
- same platform user ID in the same scope -> possible same rider
- name-only similarity -> warning only, never auto-merge

## How Conflicts Are Detected

- same user ID across multiple iqamas -> high conflict
- same phone across multiple iqamas -> high conflict
- duplicate iqama across multiple rider records -> conflict / review path

The current real workbook baseline normalized cleanly enough to produce:

- `0` emitted matching conflicts in the first baseline build

That is good for an initial master import, but future changing operational files are still expected to surface review conflicts.

## Import Output From The Real Workbook Baseline

- `rawProfiles`: `931`
- `platformAccountsRaw`: `3703`
- `hrProfiles`: `719`
- `riders`: `569`
- `riderIdentities`: `4004`
- `riderPlatformAccounts`: `3703`
- `riderArchiveEvents`: `2105`

## Test Results

Passed:

- `npm run test:hr`
- `npm run test:all`

Browser verification passed on:

- `http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html`

Verified:

- Prompt 4 pages render correctly
- empty states are safe
- no serious console/page errors remain

## Current Limitations

- `شفز` source sheet is broken as `#REF!`, so Chefz account extraction is not available yet.
- `حالات اصدار رخص البوابة` needs a dedicated parser if it will become an authoritative license-progress input.
- The workbook contains support sheets that are useful later but are not forced into Prompt 4 entities yet.
- The Prompt 4 UI currently shows empty states until the user saves an HR workbook through the existing Import Center flow.
- Prompt 4 does not yet implement assignment, swapping, termination, or full operational action handling.

## What Prompt 5 Should Build Next

Prompt 5 should build the operations module on top of the rider master foundation:

- first placement / onboarding workflow
- active users view
- working riders view
- swapping workflow
- user status change workflow
- termination workflow
- conflict review queue
- account-level operational actions linked to `riderPlatformAccounts`
- archive enrichment from real operational actions

## Final Status

Prompt 4 is complete enough to serve as the master rider data foundation and can safely hand off to the operations-focused next prompt.
