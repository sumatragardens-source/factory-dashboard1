import {
	getSolventTotals,
	getActiveBatchProgress,
	getLatestCompletedBatchCostPerKg,
	getTotalFinalYield,
	getOperationsPipelineMetrics,
	getCostBreakdown,
	getDailyOpCost,
	getAvgCostPerKg,
	getEthanolRecoveryTrend,
	getDailyCostTrend,
	getBatchYieldTrend,
	getLatestHplcResult
} from '$lib/data/repositories/dashboardRepo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		pipeline: getOperationsPipelineMetrics(),
		activeBatchProgress: getActiveBatchProgress(),
		totalFinalYield: getTotalFinalYield(),
		solventTotals: getSolventTotals(),
		costSnapshot: getLatestCompletedBatchCostPerKg(),
		costBreakdown: getCostBreakdown(),
		dailyOpCost: getDailyOpCost(),
		avgCostPerKg: getAvgCostPerKg(),
		ethRecoveryTrend: getEthanolRecoveryTrend(),
		costTrend: getDailyCostTrend(),
		yieldTrend: getBatchYieldTrend(),
		hplcResult: getLatestHplcResult()
	};
};
