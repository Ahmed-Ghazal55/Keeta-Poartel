# Prompt 8.10 Operations View Model Report

## Main change

- Added and used `src/operations/operationsViewModel.js` as the lightweight centralized Operations helper.

## Consolidated responsibilities

- canonical tab definitions
- visible filters per tab
- import buttons per tab
- route alias normalization
- sidebar route map
- dashboard row filtering by tab
- assignment row filtering by tab
- dashboard KPI derivation
- notification/search query normalization

## Data-separation protections preserved

- owner identity remains separate from actual rider identity
- registered dashboard vehicle remains separate from actual used vehicle
- Dashboard Users datasets remain separate from Current Assignments datasets
- notification focus/highlight stays compatible with standard search behavior

## Search/scope behavior

- Shared search helper supports matching across:
  - courier id
  - owner iqama
  - actual rider iqama
  - names
  - phone
  - vehicle serial
  - plate
  - assignment id
- Scope filters are unified around:
  - `register`
  - `city`
  - `platform`

## Render-side cleanup in Operations extension

- Operations data model now precomputes:
  - filtered dashboard rows
  - filtered assignment rows
  - visible working riders
  - visible swaps
  - visible terminations
  - visible audit rows
  - tab counts
  - dashboard KPI payload
- This reduced duplicated tab-specific derivation inside render functions and keeps hidden data tables out of the visible Operations flow.
