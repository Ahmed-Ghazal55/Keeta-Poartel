# Prompt 8.14 Archive Model Report

Date: 2026-08-02

`src/archive/monthlyArchiveModel.js` defines the immutable `monthly_snapshot` run contract, all 19 required item families, draft/previewed/created/blocked run states, canonical scope/cycle/source/count fields, and AR1–AR5 routes. Identity projection deliberately keeps dashboard/courier, owner/actual rider, assignment, and registered/actual vehicle fields separate. The future creation contract requires explicit confirmation and marks creation as unimplemented.
