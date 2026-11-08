import { mkdir, writeFile } from 'node:fs/promises';
const root = new URL('./', import.meta.url);
const base = {
  metadata: { app: 'MyPlanner', schemaVersion: '1.0.0', documentType: 'planner-plan', exportedAt: '2026-11-08T10:00:00Z' },
  plan: { id: 'plan-1', title: 'November learning plan', startDate: '2026-11-01', endDate: '2026-11-30', timezone: 'Asia/Calcutta' },
  goals: [{ id: 'goal-1', title: 'Improve programming skills', priority: 'high', targetDate: '2026-11-30' }],
  tasks: [{ id: 'task-1', title: 'Study algorithms', description: 'Work through lessons', category: 'Learning', goalIds: ['goal-1'], priority: 'high', taskType: 'one_time', scheduleType: 'fixed', durationMinutes: 60, startDate: '2026-11-08', endDate: '2026-11-08' }],
  schedule: { entries: [{ id: 'entry-1', taskId: 'task-1', date: '2026-11-08', type: 'fixed', startTime: '09:00', endTime: '10:00' }] },
  weeklyCheckpoints: [{ id: 'week-1', title: 'Week 1', startDate: '2026-11-01', endDate: '2026-11-07', targets: [{ id: 'wt-1', taskId: 'task-1', description: 'Complete lessons', targetValue: 3, unit: 'lessons' }] }],
  dailyCheckpoints: [{ id: 'day-1', date: '2026-11-08', targets: [{ id: 'dt-1', taskId: 'task-1', description: 'Study one hour', targetValue: 1, unit: 'session' }] }],
  dependencies: []
};
const clone = x => structuredClone(x);
const valid = new Map();
valid.set('01-minimal-fixed.json', base);
let x=clone(base); x.tasks[0].scheduleType='flexible'; x.schedule.entries=[{id:'entry-1',taskId:'task-1',date:'2026-11-08',type:'flexible',durationMinutes:45}]; valid.set('02-flexible-schedule.json',x);
x=clone(base); x.tasks[0].taskType='recurring'; x.tasks[0].recurrence={frequency:'daily',interval:1}; x.tasks[0].scheduleType='flexible'; x.schedule.entries=[{id:'entry-1',taskId:'task-1',date:'2026-11-08',type:'flexible',durationMinutes:30}]; valid.set('03-daily-recurring.json',x);
x=clone(base); x.tasks[0].taskType='recurring'; x.tasks[0].recurrence={frequency:'weekly',interval:2,daysOfWeek:['monday','wednesday']}; valid.set('04-weekly-recurring.json',x);
x=clone(base); x.tasks[0].taskType='recurring'; x.tasks[0].recurrence={frequency:'monthly',interval:1,dayOfMonth:15}; x.tasks[0].measurement={targetValue:12,unit:'chapters'}; valid.set('05-monthly-recurring.json',x);
x=clone(base); x.goals=[]; x.weeklyCheckpoints=[]; x.dailyCheckpoints=[]; x.dependencies=[]; x.schedule.entries=[]; valid.set('06-empty-optional-collections.json',x);
x=clone(base); x.tasks.push({id:'task-2',title:'Review notes',description:'',category:'Learning',goalIds:[],priority:'medium',taskType:'one_time',scheduleType:'flexible',durationMinutes:25,startDate:'2026-11-09',endDate:'2026-11-09'}); x.dependencies=[{taskId:'task-2',dependsOn:['task-1']}]; valid.set('07-multiple-tasks-dependency.json',x);
x=clone(base); x.tasks[0].measurement={targetValue:5,unit:'problems'}; x.schedule.entries[0].objective='Solve practice set'; valid.set('08-measurement-objective.json',x);

const invalid = new Map();
const add=(name,mutate)=>{const d=clone(base); mutate(d); invalid.set(name,d);};
add('01-missing-metadata.json',d=>delete d.metadata);
add('02-missing-required-task-field.json',d=>delete d.tasks[0].durationMinutes);
add('03-unknown-root-property.json',d=>d.progress={completed:true});
add('04-invalid-version.json',d=>d.metadata.schemaVersion='2.0.0');
add('05-invalid-priority-enum.json',d=>d.tasks[0].priority='urgent');
add('06-wrong-duration-type.json',d=>d.tasks[0].durationMinutes='60');
add('07-invalid-date-format.json',d=>d.plan.startDate='November 1, 2026');
add('08-fixed-missing-end-time.json',d=>delete d.schedule.entries[0].endTime);
add('09-flexible-with-time.json',d=>{d.schedule.entries[0]={id:'entry-1',taskId:'task-1',date:'2026-11-08',type:'flexible',durationMinutes:30,startTime:'09:00'};});
add('10-recurring-without-recurrence.json',d=>d.tasks[0].taskType='recurring');
add('11-one-time-with-recurrence.json',d=>d.tasks[0].recurrence={frequency:'daily',interval:1});
add('12-weekly-missing-days.json',d=>{d.tasks[0].taskType='recurring';d.tasks[0].recurrence={frequency:'weekly',interval:1};});
add('13-monthly-invalid-day.json',d=>{d.tasks[0].taskType='recurring';d.tasks[0].recurrence={frequency:'monthly',interval:1,dayOfMonth:32};});
add('14-invalid-id-pattern.json',d=>d.tasks[0].id='task 1');
for (const [name,data] of valid) await writeFile(new URL(`valid/${name}`,root), JSON.stringify(data,null,2)+'\n');
for (const [name,data] of invalid) await writeFile(new URL(`invalid/${name}`,root), JSON.stringify(data,null,2)+'\n');
console.log(`Wrote ${valid.size} valid and ${invalid.size} invalid fixtures.`);
