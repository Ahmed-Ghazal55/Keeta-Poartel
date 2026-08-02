# Prompt 8.14 Run Scripts Report

Date: 2026-08-02

## Result

- `npm run dev` delegates to `npm run dev:ui`.
- `npm run dev:ui` runs `npx vite --host 127.0.0.1 --port 4173`.
- `npm run dev:api` preserves the existing `node ./server/devServer.js` command and API port 4174.
- No test scripts were removed.

## Runtime proof

- The presentation URL on port 4173 returned HTTP 200.
- The API health endpoint on port 4174 returned `{ "ok": true, "service": "keeta-local-dev-api" }`.
- A second UI launch detected ports 4173 and 4174 already occupied and started on 4175. This confirms the script is functional and also demonstrates why the README instructs presenters to stop an old process or use the matching fallback URL when a port is busy.
- Vite is supplied through `npx`; the first run on a clean workstation may download it and therefore requires network access.

The complete regression result is recorded in `PROMPT_8_14_TEST_RESULTS.md`.
