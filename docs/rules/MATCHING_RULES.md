# Matching Rules

## Core Principle

The company courier invoice sheet is the source of truth for the final monthly rider row set. Internal sheets enrich, validate, and compare against that source.

## Matching Order

When matching a company rider row to an internal row, use this order:

1. exact `register + riderId + iqama`
2. fallback `register + iqama`
3. fallback `riderId + iqama`

## Difference Rules

A matched row is marked `different` when one or more of these checks fail:

- orders difference is greater than `0.001`
- distance difference is greater than `0.001`
- incentives difference is greater than `0.001`
- gross difference is greater than `1`

If no internal row is found, the row is marked `missing_internal`.

## Validity Rules

- Start from the company invoice `صالح` flag.
- If `VDA_Report` exists for the same rider, the final row only stays valid when the target-state text indicates success.
- Invalid riders receive:
  - zero capacity incentive
  - zero delivery-experience incentive

## Work-Day Rules

Settlement work days are sourced in this order:

1. `FR 3PL -> الايام`
2. company invoice `أيام الاتصال-صالحة`
3. `VDA_Report -> عدد ايام العمل للايدي`

The final settlement exposes this as `أيام العمل` for the salary bridge.

## Salary Bridge Rules

When a settlement row is applied into the salary calculator:

- vehicle type is mapped from settlement vehicle fields
- work days populate work-day and vehicle-day inputs
- valid rows force the salary validity override to `valid`
- invalid rows force it to `invalid`
- loans and deductions are pushed into the existing V4 calculator fields

## City Isolation

- Do not mix Jeddah and Riyadh in the same monthly closing run.
- The import and monthly pages keep city selection explicit.
- Generated reference folders are partitioned under `.../jeddah/...` for the current sample set.
