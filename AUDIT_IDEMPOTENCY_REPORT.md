# Audit Idempotency Report

Date: 2026-07-14

## Rule

Every allowlisted business mutation must carry a stable idempotency key.

If the same idempotency key is seen again:

- no duplicate audit row is created
- the existing row is returned

## Implemented examples

```text
import_batch_saved:{importBatchId}
import_batch_rejected:{importBatchId}
assignment_created:{assignmentId}
swap_confirmed:{assignmentId}
termination_created:{terminationId}
stop_without_replacement_confirmed:{terminationId}
vehicle_marked_under_review:{vehicleId}
vehicle_excluded:{vehicleId}:{newStatus}
monthly_rule_created:{ruleId}
monthly_rule_published:{ruleId}:{version}
monthly_rule_locked:{ruleId}:{lockedAt}
performance_calculation_finalized:{calculationRunId}
dev_data_reset_requested:{resetRunId}
dev_data_reset_completed:{resetRunId}
```

## Service behavior

Implemented in:

- [src/audit/auditLogService.js](D:/keeta%20operations%20portal/src/audit/auditLogService.js)

Key behavior:

- if idempotency key exists and is already stored, return the existing row
- if key is missing for an allowlisted mutation event, ignore the attempted write

## Test coverage

`tests/auditLogPolicy.test.js` covers duplicate prevention for repeated idempotency keys.

## Browser-verified example

Safe business mutation used in browser verification:

- `vehicle_marked_under_review:vehicle_jed_1001`

Observed result:

- count before mutation: `0`
- count after mutation: `1`
- repeating UI read actions after that event did not create any duplicates

## Conclusion

The audit log is now idempotent by design instead of append-only by accident.
