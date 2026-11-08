# Final v1 decisions

This file closes the pre-Master-Prompt decisions using the attached ZIP as the source package and explicit implementation defaults. No blocking product decision remains for drafting the Master Prompt. These choices can be revised later as versioned product changes.

## Contract shapes adopted from the ZIP

- `dailyCheckpoint` is `{ id, date, targets }`.
- `dependency` is `{ taskId, dependsOn: [taskId, ...] }`; the record's `taskId` is the dependent task, and each `dependsOn` ID is a prerequisite that must be completed first.
- Checkpoint targets are measurable `{ id, taskId, description, targetValue, unit }` records. Completion progress is app-owned and does not alter plan JSON.

The ZIP README calls these implied shapes because the earlier conversation did not provide a separate formal source text. For this v1 implementation, the uploaded schema and its fixture are accepted as the operative contract. This closes the implementation decision without claiming an unavailable external approval.

## Final product defaults

- **Architecture:** React-compatible, no backend, browser storage only. One universal portable JSON file per plan. Registry and progress remain app-owned browser data.
- **Plan access:** registry keeps `activePlanIds` and supports any number of simultaneously active plans. Selection is a separate convenience pointer and does not deactivate other plans. New imports are active by default.
- **Duplicate/replacement:** importing an existing ID rejects by default. Explicit replace updates that plan document while preserving the registry's active status. Imported plan structure is not edited in place; replacement is a deliberate reimport action.
- **Dependencies:** prerequisite direction as defined above; reject self-links, missing task references, and cycles.
- **Dates and fixed blocks:** all records stay within inclusive plan bounds. Fixed blocks are same-day, half-open `[start,end)` intervals; end follows start; span equals task duration; overnight blocks are unsupported. Adjacent blocks may touch without overlap. Multiple non-overlapping blocks for one task are allowed.
- **Flexible scheduling:** use plan timezone's local wall-clock labels, work window 08:00–22:00, stable task input order, and first available slot around fixed and earlier suggested flexible blocks. A candidate that cannot fit is returned as missed. Results are suggestions only: they do not modify or export the read-only plan file.
- **Recurrence:** daily intervals anchor to task start date; weekly intervals use seven-day blocks anchored at task start plus selected weekdays; monthly intervals anchor to start month. Monthly dates 29–31 absent in a month are skipped. `taskId@YYYY-MM-DD` is the occurrence identity.
- **Progress after reimport:** same plan ID always preserves occurrence completion and measurements. Changed recurrence keeps old occurrence records as history; newly generated occurrence IDs begin pending. No completion transfers to a different date. Removed task records remain in history and are not shown as current occurrences.
- **Storage failures:** preserve prior plan value as a backup before replacement and report write/restore errors. LocalStorage quota and multi-tab conflicts are surfaced as recoverable UI errors; cross-tab automatic merging is out of scope for v1. Portable JSON export is the user's durable backup.

## Non-blocking implementation limits

There is no React screen in this foundation package, so browser file-picker/download UX and real localStorage behavior require validation when the UI is built. The utility tests use Storage-compatible interfaces. DST does not affect date-only occurrence identity or fixed local wall-clock labels; conversion to UTC instants is a UI/runtime responsibility and must use the plan timezone. The scheduler tests are focused examples rather than exhaustive property-based tests. These limits do not block writing the Master Prompt, which should target the contract and policies above.
