import { getAllBatches } from '$lib/data/repositories/batchRepo';
import { getAllUnitRates, getBatchCosts, getBatchTotalCost } from '$lib/data/repositories/costingRepo';
import { getStage4Record } from '$lib/data/repositories/stageRepo';
import { calculateTotalBatchCost, calculateCostByCategory, calculateCostPerKg, calculateStageCost } from '$lib/calculations/costing';
import { getStageName } from '$lib/constants/stageNames';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const unitRates = getAllUnitRates();
	const batches = getAllBatches();

	// Get detailed costing for batch 1 (SG-2026-001)
	const batch1Costs = getBatchCosts(1);
	const totalCost = calculateTotalBatchCost(batch1Costs);
	const costBreakdown = calculateCostByCategory(batch1Costs);
	const stage4 = getStage4Record(1);
	const costPerKg = stage4?.final_product_weight_kg
		? calculateCostPerKg(totalCost, stage4.final_product_weight_kg)
		: null;

	const stageCosts = [1, 2, 3, 4].map((sn) => ({
		stageNumber: sn,
		stageName: getStageName(sn),
		labor: batch1Costs.filter((c) => c.stage_number === sn && c.cost_category === 'Labor').reduce((s, c) => s + c.total_cost, 0),
		materials: batch1Costs.filter((c) => c.stage_number === sn && c.cost_category === 'Material').reduce((s, c) => s + c.total_cost, 0),
		utility: batch1Costs.filter((c) => c.stage_number === sn && c.cost_category === 'Utility').reduce((s, c) => s + c.total_cost, 0),
		total: calculateStageCost(batch1Costs, sn)
	}));

	// Running total
	let running = 0;
	for (const sc of stageCosts) {
		running += sc.total;
		(sc as any).runningTotal = running;
	}

	return { unitRates, batches, batch1Costs, totalCost, costBreakdown, costPerKg, stageCosts };
};
