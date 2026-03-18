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
	getLatestHplcResult,
	getProductionRuns,
	getProductionRunSummary,
	getRunBatchCosts,
	getRunCostAggregates,
	getRunEthanolBreakdown,
	getRunEthanolAggregates,
	getRunYieldBreakdown,
	getRunYieldAggregates,
	getRunHistorySummaries,
	getBatchAnomalies,
	getQualityCorrelation
} from '$lib/data/repositories/dashboardRepo';
import { getActiveAlerts, getAlertCounts } from '$lib/data/repositories/alertRepo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const productionRuns = getProductionRuns();
	const activeRun = productionRuns.find(r => r.status === 'In Progress') ?? productionRuns[0];
	const activeRunId = activeRun?.id ?? 0;

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
		hplcResult: getLatestHplcResult(),
		productionRuns,
		activeRunId,
		runSummary: activeRunId ? getProductionRunSummary(activeRunId) : null,
		runBatchCosts: activeRunId ? getRunBatchCosts(activeRunId) : [],
		runCostAggregates: activeRunId ? getRunCostAggregates(activeRunId) : null,
		runEthanolBreakdown: activeRunId ? getRunEthanolBreakdown(activeRunId) : [],
		runEthanolAggregates: activeRunId ? getRunEthanolAggregates(activeRunId) : null,
		runYieldBreakdown: activeRunId ? getRunYieldBreakdown(activeRunId) : [],
		runYieldAggregates: activeRunId ? getRunYieldAggregates(activeRunId) : null,
		runHistory: getRunHistorySummaries(),
		batchAnomalies: activeRunId ? getBatchAnomalies(activeRunId) : [],
		qualityCorrelation: activeRunId ? getQualityCorrelation(activeRunId) : [],
		alertCounts: getAlertCounts(),
		activeAlerts: getActiveAlerts().slice(0, 5)
	};
};
