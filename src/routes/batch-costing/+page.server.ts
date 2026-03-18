import { getDb } from '$lib/data/db';
import { getAllBatches } from '$lib/data/repositories/batchRepo';
import { getBatchCosts } from '$lib/data/repositories/costingRepo';
import { calculateTotalBatchCost, calculateCostByCategory, calculateCostPerKg } from '$lib/calculations/costing';
import { fmt, TARGETS, UNIT_RATES } from '$lib/config/costs';
import type { PageServerLoad } from './$types';

// Map item names to stages
function itemToStage(itemName: string): string {
	const lower = itemName.toLowerCase();
	if (lower.includes('leaf') || lower.includes('raw')) return 'STG_01 Leaf Prep';
	if (lower.includes('ethanol')) return 'STG_02 Extraction';
	if (lower.includes('limonene') || lower.includes('acetic') || lower.includes('naoh')) return 'STG_03 AB Phase';
	if (lower.includes('k₂co₃') || lower.includes('k2co3')) return 'STG_04 Drying';
	// Overheads split 25% each — handled separately
	return 'Overhead';
}

const STAGE_ORDER = ['STG_01 Leaf Prep', 'STG_02 Extraction', 'STG_03 AB Phase', 'STG_04 Drying'];

export const load: PageServerLoad = () => {
	const db = getDb();
	const batches = getAllBatches();

	// Aggregate all batch costs
	const allCosts = db.prepare(`
		SELECT bc.*, b.batch_number, s4.final_product_g
		FROM batch_costs bc
		JOIN batches b ON b.id = bc.batch_id
		LEFT JOIN stage4_records s4 ON s4.batch_id = bc.batch_id
		ORDER BY bc.batch_id, bc.cost_category
	`).all() as any[];

	// Per-batch summaries
	const batchMap = new Map<number, { batchNumber: string; costs: any[]; finalProductG: number | null }>();
	for (const c of allCosts) {
		if (!batchMap.has(c.batch_id)) {
			batchMap.set(c.batch_id, { batchNumber: c.batch_number, costs: [], finalProductG: c.final_product_g });
		}
		batchMap.get(c.batch_id)!.costs.push(c);
	}

	let totalOpEx = 0;
	let totalMaterial = 0;
	let totalLabor = 0;
	let totalEnergy = 0;

	const batchSummaries: any[] = [];
	const categoryTotals: Record<string, number> = {};
	const stageCosts: Record<string, Record<string, number>> = {};
	for (const stage of STAGE_ORDER) {
		stageCosts[stage] = { Material: 0, Labor: 0, Energy: 0, Other: 0 };
	}

	for (const [batchId, info] of batchMap) {
		const batchTotal = calculateTotalBatchCost(info.costs);
		const breakdown = calculateCostByCategory(info.costs);
		const costPerKg = info.finalProductG && info.finalProductG > 0
			? calculateCostPerKg(batchTotal, info.finalProductG / 1000.0)
			: null;

		totalOpEx += batchTotal;

		// Category aggregation
		for (const [cat, amount] of Object.entries(breakdown)) {
			categoryTotals[cat] = (categoryTotals[cat] || 0) + (amount as number);
		}

		// Stage cost allocation
		for (const cost of info.costs) {
			const stage = itemToStage(cost.item_name);
			if (stage === 'Overhead') {
				// Split overheads 25% each stage
				const perStage = cost.total_cost / 4;
				for (const s of STAGE_ORDER) {
					if (cost.item_name.toLowerCase().includes('labor')) {
						stageCosts[s].Labor += perStage;
					} else if (cost.item_name.toLowerCase().includes('electric')) {
						stageCosts[s].Energy += perStage;
					} else {
						stageCosts[s].Other += perStage;
					}
				}
			} else if (STAGE_ORDER.includes(stage)) {
				if (cost.cost_category === 'Material') {
					stageCosts[stage].Material += cost.total_cost;
				} else if (cost.item_name.toLowerCase().includes('labor')) {
					stageCosts[stage].Labor += cost.total_cost;
				} else if (cost.item_name.toLowerCase().includes('electric')) {
					stageCosts[stage].Energy += cost.total_cost;
				} else {
					stageCosts[stage].Other += cost.total_cost;
				}
			}
		}

		// Material/Labor/Energy totals
		for (const cost of info.costs) {
			if (cost.cost_category === 'Material') totalMaterial += cost.total_cost;
			if (cost.item_name.toLowerCase().includes('labor')) totalLabor += cost.total_cost;
			if (cost.item_name.toLowerCase().includes('electric')) totalEnergy += cost.total_cost;
		}

		const vsTarget = costPerKg != null ? Number(((costPerKg - TARGETS.costPerKg) / TARGETS.costPerKg * 100).toFixed(1)) : null;

		batchSummaries.push({
			batchNumber: info.batchNumber,
			totalCost: Number(batchTotal.toFixed(2)),
			costPerKg,
			vsTarget,
			finalProductKg: info.finalProductG ? Number((info.finalProductG / 1000).toFixed(3)) : null,
		});
	}

	const batchCount = batchSummaries.length;
	const avgPerBatch = batchCount > 0 ? Number((totalOpEx / batchCount).toFixed(2)) : 0;

	// Overall cost/kg from all batches with product
	const totalProductKg = batchSummaries.reduce((s, b) => s + (b.finalProductKg || 0), 0);
	const overallCostPerKg = totalProductKg > 0 ? Number((totalOpEx / totalProductKg).toFixed(2)) : 0;

	const materialPct = totalOpEx > 0 ? Number((totalMaterial / totalOpEx * 100).toFixed(1)) : 0;
	const laborPct = totalOpEx > 0 ? Number((totalLabor / totalOpEx * 100).toFixed(1)) : 0;
	const energyPct = totalOpEx > 0 ? Number((totalEnergy / totalOpEx * 100).toFixed(1)) : 0;
	const margin = overallCostPerKg > 0 ? Number((TARGETS.sellingPricePerKg - overallCostPerKg).toFixed(2)) : 0;
	const projectedDaily = Number((totalOpEx / Math.max(batchCount, 1) * 3).toFixed(2)); // ~3 batches/day

	// Avg cost/kg for deviation calc
	const batchesWithCpk = batchSummaries.filter(b => b.costPerKg != null);
	const avgCostPerKg = batchesWithCpk.length > 0
		? Number((batchesWithCpk.reduce((s, b) => s + b.costPerKg, 0) / batchesWithCpk.length).toFixed(2))
		: 0;

	const batchesWithDeviation = batchSummaries.map(b => ({
		...b,
		vsAvg: b.costPerKg != null && avgCostPerKg > 0
			? Number(((b.costPerKg - avgCostPerKg) / avgCostPerKg * 100).toFixed(1))
			: null,
		status: b.costPerKg == null ? 'N/A'
			: b.vsTarget != null && b.vsTarget <= -5 ? 'High Eff'
			: b.vsTarget != null && b.vsTarget > 5 ? 'Critical'
			: 'On Target'
	}));

	// Cost Pareto — sort categories descending
	const paretoDrivers = Object.entries(categoryTotals)
		.map(([name, total]) => ({
			name,
			total: Number(total.toFixed(2)),
			pct: totalOpEx > 0 ? Number((total / totalOpEx * 100).toFixed(1)) : 0
		}))
		.sort((a, b) => b.total - a.total);

	// Stage accumulation data with cumulative totals
	let cumulative = 0;
	const stageAccumulation = STAGE_ORDER.map(stage => {
		const cats = stageCosts[stage];
		const stageTotal = Object.values(cats).reduce((s, v) => s + v, 0);
		cumulative += stageTotal;
		return {
			stage,
			total: Number(stageTotal.toFixed(2)),
			cumulative: Number(cumulative.toFixed(2)),
			segments: [
				{ label: 'Material', value: Number(cats.Material.toFixed(2)), color: '#bef264' },
				{ label: 'Labor', value: Number(cats.Labor.toFixed(2)), color: '#9ca3af' },
				{ label: 'Other', value: Number((cats.Energy + cats.Other).toFixed(2)), color: '#4b5563' },
			].filter(s => s.value > 0)
		};
	});

	return {
		totalOpEx: Number(totalOpEx.toFixed(2)),
		avgPerBatch,
		overallCostPerKg,
		projectedDaily,
		materialPct,
		laborPct,
		energyPct,
		margin,
		stageAccumulation,
		paretoDrivers,
		batches: batchesWithDeviation,
		batchCount,
		avgCostPerKg
	};
};
