# Notification Audit Separation Report

Date: 2026-07-14

## Principle

Notifications and audit logs are separate lifecycles.

- Notifications represent derived attention items.
- Audit logs represent confirmed business mutations.

## Allowed notification behavior

The notification center may:

- derive warnings from imports
- derive warnings from issues
- derive warnings from monthly-rule lifecycle events
- derive storage warnings
- store notifications
- mark notifications as read
- clear notifications

None of those actions should create a business audit row by themselves.

## Disallowed notification-to-audit behavior

Never create audit rows for:

- notification creation by system
- notification sync
- notification panel open
- notification filtering
- notification marked read
- notification derived from an existing issue

## Verified behavior

Browser verification after one real business row existed:

- Audit count before notification open: `1`
- Audit count after notification open: `1`
- Delta: `0`

This confirms that the topbar notification drawer is not writing to the Operations Log.

## Code outcome

- Notification derivation remains in notification modules.
- Business audit creation remains in mutation services only.
- No notification module is used as an audit producer for read-only UI behavior.

## Conclusion

Notification visibility and notification derivation are now explicitly separated from the business audit lifecycle.
