# MyPlanner UI design specification

## Direction

A calm, dark glassmorphic planner with restrained neon color. Translucent surfaces, soft blur, fine borders, and low ambient light create depth without reducing the legibility of dates or tasks.

## Color and type

- Deep blue-black canvas and slightly lighter glass surfaces.
- Soft mint is the primary accent for focus, completion, and active navigation.
- Muted violet and blue distinguish secondary information. Neon is limited to small highlights and progress states.
- System sans-serif typography; clear page and card headings, compact labels, and readable task details.

## App shell and shared components

- Persistent left sidebar on desktop with Overview, Monthly, Weekly, Daily, and Create Plan.
- Compact navigation on small screens, with all five destinations available.
- A shared header carries the current plan, JSON import action, and period navigation where relevant.
- Reusable glass cards, pill labels, progress rings, task rows, subtle check controls, import previews, measurement entry, and short confirmation messages.
- Keyboard focus remains visible. Completion uses a checkmark as well as color, and reduced-motion preferences are respected.

## Screens

- **Overview:** today-at-a-glance progress, next step, goals in focus, and a short task list. Empty state explains how to import a first plan.
- **Monthly:** Monday-first calendar grid with task markers and completion state; selecting a date reveals that day’s tasks.
- **Weekly:** seven day columns with task times, durations, and completion controls, plus a weekly progress summary and dated checkpoint progress.
- **Daily:** a chronological agenda, progress summary, a separate area for flexible or unplaced steps, and daily checkpoint progress.
- **Create Plan:** four steps—copy the schema-aware AI prompt, generate and approve a plan with an AI assistant, download its JSON, then preview and validate it before import.

## Product behavior carried into the UI

Imported plan data stays read-only. MyPlanner validates files against the verified schema and semantic rules. Completion and measurements stay app-owned in browser storage. Flexible schedule placement is presented as a suggestion; the UI does not claim to generate plans with an AI service.

The library can hold multiple active plans. Choosing a plan in the header changes the current view without deactivating other plans.

