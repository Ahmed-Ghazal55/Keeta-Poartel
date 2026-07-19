# Mandatory Days Engine Rules

Date: 2026-07-12

## Implemented file

- `src/performance/mandatoryDaysEngine.js`

## Supported inputs

- fixed `mandatoryDates`
- generated `mandatoryWeekdays`
- `minRequiredValidMandatoryDays`
- `allowMissedMandatoryDays`
- rider start-date inference from daily rows

## Core behavior

`evaluateMandatoryDays(dailyRows, rules, options)`:

1. Expands the month rule into a final date list.
2. Builds a date-to-row map.
3. Excuses earlier mandatory dates if the rider appears to have started after the month began and there is no row for those dates.
4. Counts:
   - valid mandatory days
   - invalid mandatory days
   - no-data mandatory days
5. Decides whether the rider met the mandatory attendance requirement.

## Output summary fields

- `dates`
- `effectiveDates`
- `excusedDates`
- `valid`
- `invalid`
- `noData`
- `missed`
- `required`
- `allowedMissed`
- `met`
- `warnings`
- `reasons`
- `startedAfterMonthStart`

## Cases covered by tests

- 6 of 7 mandatory days passes with `allowMissedMandatoryDays = 1`
- 5 of 7 fails
- weekday-generated mandatory days are supported
- no-data mandatory dates are counted
- late month start can excuse earlier mandatory dates
