import { getBatchById, getBatchStages } from '$lib/data/repositories/batchRepo';
import { getBatchCosts } from '$lib/data/repositories/costingRepo';
import { getDeviationsByBatch } from '$lib/data/repositories/deviationRepo';
import { getLabResultsByBatch } from '$lib/data/repositories/labResultRepo';
import { getApprovalsByBatch } from '$lib/data/repositories/approvalRepo';
import { getStage1Record, getStage2Record, getStage3Record, getStage4Record } from '$lib/data/repositories/stageRepo';
import { calculateTotalBatchCost, calculateCostPerKg } from '$lib/calculations/costing';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const batch = getBatchById(Number(params.id));
	if (!batch) error(404, 'Batch not found');

	const stages = getBatchStages(batch.id);
	const costs = getBatchCosts(batch.id);
	const totalCost = calculateTotalBatchCost(costs);
	const deviations = getDeviationsByBatch(batch.id);
	const labResults = getLabResultsByBatch(batch.id);
	const approvals = getApprovalsByBatch(batch.id);

	const stage4 = getStage4Record(batch.id);
	const costPerKg = stage4?.final_product_weight_kg
		? calculateCostPerKg(totalCost, stage4.final_product_weight_kg)
		: null;

	return {
		batch,
		stages,
		costs,
		totalCost,
		costPerKg,
		deviations,
		labResults,
		approvals,
		stage1: getStage1Record(batch.id) ?? null,
		stage2: getStage2Record(batch.id) ?? null,
		stage3: getStage3Record(batch.id) ?? null,
		stage4: stage4 ?? null
	};
};
