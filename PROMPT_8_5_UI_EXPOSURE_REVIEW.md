# Prompt 8.5 UI Exposure Review

Date: 2026-07-15
Project URL checked: `http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html`

## Review goal

Check whether Prompt 8.5 exposed only safe/minimal UI placeholders, and whether the current UI actually surfaces the new lifecycle/template work.

## What is currently exposed in the UI

### Import Center

The Import Center is still the most complete import-facing surface.

Observed controls:

- file batch upload
- analyze uploaded files
- preview panel
- save import
- reject
- re-detect
- export detection report
- `Download Template`
- `Download All Templates`
- `View Template Requirements`

Assessment:

- safe/minimal placeholder behavior is present
- no forced data mutation before save
- suitable as a generic import workbench

### Page-level import placeholders

Observed shell-level import buttons exist on:

- operations
- performance
- fleet
- shifts
- monthly closing
- reports

Behavior from code review:

- these buttons route to `import-center`
- they then trigger the shared `#importBatchFiles` input

Assessment:

- page-level import entry points exist
- they are placeholders only, not true page-owned import workflows

### Legacy module file inputs still exist

Direct file inputs still exist on older module pages such as:

- `page-vehicles`
- `page-shifts`
- `page-monthly-closing`
- `page-opr`
- `page-excel`

Assessment:

- the project currently mixes:
  - centralized Import Center flow
  - shell-level import placeholders
  - older direct page file inputs
- this is workable for review, but not yet a unified 8.5 lifecycle UI architecture

## What Prompt 8.5 did not expose in the UI

No dedicated UI was found for:

- External Riders Master
- Current Assignments template contract
- Rider Operational Profile
- LifecycleRegistry-driven page import summaries
- assignment-period-based performance attribution views
- monthly archive snapshot management

Important detail:

- `src/data/lifecycleRegistry.js` exists, but the current UI does not consume it to render dedicated 8.5 lifecycle pages or route-aware import summaries.

## Import/template safety review

### Supported templates list

Status: partially exposed

- Template download and requirements actions exist in Import Center.
- The registry itself still reflects the older 12-template Prompt 8 set.
- New 8.5 templates for external riders/current assignments are not exposed because they do not exist in the template registry yet.

### Required columns display

Status: present for existing templates only

- Import Center supports template requirements display for registered templates.
- Missing 8.5 templates cannot be reviewed because they are absent from the live registry.

### Validation result cards

Status: present

- Import preview panel and validation issue areas are already in place.

## Browser smoke-check findings

### Header/topbar containment

Observed:

- `#uiTopbar` height measured about `101px`
- runtime row `#appTopbarRuntime` height measured about `36px`
- no console errors were observed in the smoke check

Assessment:

- topbar containment from earlier stabilization work remains intact

### Hero/header footprint

Observed:

- `.hero` still exists
- measured height was about `257px` on a `720px` viewport
- hero starts below the topbar and consumes a large portion of the first viewport

Assessment:

- the earlier large-hero issue is still present in the starter HTML structure
- this was not introduced by Prompt 8.5, but it remains unresolved
- this means the UI is still not in a clean application-toolbar + compact-page-header state

### Console state

Observed:

- no browser console errors
- only startup profiler warnings related to `storageBridge.refreshStatus`

## Does Prompt 8.5 appear to have attempted a broad UI redesign?

Answer: no

Observed reality:

- no major new visual system was added for 8.5
- no dedicated lifecycle pages were introduced
- the current UI remains mostly the existing Prompt 8 / 8.3 / 8.4 shell with generic import capabilities and placeholders

This is good for safety, but it also means the 8.5 lifecycle concepts are still mostly backend planning artifacts.

## Does the UI now depend only on a global import path?

Answer: not fully

What exists:

- global header import entry
- Import Center
- shell placeholder import buttons
- older module-specific file inputs

Interpretation:

- the app is not blocked behind one global import button only
- however, the intended 8.5 page-scoped import architecture is still incomplete

## UI exposure conclusion

Current UI status:

- `Safe/minimal placeholders: yes`
- `Lifecycle-specific UI exposure: no`
- `External riders/current assignments UI: missing`
- `Import Center template tooling: present`
- `Page-scoped import architecture: partial`
- `No new console-error regression: yes`
- `No full 8.5 UI completion: yes`

Prompt 8.5 did not overreach the UI, but it also did not surface the new lifecycle contracts in a usable module-level way.
