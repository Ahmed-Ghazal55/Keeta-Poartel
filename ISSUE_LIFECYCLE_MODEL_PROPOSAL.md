# Issue Lifecycle Model Proposal

Date: 2026-07-14
Scope: design proposal for Prompt 8.9 and related module cleanup prompts

## Goal

Issues should become a first-class operational concept across modules without turning every warning into a permanent stored record.

The issue model must distinguish between:

- derived issues
- actionable issues
- acknowledged issues
- resolved issues

## Core principle

An issue is usually a derived operational condition attached to an entity or process.

It is not automatically an audit event, and simply viewing it must not write data.

## Proposed issue categories

- `operations.assignment_gap`
- `operations.status_review_required`
- `operations.swap_followup`
- `operations.termination_pending`
- `hr.document_expiring`
- `hr.identity_mismatch`
- `fleet.vehicle_capacity_issue`
- `fleet.vehicle_compliance_issue`
- `fleet.unmatched_vehicle_assignment`
- `performance.validity_failure`
- `performance.vda_failure`
- `performance.face_verification_failure`
- `performance.delivery_experience_failure`
- `rules.missing_active_rule`
- `imports.validation_warning`
- `closing.reconciliation_gap`

## Proposed issue severity

- `info`
- `warning`
- `critical`

Severity must remain derived from rules, not manually color-picked in the UI.

## Proposed issue status

- `open`
- `acknowledged`
- `in_progress`
- `resolved`
- `dismissed`

## Proposed issue record shape

- `id`
- `type`
- `severity`
- `status`
- `title`
- `message`
- `entityType`
- `entityId`
- `module`
- `routeTarget`
- `context`
- `sourceBatchId`
- `ruleReference`
- `firstDetectedAt`
- `lastDetectedAt`
- `acknowledgedBy`
- `acknowledgedAt`
- `resolvedBy`
- `resolvedAt`
- `resolutionNote`

## How issues are created

### Derived issue generation

Generated when:

- an import batch is saved and normalized
- a business mutation changes related state
- a manual refresh explicitly recomputes issue views
- a scheduled monthly-rules resolution changes validity logic later if introduced

Derived generation does not mean every issue must be permanently stored.

Recommended approach:

- store stable actionable issues where user follow-up matters
- allow transient summaries for KPI and notification surfaces

### Manual issue creation

Not required for Prompt 8.x by default.

If introduced later, manual issue creation must be tightly scoped and audited as a true mutation.

## How issues change state

### Acknowledge

Use when the team has seen the issue and is working on it.

Examples:

- compliance document expiring soon
- performance row needs review

### In progress

Use when the issue triggered an operational action already underway.

### Resolved

Use when the underlying condition is fixed or the recompute no longer detects the issue.

### Dismissed

Use sparingly for known false positives or intentionally ignored cases.

Dismissal should record a reason.

## Relationship between issues and notifications

Notifications are delivery mechanisms.

Issues are operational objects.

Recommended model:

- an issue may produce a notification
- multiple notifications may refer to one issue over time
- viewing or clearing a notification must not mutate the issue automatically unless explicitly designed

## Relationship between issues and audit logs

- Issue derivation alone should not create an audit event.
- Opening issue drawers or issue pages must not create an audit event.
- Explicit issue-state mutation such as acknowledge, dismiss, or resolve may create an audit event only if implemented as a service-layer mutation later.
- The audit log remains a record of real mutations, not a mirror of every derived warning.

## Module routing behavior

Each issue should deep-link the user into a relevant operational context:

- operations issue -> operations subpage and filtered record
- HR issue -> rider detail drawer or archive context
- fleet issue -> vehicle detail drawer or issue table
- performance issue -> performance page with the affected rider or user context
- import issue -> import batch detail
- closing issue -> reconciliation page and batch context later

## UI display proposal

- topbar notification bell shows counts by severity
- module landing sections show issue summary cards
- tables may display issue badges per row
- details drawers show issue timeline and related source data
- dedicated issue-focused subpages should group by severity, type, and owner

## Data freshness model

Issue derivation should run:

- after relevant imports
- after relevant mutations
- on explicit refresh

Issue derivation should not run continuously on clock ticks or passive navigation.

## Implementation notes for later prompts

- Start with read-only derived issue views where possible.
- Introduce persistent issue-state transitions only when the workflow genuinely needs them.
- Reuse route metadata so issue links remain stable after page refactors.
