import React, { useEffect, useRef, useState } from 'react';
import { occurrences, placeFlexible } from './scheduler.js';
import { aggregateCheckpoint, recordMeasurement, setOccurrence } from './progress.js';
import { setPlanActive } from './registry.js';
import { saveProgress, preparePlanImport, commitPlanImport, readLibrary, writeRegistry } from './appStore.js';
import { createMasterPrompt } from './masterPrompt.js';
import planSchema from '../schema/plan.schema.json' with { type: 'json' };
import FocusTimer, { primeTimerAudio } from './FocusTimer.jsx';

const NAV = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'monthly', label: 'Monthly', icon: 'calendar' },
  { id: 'weekly', label: 'Weekly', icon: 'week' },
  { id: 'daily', label: 'Daily', icon: 'sun' },
];
const PROMPT = createMasterPrompt();

function Icon({ name, size = 20, strokeWidth = 1.7 }) {
  const paths = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/></>,
    week: <><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 4v17M14 4v17M3 9h18M6 7h.01M11 12h.01M17 15h.01"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2.5 12h2m15 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
    add: <><path d="M12 5v14M5 12h14"/></>,
    upload: <><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14.5v4A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-4"/></>,
    chevronLeft: <path d="m15 18-6-6 6-6"/>,
    chevronRight: <path d="m9 18 6-6-6-6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14ZM5 15l.7 1.8L7.5 17.5l-1.8.7L5 20l-.7-1.8-1.8-.7 1.8-.7L5 15Z"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    download: <><path d="M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5"/><path d="M4 20h16"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseLocalDate = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const dayLabel = (key, options = { weekday: 'short', month: 'short', day: 'numeric' }) => parseLocalDate(key).toLocaleDateString(undefined, options);
const minuteOf = (time = '23:59') => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

function mondayStart(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}
function datesFrom(start, count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { date, key: localDateKey(date) };
  });
}
function formatDuration(minutes = 0) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}
function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

function buildScheduleMap(plan, progress, dateKeys) {
  if (!plan) return new Map();
  const wanted = new Set(dateKeys);
  const tasks = plan.tasks || [];
  const entries = plan.schedule?.entries || [];
  const allOccurrences = tasks.flatMap((task) => occurrences(task).map((item) => ({ ...item, task })));
  const byDate = new Map([...wanted].map((key) => [key, []]));
  allOccurrences.forEach((item) => { if (wanted.has(item.date)) byDate.get(item.date).push(item); });
  return new Map([...wanted].map((dateKey) => {
    const dayItems = byDate.get(dateKey) || [];
    const dayEntries = entries.filter((entry) => entry.date === dateKey);
    const entryFor = (item) => dayEntries.find((entry) => entry.taskId === item.taskId);
    const fixedEntries = dayEntries.filter((entry) => entry.type === 'fixed');
    const flexibleItems = dayItems.filter((item) => item.type === 'flexible').map((item) => {
      const entry = entryFor(item);
      return { ...item, durationMinutes: entry?.durationMinutes || item.durationMinutes };
    });
    const suggestions = placeFlexible(flexibleItems, fixedEntries, '08:00', '22:00');
    const placedById = new Map(suggestions.placed.map((item) => [item.occurrenceId, item]));
    const schedule = dayItems.map((item) => {
      const entry = entryFor(item);
      const suggested = placedById.get(item.occurrenceId);
      const stored = progress?.occurrences?.[item.occurrenceId];
      return { ...item, entry, startTime: entry?.startTime || suggested?.suggestedStartTime || null, endTime: entry?.endTime || suggested?.suggestedEndTime || null, status: stored?.status || 'pending' };
    });
    schedule.sort((a, b) => {
      const left = a.startTime ? minuteOf(a.startTime) : 24 * 60;
      const right = b.startTime ? minuteOf(b.startTime) : 24 * 60;
      return left - right || a.task.title.localeCompare(b.task.title);
    });
    return [dateKey, schedule];
  }));
}
function buildSchedule(plan, progress, dateKey) {
  return buildScheduleMap(plan, progress, [dateKey]).get(dateKey) || [];
}

function IconButton({ label, onClick, children, className = '' }) {
  return <button className={`icon-button ${className}`} type="button" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function Sidebar({ page, setPage, onCreate, planCount }) {
  return <aside className="sidebar glass-panel">
    <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); setPage('overview'); }} aria-label="MyPlanner overview">
      <span className="brand-mark"><Icon name="spark" size={19}/></span>
      <span className="brand-copy"><strong>myplanner</strong><small>make space for what matters</small></span>
    </a>
    <div className="sidebar-label">WORKSPACE</div>
    <nav className="nav-list" aria-label="Main navigation">
      {NAV.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)} aria-label={item.label} aria-current={page === item.id ? 'page' : undefined}>
        <Icon name={item.icon} size={18}/><span>{item.label}</span>{item.id === 'overview' && planCount > 0 && <span className="nav-count">{planCount}</span>}
      </button>)}
      <button className={`nav-item ${page === 'create' ? 'active' : ''}`} onClick={onCreate} aria-label="Create plan" aria-current={page === 'create' ? 'page' : undefined}>
        <Icon name="add" size={18}/><span>Create plan</span>
      </button>
    </nav>
    <div className="sidebar-bottom">
      <div className="focus-note"><span className="focus-dot"/><div><strong>One step at a time</strong><small>Your plan can flex with you.</small></div></div>
      <div className="profile-row"><div className="avatar">MP</div><div><strong>My workspace</strong><small>Personal planner</small></div><span className="profile-menu">•••</span></div>
    </div>
  </aside>;
}

function Header({ page, plan, registry, onSelectPlan, onToggleActive, onImport, date, onShift, onToday, menuOpen, setMenuOpen }) {
  const titles = { overview: ['Overview', 'A little clarity for the day ahead.'], monthly: ['Monthly view', 'See the bigger picture, one day at a time.'], weekly: ['Weekly view', 'Make room for what matters this week.'], daily: ['Daily view', 'A softer plan for today.'], create: ['Create a plan', 'Shape a thoughtful plan with a little help.'] };
  const dateLabel = page === 'monthly'
    ? date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : page === 'weekly'
      ? (() => { const week = datesFrom(mondayStart(date), 7); return `${week[0].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — ${week[6].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`; })()
      : dayLabel(localDateKey(date), { weekday: 'long', month: 'long', day: 'numeric' });
  return <header className="topbar">
    <div className="mobile-brand"><span className="brand-mark"><Icon name="spark" size={18}/></span><strong>myplanner</strong><span className="mobile-page-name">{titles[page][0]}</span></div>
    <div className="page-heading"><div className="eyebrow">YOUR PLANNING SPACE</div><h1>{titles[page][0]}</h1><p>{titles[page][1]}</p></div>
    <div className="top-actions">
      {page !== 'create' && <div className="plan-select-wrap"><button className="plan-select glass-control" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>
        <span className="select-dot"/><span className="select-copy"><small>PLAN</small><strong>{plan?.plan.title || 'Choose a plan'}</strong></span><Icon name="chevronRight" size={15}/>
      </button>
      {menuOpen && <div className="select-menu glass-panel">{registry.plans.length ? registry.plans.map((item) => { const active = registry.activePlanIds.includes(item.plan.id); return <div className="plan-option-row" key={item.plan.id}><button className="plan-option" onClick={() => { onSelectPlan(item.plan.id); setMenuOpen(false); }}><span className={`select-dot ${active ? '' : 'muted'}`}/><span>{item.plan.title}</span>{item.plan.id === plan?.plan.id && <Icon name="check" size={15}/>}</button><button className={`active-toggle ${active ? 'enabled' : ''}`} aria-pressed={active} aria-label={`${active ? 'Deactivate' : 'Activate'} ${item.plan.title}`} onClick={() => onToggleActive(item.plan.id, !active)}>{active ? 'Active' : 'Paused'}</button></div>; }) : <p>No imported plans yet.</p>}</div>}</div>}
      <button className="button button-primary header-import" onClick={onImport}><Icon name="upload" size={17}/><span>Import plan</span></button>
      {page !== 'create' && page !== 'overview' && <div className="date-control glass-control"><IconButton label="Previous period" onClick={() => onShift(-1)}><Icon name="chevronLeft" size={17}/></IconButton><span>{dateLabel}</span><IconButton label="Next period" onClick={() => onShift(1)}><Icon name="chevronRight" size={17}/></IconButton><button className="today-button" onClick={onToday}>Today</button></div>}
    </div>
  </header>;
}

function EmptyPlan({ onCreate, onImport }) {
  return <section className="empty-state glass-panel">
    <div className="empty-illustration"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="empty-core"><Icon name="spark" size={28}/></div><span className="float-chip chip-a"><Icon name="check" size={14}/></span><span className="float-chip chip-b"><Icon name="clock" size={14}/></span></div>
    <div className="eyebrow">A FRESH START</div><h2>Your plans, in one calm place.</h2><p>Import a MyPlanner JSON plan to see your goals, tasks, and schedule come together. Your imported plan stays read-only; your progress is saved separately on this device.</p>
    <div className="empty-actions"><button className="button button-primary" onClick={onImport}><Icon name="upload" size={17}/>Import a plan</button><button className="button button-quiet" onClick={onCreate}>Create a plan <Icon name="arrow" size={16}/></button></div>
    <div className="empty-footnote"><Icon name="check" size={15}/> Your data stays in this browser</div>
  </section>;
}

function ProgressRing({ value = 0, label = 'today' }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className="progress-ring" style={{ '--progress': `${safe}%` }} role="img" aria-label={`${safe}% ${label} complete`}><div className="ring-inner"><strong>{safe}%</strong><small>{label}</small></div></div>;
}

function dateInZone(timestamp, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function CheckpointPanel({ title, checkpoints, progress, timezone }) {
  return <section className="glass-card checkpoint-panel"><div className="card-top"><div><div className="eyebrow">MEASURABLE PROGRESS</div><h3>{title}</h3></div><span className="icon-orb mint"><Icon name="target" size={18}/></span></div>
    {checkpoints.length ? <div className="checkpoint-list">{checkpoints.map((checkpoint) => <div className="checkpoint-block" key={checkpoint.id}><strong>{checkpoint.title}</strong>{(checkpoint.targets || []).map((target) => {
      const start = checkpoint.date || checkpoint.startDate || '0000-01-01';
      const end = checkpoint.date || checkpoint.endDate || '9999-12-31';
      const values = (progress?.measurements?.[target.taskId] || []).filter((entry) => {
        const date = dateInZone(entry.at, timezone);
        return date >= start && date <= end;
      });
      const summary = aggregateCheckpoint(target, values);
      return <div className="checkpoint-target" key={target.id}><div className="checkpoint-target-head"><span>{target.description}</span><strong>{summary.achieved} / {summary.target} {summary.unit}</strong></div><div className="checkpoint-meter"><span style={{ width: `${summary.ratio * 100}%` }}/></div></div>;
    })}</div>)}</div> : <p className="quiet-copy checkpoint-empty">No checkpoints in this period. Keep showing up for the small steps.</p>}
  </section>;
}

function MeasureDialog({ item, value, setValue, onClose, onSubmit }) {
  if (!item) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="measure-dialog glass-panel" onSubmit={onSubmit}>
    <div className="detail-heading"><div><div className="eyebrow">LOG A MEASUREMENT</div><h3>{item.task.title}</h3></div><IconButton label="Close measurement" onClick={onClose}><Icon name="close" size={17}/></IconButton></div>
    <p>Record progress toward <strong>{item.task.measurement.targetValue} {item.task.measurement.unit}</strong>.</p>
    <label htmlFor="measurement-value">Amount completed <span>({item.task.measurement.unit})</span></label><div className="measurement-input"><input id="measurement-value" autoFocus type="number" min="0" step="any" required value={value} onChange={(event) => setValue(event.target.value)}/><span>{item.task.measurement.unit}</span></div>
    <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary">Save measurement</button></div>
  </form></div>;
}

function ImportPreviewDialog({ pendingImport, onClose, onCommit }) {
  if (!pendingImport) return null;
  const { plan, preview, duplicate } = pendingImport;
  const metrics = [
    ['GOALS', preview.goalCount],
    ['TASKS', preview.taskCount],
    ['SCHEDULED', plan.schedule?.entries?.length || 0],
    ['CHECKPOINTS', (plan.weeklyCheckpoints?.length || 0) + (plan.dailyCheckpoints?.length || 0)],
  ];
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="import-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="import-preview-title">
    <div className="detail-heading"><div><div className="eyebrow">IMPORT PREVIEW · SCHEMA 1.0.0</div><h3 id="import-preview-title">{plan.plan.title}</h3></div><IconButton label="Cancel import" onClick={onClose}><Icon name="close" size={17}/></IconButton></div>
    <p className="import-description">{plan.plan.description || 'Your plan is ready to bring into MyPlanner.'}</p>
    <div className="validated-note"><span className="validated-check"><Icon name="check" size={14}/></span><div><strong>File passed validation</strong><small>Schema structure and planning rules look good.</small></div></div>
    <div className="import-metrics">{metrics.map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div>
    <div className="import-date-row"><span>PLAN WINDOW</span><strong>{dayLabel(plan.plan.startDate, { month: 'short', day: 'numeric', year: 'numeric' })} — {dayLabel(plan.plan.endDate, { month: 'short', day: 'numeric', year: 'numeric' })}</strong><small>{plan.plan.timezone}</small></div>
    {plan.goals?.length > 0 && <div className="preview-goals"><span>GOALS IN THIS PLAN</span><div>{plan.goals.slice(0, 4).map((goal) => <span className="preview-goal" key={goal.id}>{goal.title}</span>)}{plan.goals.length > 4 && <span className="preview-goal extra-goal">+{plan.goals.length - 4} more</span>}</div></div>}
    {duplicate && <div className="replace-note"><Icon name="clock" size={16}/><span>A plan with this ID already exists. Replacing it updates the plan and preserves its saved progress.</span></div>}
    <div className="dialog-actions"><button className="button button-quiet" onClick={onClose}>{duplicate ? 'Keep existing' : 'Cancel'}</button><button className="button button-primary" onClick={() => onCommit(duplicate)}><Icon name={duplicate ? 'upload' : 'check'} size={15}/>{duplicate ? 'Replace plan' : 'Import plan'}</button></div>
  </section></div>;
}

function TaskRow({ item, onToggle, onMeasure, onStartTimer, compact = false }) {
  const done = item.status === 'completed';
  return <div className={`task-row ${done ? 'done' : ''} ${compact ? 'compact' : ''}`}>
    <button className={`task-check ${done ? 'checked' : ''}`} aria-label={done ? `Mark ${item.task.title} incomplete` : `Complete ${item.task.title}`} onClick={() => onToggle(item)}><Icon name="check" size={14}/></button>
    <div className="task-main"><strong>{item.task.title}</strong><div className="task-meta"><span className={`task-category category-${(item.task.category || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{item.task.category || 'Task'}</span><span>{formatDuration(item.durationMinutes)}</span></div></div>
    {onStartTimer && item.status !== 'completed' && <button className="task-timer-start" onClick={() => onStartTimer(item)} aria-label={`Start ${formatDuration(item.durationMinutes)} ${item.task.title} focus timer`}>Start</button>}
    {item.task.measurement && onMeasure && <button className="measure-action" onClick={() => onMeasure(item)} aria-label={`Log ${item.task.measurement.unit} for ${item.task.title}`}>+ Log</button>}
    {item.startTime && <div className="task-time"><span>{item.startTime}</span><small>{item.endTime}</small></div>}
  </div>;
}

function Overview({ plan, progress, date, setPage, onToggle, onMeasure, onStartTimer, onCreate, onImport }) {
  if (!plan) return <EmptyPlan onCreate={onCreate} onImport={onImport}/>;
  const key = localDateKey(date);
  const todayItems = buildSchedule(plan, progress, key);
  const completed = todayItems.filter((item) => item.status === 'completed').length;
  const totalMinutes = todayItems.reduce((sum, item) => sum + item.durationMinutes, 0);
  const goals = plan.goals || [];
  const upcoming = todayItems.find((item) => item.status !== 'completed');
  return <div className="page-content">
    <section className="welcome-row"><div><div className="eyebrow">{dayLabel(key, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</div><h2>{greeting()}, planner <span className="wave">✳</span></h2><p>Small, steady steps make a meaningful day.</p></div><button className="button button-outline" onClick={() => setPage('daily')}>Open today <Icon name="arrow" size={16}/></button></section>
    <section className="overview-grid">
      <article className="glass-card today-card"><div className="card-top"><div><div className="eyebrow">TODAY AT A GLANCE</div><h3>Your rhythm</h3></div><span className="icon-orb"><Icon name="sun" size={19}/></span></div><div className="rhythm-content"><ProgressRing value={todayItems.length ? Math.round((completed / todayItems.length) * 100) : 0}/><div className="rhythm-stats"><div><strong>{completed}<small> / {todayItems.length}</small></strong><span>tasks complete</span></div><div><strong>{formatDuration(totalMinutes)}</strong><span>planned today</span></div></div></div><div className="card-foot"><span className="live-dot"/> Progress is saved as you go</div></article>
      <article className="glass-card next-card"><div className="card-top"><div><div className="eyebrow">UP NEXT</div><h3>{upcoming ? 'A little focus time' : 'You’re all caught up'}</h3></div><span className="icon-orb violet"><Icon name="clock" size={19}/></span></div>{upcoming ? <><div className="next-task"><span className="next-time">{upcoming.startTime || 'Flexible'}</span><div><strong>{upcoming.task.title}</strong><small>{upcoming.task.description || 'A good next step in your plan.'}</small></div></div><button className="text-button" onClick={() => setPage('daily')}>See your day <Icon name="arrow" size={15}/></button></> : <p className="quiet-copy">There’s nothing left on today’s list. Enjoy the space.</p>}</article>
      <article className="glass-card goals-card"><div className="card-top"><div><div className="eyebrow">YOUR INTENTIONS</div><h3>Goals in focus</h3></div><span className="icon-orb mint"><Icon name="target" size={19}/></span></div>{goals.length ? <div className="goal-list">{goals.slice(0, 4).map((goal, index) => <div className="goal-line" key={goal.id}><span className={`goal-index tone-${index % 3}`}>{String(index + 1).padStart(2, '0')}</span><div><strong>{goal.title}</strong><small>Target {dayLabel(goal.targetDate, { month: 'short', day: 'numeric' })}</small></div><span className={`priority priority-${goal.priority}`}>{goal.priority}</span></div>)}</div> : <p className="quiet-copy">Your plan’s goals will appear here.</p>}<button className="text-button" onClick={() => setPage('monthly')}>View monthly plan <Icon name="arrow" size={15}/></button></article>
    <article className="glass-card agenda-card"><div className="card-top"><div><div className="eyebrow">TODAY’S PLAN</div><h3>{todayItems.length ? `${todayItems.length} thoughtful steps` : 'Space to plan your day'}</h3></div><button className="round-link" aria-label="Open daily view" onClick={() => setPage('daily')}><Icon name="arrow" size={16}/></button></div>{todayItems.length ? <div className="task-list">{todayItems.slice(0, 4).map((item) => <TaskRow key={item.occurrenceId} item={item} onToggle={onToggle} onMeasure={onMeasure} onStartTimer={onStartTimer} compact/>)}{todayItems.length > 4 && <button className="more-link" onClick={() => setPage('daily')}>+ {todayItems.length - 4} more steps</button>}</div> : <div className="agenda-empty"><span className="soft-star"><Icon name="spark" size={18}/></span><p>Your plan will show up here once you import it.</p><button className="button button-quiet" onClick={onImport}>Import plan <Icon name="arrow" size={15}/></button></div>}</article>
    </section>
    <div className="privacy-line"><Icon name="check" size={14}/> Your planner is private. Plan and progress data stay in this browser.</div>
  </div>;
}

function Monthly({ plan, progress, date, onToggle, onMeasure, onStartTimer, setDate, onCreate }) {
  if (!plan) return <EmptyPlan onCreate={onCreate} onImport={() => document.getElementById('plan-file-input')?.click()}/>;
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - ((first.getDay() + 6) % 7));
  const cells = datesFrom(gridStart, 42);
  const todayKey = localDateKey(new Date());
  const byDate = buildScheduleMap(plan, progress, cells.map(({ key }) => key));
  const selected = localDateKey(date);
  return <div className="page-content calendar-content">
    <div className="section-toolbar"><div><h2>Make the month feel manageable.</h2><p>Your tasks and checkpoints, in one clear view.</p></div><div className="legend"><span><i className="legend-dot dot-task"/>Planned</span><span><i className="legend-dot dot-done"/>Complete</span></div></div>
    <section className="month-shell glass-card"><div className="month-weekdays">{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => <span key={day}>{day}</span>)}</div><div className="month-grid">{cells.map(({ date: cellDate, key }) => {
      const items = byDate.get(key) || [];
      const inMonth = cellDate.getMonth() === date.getMonth();
      const isSelected = key === selected;
      return <button key={key} className={`month-cell ${inMonth ? '' : 'outside'} ${key === todayKey ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`} onClick={() => setDate(cellDate)} aria-label={`${dayLabel(key)}, ${items.length} tasks`}>
        <span className="cell-date">{cellDate.getDate()}</span>{items.slice(0, 2).map((item) => <span key={item.occurrenceId} className={`month-event ${item.status === 'completed' ? 'event-done' : ''}`}><i/>{item.task.title}</span>)}{items.length > 2 && <span className="event-more">+{items.length - 2} more</span>}
      </button>;
    })}</div></section>
    <section className="month-detail glass-card"><div className="detail-heading"><div><div className="eyebrow">SELECTED DAY</div><h3>{dayLabel(selected, { weekday: 'long', month: 'long', day: 'numeric' })}</h3></div><button className="text-button" onClick={() => setDate(new Date())}>Jump to today <Icon name="arrow" size={15}/></button></div>{(byDate.get(selected) || []).length ? <div className="month-task-list">{(byDate.get(selected) || []).map((item) => <TaskRow key={item.occurrenceId} item={item} onToggle={onToggle} onMeasure={onMeasure} onStartTimer={onStartTimer}/>)}</div> : <p className="quiet-copy">No planned tasks for this day. A little breathing room is part of the plan.</p>}</section>
    <CheckpointPanel title="Milestones this month" checkpoints={(plan.weeklyCheckpoints || []).filter((checkpoint) => checkpoint.endDate >= `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01` && checkpoint.startDate <= `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()).padStart(2, '0')}`)} progress={progress} timezone={plan.plan.timezone}/>
  </div>;
}

function Weekly({ plan, progress, date, onToggle, onMeasure, onStartTimer, setDate, onCreate }) {
  if (!plan) return <EmptyPlan onCreate={onCreate} onImport={() => document.getElementById('plan-file-input')?.click()}/>;
  const week = datesFrom(mondayStart(date), 7);
  const todayKey = localDateKey(new Date());
  const weekItems = buildScheduleMap(plan, progress, week.map(({ key }) => key));
  const weekRows = week.map(({ date: day, key }) => ({ date: day, key, items: weekItems.get(key) || [] }));
  const count = weekRows.reduce((sum, day) => sum + day.items.length, 0);
  const done = weekRows.reduce((sum, day) => sum + day.items.filter((item) => item.status === 'completed').length, 0);
  return <div className="page-content">
    <div className="section-toolbar"><div><h2>A week with room to breathe.</h2><p>{done} of {count} planned steps complete.</p></div><div className="week-progress"><span><i style={{ width: `${count ? (done / count) * 100 : 0}%` }}/></span><small>{count ? Math.round((done / count) * 100) : 0}%</small></div></div>
    <section className="week-board">{weekRows.map(({ date: day, key, items }) => <article key={key} className={`day-column glass-card ${key === todayKey ? 'current-day' : ''}`}>
      <button className="day-column-head" onClick={() => setDate(day)} aria-label={`Select ${dayLabel(key)}`}><span>{day.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()}</span><strong className={key === todayKey ? 'day-number today-number' : ''}>{day.getDate()}</strong><small>{items.length ? `${items.length} ${items.length === 1 ? 'step' : 'steps'}` : 'Open day'}</small></button>
      <div className="day-column-events">{items.length ? items.map((item) => <div key={item.occurrenceId} className={`week-event ${item.status === 'completed' ? 'done' : ''}`}><span className="event-time">{item.startTime || 'flexible'}</span><strong>{item.task.title}</strong><small>{formatDuration(item.durationMinutes)}</small><div className="week-event-actions">{onStartTimer && item.status !== 'completed' && <button className="mini-timer-start" onClick={() => onStartTimer(item)}>Start</button>}{item.task.measurement && <button className="mini-measure" onClick={() => onMeasure(item)} aria-label={`Log ${item.task.measurement.unit} for ${item.task.title}`}>+ Log</button>}<button className={`mini-check ${item.status === 'completed' ? 'checked' : ''}`} aria-label={item.status === 'completed' ? `Mark ${item.task.title} incomplete` : `Complete ${item.task.title}`} onClick={() => onToggle(item)}><Icon name="check" size={12}/></button></div></div>) : <div className="open-day"><span className="open-day-mark">·</span><small>Space to reset</small></div>}</div>
    </article>)}</section>
    <CheckpointPanel title="Weekly checkpoints" checkpoints={(plan.weeklyCheckpoints || []).filter((checkpoint) => checkpoint.endDate >= localDateKey(week[0].date) && checkpoint.startDate <= localDateKey(week[6].date))} progress={progress} timezone={plan.plan.timezone}/>
    <div className="week-footnote"><span className="live-dot"/> Flexible blocks are suggestions. You can adjust your day as it unfolds.</div>
  </div>;
}

function Daily({ plan, progress, date, onToggle, onMeasure, onStartTimer, onCreate }) {
  if (!plan) return <EmptyPlan onCreate={onCreate} onImport={() => document.getElementById('plan-file-input')?.click()}/>;
  const key = localDateKey(date);
  const items = buildSchedule(plan, progress, key);
  const completed = items.filter((item) => item.status === 'completed').length;
  const unscheduled = items.filter((item) => !item.startTime);
  return <div className="page-content daily-layout">
    <section className="daily-intro glass-card"><div className="daily-sun"><Icon name="sun" size={22}/></div><div><div className="eyebrow">A GENTLE PLAN</div><h2>{date.toLocaleDateString(undefined, { weekday: 'long' })}, {date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h2><p>{items.length ? `${completed} of ${items.length} steps complete · ${items.length - completed} to go at your pace.` : 'Keep a little space for the unexpected.'}</p></div><ProgressRing value={items.length ? Math.round((completed / items.length) * 100) : 0} label="today"/></section>
    <section className="daily-columns"><div className="glass-card timeline-card"><div className="card-top"><div><div className="eyebrow">YOUR FLOW</div><h3>Today’s rhythm</h3></div><span className="today-pill">{items.length} steps</span></div>{items.length ? <div className="timeline-list">{items.filter((item) => item.startTime).map((item) => <div className={`timeline-item ${item.status === 'completed' ? 'done' : ''}`} key={item.occurrenceId}><div className="timeline-time"><strong>{item.startTime}</strong><small>{item.endTime || formatDuration(item.durationMinutes)}</small></div><div className="timeline-rail"><i/></div><div className="timeline-task"><TaskRow item={item} onToggle={onToggle} onMeasure={onMeasure} onStartTimer={onStartTimer}/></div></div>)}{!items.some((item) => item.startTime) && <div className="no-timed">No fixed-time blocks today. Start wherever feels right.</div>}</div> : <div className="empty-inline"><span className="soft-star"><Icon name="spark" size={17}/></span><div><strong>A day with possibility.</strong><p>Import a plan to see your schedule here.</p></div></div>}</div>
      <aside className="daily-aside"><div className="glass-card flex-card"><div className="card-top"><div><div className="eyebrow">WHEN IT FITS</div><h3>Flexible or open steps</h3></div><span className="icon-orb mint"><Icon name="spark" size={18}/></span></div>{unscheduled.length ? <div className="task-list">{unscheduled.map((item) => <TaskRow key={item.occurrenceId} item={item} onToggle={onToggle} onMeasure={onMeasure} onStartTimer={onStartTimer}/>)}</div> : <p className="quiet-copy">No unplaced steps waiting today.</p>}<div className="suggestion-note"><Icon name="clock" size={15}/> Suggested times fit around your fixed blocks.</div></div><CheckpointPanel title="Today’s checkpoints" checkpoints={(plan.dailyCheckpoints || []).filter((checkpoint) => checkpoint.date === key)} progress={progress} timezone={plan.plan.timezone}/><div className="glass-card reflection-card"><div className="eyebrow">A SMALL REMINDER</div><p>“Progress is built in the ordinary moments.”</p><span>Keep going gently.</span></div></aside></section>
  </div>;
}

function CreatePlan({ onImport, onCreateFile }) {
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const promptRef = useRef(null);
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setShowPrompt(true);
      window.setTimeout(() => promptRef.current?.select(), 0);
    }
  }
  return <div className="page-content create-content">
    <section className="create-hero glass-panel"><div className="hero-orb hero-orb-one"/><div className="hero-orb hero-orb-two"/><div className="hero-content"><span className="hero-icon"><Icon name="spark" size={21}/></span><div className="eyebrow">FROM IDEA TO ACTION</div><h2>A plan that feels like yours.</h2><p>Use an AI assistant to shape a realistic plan, then bring it here to make progress at your own pace.</p></div><div className="hero-steps">{['Imagine', 'Shape', 'Begin'].map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></div>)}</div></section>
    <section className="create-step-grid"><article className="glass-card create-step"><div className="step-top"><span className="step-number">01</span><span className="step-icon"><Icon name="copy" size={18}/></span></div><div className="eyebrow">START WITH CLARITY</div><h3>Copy your planning prompt</h3><p>Take the MyPlanner prompt to an AI assistant to talk through your goals and shape a plan.</p><button className="button button-outline" onClick={copyPrompt}><Icon name={copied ? 'check' : 'copy'} size={16}/>{copied ? 'Copied to clipboard' : 'Copy MyPlanner prompt'}</button></article>
      <article className="glass-card create-step"><div className="step-top"><span className="step-number">02</span><span className="step-icon"><Icon name="spark" size={18}/></span></div><div className="eyebrow">MAKE IT MEANINGFUL</div><h3>Shape the plan with AI</h3><p>Discuss the plan with your preferred AI assistant. Review its summary and approve before it returns JSON.</p><div className="step-hint"><span className="live-dot"/> MyPlanner won’t generate plans on its own.</div></article>
      <article className="glass-card create-step"><div className="step-top"><span className="step-number">03</span><span className="step-icon"><Icon name="download" size={18}/></span></div><div className="eyebrow">KEEP A PORTABLE COPY</div><h3>Download the plan file</h3><p>Ask the assistant for the complete JSON file. Save it somewhere you can find it again.</p><div className="file-chip"><span className="file-chip-icon">{`{ }`}</span><div><strong>your-plan.json</strong><small>One plan · portable JSON</small></div><Icon name="check" size={16}/></div></article>
      <article className="glass-card create-step import-step"><div className="step-top"><span className="step-number">04</span><span className="step-icon"><Icon name="upload" size={18}/></span></div><div className="eyebrow">BRING IT INTO YOUR SPACE</div><h3>Import and get moving</h3><p>MyPlanner checks the file against its schema and planning rules before saving it in this browser.</p><button className="button button-primary" onClick={onImport}><Icon name="upload" size={16}/>Choose a JSON file</button><span className="button-caption">Plan content stays read-only; progress stays yours.</span></article></section>
    {showPrompt && <section className="glass-card prompt-fallback"><div className="detail-heading"><div><div className="eyebrow">COPY THE PROMPT</div><h3>Select and copy</h3></div><IconButton label="Close prompt" onClick={() => setShowPrompt(false)}><Icon name="close"/></IconButton></div><textarea ref={promptRef} value={PROMPT} readOnly aria-label="MyPlanner AI prompt"/><button className="button button-outline" onClick={() => { promptRef.current?.select(); document.execCommand('copy'); setCopied(true); }}>Select prompt text</button></section>}
    <section className="create-bottom-note glass-card"><div className="note-icon"><Icon name="target" size={18}/></div><div><strong>Built around your verified MyPlanner foundation</strong><p>Imported plans are validated against schema v1.0.0. Your completion and measurements are stored separately from the plan data.</p></div><button className="text-button" onClick={onCreateFile}>Download schema <Icon name="download" size={15}/></button></section>
  </div>;
}

function Toast({ toast, onClose }) {
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(onClose, 5200); return () => window.clearTimeout(timer); }, [toast, onClose]);
  if (!toast) return null;
  return <div className={`toast ${toast.type || ''}`} role="status"><span className="toast-icon"><Icon name={toast.type === 'error' ? 'close' : 'check'} size={15}/></span><span>{toast.message}</span><button aria-label="Dismiss notification" onClick={onClose}><Icon name="close" size={16}/></button></div>;
}

export default function App() {
  const [library, setLibrary] = useState(() => readLibrary());
  const { registry } = library;
  const [page, setPage] = useState('overview');
  const [viewDate, setViewDate] = useState(() => new Date());
  const [toast, setToast] = useState(null);
  const [measureTarget, setMeasureTarget] = useState(null);
  const [measureValue, setMeasureValue] = useState('');
  const [pendingImport, setPendingImport] = useState(null);
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [timerSession, setTimerSession] = useState(null);
  const fileInput = useRef(null);
  const selectedPlan = registry.plans.find((plan) => plan.plan.id === registry.selectedPlanId) || null;
  const envelope = selectedPlan ? library.envelopes.get(selectedPlan.plan.id) : null;
  const progress = envelope?.progress || null;

  function updateLibrary() {
    setLibrary(readLibrary());
  }
  function showToast(message, type = 'success') { setToast({ message, type }); }
  function startTaskTimer(item) {
    primeTimerAudio();
    setTimerSession({ taskName: item.task.title, totalMinutes: Math.max(1, Math.round(item.durationMinutes)) });
  }
  function openCreate() { setPage('create'); }
  function selectPlan(id) {
    const next = { ...registry, selectedPlanId: id };
    try { writeRegistry(next); setLibrary(readLibrary()); }
    catch { showToast('Could not save your selected plan in this browser.', 'error'); }
  }
  function togglePlanActive(id, active) {
    try {
      const next = setPlanActive(registry, id, active);
      writeRegistry(next);
      setLibrary(readLibrary());
    } catch (error) {
      showToast(error.message || 'Could not update this plan.', 'error');
    }
  }
  function changePage(id) { setPage(id); setPlanMenuOpen(false); }
  function shiftPeriod(direction) {
    setViewDate((current) => {
      const next = new Date(current);
      if (page === 'monthly') next.setMonth(next.getMonth() + direction);
      else next.setDate(next.getDate() + direction * (page === 'daily' ? 1 : 7));
      return next;
    });
  }
  function toggleOccurrence(item) {
    if (!selectedPlan || !progress) return;
    try {
      const nextProgress = setOccurrence(progress, item.occurrenceId, item.status === 'completed'
        ? { status: 'pending', completedAt: undefined }
        : { status: 'completed', completedAt: new Date().toISOString() });
      saveProgress(selectedPlan, nextProgress);
      updateLibrary();
    } catch (error) {
      showToast(error.message || 'Progress could not be saved.', 'error');
    }
  }
  function openMeasurement(item) { setMeasureTarget(item); setMeasureValue(''); }
  function saveMeasurement(event) {
    event.preventDefault();
    if (!selectedPlan || !progress || measureValue.trim() === '') return;
    const value = Number(measureValue);
    if (!Number.isFinite(value) || value < 0) { showToast('Enter a valid non-negative amount.', 'error'); return; }
    try {
      const nextProgress = recordMeasurement(progress, measureTarget.task.id, value);
      saveProgress(selectedPlan, nextProgress);
      setLibrary(readLibrary()); setMeasureTarget(null); setMeasureValue('');
      showToast('Measurement saved to your progress.');
    } catch (error) {
      showToast(error.message || 'Measurement could not be saved.', 'error');
    }
  }
  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = preparePlanImport(text, registry);
      if (result.ok) setPendingImport(result);
      else if (result.error?.code === 'PLAN_INVALID') {
        const first = result.error.preview?.errors?.[0];
        showToast(first?.message || 'This plan needs a small fix before it can be imported.', 'error');
      } else showToast(result.error?.message || 'That file could not be imported.', 'error');
    } catch (error) {
      showToast(error.message || 'That file could not be read.', 'error');
    } finally {
      event.target.value = '';
    }
  }
  function confirmImport(replace) {
    if (!pendingImport) return;
    const result = commitPlanImport(pendingImport.plan, registry, { replace });
    if (result.ok) {
      setLibrary(readLibrary()); setPage('overview'); setViewDate(new Date()); setPendingImport(null);
      showToast(result.replaced ? 'Plan updated. Your existing progress was preserved.' : 'Plan imported and ready to explore.');
    } else if (result.error?.code === 'PLAN_INVALID') {
      const first = result.error.preview?.errors?.[0];
      showToast(first?.message || 'This plan needs a small fix before it can be imported.', 'error');
      setPendingImport(null);
    } else showToast(result.error?.message || 'The plan could not be saved.', 'error');
  }
  function downloadSchema() {
    const blob = new Blob([`${JSON.stringify(planSchema, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'myplanner-plan-schema-v1.0.0.json'; link.click(); URL.revokeObjectURL(url);
  }

  return <div className="app-shell">
    <div className="ambient ambient-a"/><div className="ambient ambient-b"/><div className="ambient ambient-c"/>
    <div className="desktop-sidebar"><Sidebar page={page} setPage={changePage} onCreate={openCreate} planCount={registry.plans.length}/></div>
    <main className="main-panel"><Header page={page} plan={selectedPlan} registry={registry} onSelectPlan={selectPlan} onToggleActive={togglePlanActive} onImport={() => fileInput.current?.click()} date={viewDate} onShift={shiftPeriod} onToday={() => setViewDate(new Date())} menuOpen={planMenuOpen} setMenuOpen={setPlanMenuOpen}/>
      {page === 'overview' && <Overview plan={selectedPlan} progress={progress} date={viewDate} setPage={changePage} onToggle={toggleOccurrence} onMeasure={openMeasurement} onStartTimer={startTaskTimer} onCreate={openCreate} onImport={() => fileInput.current?.click()}/>}
      {page === 'monthly' && <Monthly plan={selectedPlan} progress={progress} date={viewDate} onToggle={toggleOccurrence} onMeasure={openMeasurement} onStartTimer={startTaskTimer} setDate={setViewDate} onCreate={openCreate}/>}
      {page === 'weekly' && <Weekly plan={selectedPlan} progress={progress} date={viewDate} onToggle={toggleOccurrence} onMeasure={openMeasurement} onStartTimer={startTaskTimer} setDate={setViewDate} onCreate={openCreate}/>}
      {page === 'daily' && <Daily plan={selectedPlan} progress={progress} date={viewDate} onToggle={toggleOccurrence} onMeasure={openMeasurement} onStartTimer={startTaskTimer} onCreate={openCreate}/>}
      {page === 'create' && <CreatePlan onImport={() => fileInput.current?.click()} onCreateFile={downloadSchema}/>}
      <footer className="app-footer"><span>MYPLANNER · A LITTLE MORE INTENTIONAL</span><span>Private by design <i/></span></footer>
    </main>
    <nav className="mobile-tabbar glass-panel" aria-label="Mobile navigation">{[...NAV, { id: 'create', label: 'Create', icon: 'add' }].map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => changePage(item.id)} aria-current={page === item.id ? 'page' : undefined}><Icon name={item.icon} size={19}/><span>{item.label}</span></button>)}</nav>
    <input ref={fileInput} id="plan-file-input" className="visually-hidden" type="file" accept="application/json,.json" onChange={handleFile}/>
    <ImportPreviewDialog pendingImport={pendingImport} onClose={() => setPendingImport(null)} onCommit={confirmImport}/>
    <MeasureDialog item={measureTarget} value={measureValue} setValue={setMeasureValue} onClose={() => setMeasureTarget(null)} onSubmit={saveMeasurement}/>
    {timerSession && <FocusTimer key={`${timerSession.taskName}-${timerSession.totalMinutes}`} {...timerSession} onClose={() => setTimerSession(null)}/>}
    <Toast toast={toast} onClose={() => setToast(null)}/>
  </div>;
}
