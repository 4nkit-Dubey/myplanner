export const emptyProgress = (plan, now = new Date().toISOString()) => ({
  progressVersion: '1.0.0', planId: plan.plan.id, sourceFingerprint: fingerprint(plan), createdAt: now,
  occurrences: {}, measurements: {}, checkpointSnapshots: {}, importHistory: [{ fingerprint: fingerprint(plan), importedAt: now, action: 'created' }]
});
export function fingerprint(value) {
  const stable = v => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
  let h = 2166136261; for (const ch of JSON.stringify(stable(value))) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `fnv1a-${(h >>> 0).toString(16).padStart(8, '0')}`;
}
export function setOccurrence(progress, occurrenceId, patch) {
  if (!occurrenceId) throw new Error('occurrenceId is required');
  const prior = progress.occurrences[occurrenceId] || { status: 'pending' };
  const next = { ...prior, ...patch };
  if (!['pending','completed','skipped','missed'].includes(next.status)) throw new Error('invalid occurrence status');
  if (next.status === 'completed' && !next.completedAt) throw new Error('completed occurrence requires completedAt');
  return { ...progress, occurrences: { ...progress.occurrences, [occurrenceId]: next } };
}
export function recordMeasurement(progress, taskId, value, at = new Date().toISOString()) {
  if (!Number.isFinite(value) || value < 0) throw new Error('measurement must be a non-negative finite number');
  const values = progress.measurements[taskId] || [];
  return { ...progress, measurements: { ...progress.measurements, [taskId]: [...values, { value, at }] } };
}
export function aggregateCheckpoint(target, measurements) {
  const achieved = measurements.reduce((sum, x) => sum + x.value, 0);
  return { target: target.targetValue, achieved, unit: target.unit, ratio: Math.min(1, achieved / target.targetValue), complete: achieved >= target.targetValue };
}
export function reimportProgress(oldProgress, incomingPlan, now = new Date().toISOString()) {
  const nextFp = fingerprint(incomingPlan); if (oldProgress.planId !== incomingPlan.plan.id) throw new Error('planId mismatch');
  const same = oldProgress.sourceFingerprint === nextFp;
  return { ...oldProgress, sourceFingerprint: nextFp, importHistory: [...oldProgress.importHistory, { fingerprint: nextFp, importedAt: now, action: same ? 'unchanged' : 'plan-updated-progress-preserved' }] };
}
