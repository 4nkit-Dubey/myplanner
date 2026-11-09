# MyPlanner

MyPlanner is a private, browser-based React planner. Imported plan JSON remains read-only; completion and measurement progress belong to the app and are kept in this browser.

## Start the app

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Create a production build with `npm run build` and preview it with `npm run preview`.

## Deploy to GitHub Pages

The Vite base path is configured for this repository at `/myplanner/`. Push to
`main` to automatically build and publish the site to the `gh-pages` branch, or
run `npm run deploy` locally.

To enable Pages for the repository, open **Settings → Pages**, choose **Deploy
from a branch**, and select `gh-pages` and `/(root)`. After the first successful
deployment, the site is available at
`https://4nkit-dubey.github.io/myplanner/`.

## Project areas

- `src/App.jsx` — hash-based routes for Overview (`#/`), Monthly (`#/monthly`), Weekly (`#/weekly`), Daily (`#/daily`), and Create Plan (`#/create`).
- `src/pages/` — one module for each planner page.
- `src/layout/` and `src/context/` — shared app shell, planner state, and page actions.
- `src/components/PlannerUI.jsx` — reusable navigation, dialogs, and UI components.
- `src/plannerView.js` — shared date and schedule helpers.
- `src/appStore.js` — browser library, plan import/replacement, and registry persistence.
- `src/masterPrompt.js` — copyable AI prompt with the plan schema embedded.
- `src/io.js`, `src/semantic.js`, `src/progress.js`, `src/registry.js`, and `src/scheduler.js` — the verified foundation utilities.
- `schema/` — authoritative plan and progress contracts, version 1.0.0.
- `docs/` — product decisions, AI output contract, and verification report from the handover.
- `fixtures/` and `test/` — handover fixtures and foundation tests.

## Import and data ownership

Use **Create plan** to copy the MyPlanner prompt, work with an AI assistant, save its JSON output, and import the file. MyPlanner validates the file against the structural schema and semantic rules before storing it. The app does not generate plans with an AI service.

Plans are stored in browser local storage. The library supports multiple plans and active-plan selection. Replacing a plan with the same ID preserves existing progress. Progress updates are stored in the app-owned storage envelope and are not included when a plan is exported. Browser storage is local to this browser; keep the downloaded JSON as the portable plan copy.

## Visual direction

Dark glass surfaces, soft blur, quiet borders, and restrained mint, blue, and violet highlights. Layouts adapt to smaller screens and respect reduced-motion preferences.
