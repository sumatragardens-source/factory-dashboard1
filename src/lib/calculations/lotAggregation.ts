import type { BatchCostSummary, BatchEthanolSummary, BatchYieldSummary } from '$lib/domain/types';
import type { BatchCostSegment } from '$lib/data/repositories/dashboardRepo';

export interface LotAgg {
	avgRecoveryPct: number;
	totalEthIssued: number;
	totalEthRecovered: number;
	totalEthLost: number;
	totalCost: number;
	avgCostPerKg: number;
	totalYieldKg: number;
	avgYieldPct: number;
	avgPurity: number | null;
	avgMitragynine: number | null;
	batchCount: number;
	bestBatchRecovery: string;
	deviationCount: number;
	costBySegment: {
		leaf: number;
		solvent: number;
		chemicals: number;
		labor: number;
		electricity: number;
		testing: number;
	};
}

function emptyAgg(): LotAgg {
	return {
		avgRecoveryPct: 0,
		totalEthIssued: 0,
		totalEthRecovered: 0,
		totalEthLost: 0,
		totalCost: 0,
		avgCostPerKg: 0,
		totalYieldKg: 0,
		avgYieldPct: 0,
		avgPurity: null,
		avgMitragynine: null,
		batchCount: 0,
		bestBatchRecovery: '—',
		deviationCount: 0,
		costBySegment: { leaf: 0, solvent: 0, chemicals: 0, labor: 0, electricity: 0, testing: 0 }
	};
}

export function computeLotSummaries(
	lots: string[],
	ethanolBreakdown: BatchEthanolSummary[],
	batchCosts: BatchCostSummary[],
	costBreakdown: BatchCostSegment[],
	yieldBreakdown: BatchYieldSummary[]
): Map<string, LotAgg> {
	const map = new Map<string, LotAgg>();
	if (!lots.length) return map;

	for (const lot of lots) {
		map.set(lot, emptyAgg());
	}

	// Ethanol
	for (const eb of ethanolBreakdown) {
		if (!eb.supplier_lot) continue;
		const agg = map.get(eb.supplier_lot);
		if (!agg) continue;
		agg.totalEthIssued += eb.ethanol_issued_l ?? 0;
		agg.totalEthRecovered += eb.ethanol_recovered_l ?? 0;
		agg.totalEthLost += eb.ethanol_lost_l ?? 0;
	}

	// Costs
	for (const bc of batchCosts) {
		if (!bc.supplier_lot) continue;
		const agg = map.get(bc.supplier_lot);
		if (!agg) continue;
		agg.totalCost += bc.totalCost;
		agg.batchCount++;
	}

	// Cost segments
	for (const seg of costBreakdown) {
		if (!seg.supplierLot) continue;
		const agg = map.get(seg.supplierLot);
		if (!agg) continue;
		agg.costBySegment.leaf += seg.leaf;
		agg.costBySegment.solvent += seg.solvent;
		agg.costBySegment.chemicals += seg.chemicals;
		agg.costBySegment.labor += seg.labor;
		agg.costBySegment.electricity += seg.electricity;
		agg.costBySegment.testing += seg.testing;
	}

	// Yield
	for (const yb of yieldBreakdown) {
		if (!yb.supplier_lot) continue;
		const agg = map.get(yb.supplier_lot);
		if (!agg) continue;
		agg.totalYieldKg += (yb.final_product_g ?? 0) / 1000;
		agg.deviationCount += yb.deviation_count;
	}

	// Finalize averages
	for (const [lot, agg] of map) {
		if (agg.totalEthIssued > 0) agg.avgRecoveryPct = (agg.totalEthRecovered / agg.totalEthIssued) * 100;

		const yieldBatches = yieldBreakdown.filter((y) => y.supplier_lot === lot && y.overall_yield_pct != null);
		if (yieldBatches.length > 0) {
			agg.avgYieldPct = yieldBatches.reduce((s, y) => s + (y.overall_yield_pct ?? 0), 0) / yieldBatches.length;
		}

		const purityBatches = yieldBreakdown.filter((y) => y.supplier_lot === lot && y.hplc_purity_pct != null);
		if (purityBatches.length > 0) {
			agg.avgPurity = purityBatches.reduce((s, y) => s + (y.hplc_purity_pct ?? 0), 0) / purityBatches.length;
		}

		const mitBatches = yieldBreakdown.filter((y) => y.supplier_lot === lot && y.mitragynine_pct != null);
		if (mitBatches.length > 0) {
			agg.avgMitragynine = mitBatches.reduce((s, y) => s + (y.mitragynine_pct ?? 0), 0) / mitBatches.length;
		}

		agg.avgCostPerKg = agg.totalYieldKg > 0 ? agg.totalCost / agg.totalYieldKg : 0;

		const ethBatches = ethanolBreakdown.filter((e) => e.supplier_lot === lot && e.recovery_pct != null);
		if (ethBatches.length > 0) {
			const best = ethBatches.reduce((a, b) => ((a.recovery_pct ?? 0) > (b.recovery_pct ?? 0) ? a : b));
			agg.bestBatchRecovery = best.batch_number.replace('SG-', '');
		}
	}

	return map;
}

export function computeAllTimeLotAvg(
	lots: string[],
	summaries: Map<string, LotAgg>
): { recoveryPct: number; costPerKg: number; yieldPct: number } {
	if (lots.length === 0) return { recoveryPct: 0, costPerKg: 0, yieldPct: 0 };
	let recSum = 0,
		costSum = 0,
		yieldSum = 0,
		recN = 0,
		costN = 0,
		yieldN = 0;
	for (const lot of lots) {
		const agg = summaries.get(lot);
		if (!agg) continue;
		if (agg.avgRecoveryPct > 0) {
			recSum += agg.avgRecoveryPct;
			recN++;
		}
		if (agg.avgCostPerKg > 0) {
			costSum += agg.avgCostPerKg;
			costN++;
		}
		if (agg.avgYieldPct > 0) {
			yieldSum += agg.avgYieldPct;
			yieldN++;
		}
	}
	return {
		recoveryPct: recN > 0 ? recSum / recN : 0,
		costPerKg: costN > 0 ? costSum / costN : 0,
		yieldPct: yieldN > 0 ? yieldSum / yieldN : 0
	};
}
