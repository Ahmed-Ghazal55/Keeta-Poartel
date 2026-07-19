# Import To Display Separation Plan

Date: 2026-07-14
Scope: architecture planning for Prompt 8.5 onward

## Why this separation is required

The current and future portal must not behave like a direct spreadsheet renderer.

Imports are messy, multilingual, alias-heavy, and sometimes partially broken. Daily business pages must remain curated, stable, and fast even when raw imports contain noise.

## Required layer separation

### Layer 1: raw import batch

Owned by:

- Import Center
- import-batch history
- validation review

Contains:

- original filename
- detected template
- raw headers
- raw rows
- header alias matches
- validation warnings and errors
- source metadata

Rules:

- Must preserve the original shape of incoming data.
- Must remain inspectable after save.
- Must not be treated as the live operational UI model.

### Layer 2: normalized entities

Owned by:

- repositories
- service-level normalization
- entity readers for active pages

Contains:

- canonical rider records
- dashboard users
- vehicles
- performance daily rows
- performance monthly rows
- validity results
- monthly rules
- invoices and settlement records
- shift assignments later

Rules:

- Pages read from normalized entities, not raw batch rows.
- Entity keys, statuses, and references must be stable even when header aliases vary by import.

### Layer 3: derived operational views

Owned by:

- domain services
- cached compute layers
- issue derivation

Contains:

- KPI totals
- missing assignment counts
- working vs stopped summaries
- validity eligibility
- VDA or face-verification issue summaries
- fleet capacity mismatches
- reconciliation differences

Rules:

- Derived views are recomputed only after relevant data changes.
- Derived views are never the persistence source of truth.

### Layer 4: curated page presentation

Owned by:

- page renderers
- table configuration
- drawers and filter frameworks

Contains:

- compact KPIs
- primary tables
- filtered slices
- details drawers
- issue linking

Rules:

- Pages should reveal operational meaning, not import mechanics.
- Users should only see raw column-mapping mechanics inside import surfaces or explicit debug drilldowns.

### Layer 5: mutation and audit

Owned by:

- service layer
- repository writes
- audit allowlist

Contains:

- assign
- swap
- terminate
- approve
- import-save
- monthly-rule save or activate
- vehicle update

Rules:

- One real mutation creates one valid audit event.
- Page viewing, filtering, or searching never writes audit rows.

## Module-by-module display rules

### Operations

- Primary pages show dashboard users, working users, riders, assignment queues, swaps, terminations, and audit log.
- Raw import rows for dashboard user files stay inside Import Center.
- Operational tables show normalized user identity, city, register, work mode, assignment state, and issue state.

### HR

- HR pages show rider profile, sponsorship type, document validity, platform-account state, and archive history.
- Raw HR source tabs and workbook structures stay out of the main HR page.
- Document-expiry logic becomes issue chips or drawers, not a copied workbook section.

### Fleet

- Fleet pages show operating vehicles, availability, capacity, handover history, and mismatches.
- Raw vehicle-import alias details stay in Import Center or import batch inspection.
- Vehicle-to-user matching is presented as a curated operational relation.

### Performance

- Daily and overall pages show KPIs, valid or invalid status, issues, and filtered ranked tables.
- Day-matrix detail is opened through a drawer or secondary drilldown, not the default page body.
- VDA and face verification pages prioritize exception management over raw column display.

### Monthly Rules

- Monthly Rules page manages versions, scope, active state, thresholds, and tiers.
- Imported rules or copied text parsing remain support utilities, not the page body itself.

### Monthly Closing later

- Company invoice and internal settlement remain separate imports.
- Curated pages show match rate, missing links, variances, totals, and closing status.

## Traceability requirements

Every curated row that originates from an import should be traceable back to:

- import batch id
- template type
- import date
- import warnings if relevant

This traceability should appear through detail drawers or a source link, not as permanent visible columns unless necessary.

## Allowed raw visibility

Raw data may appear in these places only:

- Import Center preview
- import batch detail view
- explicit debug or reconciliation drilldown
- scheduler formula reference views later if intentionally designed

## Prohibited blending patterns

- Showing raw header alias columns next to curated business columns on standard pages
- Embedding import mapping controls inside normal module pages
- Using raw import rows as the source for row actions
- Recomputing derived pages from raw files during normal rendering

## Recommended future implementation order

1. Standardize page scaffold and filters.
2. Standardize table and drawer primitives.
3. Move all remaining raw-like displays behind import batch or debug contexts.
4. Add consistent source-trace chips inside details drawers.
