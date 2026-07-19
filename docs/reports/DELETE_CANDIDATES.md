# Delete Candidates

Review date: 2026-07-09

## Removed During This Pass

- `.monthly-files.json`
  Temporary workbook-inspection artifact. Removed.
- `.http-server.log`
  Temporary localhost verification log. Removed.
- `.http-server.err.log`
  Temporary localhost verification error log. Removed.

## Safe To Review Later

- old prompt/reference markdown files in the workspace root
  Keep for now. They are useful for implementation traceability, but they are not runtime files.
- legacy static reference HTML files such as `Welcome.html` and the old shift-planner demos
  Keep for now. They are useful as visual/reference artifacts until the user approves archiving.
- duplicated sample exports and zip bundles used only as source references
  Keep for now. They support regression testing and monthly-closing schema review.

## Not Deleted Automatically

- Any top-level workbook or CSV used by tests or by the new reference folders
- Any active V4/V9 runtime file
- Any documentation file created during the V6 and V9 migration work
