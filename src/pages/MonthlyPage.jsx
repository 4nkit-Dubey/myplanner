import React from "react";
import { usePlanner } from "../context/PlannerContext.jsx";
import {
  buildScheduleMap,
  datesFrom,
  dayLabel,
  localDateKey,
} from "../plannerView.js";
import {
  CheckpointPanel,
  EmptyPlan,
  Icon,
  TaskRow,
} from "../components/PlannerUI.jsx";

function Monthly({
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
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = new Date(
    first.getFullYear(),
    first.getMonth(),
    1 - ((first.getDay() + 6) % 7),
  );
  const cells = datesFrom(gridStart, 42);
  const todayKey = localDateKey(new Date());
  const byDate = buildScheduleMap(
    plan,
    progress,
    cells.map(({ key }) => key),
  );
  const selected = localDateKey(date);
  return (
    <div className="page-content calendar-content">
      <div className="section-toolbar">
        <div>
          <h2>Make the month feel manageable.</h2>
          <p>Your tasks and checkpoints, in one clear view.</p>
        </div>
        <div className="legend">
          <span>
            <i className="legend-dot dot-task" />
            Planned
          </span>
          <span>
            <i className="legend-dot dot-done" />
            Complete
          </span>
        </div>
      </div>
      <section className="month-shell glass-card">
        <div className="month-weekdays">
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="month-grid">
          {cells.map(({ date: cellDate, key }) => {
            const items = byDate.get(key) || [];
            const inMonth = cellDate.getMonth() === date.getMonth();
            const isSelected = key === selected;
            return (
              <button
                key={key}
                className={`month-cell ${inMonth ? "" : "outside"} ${key === todayKey ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
                onClick={() => setDate(cellDate)}
                aria-label={`${dayLabel(key)}, ${items.length} tasks`}
              >
                <span className="cell-date">{cellDate.getDate()}</span>
                {items.slice(0, 2).map((item) => (
                  <span
                    key={item.occurrenceId}
                    className={`month-event ${item.status === "completed" ? "event-done" : ""}`}
                  >
                    <i />
                    {item.task.title}
                  </span>
                ))}
                {items.length > 2 && (
                  <span className="event-more">+{items.length - 2} more</span>
                )}
              </button>
            );
          })}
        </div>
      </section>
      <section className="month-detail glass-card">
        <div className="detail-heading">
          <div>
            <div className="eyebrow">SELECTED DAY</div>
            <h3>
              {dayLabel(selected, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>
          </div>
          <button className="text-button" onClick={() => setDate(new Date())}>
            Jump to today <Icon name="arrow" size={15} />
          </button>
        </div>
        {(byDate.get(selected) || []).length ? (
          <div className="month-task-list">
            {(byDate.get(selected) || []).map((item) => (
              <TaskRow
                key={item.occurrenceId}
                item={item}
                onToggle={onToggle}
                onMeasure={onMeasure}
                onStartTimer={onStartTimer}
              />
            ))}
          </div>
        ) : (
          <p className="quiet-copy">
            No planned tasks for this day. A little breathing room is part of
            the plan.
          </p>
        )}
      </section>
      <CheckpointPanel
        title="Milestones this month"
        checkpoints={(plan.weeklyCheckpoints || []).filter(
          (checkpoint) =>
            checkpoint.endDate >=
              `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01` &&
            checkpoint.startDate <=
              `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()).padStart(2, "0")}`,
        )}
        progress={progress}
        timezone={plan.plan.timezone}
      />
    </div>
  );
}

export default function MonthlyPage() {
  const { plan, progress, date, onToggle, onMeasure, onStartTimer, setDate, onCreate } = usePlanner();
  return <Monthly {...{ plan, progress, date, onToggle, onMeasure, onStartTimer, setDate, onCreate }} />;
}
