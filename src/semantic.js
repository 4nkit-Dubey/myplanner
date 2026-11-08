const parse = s => new Date(`${s}T00:00:00Z`);
const inRange = (d, a, b) => d >= a && d <= b;

export function validateSemantics(p) {
  const errors = [];
  const add = (code, path, message) => errors.push({ code, path, message });
  const ids = new Map();
  const register = (items, kind, path) => (items || []).forEach((x, i) => {
    if (ids.has(x.id)) add('DUPLICATE_ID', `${path}/${i}/id`, `${kind} id '${x.id}' duplicates ${ids.get(x.id)}`);
    else ids.set(x.id, `${kind} at ${path}/${i}`);
  });
  register(p.goals, 'goal', '/goals'); register(p.tasks, 'task', '/tasks');
  register(p.schedule?.entries, 'schedule', '/schedule/entries');
  register(p.weeklyCheckpoints, 'weeklyCheckpoint', '/weeklyCheckpoints');
  register(p.dailyCheckpoints, 'dailyCheckpoint', '/dailyCheckpoints');
  (p.weeklyCheckpoints || []).forEach((c, i) => register(c.targets, 'target', `/weeklyCheckpoints/${i}/targets`));
  (p.dailyCheckpoints || []).forEach((c, i) => register(c.targets, 'target', `/dailyCheckpoints/${i}/targets`));
  const taskIds = new Set((p.tasks || []).map(x => x.id));
  const goalIds = new Set((p.goals || []).map(x => x.id));
  const planStart = parse(p.plan.startDate), planEnd = parse(p.plan.endDate);
  if (planStart > planEnd) add('DATE_ORDER', '/plan', 'plan.startDate must be on or before plan.endDate');
  try { new Intl.DateTimeFormat('en', { timeZone: p.plan.timezone }); }
  catch { add('TIMEZONE', '/plan/timezone', 'timezone must be a supported IANA timezone'); }
  (p.goals || []).forEach((g, i) => { if (!inRange(parse(g.targetDate), planStart, planEnd)) add('PLAN_BOUNDARY', `/goals/${i}/targetDate`, 'goal targetDate lies outside plan bounds'); });
  (p.tasks || []).forEach((t, i) => {
    if (parse(t.startDate) > parse(t.endDate)) add('DATE_ORDER', `/tasks/${i}`, 'task startDate must be on or before endDate');
    if (parse(t.startDate) < planStart || parse(t.endDate) > planEnd) add('PLAN_BOUNDARY', `/tasks/${i}`, 'task range lies outside plan bounds');
    t.goalIds.forEach((id, j) => { if (!goalIds.has(id)) add('BROKEN_GOAL_REF', `/tasks/${i}/goalIds/${j}`, `unknown goal '${id}'`); });
    const r = t.recurrence;
    if (r?.frequency === 'daily' && (r.daysOfWeek || []).length) add('RECURRENCE', `/tasks/${i}/recurrence`, 'daily recurrence cannot specify daysOfWeek');
    if (r?.frequency !== 'weekly' && r?.daysOfWeek) add('RECURRENCE', `/tasks/${i}/recurrence/daysOfWeek`, 'daysOfWeek is only valid for weekly recurrence');
    if (r?.frequency !== 'monthly' && r?.dayOfMonth) add('RECURRENCE', `/tasks/${i}/recurrence/dayOfMonth`, 'dayOfMonth is only valid for monthly recurrence');
  });
  (p.schedule?.entries || []).forEach((e, i) => {
    const t = p.tasks.find(x => x.id === e.taskId);
    if (!t) add('BROKEN_TASK_REF', `/schedule/entries/${i}/taskId`, `unknown task '${e.taskId}'`);
    else {
      if (e.type !== t.scheduleType) add('SCHEDULE_MISMATCH', `/schedule/entries/${i}/type`, 'entry type must match task scheduleType');
      if (!inRange(parse(e.date), parse(t.startDate), parse(t.endDate))) add('TASK_BOUNDARY', `/schedule/entries/${i}/date`, 'entry date lies outside task range');
      if (t.taskType === 'one_time' && e.date !== t.startDate) add('SCHEDULE_MISMATCH', `/schedule/entries/${i}/date`, 'one-time task entry date must equal task startDate');
      if (e.type === 'fixed' && e.startTime >= e.endTime) add('TIME_ORDER', `/schedule/entries/${i}`, 'fixed endTime must be after startTime; overnight entries are unsupported');
      if (e.type === 'fixed') {
        const duration = (Number(e.endTime.slice(0,2))*60+Number(e.endTime.slice(3))) - (Number(e.startTime.slice(0,2))*60+Number(e.startTime.slice(3)));
        if (duration !== t.durationMinutes) add('DURATION_MISMATCH', `/schedule/entries/${i}`, 'fixed time span must equal task durationMinutes');
      }
    }
    if (!inRange(parse(e.date), planStart, planEnd)) add('PLAN_BOUNDARY', `/schedule/entries/${i}/date`, 'entry date lies outside plan bounds');
  });
  const fixed = (p.schedule?.entries || []).filter(e => e.type === 'fixed').sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  for (let i=1;i<fixed.length;i++) if (fixed[i].date === fixed[i-1].date && fixed[i].startTime < fixed[i-1].endTime) add('SCHEDULE_OVERLAP', `/schedule/entries/${i}`, `fixed entries '${fixed[i-1].id}' and '${fixed[i].id}' overlap`);
  (p.schedule?.entries || []).forEach((e,i) => {
    const t=p.tasks.find(x=>x.id===e.taskId); if (!t || t.taskType!=='recurring' || !t.recurrence) return;
    const d=parse(e.date), start=parse(t.startDate), n=Math.round((d-start)/86400000), r=t.recurrence;
    let occurs=n>=0 && d<=parse(t.endDate);
    if (r.frequency==='daily') occurs &&= n%r.interval===0;
    if (r.frequency==='weekly') occurs &&= Math.floor(n/7)%r.interval===0 && r.daysOfWeek.includes(['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][d.getUTCDay()]);
    if (r.frequency==='monthly') { const m=(d.getUTCFullYear()-start.getUTCFullYear())*12+d.getUTCMonth()-start.getUTCMonth(); occurs &&= m%r.interval===0 && d.getUTCDate()===r.dayOfMonth; }
    if (!occurs) add('RECURRENCE_SCHEDULE_MISMATCH', `/schedule/entries/${i}/date`, 'entry date does not match task recurrence');
  });
  const edges = new Map();
  (p.dependencies || []).forEach((d, i) => {
    if (!taskIds.has(d.taskId)) add('BROKEN_TASK_REF', `/dependencies/${i}/taskId`, `unknown task '${d.taskId}'`);
    d.dependsOn.forEach((id, j) => {
      if (!taskIds.has(id)) add('BROKEN_TASK_REF', `/dependencies/${i}/dependsOn/${j}`, `unknown task '${id}'`);
      if (id === d.taskId) add('DEPENDENCY_SELF', `/dependencies/${i}`, 'task cannot depend on itself');
      const list = edges.get(d.taskId) || []; list.push(id); edges.set(d.taskId, list);
    });
  });
  const visiting = new Set(), visited = new Set();
  function dfs(id) { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); for (const n of edges.get(id) || []) if (dfs(n)) return true; visiting.delete(id); visited.add(id); return false; }
  for (const id of taskIds) if (dfs(id)) { add('DEPENDENCY_CYCLE', '/dependencies', 'dependency graph contains a cycle'); break; }
  for (const group of [...(p.weeklyCheckpoints || []), ...(p.dailyCheckpoints || [])]) for (const target of group.targets) if (!taskIds.has(target.taskId)) add('BROKEN_TASK_REF', `/checkpoints/${group.id}/${target.id}`, `unknown task '${target.taskId}'`);
  (p.weeklyCheckpoints || []).forEach((c,i) => { if (parse(c.startDate)>parse(c.endDate)) add('DATE_ORDER', `/weeklyCheckpoints/${i}`, 'checkpoint startDate must be on or before endDate'); if (parse(c.startDate)<planStart||parse(c.endDate)>planEnd) add('PLAN_BOUNDARY', `/weeklyCheckpoints/${i}`, 'checkpoint lies outside plan bounds'); });
  (p.dailyCheckpoints || []).forEach((c,i) => { if (!inRange(parse(c.date), planStart, planEnd)) add('PLAN_BOUNDARY', `/dailyCheckpoints/${i}/date`, 'checkpoint date lies outside plan bounds'); });
  return { valid: errors.length === 0, errors };
}
