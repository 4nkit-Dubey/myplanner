const DAY = 86400000;
const asDate = s => new Date(`${s}T00:00:00Z`);
const ymd = d => d.toISOString().slice(0,10);
const dow = d => ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][d.getUTCDay()];
export function occurrences(task) {
  const out=[]; const start=asDate(task.startDate), end=asDate(task.endDate);
  for(let d=start, n=0; d<=end; d=new Date(d.getTime()+DAY), n++) {
    let match= n % (task.recurrence?.interval || 1) === 0;
    if(task.taskType==='recurring') { const r=task.recurrence; if(r.frequency==='weekly') match=(Math.floor(n/7)%r.interval===0)&&(r.daysOfWeek.includes(dow(d))); if(r.frequency==='monthly') { const month=(d.getUTCFullYear()-start.getUTCFullYear())*12+d.getUTCMonth()-start.getUTCMonth(); match=month%r.interval===0&&d.getUTCDate()===r.dayOfMonth; } }
    else match=n===0;
    if(match) out.push({ occurrenceId:`${task.id}@${ymd(d)}`, taskId:task.id, date:ymd(d), type:task.scheduleType, durationMinutes:task.durationMinutes });
  }
  return out;
}
export function placeFlexible(items, fixedEntries, dayStart='08:00', dayEnd='22:00') {
  const minute=s=>Number(s.slice(0,2))*60+Number(s.slice(3)); const placed=[], missed=[];
  const byDate=new Map(); for(const e of fixedEntries){const a=byDate.get(e.date)||[];a.push([minute(e.startTime),minute(e.endTime)]);byDate.set(e.date,a);}
  for(const item of items) { const ranges=(byDate.get(item.date)||[]).sort((a,b)=>a[0]-b[0]); let cursor=minute(dayStart), finish=minute(dayEnd), found=null;
    for(const [a,b] of [...ranges,[finish,finish]]) { if(a-cursor>=item.durationMinutes){found=[cursor,cursor+item.durationMinutes];break;} cursor=Math.max(cursor,b); }
    if(found) { const fmt=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; const slot={...item,suggestedStartTime:fmt(found[0]),suggestedEndTime:fmt(found[1])}; placed.push(slot); const a=byDate.get(item.date)||[];a.push(found);byDate.set(item.date,a); } else missed.push({...item,reason:'no-available-window'});
  }
  return {placed, missed};
}
export function detectOverlaps(entries) { const sorted=[...entries].sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime)), conflicts=[]; for(let i=0;i<sorted.length;i++) for(let j=i+1;j<sorted.length&&sorted[j].date===sorted[i].date&&sorted[j].startTime<sorted[i].endTime;j++) conflicts.push([sorted[i].id,sorted[j].id]); return conflicts; }
