# Future Reporting Standard

Every future prompt final report must contain exactly this status block:

## Project Context Snapshot

- Project name:
- Current prompt:
- Latest completed prompt:
- Current decision:
- Main modules affected:
- Current stable capabilities:
- Known deferred items:
- Next planned prompt:
- Production/backend status:
- Data/privacy safety:
- Test status:
- Browser proof status:
- GitHub publish status:

When project status changes, the prompt must also update:

- `docs/project-handoff/PROJECT_PHASE_TIMELINE.md`
- `docs/project-handoff/PROJECT_MODULE_STATUS_MATRIX.md`
- `docs/project-handoff/PROJECT_ROADMAP_TO_FINAL_STATE.md`
- `docs/project-handoff/PROJECT_AI_TRANSFER_BRIEF.md`

Major claims must cite a repository report and section where possible, for example: `Source: PROMPT_8_15_FINAL_REPORT.md, section “Outcome”.` Conversation-only facts must say: `Source note: project conversation context; not independently verified in repo reports.` Missing sources must say: `source report not found in current repo`.

Reports must not reproduce private rider names, real identity numbers, phone numbers, IBANs, workbook/CSV rows, `.env`, private uploads, or local database contents. Use module names, counts, field names, masks, or synthetic examples. Source: `README.md`, “Demo scope / current limitations”; `PROMPT_8_16_GITHUB_PUBLISH_REPORT.md`.
