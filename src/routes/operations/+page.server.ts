import {
	getStalledBatches,
	getPendingApprovals,
	getAllMachineStatuses,
	getOpenDeviationCount,
	getSolventTotals,
	getLatestCompletedBatchNumber,
	getTotalLeafInputProcessed,
	getTotalFinalProductWeight,
	getStagePipelineSummary,
	getActiveBatchProgress,
	getPendingLabResults,
	getLatestCompletedBatchCostPerKg,
	getLatestHplcResult,
	getAverageCycleTimePerStage
} from '$lib/data/repositories/dashboardRepo';
import { getLowStockMaterials } from '$lib/data/repositories/materialRepo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const stalledBatches = getStalledBatches();
	const pendingApprovals = getPendingApprovals();
	const openDeviationCount = getOpenDeviationCount();
	const lowStockMaterials = getLowStockMaterials();

	const pendingActionsCount =
		openDeviationCount + pendingApprovals.length + stalledBatches.length + lowStockMaterials.length;

	return {
		// Row 1: Hero KPIs
		throughput: getTotalLeafInputProcessed(),
		totalFinalProduct: getTotalFinalProductWeight(),
		activeBatchProgress: getActiveBatchProgress(),
		pendingActionsCount,

		// Row 2: Pipeline
		stagePipeline: getStagePipelineSummary(),
		avgCycleTime: getAverageCycleTimePerStage(),

		// Row 4: Support
		machines: getAllMachineStatuses(),
		pendingLabResults: getPendingLabResults(),

		// Row 5: Analytics
		latestHplcResult: getLatestHplcResult(),
		latestCompletedBatch: getLatestCompletedBatchNumber(),
		solventTotals: getSolventTotals(),
		costSnapshot: getLatestCompletedBatchCostPerKg()
	};
};
