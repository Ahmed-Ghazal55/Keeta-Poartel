# Prompt 8.15 Demo Run Verification Report

Date: 2026-08-04

Ports 4173 and 4174 already had active local listeners (PIDs 17325 and 17538). A duplicate API start correctly reported `EADDRINUSE`; no process was killed. The existing project UI returned HTTP 200 for the canonical portal route and API `/api/health` returned `ok: true` on 4174. Prompt 8.14 archive, Prompt 8.15 normal, and Prompt 8.15 safe URLs opened through the default 4173 path with no connection refusal. No duplicate servers were left running by this verification.
