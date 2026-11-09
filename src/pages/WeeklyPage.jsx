import React from "react";
import { usePlanner } from "../context/PlannerContext.jsx";
import {
  buildScheduleMap,
  dayLabel,
  datesFrom,
  formatDuration,
  localDateKey,
  mondayStart,
} from "../plannerView.js";
import {
  CheckpointPanel,
  EmptyPlan,
  Icon,
} from "../components/PlannerUI.jsx";

function Weekly({
  plan,
  progress,
  date,
  onToggle,
  onMeasure,
  onStartTimer,
  setDate,
  onCreate,
}) {
  if (!plan)
    return (
      <EmptyPlan
        onCreate={onCreate}
        onImport={() => document.getElementById("plan-file-input")?.click()}
      />
    );
  const week = datesFrom(mondayStart(date), 7);
  const todayKey = localDateKey(new Date());
  const weekItems = buildScheduleMap(
    plan,
    progress,
    week.map(({ key }) => key),
  );
  const weekRows = week.map(({ date: day, key }) => ({
    date: day,
    key,
    items: weekItems.get(key) || [],
  }));
  const count = weekRows.reduce((sum, day) => sum + day.items.length, 0);
  const done = weekRows.reduce(
    (sum, day) =>
      sum + day.items.filter((item) => item.status === "completed").length,
    0,
  );
  return (
    <div className="page-content">
      <div className="section-toolbar">
        <div>
          <h2>A week with room to breathe.</h2>
          <p>
            {done} of {count} planned steps complete.
          </p>
        </div>
        <div className="week-progress">
          <span>
            <i style={{ width: `${count ? (done / count) * 100 : 0}%` }} />
          </span>
          <small>{count ? Math.round((done / count) * 100) : 0}%</small>
        </div>
      </div>
      <section className="week-board">
        {weekRows.map(({ date: day, key, items }) => (
          <article
            key={key}
            className={`day-column glass-card ${key === todayKey ? "current-day" : ""}`}
          >
            <button
              className="day-column-head"
              onClick={() => setDate(day)}
              aria-label={`Select ${dayLabel(key)}`}
            >
              <span>
                {day
                  .toLocaleDateString(undefined, { weekday: "short" })
                  .toUpperCase()}
              </span>
              <strong
                className={key === todayKey ? "day-number today-number" : ""}
              >
                {day.getDate()}
              </strong>
              <small>
                {items.length
                  ? `${items.length} ${items.length === 1 ? "step" : "steps"}`
                  : "Open day"}
              </small>
            </button>
            <div className="day-column-events">
              {items.length ? (
                items.map((item) => (
                  <div
                    key={item.occurrenceId}
                    className={`week-event ${item.status === "completed" ? "done" : ""}`}
                  >
                    <span className="event-time">
                      {item.startTime || "flexible"}
                    </span>
                    <strong>{item.task.title}</strong>
                    <small>{formatDuration(item.durationMinutes)}</small>
                    <div className="week-event-actions">
                      {onStartTimer && item.status !== "completed" && (
                        <button
                          className="mini-timer-start"
                          onClick={() => onStartTimer(item)}
                        >
                          Start
                        </button>
                      )}
                      {item.task.measurement && (
                        <button
                          className="mini-measure"
                          onClick={() => onMeasure(item)}
                          aria-label={`Log ${item.task.measurement.unit} for ${item.task.title}`}
                        >
                          + Log
                        </button>
                      )}
                      <button
                        className={`mini-check ${item.status === "completed" ? "checked" : ""}`}
                        aria-label={
                          item.status === "completed"
                            ? `Mark ${item.task.title} incomplete`
                            : `Complete ${item.task.title}`
                        }
                        onClick={() => onToggle(item)}
                      >
                        <Icon name="check" size={12} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="open-day">
                  <span className="open-day-mark">·</span>
                  <small>Space to reset</small>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
      <CheckpointPanel
        title="Weekly checkpoints"
        checkpoints={(plan.weeklyCheckpoints || []).filter(
          (checkpoint) =>
            checkpoint.endDate >= localDateKey(week[0].date) &&
            checkpoint.startDate <= localDateKey(week[6].date),
        )}
        progress={progress}
        timezone={plan.plan.timezone}
      />
      <div className="week-footnote">
        <span className="live-dot" /> Flexible blocks are suggestions. You can
        adjust your day as it unfolds.
      </div>
    </div>
  );
}

export default function WeeklyPage() {
  const { plan, progress, date, onToggle, onMeasure, onStartTimer, setDate, onCreate } = usePlanner();
  return <Weekly {...{ plan, progress, date, onToggle, onMeasure, onStartTimer, setDate, onCreate }} />;
}
