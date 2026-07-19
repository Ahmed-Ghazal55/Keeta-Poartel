# Data Privacy And GitHub Note

## Important

Prompt 2 adds local runtime storage and a local JSON database for development only.

This is not production security.

## What Must Not Be Committed

Do not push real operational data to GitHub, especially:

- iqama numbers
- phone numbers
- salary or settlement amounts from real couriers
- national IDs
- real user account/session data
- any private partner invoice details that should stay internal

## Current `.gitignore`

The project now ignores:

```gitignore
data/local-db/*.json
data/backups/
.env
*.log
```

## What Is Safe To Keep In Git

These can remain tracked:

- `data/seed/*.json`
- `data/schema/*.json`
- `server/`
- `tests/`
- browser/runtime source code

## Seed Data Policy

Use seed/demo data only for:

- UI behavior
- RBAC scenarios
- local smoke tests
- API smoke tests

Do not replace seed files with real rider or payroll data.

## Runtime Data Policy

`data/local-db/` is runtime/dev-state only.

Treat it as disposable local data, not as a source-controlled truth set.

## Current Recommendation

Before any real operational rollout:

1. move sensitive data out of Git-managed runtime folders
2. use environment-based secrets
3. replace dev auth with real authentication
4. define privacy rules for imported workbooks and exports
