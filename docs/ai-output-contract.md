# AI Output Contract (Phase 7)

This is a format specification for a future Master Prompt; it is not the Master Prompt.

## Response format

The AI must return exactly one UTF-8 JSON object and no Markdown fences, preamble, commentary, or trailing text. Root keys are exactly: `metadata`, `plan`, `goals`, `tasks`, `schedule`, `weeklyCheckpoints`, `dailyCheckpoints`, `dependencies`. One file represents exactly one plan. `metadata.schemaVersion` is `1.0.0`; `documentType` is `planner-plan`.

## Field and behavior rules

Conform to `schema/plan.schema.json` with no unknown properties. IDs are stable, unique, ASCII letters/digits/underscore/hyphen. Dates use `YYYY-MM-DD`, times `HH:mm` 24-hour local wall time, timezone is IANA. Fixed entries require start and end and their span equals task duration; flexible entries carry duration and no clock times. Overnight blocks are forbidden. Recurrence uses daily interval, weekly interval plus weekday names, or monthly interval plus day 1–31. Day 29–31 occurrences that do not exist in a month are skipped. `dailyCheckpoint` is `{id,date,targets}`; dependency is `{taskId,dependsOn:[taskId...]}`; these are v1 inferred shapes and should be confirmed against the unavailable source contract.

## Minimal valid example

```json
{"metadata":{"app":"MyPlanner","schemaVersion":"1.0.0","documentType":"planner-plan","exportedAt":"2026-01-01T00:00:00Z"},"plan":{"id":"study","title":"Study plan","startDate":"2026-01-01","endDate":"2026-01-01","timezone":"Asia/Kolkata"},"goals":[],"tasks":[{"id":"read","title":"Read","description":"Read one chapter","category":"study","goalIds":[],"priority":"medium","taskType":"one_time","scheduleType":"fixed","durationMinutes":30,"startDate":"2026-01-01","endDate":"2026-01-01"}],"schedule":{"entries":[{"id":"slot1","taskId":"read","date":"2026-01-01","type":"fixed","startTime":"09:00","endTime":"09:30"}]},"weeklyCheckpoints":[],"dailyCheckpoints":[],"dependencies":[]}
```

## Validation and repair protocol

Before presenting output, parse JSON, validate Draft 2020-12 schema, then run semantic validation. On failure, repair only the plan JSON, preserve the user's stated intent, repeat all validation, and return only the corrected JSON. If a user requirement cannot be represented without changing the contract (for example, an overnight fixed block), ask a focused question outside the JSON instead of silently changing it. Never emit progress state or mutate imported plan data to record completion.
