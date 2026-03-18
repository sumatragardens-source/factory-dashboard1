import { getAllBatches } from '$lib/data/repositories/batchRepo';
import { getAllUnitRates, getBatchCosts, getBatchTotalCost } from '$lib/data/repositories/costingRepo';
import { getStage4Record } from '$lib/data/repositories/stageRepo';
import { calculateTotalBatchCost, calculateCostByCategory, calculateCostPerKg } from '$lib/calculations/costing';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const unitRates = getAllUnitRates();
	const batches = getAllBatches();

	// Get detailed costing for batch 1 (SG-2026-001)
	const batch1Costs = getBatchCosts(1);
	const totalCost = calculateTotalBatchCost(batch1Costs);
	const costBreakdown = calculateCostByCategory(batch1Costs);
	const stage4 = getStage4Record(1);
	const costPerKg = stage4?.final_product_g
		? calculateCostPerKg(totalCost, stage4.final_product_g / 1000.0)
		: null;

	return { unitRates, batches, batch1Costs, totalCost, costBreakdown, costPerKg };
};
