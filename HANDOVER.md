# MyPlanner implementation handover

This handover describes the files in this package as they exist. It does not create new architectural decisions. The exact schema, decisions, AI contract, source, fixtures, tests, and report are included alongside this file.

## Deliverables

- Exact current Draft 2020-12 schema: `schema/plan.schema.json` (schema version 1.0.0).
- Progress schema: `schema/progress.schema.json`.
- Full decisions: `docs/decisions.md`.
- AI Output Contract specification (not a Master Prompt): `docs/ai-output-contract.md`.
- Semantic implementation: `src/semantic.js`.
- Progress utilities: `src/progress.js`.
- Plan registry: `src/registry.js`.
- Recurrence and flexible scheduling utilities: `src/scheduler.js`.
- Import/export and local storage utilities: `src/io.js`.
- Original fixtures: 8 valid and 14 invalid; additional tests: `test/phases.test.mjs`.
- Verification status: `docs/verification-report.md`.

## Plan schema summary

Root object is closed (`additionalProperties:false`) and requires exactly these keys: `metadata`, `plan`, `goals`, `tasks`, `schedule`, `weeklyCheckpoints`, `dailyCheckpoints`, `dependencies`. Each plan file describes one plan. `tasks` has at least one item. The exact JSON Schema, including nested definitions, constraints, conditionals, and enums, is `schema/plan.schema.json`.

| Object | Required fields | Optional fields / constraints |
|---|---|---|
| `metadata` | `app` const `MyPlanner`; `schemaVersion` const `1.0.0`; `documentType` const `planner-plan`; `exportedAt` date-time | no extra fields |
| `plan` | `id`, `title`, `startDate`, `endDate`, `timezone` | `description`; title 1–150 chars; description max 2000; no extra fields |
| `goal` | `id`, `title`, `priority`, `targetDate` | `description`; priority `low\|medium\|high`; no extra fields |
| `task` | `id`, `title`, `description`, `category`, `goalIds`, `priority`, `taskType`, `scheduleType`, `durationMinutes`, `startDate`, `endDate` | `recurrence` required iff recurring; `measurement`; priority `low\|medium\|high`; taskType `one_time\|recurring`; scheduleType `fixed\|flexible`; duration positive integer; no extra fields |
| `recurrence` | `frequency`, `interval` | frequency `daily\|weekly\|monthly`; positive integer interval; weekly requires unique nonempty `daysOfWeek` from weekday enum; monthly requires `dayOfMonth` integer 1–31; no extra fields |
| `measurement` | `targetValue`, `unit` | target positive number; unit nonempty; no extra fields |
| `schedule` | `entries` | array of entries; no extra fields |
| `scheduleEntry` | `id`, `taskId`, `date`, `type` | fixed requires `startTime`,`endTime` and forbids `durationMinutes`; flexible requires `durationMinutes` and forbids both times; optional `objective`; type `fixed\|flexible`; no extra fields |
| `weeklyCheckpoint` | `id`, `title`, `startDate`, `endDate`, `targets` | no extra fields |
| `dailyCheckpoint` | `id`, `date`, `targets` | no extra fields |
| `checkpointTarget` | `id`, `taskId`, `description`, `targetValue`, `unit` | target positive number; description/unit nonempty; no extra fields |
| `dependency` | `taskId`, `dependsOn` | `dependsOn` unique, nonempty ID array; no extra fields |

IDs match `^[a-zA-Z0-9_-]+$`, length 1–100. Dates use JSON Schema `date`; times use 24-hour `HH:mm`. Unknown keys are rejected throughout.

## Semantic validation

Implemented by `validateSemantics(plan)` after structural schema validation. It returns `{valid, errors:[{code,path,message}]}`.

- Duplicate IDs across goals, tasks, schedule entries, weekly/daily checkpoints, and checkpoint targets (`DUPLICATE_ID`).
- Plan start <= end; task and weekly checkpoint start <= end (`DATE_ORDER`).
- IANA timezone accepted by runtime `Intl.DateTimeFormat` (`TIMEZONE`).
- Goal target, task range, checkpoint dates/ranges, and schedule dates inside inclusive plan bounds (`PLAN_BOUNDARY`).
- Task `goalIds`, schedule task IDs, checkpoint target task IDs, dependency task/prerequisite IDs resolve (`BROKEN_GOAL_REF`, `BROKEN_TASK_REF`).
- Task recurrence must not use weekday fields except weekly or dayOfMonth except monthly; daily cannot carry weekdays (`RECURRENCE`).
- Schedule entry type matches task schedule type; one-time entry date equals task start; recurring entry date matches recurrence (`SCHEDULE_MISMATCH`, `RECURRENCE_SCHEDULE_MISMATCH`).
- Fixed end is after start, duration span equals task duration; overlaps invalidate (`TIME_ORDER`, `DURATION_MISMATCH`, `SCHEDULE_OVERLAP`). Overnight is rejected.
- Dependencies cannot self-reference and graph must be acyclic (`DEPENDENCY_SELF`, `DEPENDENCY_CYCLE`).

Implemented and exercised by selected tests, not exhaustively. It does not enforce a scheduled entry for every occurrence, or a fixed/flexible placement for every task. Schema fixtures test structure; the semantic tests cover a subset of these cross-record rules.

## Progress data and storage

The progress schema requires `progressVersion` (`1.0.0`), `planId`, `sourceFingerprint`, `createdAt`, `occurrences`, `measurements`, `checkpointSnapshots`, and `importHistory`. Occurrence keys are IDs such as `taskId@YYYY-MM-DD`; occurrence status enum is `pending|completed|skipped|missed`, with optional `completedAt` and `note`. Measurement entries require numeric nonnegative `value` and date-time `at`. Import history actions are `created|unchanged|plan-updated-progress-preserved`.

`src/progress.js` implements empty-state creation, a stable-key-order FNV-1a fingerprint, immutable-style occurrence updates, measurement append, sum-based checkpoint aggregation, and reimport history/fingerprint update preserving existing occurrence and measurement maps. It does not validate progress against `progress.schema.json`, initialize generated occurrences as a map, or reconcile occurrence sets with recurrence changes. The documented behavior that new occurrence IDs start pending relies on the consuming UI defaulting missing keys to pending.

Storage implementation detail: despite the conceptual separation of plan and progress, `persistPlan(storage, plan, progress)` stores a single JSON envelope `{plan,progress}` under `myplanner:<planId>`. Export serializes only the plan. The prior value is copied to `myplanner:<planId>:backup` before the new envelope is written. This differs from README wording that describes progress as stored separately under a plan-specific key.

## Multi-plan registry

In-memory registry shape: `{registryVersion:'1.0.0', selectedPlanId, activePlanIds:[...], plans:[plan,...]}`. `createRegistry` defaults plans supplied at initialization to active. `registerPlan` appends a new ID and activates it; duplicate IDs reject by default; `{onDuplicate:'replace'}` replaces the plan while preserving current active status. `selectPlan` changes selection only. `setPlanActive` activates/deactivates. `removePlan` removes plan and active ID, and selects the first remaining plan when removing the selected one.

Registry persistence and schema are not implemented. `registerPlan` replacement is not integrated with `reimportProgress` or storage persistence, so the documented progress-preserving replacement needs caller orchestration.

## Scheduling

`occurrences(task)` returns occurrence descriptors for an inclusive task date range. Daily interval anchors to task start. Weekly intervals are seven-day blocks from task start, filtered by weekdays. Monthly intervals anchor to the start month; day 29–31 is skipped when absent. IDs are `taskId@YYYY-MM-DD`.

`placeFlexible(items,fixedEntries,dayStart='08:00',dayEnd='22:00')` places in input order using first-fit, considering passed fixed entries and earlier suggested items. Successful rows have `suggestedStartTime`/`suggestedEndTime`; they are suggestions, not schema schedule entries and not persisted by this utility. Failures return `reason:'no-available-window'`. `detectOverlaps` returns overlapping entry ID pairs. `validateSemantics` separately checks fixed-entry conflicts.

The scheduler does not read the plan timezone or resolve wall-clock labels to instants. Dates are handled using UTC date arithmetic and slots as local-looking HH:mm labels; actual timezone/DST rendering is the caller's responsibility. Policy says task priority does not reorder input.

## Import, export, backup, restore

- `safeImportJson(text)`: parse errors return `INVALID_JSON`; valid JSON is structurally and semantically validated; failure returns `PLAN_INVALID` plus preview.
- `previewImport(input)`: reports validity, plan ID/title, task/goal counts, combined errors.
- `exportPlan(plan)`: validates and returns pretty JSON for plan only; invalid plans throw.
- `persistPlan(storage,plan,progress)`: validates plan; backs up prior stored string if truthy; writes `{plan,progress}` envelope; on write error attempts restoring old string and throws.
- `restoreBackup(storage,planId)`: reads backup, parses it, checks envelope plan ID and validates plan, then restores the full envelope.

No file-picker, download trigger, registry import workflow, cross-tab lock/merge, or tested real-browser UI is present. Backup restore validation catches invalid plan data but malformed backup JSON may throw a raw parse error.

## Verification and limits

The latest full run *before the last registry/scheduler changes* passed 22/22 schema fixtures and 6/6 foundation tests. Targeted dependency-free runtime checks after those changes passed active-plan toggling, replacement status preservation, suggested slot output, and nested overlap reporting. The full suite was not rerun after the changes because dependency installation was blocked and one package was absent from the local cache. Do not describe the final tree as having a latest full-suite pass.

No real React/browser E2E was run. Tests do not establish all semantic rule branches, progress schema validity, browser storage quota safety, multi-tab behavior, DST conversion, or file-picker/download UX. `docs/verification-report.md` is the latest verification record.

## Inconsistency register (do not silently resolve)

1. `docs/decisions.md` adopts the ZIP's two inferred shapes as operative v1; `docs/ai-output-contract.md` still says they are inferred and should be confirmed. ZIP README itself also says implied, not independently approved.
2. README says progress is stored separately under a plan-specific key; `persistPlan` actually stores `{plan,progress}` together in one key. Export remains plan-only.
3. Decision says reimport preserves progress and new recurrence occurrences start pending; utility preserves existing maps/history but does not generate or reconcile occurrence records. UI must supply pending defaults. Registry replacement does not call reimport utility.
4. Progress schema permits `status:'completed'` without `completedAt`, while `setOccurrence` rejects that state. Conversely schema permits `completedAt` on non-completed states.
5. AI contract gives a minimal example and broad field rules but does not enumerate every field's required/optional status; the schema is the exact source of truth.
6. README says browser storage is covered by a Storage-compatible API, which is an interface-level utility only; there are no persistence/restore tests in `phases.test.mjs` and no actual browser test.

## Handover for the next conversation

Use the included schema and decisions as the current implementation baseline. Do not assume the Master Prompt exists. Before writing it, preserve the no-backend React/browser direction, one plan per portable JSON file, multiple active plans, read-only imported plan, separate app-owned progress, fixed/flexible tasks, and JSON-only output format. Treat the listed inconsistencies as known implementation gaps to explicitly carry forward or resolve with the user; do not represent them as already implemented or verified.
