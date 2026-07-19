# Performance Rule Resolver Report

Date: 2026-07-12

## Implemented file

- `src/performance/performanceRuleResolver.js`

## Responsibility

`resolvePerformanceRules(input)` builds the effective rule package for daily validity, mandatory days, salary eligibility, incentive eligibility, face verification, VDA, and delivery experience.

## Inputs supported

- `city`
- `register`
- `platform`
- `month`
- `date`
- `vehicleType`
- `globalContext`
- `monthlyRulesService`

## Resolution flow

1. Normalize scope fields:
   - city
   - register
   - platform
   - month

2. Build a legacy fallback rule from preserved hard-coded settings.

3. Ask `monthlyRulesService.resolveRulesForContext(context, date)`.

4. If no direct active rule is returned, try `getActiveRules(...)`.

5. Merge the resolved active rule with the fallback rule.

6. Add runtime metadata:
   - `appliedRuleId`
   - `appliedRuleVersion`
   - `fallbackUsed`
   - `fallbackParts`
   - `warnings`
   - `activeRule`
   - `matches`

## Resolver helpers

- `getValidDayCriteria(rules, vehicleType)`
- `getMandatoryDayPolicy(rules, month)`
- `getFaceVerificationPolicy(rules)`
- `getVdaPolicy(rules)`
- `getDeliveryExperiencePolicy(rules)`
- `getCancellationPolicy(rules)`
- `getAtaPolicy(rules)`
- `getCompliancePolicy(rules)`
- `expandMandatoryDates(rules, month)`

## Important Prompt 7 detail

The final valid-day criteria now prioritize explicit `validDayRules` values over default `vehicleRules` values. This fixed the bike/car threshold mismatch caught by `dailyPerformanceEngine.test.js`.
