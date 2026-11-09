import React, { useEffect } from "react";
import { aggregateCheckpoint } from "../progress.js";
import {
  dateInZone,
  datesFrom,
  dayLabel,
  localDateKey,
  mondayStart,
} from "../plannerView.js";

export const NAV = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "monthly", label: "Monthly", icon: "calendar" },
  { id: "weekly", label: "Weekly", icon: "week" },
  { id: "daily", label: "Daily", icon: "sun" },
];

export function Icon({ name, size = 20, strokeWidth = 1.7 }) {
  const paths = {
    grid: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4M17 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
      </>
    ),
    week: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M8 4v17M14 4v17M3 9h18M6 7h.01M11 12h.01M17 15h.01" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2.5 12h2m15 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
      </>
    ),
    add: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
        <path d="M5 14.5v4A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-4" />
      </>
    ),
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        <path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14ZM5 15l.7 1.8L7.5 17.5l-1.8.7L5 20l-.7-1.8-1.8-.7 1.8-.7L5 15Z" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5" />
        <path d="M4 20h16" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export function IconButton({ label, onClick, children, className = "" }) {
  return (
    <button
      className={`icon-button ${className}`}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Sidebar({ page, setPage, onCreate, planCount }) {
  return (
    <aside className="sidebar glass-panel">
      <a
        className="brand"
        href="#/"
        onClick={(event) => {
          event.preventDefault();
          setPage("overview");
        }}
        aria-label="MyPlanner overview"
      >
        <span className="brand-mark">
          <Icon name="spark" size={19} />
        </span>
        <span className="brand-copy">
          <strong>myplanner</strong>
          <small>make space for what matters</small>
        </span>
      </a>
      <div className="sidebar-label">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? "active" : ""}`}
            onClick={() => setPage(item.id)}
            aria-label={item.label}
            aria-current={page === item.id ? "page" : undefined}
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
            {item.id === "overview" && planCount > 0 && (
              <span className="nav-count">{planCount}</span>
            )}
          </button>
        ))}
        <button
          className={`nav-item ${page === "create" ? "active" : ""}`}
          onClick={onCreate}
          aria-label="Create plan"
          aria-current={page === "create" ? "page" : undefined}
        >
          <Icon name="add" size={18} />
          <span>Create plan</span>
        </button>
      </nav>
      <div className="sidebar-bottom">
        <div className="focus-note">
          <span className="focus-dot" />
          <div>
            <strong>One step at a time</strong>
            <small>Your plan can flex with you.</small>
          </div>
        </div>
        <div className="profile-row">
          <div className="avatar">MP</div>
          <div>
            <strong>My workspace</strong>
            <small>Personal planner</small>
          </div>
          <span className="profile-menu">•••</span>
        </div>
      </div>
    </aside>
  );
}

export function Header({
  page,
  plan,
  registry,
  onSelectPlan,
  onToggleActive,
  onImport,
  date,
  onShift,
  onToday,
  menuOpen,
  setMenuOpen,
}) {
  const titles = {
    overview: ["Overview", "A little clarity for the day ahead."],
    monthly: ["Monthly view", "See the bigger picture, one day at a time."],
    weekly: ["Weekly view", "Make room for what matters this week."],
    daily: ["Daily view", "A softer plan for today."],
    create: ["Create a plan", "Shape a thoughtful plan with a little help."],
  };
  const dateLabel =
    page === "monthly"
      ? date.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : page === "weekly"
        ? (() => {
            const week = datesFrom(mondayStart(date), 7);
            return `${week[0].date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${week[6].date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
          })()
        : dayLabel(localDateKey(date), {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
  return (
    <header className="topbar">
      <div className="mobile-brand">
        <span className="brand-mark">
          <Icon name="spark" size={18} />
        </span>
        <strong>myplanner</strong>
        <span className="mobile-page-name">{titles[page][0]}</span>
      </div>
      <div className="page-heading">
        <div className="eyebrow">YOUR PLANNING SPACE</div>
        <h1>{titles[page][0]}</h1>
        <p>{titles[page][1]}</p>
      </div>
      <div className="top-actions">
        {page !== "create" && (
          <div className="plan-select-wrap">
            <button
              className="plan-select glass-control"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
            >
              <span className="select-dot" />
              <span className="select-copy">
                <small>PLAN</small>
                <strong>{plan?.plan.title || "Choose a plan"}</strong>
              </span>
              <Icon name="chevronRight" size={15} />
            </button>
            {menuOpen && (
              <div className="select-menu glass-panel">
                {registry.plans.length ? (
                  registry.plans.map((item) => {
                    const active = registry.activePlanIds.includes(
                      item.plan.id,
                    );
                    return (
                      <div className="plan-option-row" key={item.plan.id}>
                        <button
                          className="plan-option"
                          onClick={() => {
                            onSelectPlan(item.plan.id);
                            setMenuOpen(false);
                          }}
                        >
                          <span
                            className={`select-dot ${active ? "" : "muted"}`}
                          />
                          <span>{item.plan.title}</span>
                          {item.plan.id === plan?.plan.id && (
                            <Icon name="check" size={15} />
                          )}
                        </button>
                        <button
                          className={`active-toggle ${active ? "enabled" : ""}`}
                          aria-pressed={active}
                          aria-label={`${active ? "Deactivate" : "Activate"} ${item.plan.title}`}
                          onClick={() => onToggleActive(item.plan.id, !active)}
                        >
                          {active ? "Active" : "Paused"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p>No imported plans yet.</p>
                )}
              </div>
            )}
          </div>
        )}
        <button
          className="button button-primary header-import"
          onClick={onImport}
        >
          <Icon name="upload" size={17} />
          <span>Import plan</span>
        </button>
        {page !== "create" && page !== "overview" && (
          <div className="date-control glass-control">
            <IconButton label="Previous period" onClick={() => onShift(-1)}>
              <Icon name="chevronLeft" size={17} />
            </IconButton>
            <span>{dateLabel}</span>
            <IconButton label="Next period" onClick={() => onShift(1)}>
              <Icon name="chevronRight" size={17} />
            </IconButton>
            <button className="today-button" onClick={onToday}>
              Today
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export function EmptyPlan({ onCreate, onImport }) {
  return (
    <section className="empty-state glass-panel">
      <div className="empty-illustration">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="empty-core">
          <Icon name="spark" size={28} />
        </div>
        <span className="float-chip chip-a">
          <Icon name="check" size={14} />
        </span>
        <span className="float-chip chip-b">
          <Icon name="clock" size={14} />
        </span>
      </div>
      <div className="eyebrow">A FRESH START</div>
      <h2>Your plans, in one calm place.</h2>
      <p>
        Import a MyPlanner JSON plan to see your goals, tasks, and schedule come
        together. Your imported plan stays read-only; your progress is saved
        separately on this device.
      </p>
      <div className="empty-actions">
        <button className="button button-primary" onClick={onImport}>
          <Icon name="upload" size={17} />
          Import a plan
        </button>
        <button className="button button-quiet" onClick={onCreate}>
          Create a plan <Icon name="arrow" size={16} />
        </button>
      </div>
      <div className="empty-footnote">
        <Icon name="check" size={15} /> Your data stays in this browser
      </div>
    </section>
  );
}

export function ProgressRing({ value = 0, label = "today" }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div
      className="progress-ring"
      style={{ "--progress": `${safe}%` }}
      role="img"
      aria-label={`${safe}% ${label} complete`}
    >
      <div className="ring-inner">
        <strong>{safe}%</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

export function CheckpointPanel({ title, checkpoints, progress, timezone }) {
  return (
    <section className="glass-card checkpoint-panel">
      <div className="card-top">
        <div>
          <div className="eyebrow">MEASURABLE PROGRESS</div>
          <h3>{title}</h3>
        </div>
        <span className="icon-orb mint">
          <Icon name="target" size={18} />
        </span>
      </div>
      {checkpoints.length ? (
        <div className="checkpoint-list">
          {checkpoints.map((checkpoint) => (
            <div className="checkpoint-block" key={checkpoint.id}>
              <strong>{checkpoint.title}</strong>
              {(checkpoint.targets || []).map((target) => {
                const start =
                  checkpoint.date || checkpoint.startDate || "0000-01-01";
                const end =
                  checkpoint.date || checkpoint.endDate || "9999-12-31";
                const values = (
                  progress?.measurements?.[target.taskId] || []
                ).filter((entry) => {
                  const date = dateInZone(entry.at, timezone);
                  return date >= start && date <= end;
                });
                const summary = aggregateCheckpoint(target, values);
                return (
                  <div className="checkpoint-target" key={target.id}>
                    <div className="checkpoint-target-head">
                      <span>{target.description}</span>
                      <strong>
                        {summary.achieved} / {summary.target} {summary.unit}
                      </strong>
                    </div>
                    <div className="checkpoint-meter">
                      <span style={{ width: `${summary.ratio * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <p className="quiet-copy checkpoint-empty">
          No checkpoints in this period. Keep showing up for the small steps.
        </p>
      )}
    </section>
  );
}

export function MeasureDialog({ item, value, setValue, onClose, onSubmit }) {
  if (!item) return null;
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="measure-dialog glass-panel" onSubmit={onSubmit}>
        <div className="detail-heading">
          <div>
            <div className="eyebrow">LOG A MEASUREMENT</div>
            <h3>{item.task.title}</h3>
          </div>
          <IconButton label="Close measurement" onClick={onClose}>
            <Icon name="close" size={17} />
          </IconButton>
        </div>
        <p>
          Record progress toward{" "}
          <strong>
            {item.task.measurement.targetValue} {item.task.measurement.unit}
          </strong>
          .
        </p>
        <label htmlFor="measurement-value">
          Amount completed <span>({item.task.measurement.unit})</span>
        </label>
        <div className="measurement-input">
          <input
            id="measurement-value"
            autoFocus
            type="number"
            min="0"
            step="any"
            required
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <span>{item.task.measurement.unit}</span>
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            className="button button-quiet"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="button button-primary">
            Save measurement
          </button>
        </div>
      </form>
    </div>
  );
}

export function ImportPreviewDialog({ pendingImport, onClose, onCommit }) {
  if (!pendingImport) return null;
  const { plan, preview, duplicate } = pendingImport;
  const metrics = [
    ["GOALS", preview.goalCount],
    ["TASKS", preview.taskCount],
    ["SCHEDULED", plan.schedule?.entries?.length || 0],
    [
      "CHECKPOINTS",
      (plan.weeklyCheckpoints?.length || 0) +
        (plan.dailyCheckpoints?.length || 0),
    ],
  ];
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="import-dialog glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-preview-title"
      >
        <div className="detail-heading">
          <div>
            <div className="eyebrow">IMPORT PREVIEW · SCHEMA 1.0.0</div>
            <h3 id="import-preview-title">{plan.plan.title}</h3>
          </div>
          <IconButton label="Cancel import" onClick={onClose}>
            <Icon name="close" size={17} />
          </IconButton>
        </div>
        <p className="import-description">
          {plan.plan.description ||
            "Your plan is ready to bring into MyPlanner."}
        </p>
        <div className="validated-note">
          <span className="validated-check">
            <Icon name="check" size={14} />
          </span>
          <div>
            <strong>File passed validation</strong>
            <small>Schema structure and planning rules look good.</small>
          </div>
        </div>
        <div className="import-metrics">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <small>{label}</small>
            </div>
          ))}
        </div>
        <div className="import-date-row">
          <span>PLAN WINDOW</span>
          <strong>
            {dayLabel(plan.plan.startDate, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            —{" "}
            {dayLabel(plan.plan.endDate, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </strong>
          <small>{plan.plan.timezone}</small>
        </div>
        {plan.goals?.length > 0 && (
          <div className="preview-goals">
            <span>GOALS IN THIS PLAN</span>
            <div>
              {plan.goals.slice(0, 4).map((goal) => (
                <span className="preview-goal" key={goal.id}>
                  {goal.title}
                </span>
              ))}
              {plan.goals.length > 4 && (
                <span className="preview-goal extra-goal">
                  +{plan.goals.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
        {duplicate && (
          <div className="replace-note">
            <Icon name="clock" size={16} />
            <span>
              A plan with this ID already exists. Replacing it updates the plan
              and preserves its saved progress.
            </span>
          </div>
        )}
        <div className="dialog-actions">
          <button className="button button-quiet" onClick={onClose}>
            {duplicate ? "Keep existing" : "Cancel"}
          </button>
          <button
            className="button button-primary"
            onClick={() => onCommit(duplicate)}
          >
            <Icon name={duplicate ? "upload" : "check"} size={15} />
            {duplicate ? "Replace plan" : "Import plan"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function TaskRow({ item, onToggle, onMeasure, onStartTimer, compact = false }) {
  const done = item.status === "completed";
  return (
    <div
      className={`task-row ${done ? "done" : ""} ${compact ? "compact" : ""}`}
    >
      <button
        className={`task-check ${done ? "checked" : ""}`}
        aria-label={
          done
            ? `Mark ${item.task.title} incomplete`
            : `Complete ${item.task.title}`
        }
        onClick={() => onToggle(item)}
      >
        <Icon name="check" size={14} />
      </button>
      <div className="task-main">
        <strong>{item.task.title}</strong>
        <div className="task-meta">
          <span
            className={`task-category category-${(item.task.category || "general").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          >
            {item.task.category || "Task"}
          </span>
          <span>{formatDuration(item.durationMinutes)}</span>
        </div>
      </div>
      {onStartTimer && item.status !== "completed" && (
        <button
          className="task-timer-start"
          onClick={() => onStartTimer(item)}
          aria-label={`Start ${formatDuration(item.durationMinutes)} ${item.task.title} focus timer`}
        >
          Start
        </button>
      )}
      {item.task.measurement && onMeasure && (
        <button
          className="measure-action"
          onClick={() => onMeasure(item)}
          aria-label={`Log ${item.task.measurement.unit} for ${item.task.title}`}
        >
          + Log
        </button>
      )}
      {item.startTime && (
        <div className="task-time">
          <span>{item.startTime}</span>
          <small>{item.endTime}</small>
        </div>
      )}
    </div>
  );
}

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onClose, 5200);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type || ""}`} role="status">
      <span className="toast-icon">
        <Icon name={toast.type === "error" ? "close" : "check"} size={15} />
      </span>
      <span>{toast.message}</span>
      <button aria-label="Dismiss notification" onClick={onClose}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
