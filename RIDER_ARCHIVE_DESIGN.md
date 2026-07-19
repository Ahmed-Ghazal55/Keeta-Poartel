# Rider Archive Design

## Goal

Prompt 4 introduces a cross-platform rider archive so every rider can accumulate a timeline, even before the full operations module is built.

Implementation file:

- `src/hr/riderArchive.js`

## Stored Entity

The archive persists into:

- `riderArchiveEvents`

Core shape:

```js
{
  id,
  riderId,
  eventType,
  eventDate,
  city,
  register,
  platform,
  before,
  after,
  source,
  sourceFile,
  note,
  createdBy,
  createdAt
}
```

## Event Types Currently Generated

### `imported`

- generated for every HR profile that resolves to a rider
- tells us when a rider first entered the Prompt 4 master from a workbook import

### `license_updated`

- generated when a profile has usable license information
- stores `licenseType` and `licenseExpiry` in `after`

### `health_card_updated`

- generated when health card information exists
- stores `healthCardNumber` and `healthCardExpiry` in `after`

### `status_changed`

- generated from workbook status events when they can be mapped back to a rider

## Event Counts From The Real Workbook Baseline

From `البوابة المقبلة.xlsx`:

- `imported`: `719`
- `license_updated`: `697`
- `health_card_updated`: `666`
- `status_changed`: `23`
- total archive events: `2105`

## Generation Flow

1. Normalize workbook into raw HR rows, support rows, and platform rows.
2. Build `hrProfiles`.
3. Build riders and assignments.
4. Generate archive events using rider assignments so every event is attached to a stable `riderId`.
5. Save archive events through the Prompt 3 import batch service.

## Query Behavior

Archive helper functions support:

- stable imported-event creation
- newest-first timeline sorting
- filtering by:
  - `riderId`
  - `city`
  - `register`
  - `platform`
  - `eventType`

## UI Usage

Prompt 4 surfaces archive data in:

- `archive-shell`
- rider detail drawer inside `rider-master`

If no data is saved yet, the UI shows a safe empty state instead of breaking.

## Prompt 5 Ready Extensions

The current archive structure is intentionally prepared for future operational events such as:

- `assigned`
- `swapped`
- `terminated`
- `note_added`
- `account_status_changed`
- `vehicle_linked`

That means Prompt 5 can extend the archive instead of redesigning it.
