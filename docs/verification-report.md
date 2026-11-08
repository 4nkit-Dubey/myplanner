# Verification report

Date: 2026-11-08

## Verified

- Draft 2020-12 schema fixture run: **22/22 passed** (8 expected-valid accepted, 14 expected-invalid rejected).
- Added foundation tests: **6/6 passed** on the prior full run covering broken references, dependency cycles, overlap, completion and quantitative aggregation, progress preservation on reimport, multi-plan registry, recurrence expansion, flexible placement, overlap reporting, and valid JSON import.
- Follow-up default changes received dependency-free runtime checks for multiple active plans, active-plan toggling, suggested flexible slots, and nested overlaps. The full Ajv suite was not rerun after these changes because the approval policy blocked dependency installation and the local npm cache lacked one locked package.
- Full command: `npm test` (Node v24.19.0; Ajv 8; ajv-formats).
- Dependency audit reported 0 vulnerabilities at install time.

## Not verified

- No real browser/React application exists in this deliverable, so localStorage UX, quota behavior, multi-tab synchronization, and actual download/file-picker behavior are not browser-tested.
- The two shapes are adopted from the uploaded ZIP as this package's operative v1 contract; the ZIP itself describes them as implied rather than citing a separate authoritative source.
- The scheduler has focused examples but not exhaustive property/calendar testing, DST interaction testing, or randomized boundary testing.
- Schema v1.0.0 is frozen as the implementation baseline after its fixture suite passes. The policies in `decisions.md` close the remaining pre-Master-Prompt defaults.
