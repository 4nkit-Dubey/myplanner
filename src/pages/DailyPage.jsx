import React from "react";
import { usePlanner } from "../context/PlannerContext.jsx";
import {
  buildSchedule,
  formatDuration,
  localDateKey,
} from "../plannerView.js";
import {
  CheckpointPanel,
  EmptyPlan,
  Icon,
  ProgressRing,
  TaskRow,
} from "../components/PlannerUI.jsx";

function Daily({
  plan,
  progress,
  date,
  onToggle,
  onMeasure,
  onStartTimer,
  onCreate,
}) {
  if (!plan)
    return (
      <EmptyPlan
        onCreate={onCreate}
        onImport={() => document.getElementById("plan-file-input")?.click()}
      />
    );
  const key = localDateKey(date);
  const items = buildSchedule(plan, progress, key);
  const completed = items.filter((item) => item.status === "completed").length;
  const unscheduled = items.filter((item) => !item.startTime);
  return (
    <div className="page-content daily-layout">
      <section className="daily-intro glass-card">
        <div className="daily-sun">
          <Icon name="sun" size={22} />
        </div>
        <div>
          <div className="eyebrow">A GENTLE PLAN</div>
          <h2>
            {date.toLocaleDateString(undefined, { weekday: "long" })},{" "}
            {date.toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
            })}
          </h2>
          <p>
            {items.length
              ? `${completed} of ${items.length} steps complete · ${items.length - completed} to go at your pace.`
              : "Keep a little space for the unexpected."}
          </p>
        </div>
        <ProgressRing
          value={
            items.length ? Math.round((completed / items.length) * 100) : 0
          }
          label="today"
        />
      </section>
      <section className="daily-columns">
        <div className="glass-card timeline-card">
          <div className="card-top">
            <div>
              <div className="eyebrow">YOUR FLOW</div>
              <h3>Today’s rhythm</h3>
            </div>
            <span className="today-pill">{items.length} steps</span>
          </div>
          {items.length ? (
            <div className="timeline-list">
              {items
                .filter((item) => item.startTime)
                .map((item) => (
                  <div
                    className={`timeline-item ${item.status === "completed" ? "done" : ""}`}
                    key={item.occurrenceId}
                  >
                    <div className="timeline-time">
                      <strong>{item.startTime}</strong>
                      <small>
                        {item.endTime || formatDuration(item.durationMinutes)}
                      </small>
                    </div>
                    <div className="timeline-rail">
                      <i />
                    </div>
                    <div className="timeline-task">
                      <TaskRow
                        item={item}
                        onToggle={onToggle}
                        onMeasure={onMeasure}
                        onStartTimer={onStartTimer}
                      />
                    </div>
                  </div>
                ))}
              {!items.some((item) => item.startTime) && (
                <div className="no-timed">
                  No fixed-time blocks today. Start wherever feels right.
                </div>
              )}
            </div>
          ) : (
            <div className="empty-inline">
              <span className="soft-star">
                <Icon name="spark" size={17} />
              </span>
              <div>
                <strong>A day with possibility.</strong>
                <p>Import a plan to see your schedule here.</p>
              </div>
            </div>
          )}
        </div>
        <aside className="daily-aside">
          <div className="glass-card flex-card">
            <div className="card-top">
              <div>
                <div className="eyebrow">WHEN IT FITS</div>
                <h3>Flexible or open steps</h3>
              </div>
              <span className="icon-orb mint">
                <Icon name="spark" size={18} />
              </span>
            </div>
            {unscheduled.length ? (
              <div className="task-list">
                {unscheduled.map((item) => (
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
              <p className="quiet-copy">No unplaced steps waiting today.</p>
            )}
            <div className="suggestion-note">
              <Icon name="clock" size={15} /> Suggested times fit around your
              fixed blocks.
            </div>
          </div>
          <CheckpointPanel
            title="Today’s checkpoints"
            checkpoints={(plan.dailyCheckpoints || []).filter(
              (checkpoint) => checkpoint.date === key,
            )}
            progress={progress}
            timezone={plan.plan.timezone}
          />
          <div className="glass-card reflection-card">
            <div className="eyebrow">A SMALL REMINDER</div>
            <p>“Progress is built in the ordinary moments.”</p>
            <span>Keep going gently.</span>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default function DailyPage() {
  const { plan, progress, date, onToggle, onMeasure, onStartTimer, onCreate } = usePlanner();
  return <Daily {...{ plan, progress, date, onToggle, onMeasure, onStartTimer, onCreate }} />;
}
