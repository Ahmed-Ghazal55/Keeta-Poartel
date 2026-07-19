# Performance Template Reference Notes

## Scope in Prompt 8

Prompt 8 does not rebuild the Prompt 7 performance engines.

The performance templates remain registered and documented, while the exact production mapping from `شيت الاداء.xlsx` is treated as a reference note for the later import refinements.

## Reference file

- `شيت الاداء.xlsx`

## Current registry status

The template registry already includes:

- `daily_performance`
- `overall_performance`

These are usable as structured placeholders without removing or breaking the Prompt 7 engines.

## Current expected fields

The current registry preserves a minimal normalized performance shape:

- date/month
- user id
- iqama
- full name
- city
- register
- vehicle type
- completed orders
- cancelled orders
- rejected orders
- working/online hours
- attendance status
- ATA / late count / cancellation rate

## Implementation note

If the future company sheet differs from the current placeholder layout, the import stage should be updated at the template/normalizer layer only.

The Prompt 7 calculation engines should stay intact and consume normalized rows after mapping.
