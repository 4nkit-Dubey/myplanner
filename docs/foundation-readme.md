# MyPlanner pre-Master-Prompt foundation

Seven-phase React/browser-only foundation, built from the attached schema test suite. The Master Prompt itself is deliberately not included. Each exported/imported JSON file remains one universal plan document; multiple plans and multiple active plans live in the browser registry. Imported plan data is read-only after import; completion and progress belong to separate app-owned state.

## Contents

- `schema/plan.schema.json` — Draft 2020-12 plan contract, version 1.0.0.
- `schema/progress.schema.json` — separate app-owned progress contract.
- `fixtures/valid` and `fixtures/invalid` — original 8/14 structural fixtures.
- `src/semantic.js` — IDs, references, dates, IANA timezone, schedule consistency, overlap, recurrence and dependency graph validation.
- `src/progress.js` — stable plan fingerprint, occurrence completion, quantitative measures, checkpoint aggregation, and progress-preserving reimport.
- `src/registry.js` — multiple plan registry, selected plan, duplicate rejection or explicit replacement.
- `src/scheduler.js` — deterministic recurrence expansion, flexible slot placement, overlap detection, and missed items.
- `src/io.js` — structural and semantic import validation, preview, export, localStorage persistence, backup and restore.
- `docs/ai-output-contract.md` — exact future output format and repair protocol; this is a contract specification, not the Master Prompt.
- `docs/decisions.md` — product policies and unresolved source-contract questions.
- `docs/verification-report.md` — latest test result and limits.

## Run

Requires Node.js 20+. Run `npm ci`, then `npm test`. Ajv 8 and `ajv-formats` are pinned by the lockfile. The schema fixture runner validates Draft 2020-12. The Node test suite exercises key semantic, progress, registry, scheduling, and import behavior. Browser storage methods accept a Storage-compatible object, so the React UI can pass `window.localStorage`.

## Data ownership and browser architecture

Export contains the plan only. The registry stores multiple plan JSON objects; app progress is stored separately under a plan-specific localStorage key and never written into the imported plan. An import preview runs schema and semantic checks before persistence. Reimport with the same plan ID preserves progress and records a fingerprint history; callers must explicitly choose duplicate rejection or replacement when adding a plan. Persistence keeps the last value as a backup before replacing it. Browser storage is device/browser scoped and can be cleared by the user; use export as portable backup.

## Phase status

1. **Schema audit/freeze:** original 22 fixtures are verified by the current runner (8 valid, 14 invalid). Contract v1.0.0 is frozen as the implementation baseline. The ZIP's `dailyCheckpoint` and `dependency` definitions are adopted as the operative contract; their earlier source conversation described them as implied.
2. **Semantic validation:** implemented in `src/semantic.js`, with cross-record and calendar rules; add tests as real imported plans expose additional cases.
3. **Progress:** schema and utilities implemented separately. Plan fingerprint changes are recorded while progress keys remain intact.
4. **Plan registry:** multiple plans and explicitly tracked multiple active plans supported; duplicate ID rejects by default and replacement is an explicit option.
5. **Scheduling:** deterministic generation, fixed-time overlap detection, flexible first-fit placement, missed-task return values. See decisions for calendar conventions.
6. **Import/export:** parse, validate, preview, plan-only export, persistence backup, restore validation and actionable errors implemented.
7. **AI output contract:** exact JSON-only contract, example and validation/repair policy documented; Master Prompt deferred.

## Limitations

This package is the data foundation and utilities, not a finished React UI. Browser storage behavior is covered through a Storage-compatible API but has not been exercised in a real browser. `Intl` timezone validation depends on the browser's timezone database. Fingerprints are non-cryptographic change detectors, not security proofs. LocalStorage writes are not transactional across tabs. Final v1 behavior defaults are recorded in `docs/decisions.md`.
