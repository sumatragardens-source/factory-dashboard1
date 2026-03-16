import {
	getSolventTotals,
	getActiveBatchProgress,
	getLatestCompletedBatchCostPerKg,
	getTotalFinalYield,
	getOperationsPipelineMetrics
} from '$lib/data/repositories/dashboardRepo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		pipeline: getOperationsPipelineMetrics(),
		activeBatchProgress: getActiveBatchProgress(),
		totalFinalYield: getTotalFinalYield(),
		solventTotals: getSolventTotals(),
		costSnapshot: getLatestCompletedBatchCostPerKg()
	};
};
