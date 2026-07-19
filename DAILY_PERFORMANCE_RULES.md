# Daily Performance Rules

Date: 2026-07-12

## Implemented file

- `src/performance/dailyPerformanceEngine.js`

## Normalized daily fields

The engine reads and normalizes:

- `date`
- `month`
- `platform`
- `city`
- `register`
- `vehicleType`
- `workMode`
- `dashboardUserId`
- `userId`
- `riderId`
- `iqama`
- `orders`
- `completedOrders`
- `deliveredTasks`
- `cancelledOrders`
- `rejectedOrders`
- `workingHours`
- `onlineHours`
- `ataScore`
- `lateCount`
- `cancellationRate`
- `attendanceStatus`

## Valid-day modes supported

- `orders_only`
- `hours_only`
- `orders_or_hours`
- `orders_and_hours`

## Rule source

Daily thresholds come from `getValidDayCriteria(rules, vehicleType)`:

- car thresholds
- bike thresholds
- optional online-hours threshold
- fallback to preserved legacy rules if monthly rule is missing

## Output statuses

`calculateDailyPerformance(row, rules)` returns:

- `validDayStatus`
  - `valid`
  - `invalid`
  - `no_data`

- `mandatoryDayStatus`
  - `mandatory_valid`
  - `mandatory_invalid`
  - `no_data`
  - `not_mandatory`

## Important Prompt 7 fix

Bike daily thresholds now correctly use explicit bike values from `validDayRules` before falling back to default `vehicleRules`.
