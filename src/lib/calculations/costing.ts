import type { BatchCost } from '$lib/domain/types';

export function calculateStageCost(costs: BatchCost[], stageNumber: number): number {
	return costs
		.filter((c) => c.stage_number === stageNumber)
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
