# HR Workbook Analysis

## Scope

- Reviewed workbook: `البوابة المقبلة.xlsx`
- Review date: `2026-07-10`
- Review tools:
  - `vendor/xlsx.full.min.js`
  - `src/import/workbookReader.js`
  - `src/import/fileDetector.js`
  - `src/hr/riderNormalizer.js`
  - `src/hr/hrValidator.js`

## Detection Result

- Detected type: `hr_master_workbook`
- Confidence: `0.8066`
- Confidence state: `needs_review`
- Detected city: `multi`
- Detected register: `MULTI`
- Second best type: `opr_workbook` at `0.6027`

## Important Detection Notes

- The workbook mixes HR master sheets, archive sheets, supporting compliance sheets, and platform/operations sheets in one file.
- `detectedMonth = 2088-09` is a false positive caused by date-like cells and Google Sheets serial values. This month result should not be treated as business truth.
- `شفز` is currently broken at source level and exports as `#REF!`, so Prompt 4 cannot build usable Chefz accounts from this workbook.

## Workbook Role Map

### HR Master / Archive Sheets

| Sheet | Prompt 4 role | Parsed rows | Key link fields | Notes |
| --- | --- | ---: | --- | --- |
| `ارشيف البوابه واكسبرس` | `archive` | 430 | `employeeId`, `iqama`, `fullName`, `city`, `register`, `keetaId`, `hungerId`, `amazonId`, `jahezId`, `chefzId` | Historical HR-style archive with many formulas |
| `HR شركة البوابة المقبله` | `hr_master` | 232 | `employeeId`, `iqama`, `fullName`, `city`, `register`, `keetaId`, `hungerId`, `amazonId`, `jahezId`, `ninjaId`, `chefzId` | Main Albawaba HR source |
| `HR اكبريس جايت` | `hr_master` | 271 | `employeeId`, `iqama`, `fullName`, `city`, `register`, `keetaId`, `hungerId`, `amazonId`, `jahezId`, `ninjaId`, `chefzId`, `notes` | Main Express HR source |
| `HR مؤسسة البوابة` | `hr_master` | 93 | `employeeId`, `iqama`, `fullName`, `city`, `register`, `keetaId`, `hungerId`, `notes` | Smaller master sheet, mostly Riyadh rows |

### Supporting Sheets Used by Prompt 4

| Sheet | Prompt 4 role | Parsed rows | Keys / fields | Notes |
| --- | --- | ---: | --- | --- |
| `مناديب لم تعمل` | `never_worked` | 9 + 14 | `iqama`, `name`, `city`, `reason` | Dual-table layout split into two logical sections |
| `رخص النقل` | `licenses` | 83 + 50 | `iqama`, `name`, `city`, `licenseType`, `action`, `managerNote` | Dual-table layout split into Express and Albawaba sections |
| `كروت صحية` | `health_cards` | 319 | `iqama`, `healthCardNumber`, `healthCardExpiry` | Used to enrich `hrProfiles` and raise expiry flags |
| `حالات اصدار رخص البوابة` | `licenses` | 88 + 88 | license progress fields | Layout is not ideal for the current generic parser and needs a dedicated parser later |

### Platform Sheets Used by Prompt 4

| Sheet | Platform | Parsed rows | Main keys | Notes |
| --- | --- | ---: | --- | --- |
| `ايديهات كيتا` | `keeta` | 520 | `courier_id`, `IQAMA`, `NAME`, `Branche`, `Status` | Strong cross-link source for Keeta identity mapping |
| `اداء كيتا جدة` | `keeta` | 383 | `معرّف السائق`, `رقم بطاقة الهوية`, `رقم الهاتف`, `المؤسسة` | Daily performance-style Keeta source |
| `اداء كيتا الرياض` | `keeta` | 64 | `معرّف السائق`, `رقم بطاقة الهوية`, `رقم الهاتف`, `المؤسسة` | Riyadh-specific Keeta performance sheet |
| `بيانات هانجر` | `hungerstation` | 303 | `رقم الهوية المندوب`, `رقم الايدي`, `رقم الهاتف`, `مدينة العمل`, `السجل` | Main Hungerstation source |
| `امازون` | `amazon` | 25 | `رقم الايدي`, `رقم الاقامة`, `رقم جوال الحساب`, `السجل` | Small but usable |
| `Ninja` | `ninja` | 270 | `ID`, `رقم هوية المندوب`, `البريد الإلكتروني`, `المؤسسة`, `حالة الحساب` | Strong platform-specific source |
| `بيانات جاهز كل الفروع` | `jahez` | 745 | `الايدي`, `رقم الاقامة`, `مدينة العمل`, `اسم السجل` | Largest platform sheet in the workbook |
| `شفز` | `chefz` | 0 | none | Exported as `#REF!`; currently unusable |

### Context / Supporting Sheets Not Yet Used in Prompt 4 Import

| Sheet | Why not used yet |
| --- | --- |
| `Form Responses 5` | recruiting / survey source, not authoritative HR master data |
| `مشاكل هنقر` | operational issue-tracking sheet, better suited for Prompt 5 workflow queues |
| `سورس` | lookup/reference values, not rider master input |
| `البوابه من مقيم` | residency authority data, useful later for compliance reconciliation |
| `مقيم اكسبريس` | residency authority data, useful later for compliance reconciliation |
| `اكسبرس من التامينات` | insurance / GOSI data, not needed for Prompt 4 entity build |
| `تقرير تاشيرات الخروج والعوده` | travel/visa tracking, useful later for HR compliance |
| `بطاقات السائقين` | licensing card ledger, currently not normalized into Prompt 4 entities |

## Actual Normalization Output From This Workbook

- `rawProfiles`: `931`
- `platformAccountsRaw`: `3703`
- `healthCards`: `319`
- `licenses`: `100`
- `statusEvents`: `23`
- `hrProfiles`: `719`
- `riders`: `569`
- `riderIdentities`: `4004`
- `riderPlatformAccounts`: `3703`
- `riderArchiveEvents`: `2105`

## Status / Type Distribution

### HR status

- `active`: `505`
- `under_review`: `173`
- `inactive`: `31`
- `exited`: `10`

### Employment type

- `sponsorship`: `448`
- `unknown`: `271`

### Rider work status

- `under_review`: `532`
- `working`: `30`
- `previously_worked`: `4`
- `not_working`: `3`

### Platform accounts

- `jahez`: `1275`
- `keeta`: `1211`
- `hungerstation`: `662`
- `ninja`: `481`
- `amazon`: `74`
- `chefz`: `0`

## Main Linking Keys Across Sheets

- `iqama` is the strongest identity key across HR, archive, health card, license, Keeta, Jahez, Hungerstation, Amazon, and Ninja sheets.
- `employeeId` appears mainly in HR/archive sheets and helps keep official HR rows stable.
- `platform user ID` links operational accounts to the same rider across Keeta, Hungerstation, Ninja, Amazon, and Jahez.
- `phone` is a secondary helper key and should never be used alone for auto-merge.
- `city` and `register` are required to keep rider scope aligned with RBAC and organization filtering.

## Validation Signals Observed On The Real Workbook

- `missing_iqama`: `218`
- `missing_phone`: `719`
- `unknown_city`: `218`
- `unknown_register`: `220`
- `employment_type_unknown`: `271`
- `status_unknown`: `173`
- `expired_health_card`: `83`
- `expired_license`: `3`

## Interpretation Notes

- `missing_phone` is high because the official HR sheets do not consistently carry phone numbers; many phones exist only in platform sheets.
- The workbook is formula-heavy because it came from Google Sheets. Large formula counts appear especially in archive, Keeta, Hungerstation, and Jahez sheets.
- `حالات اصدار رخص البوابة` is structurally valuable but needs a custom parser to avoid partial/misaligned extraction.
- `شفز` is a source-data problem, not a Prompt 4 code problem.

## Prompt 4 Conclusion

- The workbook is suitable as a real Prompt 4 baseline.
- It already contains enough information to generate `hrProfiles`, `riders`, `riderIdentities`, `riderPlatformAccounts`, and `riderArchiveEvents`.
- Some sheets are intentionally deferred for later operational or compliance prompts rather than forced into the rider master now.
