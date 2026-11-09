import React from "react";
import { usePlanner } from "../context/PlannerContext.jsx";
import {
  buildSchedule,
  dayLabel,
  formatDuration,
  greeting,
  localDateKey,
} from "../plannerView.js";
import {
  EmptyPlan,
  Icon,
  ProgressRing,
  TaskRow,
} from "../components/PlannerUI.jsx";

function Overview({
  plan,
  progress,
  date,
  setPage,
  onToggle,
  onMeasure,
  onStartTimer,
  onCreate,
  onImport,
}) {
  if (!plan) return <EmptyPlan onCreate={onCreate} onImport={onImport} />;
  const key = localDateKey(date);
  const todayItems = buildSchedule(plan, progress, key);
  const completed = todayItems.filter(
    (item) => item.status === "completed",
  ).length;
  const totalMinutes = todayItems.reduce(
    (sum, item) => sum + item.durationMinutes,
    0,
  );
  const goals = plan.goals || [];
  const upcoming = todayItems.find((item) => item.status !== "completed");
  return (
    <div className="page-content">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            {dayLabel(key, {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).toUpperCase()}
          </div>
          <h2>
            {greeting()}, planner <span className="wave">✳</span>
          </h2>
          <p>Small, steady steps make a meaningful day.</p>
        </div>
        <button
          className="button button-outline"
          onClick={() => setPage("daily")}
        >
          Open today <Icon name="arrow" size={16} />
        </button>
      </section>
      <section className="overview-grid">
        <article className="glass-card today-card">
          <div className="card-top">
            <div>
              <div className="eyebrow">TODAY AT A GLANCE</div>
              <h3>Your rhythm</h3>
            </div>
            <span className="icon-orb">
              <Icon name="sun" size={19} />
            </span>
          </div>
          <div className="rhythm-content">
            <ProgressRing
              value={
                todayItems.length
                  ? Math.round((completed / todayItems.length) * 100)
                  : 0
              }
            />
            <div className="rhythm-stats">
              <div>
                <strong>
                  {completed}
                  <small> / {todayItems.length}</small>
                </strong>
                <span>tasks complete</span>
              </div>
              <div>
                <strong>{formatDuration(totalMinutes)}</strong>
                <span>planned today</span>
              </div>
            </div>
          </div>
          <div className="card-foot">
            <span className="live-dot" /> Progress is saved as you go
          </div>
        </article>
        <article className="glass-card next-card">
          <div className="card-top">
            <div>
              <div className="eyebrow">UP NEXT</div>
              <h3>
                {upcoming ? "A little focus time" : "You’re all caught up"}
              </h3>
            </div>
            <span className="icon-orb violet">
              <Icon name="clock" size={19} />
            </span>
          </div>
          {upcoming ? (
            <>
              <div className="next-task">
                <span className="next-time">
                  {upcoming.startTime || "Flexible"}
                </span>
                <div>
                  <strong>{upcoming.task.title}</strong>
                  <small>
                    {upcoming.task.description ||
                      "A good next step in your plan."}
                  </small>
                </div>
              </div>
              <button className="text-button" onClick={() => setPage("daily")}>
                See your day <Icon name="arrow" size={15} />
              </button>
            </>
          ) : (
            <p className="quiet-copy">
              There’s nothing left on today’s list. Enjoy the space.
            </p>
          )}
        </article>
        <article className="glass-card goals-card">
          <div className="card-top">
            <div>
              <div className="eyebrow">YOUR INTENTIONS</div>
              <h3>Goals in focus</h3>
            </div>
            <span className="icon-orb mint">
              <Icon name="target" size={19} />
            </span>
          </div>
          {goals.length ? (
            <div className="goal-list">
              {goals.slice(0, 4).map((goal, index) => (
                <div className="goal-line" key={goal.id}>
                  <span className={`goal-index tone-${index % 3}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{goal.title}</strong>
                    <small>
                      Target{" "}
                      {dayLabel(goal.targetDate, {
                        month: "short",
                        day: "numeric",
                      })}
                    </small>
                  </div>
                  <span className={`priority priority-${goal.priority}`}>
                    {goal.priority}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="quiet-copy">Your plan’s goals will appear here.</p>
          )}
          <button className="text-button" onClick={() => setPage("monthly")}>
            View monthly plan <Icon name="arrow" size={15} />
          </button>
        </article>
        <article className="glass-card agenda-card">
          <div className="card-top">
            <div>
              <div className="eyebrow">TODAY’S PLAN</div>
              <h3>
                {todayItems.length
                  ? `${todayItems.length} thoughtful steps`
                  : "Space to plan your day"}
              </h3>
            </div>
            <button
              className="round-link"
              aria-label="Open daily view"
              onClick={() => setPage("daily")}
            >
              <Icon name="arrow" size={16} />
            </button>
          </div>
          {todayItems.length ? (
            <div className="task-list">
              {todayItems.slice(0, 4).map((item) => (
                <TaskRow
                  key={item.occurrenceId}
                  item={item}
                  onToggle={onToggle}
                  onMeasure={onMeasure}
                  onStartTimer={onStartTimer}
                  compact
                />
              ))}
              {todayItems.length > 4 && (
                <button className="more-link" onClick={() => setPage("daily")}>
                  + {todayItems.length - 4} more steps
                </button>
              )}
            </div>
          ) : (
            <div className="agenda-empty">
              <span className="soft-star">
                <Icon name="spark" size={18} />
              </span>
              <p>Your plan will show up here once you import it.</p>
              <button className="button button-quiet" onClick={onImport}>
                Import plan <Icon name="arrow" size={15} />
              </button>
            </div>
          )}
        </article>
      </section>
      <div className="privacy-line">
        <Icon name="check" size={14} /> Your planner is private. Plan and
        progress data stay in this browser.
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { plan, progress, date, setPage, onToggle, onMeasure, onStartTimer, onCreate, onImport } = usePlanner();
  return <Overview {...{ plan, progress, date, setPage, onToggle, onMeasure, onStartTimer, onCreate, onImport }} />;
}
