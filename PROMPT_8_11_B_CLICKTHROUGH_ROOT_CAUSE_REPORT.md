# Prompt 8.11-B Click-Through Root Cause Report

Date: 2026-07-29

## Classification

- Primary functional cause: `target page focus missing / overly broad target resolution`
- Verification-data cause: isolated profile hydration collision
- Earlier proof limitation: browser automation reachability while the Operations table was re-rendering

## Findings

The dropdown emitted the correct dataset for all five actions. The Fleet focus request for the actual vehicle also contained `JED-BIKE-9009 / JED-9090`, but `findFleetRow()` accepted any serial, plate, dashboard-user, or rider association in one OR predicate. Because the registered car appeared first and shared the dashboard user, it won even when an explicit bike serial was supplied.

The 8.11-B profile initially reused the 8.11 signature and was then hydrated from the dev API. This replaced its isolated usage-history seed with general runtime data.

## Fix

- Explicit vehicle serial now has strict priority, followed by plate, dashboard user, then rider association.
- Prompt 8.11-B has a distinct verification signature.
- Verification profiles skip API hydration and persistence while retaining the API health connection.
- Focus markers were added for browser-visible HR/Fleet proof.

No assignment, swap, termination, HR, Fleet, or audit mutation service was changed.
