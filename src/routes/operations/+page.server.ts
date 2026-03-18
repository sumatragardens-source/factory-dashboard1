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
	try {
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
	} catch (e) {
		console.error('Failed to load operations data:', e);
		return {
			pipeline: { stageCounts: {}, totalPowderKg: 0, lotsExtracted: 0, ethanolStockUsedL: 0, ethanol70TotalL: 0, filtrationOutputL: 0, ethanolDistilledL: 0, ethanolRecoveredL: 0, ethanolLostL: 0, extractTotalKg: 0, reactorCount: 0, limoneneRecoveredL: 0, limoneneLostL: 0, precipitateKg: 0, finalProductKg: 0, completedCount: 0 },
			activeBatchProgress: [],
			totalFinalYield: { producedKg: 0, targetKg: 0, pct: 0, lotsContributing: 0 },
			solventTotals: { ethanol_issued: 0, ethanol_recovered: 0, ethanol_lost: 0, limonene_issued: 0, limonene_recovered: 0, limonene_lost: 0 },
			costSnapshot: null,
			costBreakdown: { rawMaterial: 0, solvents: 0, reagents: 0, labor: 0, utilities: 0, total: 0 },
			dailyOpCost: 0,
			avgCostPerKg: 0,
			ethRecoveryTrend: [],
			costTrend: [],
			yieldTrend: [],
			hplcResult: null,
			productionRuns: [],
			activeRunId: 0,
			runSummary: null,
			runBatchCosts: [],
			runCostAggregates: null,
			runEthanolBreakdown: [],
			runEthanolAggregates: null,
			runYieldBreakdown: [],
			runYieldAggregates: null,
			runHistory: [],
			batchAnomalies: [],
			qualityCorrelation: [],
			alertCounts: { high: 0, medium: 0, low: 0, total: 0 },
			activeAlerts: []
		};
	}
};
