export function createRegistry(plans = [], selectedPlanId = null, activePlanIds = plans.map(p => p.plan.id)) { return { registryVersion: '1.0.0', selectedPlanId, activePlanIds, plans }; }
export function registerPlan(registry, plan, { onDuplicate = 'reject' } = {}) {
  const id = plan.plan.id, index = registry.plans.findIndex(x => x.plan.id === id);
  if (index >= 0 && onDuplicate === 'reject') throw new Error(`plan '${id}' already exists`);
  const plans = [...registry.plans]; if (index >= 0) plans[index] = plan; else plans.push(plan);
  const activePlanIds = index >= 0 ? registry.activePlanIds : [...registry.activePlanIds, id];
  return { ...registry, plans, activePlanIds, selectedPlanId: registry.selectedPlanId || id };
}
export function selectPlan(registry, id) { if (!registry.plans.some(p => p.plan.id === id)) throw new Error(`unknown plan '${id}'`); return { ...registry, selectedPlanId: id }; }
export function setPlanActive(registry,id,active) { if (!registry.plans.some(p=>p.plan.id===id)) throw new Error(`unknown plan '${id}'`); const activePlanIds=active ? [...new Set([...registry.activePlanIds,id])] : registry.activePlanIds.filter(x=>x!==id); return {...registry,activePlanIds}; }
export function removePlan(registry, id) { const plans = registry.plans.filter(p => p.plan.id !== id); if (plans.length === registry.plans.length) throw new Error(`unknown plan '${id}'`); return { ...registry, plans, activePlanIds:registry.activePlanIds.filter(x=>x!==id), selectedPlanId: registry.selectedPlanId === id ? plans[0]?.plan.id || null : registry.selectedPlanId }; }
