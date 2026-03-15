import {
	getActiveBatches,
	getCompletedBatchCount,
	getStalledBatches,
	getRecentBatches,
	getRecentDeviations,
	getPendingApprovals,
	getBatchesByStage,
	getAllMachineStatuses,
	getAverageEthanolRecovery,
	getOpenDeviationCount,
	getBatchCountByStatus
} from '$lib/data/repositories/dashboardRepo';
import { getLowStockMaterials } from '$lib/data/repositories/materialRepo';
import { getBatchCosts } from '$lib/data/repositories/costingRepo';
import { getLabResultsByBatch } from '$lib/data/repositories/labResultRepo';
import { calculateTotalBatchCost, calculateCostByCategory } from '$lib/calculations/costing';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	// Get cost data for batch 1 (SG-2026-001)
	const batch1Costs = getBatchCosts(1);
	const totalCost = calculateTotalBatchCost(batch1Costs);
	const costBreakdown = calculateCostByCategory(batch1Costs);

	// Get HPLC result for batch 1
	const labResults = getLabResultsByBatch(1);
	const hplcResult = labResults.find((r) => r.test_type === 'HPLC' && r.status === 'Completed') ?? null;

	return {
		activeBatches: getActiveBatches(),
		completedCount: getCompletedBatchCount(),
		stalledBatches: getStalledBatches(),
		recentBatches: getRecentBatches(),
		recentDeviations: getRecentDeviations(),
		pendingApprovals: getPendingApprovals(),
		batchesByStage: getBatchesByStage(),
		machines: getAllMachineStatuses(),
		avgEthanolRecovery: getAverageEthanolRecovery(),
		openDeviationCount: getOpenDeviationCount(),
		statusCounts: getBatchCountByStatus(),
		lowStockMaterials: getLowStockMaterials(),
		totalCost,
		costBreakdown,
		hplcResult
	};
};
