# Rider Matching Rules

## Goal

Prompt 4 must treat a rider as one operational person even if the same person appears in:

- official HR sheets
- archive sheets
- Keeta accounts
- Hungerstation accounts
- Jahez accounts
- Ninja accounts
- Amazon accounts

The matching logic is implemented in `src/hr/riderMatching.js`.

## Matching Priority

### 1. Same iqama

- Rule: same normalized iqama means same rider
- Confidence: `0.99`
- Match reason: `same_iqama`
- Expected use: strongest identity key across HR and platform sheets

### 2. Same phone plus similar name

- Rule: same normalized Saudi phone plus similar normalized name can match
- Confidence: `0.84`
- Match reason: `same_phone_similar_name`
- Purpose: helps when platform row is missing iqama but still looks operationally consistent

### 3. Same platform user ID in the same scope

- Rule: same platform user ID on the same platform with matching city/register scope can match
- Confidence: `0.74`
- Match reason: `same_platform_user_id_same_scope`
- Purpose: links recurring dashboard/platform accounts

### 4. Name-only similarity

- Rule: name similarity alone never auto-merges riders
- Result: warning only
- Warning code: `name_only_similarity`

## Conflict Rules

### Duplicate iqama across multiple riders

- Conflict code: `duplicate_iqama_multiple_riders`
- Result:
  - no confident auto-merge
  - low confidence response
  - review required

### Same phone across multiple iqamas

- Conflict code: `same_phone_multiple_iqamas`
- Result: review required

### Same phone with clear name mismatch

- Warning code: `same_phone_name_mismatch`
- Result: do not merge automatically

### Same platform user ID linked to multiple iqamas

- Conflict code: `same_user_id_multiple_iqamas`
- Result: high-risk conflict and review required

## Output Contract

Each match attempt returns:

```js
{
  matchedRiderId,
  confidence,
  matchReason,
  warnings,
  conflicts
}
```

## Merge Policy

- Same iqama can legitimately have multiple platform accounts.
- Multiple user IDs under one iqama are allowed and stored in `riderPlatformAccounts`.
- A user ID reused across different iqamas is not allowed to auto-merge and should be treated as a conflict.
- Names are helper signals only and never a primary merge key.

## Data Sources Used By Matching

- `riders`
- `riderIdentities`
- `riderPlatformAccounts`

The matching context is built from existing saved data so future imports can merge into the rider master instead of recreating duplicate riders.

## Test Coverage

Covered in `tests/riderMatching.test.js`:

- same iqama maps to one rider
- same phone with similar name matches
- name-only similarity does not auto-merge
- one iqama can have multiple user IDs
- one user ID across multiple iqamas becomes a high conflict

## Real Workbook Observation

On the current `البوابة المقبلة.xlsx` baseline:

- no high-conflict matches were emitted by the baseline normalization run
- this means the current extraction can produce a stable initial rider master
- future imports are still expected to surface conflicts once operational sheets begin changing over time
