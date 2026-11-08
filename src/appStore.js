import { createRegistry, registerPlan } from './registry.js';
import { emptyProgress, reimportProgress } from './progress.js';
import { persistPlan, safeImportJson } from './io.js';

const REGISTRY_KEY = 'myplanner:registry';
const isBackupKey = (key) => key.endsWith(':backup');

export function readLibrary(storage = window.localStorage) {
  let savedRegistry = null;
  try {
    savedRegistry = JSON.parse(storage.getItem(REGISTRY_KEY) || 'null');
  } catch {
    savedRegistry = null;
  }

  const plansById = new Map((savedRegistry?.plans || []).map((plan) => [plan.plan.id, plan]));
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith('myplanner:') || key === REGISTRY_KEY || isBackupKey(key)) continue;
    try {
      const stored = JSON.parse(storage.getItem(key));
      if (stored?.plan?.plan?.id) plansById.set(stored.plan.plan.id, stored.plan);
    } catch {
      // A damaged saved item should not prevent the rest of the library from opening.
    }
  }

  const plans = [...plansById.values()];
  const known = new Set(plans.map((plan) => plan.plan.id));
  const activePlanIds = (savedRegistry?.activePlanIds || plans.map((plan) => plan.plan.id))
    .filter((id) => known.has(id));
  const selectedPlanId = known.has(savedRegistry?.selectedPlanId)
    ? savedRegistry.selectedPlanId
    : plans[0]?.plan.id || null;

  return {
    registry: createRegistry(plans, selectedPlanId, activePlanIds),
    envelopes: new Map(plans.map((plan) => {
      try {
        const parsed = JSON.parse(storage.getItem(`myplanner:${plan.plan.id}`) || 'null');
        return [plan.plan.id, parsed?.plan ? { ...parsed, progress: parsed.progress || emptyProgress(plan) } : { plan, progress: emptyProgress(plan) }];
      } catch {
        return [plan.plan.id, { plan, progress: emptyProgress(plan) }];
      }
    })),
  };
}

export function writeRegistry(registry, storage = window.localStorage) {
  storage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

export function preparePlanImport(text, registry) {
  const parsed = safeImportJson(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const plan = parsed.value;
  return { ok: true, plan, preview: parsed.preview, duplicate: registry.plans.some((item) => item.plan.id === plan.plan.id) };
}

export function commitPlanImport(plan, registry, { replace = false, storage = window.localStorage } = {}) {
  const validation = safeImportJson(JSON.stringify(plan));
  if (!validation.ok) return { ok: false, error: validation.error };
  const id = plan.plan.id;
  const exists = registry.plans.some((item) => item.plan.id === id);
  if (exists && !replace) return { ok: false, duplicate: true };

  let progress = emptyProgress(plan);
  if (exists) {
    try {
      const prior = JSON.parse(storage.getItem(`myplanner:${id}`) || 'null');
      if (prior?.progress) progress = reimportProgress(prior.progress, plan);
    } catch {
      progress = emptyProgress(plan);
    }
  }

  try {
    persistPlan(storage, plan, progress);
    const nextRegistry = registerPlan(registry, plan, { onDuplicate: replace ? 'replace' : 'reject' });
    writeRegistry(nextRegistry, storage);
    return { ok: true, registry: nextRegistry, plan, replaced: exists };
  } catch (error) {
    return { ok: false, error: { code: 'STORAGE_ERROR', message: error.message } };
  }
}

export function saveProgress(plan, progress, storage = window.localStorage) {
  persistPlan(storage, plan, progress);
}

