import type { BatchCost } from '$lib/domain/types';

export function calculateCategoryCost(costs: BatchCost[], category: string): number {
	return costs
		.filter((c) => c.cost_category === category)
		.reduce((sum, c) => sum + c.total_cost, 0);
}

export function calculateTotalBatchCost(costs: BatchCost[]): number {
	return costs.reduce((sum, c) => sum + c.total_cost, 0);
}

export function calculateCostPerKg(totalCost: number, finalProductKg: number): number {
	if (finalProductKg <= 0) return 0;
	return Number((totalCost / finalProductKg).toFixed(2));
}

export function calculateCostByCategory(
	costs: BatchCost[]
): Record<string, number> {
	const result: Record<string, number> = {};
	for (const c of costs) {
		result[c.cost_category] = (result[c.cost_category] || 0) + c.total_cost;
	}
	return result;
}

/** Spec §3: solvent_cost_intensity = ethanol_cost_lost / product_output_kg */
export function calculateSolventCostIntensity(ethanolCostLost: number, productOutputKg: number): number {
	if (productOutputKg <= 0) return 0;
	return Number((ethanolCostLost / productOutputKg).toFixed(2));
}
