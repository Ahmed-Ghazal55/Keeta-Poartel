# Monthly Rules Schema

## الكيان
`monthlyRules`

## الغرض
تخزين Rule شهرية versioned حسب:
- `month`
- `platform`
- `city scope`
- `register scope`

## الحقول العليا
- `id`
- `month`
- `platform`
- `status`
- `version`
- `cityScope`
- `selectedCities`
- `registerScope`
- `selectedRegisters`
- `effectiveFrom`
- `effectiveTo`
- `notes`
- `previousVersionId`
- `source`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`
- `lockedAt`
- `lockedBy`
- `lockedFromStatus`
- `archivedAt`
- `archivedBy`

## الأقسام الداخلية

### `validDayRules`
- `enabled`
- `validDayMode`
- `minOrdersCar`
- `minOrdersBike`
- `minWorkingHoursCar`
- `minWorkingHoursBike`
- `minOnlineHours`
- `allowManualOverride`

### `mandatoryDaysRules`
- `enabled`
- `mandatoryDates`
- `mandatoryWeekdays`
- `minRequiredValidMandatoryDays`
- `allowMissedMandatoryDays`
- `missingMandatoryDayPenalty`
- `note`

### `vehicleRules`
- `car`
- `bike`

### `incentiveRules`
- `enabled`
- `currency`
- `carTiers`
- `bikeTiers`
- `companyCommission`

### `attendanceRules`
- `enabled`
- `minimumValidDays`
- `allowGraceDays`

### `orderRules`
- `enabled`
- `mandatoryDayMinOrders`
- `regularDayMinOrders`

### `ataRules`
- `enabled`
- `minScore`
- `maxLateCount`
- `penaltyRules`
- `affectsValidity`
- `affectsIncentive`

### `cancellationRules`
- `enabled`
- `maxRejectsPerDay`
- `penaltyAfterRejects`
- `penaltyAmount`
- `affectsValidity`
- `affectsIncentive`

### `faceVerificationRules`
- `enabled`
- `passRateRequired`
- `skipCountsAsFail`
- `firstResultDateIsStart`
- `excludeNoResultDays`
- `allowExpectedProjection`

### `vdaRules`
- `enabled`
- `requiredStatus`
- `invalidStatuses`
- `affectsValidity`
- `affectsSalaryEligibility`

### `deliveryExperienceRules`
- `enabled`
- `minGrade`
- `gradeScores`
- `affectsIncentive`

### `complianceRules`
- `stcPayRequired`
- `bagRequired`
- `vehiclePhotoRequired`
- `licenseRequired`
- `healthCardRequired`

### `salaryEligibilityRules`
- `enabled`
- `minimumValidDays`
- `minimumOrdersCar`
- `minimumOrdersBike`

## حالات الـ Rule
- `draft`
- `active`
- `locked`
- `archived`

## ملاحظات تصميمية
- لا يسمح بأكثر من `active` Rule لنفس `month + platform + cityScope + selectedCities + registerScope + selectedRegisters`.
- `locked` لا تُعدل مباشرة إلا بصلاحية `monthlyRules.unlock`.
- `archived` لا تستخدم في الحل التشغيلي.
