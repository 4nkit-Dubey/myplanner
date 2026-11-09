import { occurrences, placeFlexible } from "./scheduler.js";

export const localDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const parseLocalDate = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};
export const dayLabel = (
  key,
  options = { weekday: "short", month: "short", day: "numeric" },
) => parseLocalDate(key).toLocaleDateString(undefined, options);
export const minuteOf = (time = "23:59") =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

export function mondayStart(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}
export function datesFrom(start, count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + index,
    );
    return { date, key: localDateKey(date) };
  });
}
export function formatDuration(minutes = 0) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}
export function greeting() {
  const hour = new Date().getHours();
  return hour < 12
    ? "Good morning"
    : hour < 18
      ? "Good afternoon"
      : "Good evening";
}

export function buildScheduleMap(plan, progress, dateKeys) {
  if (!plan) return new Map();
  const wanted = new Set(dateKeys);
  const tasks = plan.tasks || [];
  const entries = plan.schedule?.entries || [];
  const allOccurrences = tasks.flatMap((task) =>
    occurrences(task).map((item) => ({ ...item, task })),
  );
  const byDate = new Map([...wanted].map((key) => [key, []]));
  allOccurrences.forEach((item) => {
    if (wanted.has(item.date)) byDate.get(item.date).push(item);
  });
  return new Map(
    [...wanted].map((dateKey) => {
      const dayItems = byDate.get(dateKey) || [];
      const dayEntries = entries.filter((entry) => entry.date === dateKey);
      const entryFor = (item) =>
        dayEntries.find((entry) => entry.taskId === item.taskId);
      const fixedEntries = dayEntries.filter((entry) => entry.type === "fixed");
      const flexibleItems = dayItems
        .filter((item) => item.type === "flexible")
        .map((item) => {
          const entry = entryFor(item);
          return {
            ...item,
            durationMinutes: entry?.durationMinutes || item.durationMinutes,
          };
        });
      const suggestions = placeFlexible(
        flexibleItems,
        fixedEntries,
        "08:00",
        "22:00",
      );
      const placedById = new Map(
        suggestions.placed.map((item) => [item.occurrenceId, item]),
      );
      const schedule = dayItems.map((item) => {
        const entry = entryFor(item);
        const suggested = placedById.get(item.occurrenceId);
        const stored = progress?.occurrences?.[item.occurrenceId];
        return {
          ...item,
          entry,
          startTime: entry?.startTime || suggested?.suggestedStartTime || null,
          endTime: entry?.endTime || suggested?.suggestedEndTime || null,
          status: stored?.status || "pending",
        };
      });
      schedule.sort((a, b) => {
        const left = a.startTime ? minuteOf(a.startTime) : 24 * 60;
        const right = b.startTime ? minuteOf(b.startTime) : 24 * 60;
        return left - right || a.task.title.localeCompare(b.task.title);
      });
      return [dateKey, schedule];
    }),
  );
}
export function buildSchedule(plan, progress, dateKey) {
  return buildScheduleMap(plan, progress, [dateKey]).get(dateKey) || [];
}

export function dateInZone(timestamp, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}
