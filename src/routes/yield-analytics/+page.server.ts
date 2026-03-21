import { getDb } from '$lib/data/db';
import { getProcessStageName } from '$lib/constants/stageNames';
import type { PageServerLoad } from './$types';

interface MassTotals {
	total_leaf: number;
	total_powder: number;
	total_crude: number;
	total_wet_precip: number;
	total_final_product: number;
	batch_count: number;
}

interface BatchYieldRow {
	batch_number: string;
	leaf_input_kg: number;
	powder_output_kg: number | null;
	crude_extract_wt_kg: number | null;
	wet_precip_kg: number | null;
	final_product_kg: number | null;
	overall_yield_pct: number | null;
	final_moisture_pct: number | null;
	hplc_purity_pct: number | null;
	mitragynine_pct: number | null;
	powder_yield_pct: number | null;
}

interface HplcRow {
	mitragynine_pct: number | null;
	hydroxy_mitragynine_pct: number | null;
	paynantheine_pct: number | null;
	speciogynine_pct: number | null;
	speciociliatine_pct: number | null;
	non_alkaloids_pct: number | null;
	hplc_purity_pct: number | null;
}

interface StageAvgRow {
	avg: number;
}

interface QualityPoint {
	batch_number: string;
	yield_pct: number | null;
	purity_pct: number | null;
}

interface SolventTrendRow {
	batch_number: string;
	etoh_recovery_pct: number | null;
}

interface CycleTimeRow {
	batch_number: string;
	hours: number | null;
}

export const load: PageServerLoad = () => {
	try {
		const db = getDb();

		// Mass cascade aggregation across all batches
		const massTotals = db
			.prepare(
				`
			SELECT
				COALESCE(SUM(b.leaf_input_kg), 0) as total_leaf,
				COALESCE(SUM(s1.powder_output_kg), 0) as total_powder,
				COALESCE(SUM(s2.crude_extract_wt_kg), 0) as total_crude,
				COALESCE(SUM(s4.wet_precipitate_g), 0) / 1000.0 as total_wet_precip,
				COALESCE(SUM(s4.final_product_g), 0) / 1000.0 as total_final_product,
				COUNT(DISTINCT b.id) as batch_count
			FROM batches b
			LEFT JOIN stage1_records s1 ON s1.batch_id = b.id
			LEFT JOIN stage2_records s2 ON s2.batch_id = b.id
			LEFT JOIN stage4_records s4 ON s4.batch_id = b.id
		`
			)
			.get() as MassTotals;

		const cascade = {
			leaf: Number(massTotals.total_leaf.toFixed(1)),
			powder: Number(massTotals.total_powder.toFixed(1)),
			crude: Number(massTotals.total_crude.toFixed(2)),
			wetPrecip: Number(massTotals.total_wet_precip.toFixed(2)),
			finalProduct: Number(massTotals.total_final_product.toFixed(2))
		};

		// Conversion rates between stages
		const cascadeLosses = {
			leafToPowder: Number((cascade.leaf - cascade.powder).toFixed(1)),
			powderToCrude: Number((cascade.powder - cascade.crude).toFixed(1)),
			crudeToWet: Number((cascade.crude - cascade.wetPrecip).toFixed(2)),
			wetToFinal: Number((cascade.wetPrecip - cascade.finalProduct).toFixed(2))
		};

		// Overall yield and extract rate
		const overallYieldPct = cascade.leaf > 0 ? Number(((cascade.finalProduct / cascade.leaf) * 100).toFixed(2)) : 0;
		const extractRatePct = cascade.leaf > 0 ? Number(((cascade.crude / cascade.leaf) * 100).toFixed(2)) : 0;

		// Projected daily (assuming ~3 batches/day)
		const batchCount = massTotals.batch_count;
		const avgProductPerBatch = batchCount > 0 ? cascade.finalProduct / batchCount : 0;
		const projectedDaily = Number((avgProductPerBatch * 3).toFixed(2));

		// Per-batch yield+quality data
		const batchYields = db
			.prepare(
				`
			SELECT b.batch_number, b.leaf_input_kg,
				s1.powder_output_kg,
				s2.crude_extract_wt_kg,
				s4.wet_precipitate_g / 1000.0 as wet_precip_kg,
				s4.final_product_g / 1000.0 as final_product_kg,
				s4.overall_yield_pct,
				s4.final_moisture_pct,
				lr.hplc_purity_pct,
				lr.mitragynine_pct,
				CASE WHEN s1.net_leaf_kg > 0 THEN (s1.powder_output_kg / s1.net_leaf_kg * 100) END as powder_yield_pct
			FROM batches b
			LEFT JOIN stage1_records s1 ON s1.batch_id = b.id
			LEFT JOIN stage2_records s2 ON s2.batch_id = b.id
			LEFT JOIN stage4_records s4 ON s4.batch_id = b.id
			LEFT JOIN lab_results lr ON lr.batch_id = b.id AND lr.test_type = 'HPLC'
			WHERE s4.id IS NOT NULL
			ORDER BY b.created_at ASC
		`
			)
			.all() as BatchYieldRow[];

		const avgYield =
			batchYields.length > 0
				? Number((batchYields.reduce((s, b) => s + (b.overall_yield_pct ?? 0), 0) / batchYields.length).toFixed(2))
				: 0;

		// Batch table with vs-avg computation
		const batchTable = batchYields.map((b) => ({
			...b,
			final_product_kg: Number((b.final_product_kg ?? 0).toFixed(3)),
			vsAvg: b.overall_yield_pct != null ? Number((b.overall_yield_pct - avgYield).toFixed(2)) : null
		}));

		// HPLC purity + alkaloid composition (latest or aggregate)
		const hplc = db
			.prepare(
				`
			SELECT mitragynine_pct, hydroxy_mitragynine_pct, paynantheine_pct,
				speciogynine_pct, speciociliatine_pct, non_alkaloids_pct, hplc_purity_pct
			FROM lab_results
			WHERE test_type = 'HPLC' AND status = 'Completed'
			ORDER BY test_date DESC LIMIT 1
		`
			)
			.get() as HplcRow | undefined;

		// Stage yield averages
		const stage1Avg = db
			.prepare(
				`SELECT COALESCE(AVG(CASE WHEN s1.net_leaf_kg > 0 THEN (s1.powder_output_kg / s1.net_leaf_kg * 100) END), 0) as avg FROM stage1_records s1`
			)
			.get() as StageAvgRow;
		const stage2Avg = db
			.prepare(`SELECT COALESCE(AVG(etoh_recovery_pct), 0) as avg FROM stage2_records`)
			.get() as StageAvgRow;
		const stage3Avg = db
			.prepare(
				`
			SELECT COALESCE(AVG(CASE WHEN s3.dlimo_vol_L > 0 THEN ((s3.dlimo_vol_L - COALESCE(s3.dlimo_lost_L, 0)) / s3.dlimo_vol_L * 100) END), 0) as avg
			FROM stage3_records s3
		`
			)
			.get() as StageAvgRow;
		const stage4Avg = db
			.prepare(`SELECT COALESCE(AVG(overall_yield_pct), 0) as avg FROM stage4_records`)
			.get() as StageAvgRow;

		const stageYields = [
			{ stage: getProcessStageName(1), pct: Number(stage1Avg.avg.toFixed(1)) },
			{ stage: getProcessStageName(2), pct: Number(stage2Avg.avg.toFixed(1)) },
			{ stage: getProcessStageName(3), pct: Number(stage3Avg.avg.toFixed(1)) },
			{ stage: getProcessStageName(4), pct: Number(stage4Avg.avg.toFixed(1)) }
		];

		// Yield loss waterfall (per-stage mass loss)
		const yieldLossWaterfall = [
			{ stage: 'Grinding & Structural', loss: cascadeLosses.leafToPowder, unit: 'kg' },
			{ stage: 'Extraction (Spent Cake)', loss: cascadeLosses.powderToCrude, unit: 'kg' },
			{ stage: 'AB Partition', loss: cascadeLosses.crudeToWet, unit: 'kg' },
			{ stage: 'Drying', loss: cascadeLosses.wetToFinal, unit: 'kg' }
		];
		const maxStageLoss = Math.max(...yieldLossWaterfall.map((w) => w.loss), 1);

		// Quality correlation: yield vs purity (for scatter plot)
		const qualityCorrelation = db
			.prepare(
				`
			SELECT b.batch_number,
				s4.overall_yield_pct as yield_pct,
				lr.hplc_purity_pct as purity_pct
			FROM stage4_records s4
			JOIN batches b ON b.id = s4.batch_id
			LEFT JOIN lab_results lr ON lr.batch_id = s4.batch_id AND lr.test_type = 'HPLC'
			WHERE s4.overall_yield_pct IS NOT NULL
		`
			)
			.all() as QualityPoint[];

		// Quality specs
		const qualitySpecs = {
			purity: hplc?.hplc_purity_pct ?? null,
			purityTarget: 90,
			mitragynine: hplc?.mitragynine_pct ?? null,
			mitragynineTarget: 1.0,
			moisture:
				batchYields.length > 0
					? Number(
							(
								batchYields.reduce((s, b) => s + (b.final_moisture_pct ?? 0), 0) /
									batchYields.filter((b) => b.final_moisture_pct != null).length || 0
							).toFixed(1)
						)
					: null,
			moistureTarget: 6
		};

		// Solvent trend (for Trends tab)
		const solventTrend = db
			.prepare(
				`
			SELECT b.batch_number, s2.etoh_recovery_pct
			FROM stage2_records s2
			JOIN batches b ON b.id = s2.batch_id
			ORDER BY b.created_at ASC
		`
			)
			.all() as SolventTrendRow[];

		// Cycle times
		const cycleTimes = db
			.prepare(
				`
			SELECT b.batch_number,
				ROUND((julianday(COALESCE(s4.updated_at, s4.created_at)) - julianday(COALESCE(s1.created_at, b.created_at))) * 24, 1) as hours
			FROM batches b
			JOIN stage1_records s1 ON s1.batch_id = b.id
			JOIN stage4_records s4 ON s4.batch_id = b.id
			ORDER BY b.created_at ASC
		`
			)
			.all() as CycleTimeRow[];

		// Alkaloid composition for sidebar
		const alkaloids = hplc
			? [
					{ name: 'Mitragynine', pct: hplc.mitragynine_pct ?? 0, color: '#bef264' },
					{ name: '7-OH-Mitragynine', pct: hplc.hydroxy_mitragynine_pct ?? 0, color: '#86efac' },
					{ name: 'Paynantheine', pct: hplc.paynantheine_pct ?? 0, color: '#4ade80' },
					{ name: 'Speciogynine', pct: hplc.speciogynine_pct ?? 0, color: '#a3e635' },
					{ name: 'Speciociliatine', pct: hplc.speciociliatine_pct ?? 0, color: '#d9f99d' },
					{ name: 'Non-alkaloids', pct: hplc.non_alkaloids_pct ?? 0, color: '#6b7280' }
				]
			: [];

		return {
			cascade,
			cascadeLosses,
			overallYieldPct,
			extractRatePct,
			projectedDaily,
			batchCount,
			avgYield,
			batchTable,
			hplc: hplc ?? null,
			stageYields,
			yieldLossWaterfall,
			maxStageLoss,
			qualityCorrelation,
			qualitySpecs,
			solventTrend,
			cycleTimes,
			alkaloids
		};
	} catch (error) {
		console.error('Failed to load yield analytics data:', error);
		return {
			cascade: { leaf: 0, powder: 0, crude: 0, wetPrecip: 0, finalProduct: 0 },
			cascadeLosses: { leafToPowder: 0, powderToCrude: 0, crudeToWet: 0, wetToFinal: 0 },
			overallYieldPct: 0,
			extractRatePct: 0,
			projectedDaily: 0,
			batchCount: 0,
			avgYield: 0,
			batchTable: [],
			hplc: null,
			stageYields: [],
			yieldLossWaterfall: [],
			maxStageLoss: 1,
			qualityCorrelation: [],
			qualitySpecs: {
				purity: null,
				purityTarget: 90,
				mitragynine: null,
				mitragynineTarget: 1.0,
				moisture: null,
				moistureTarget: 6
			},
			solventTrend: [],
			cycleTimes: [],
			alkaloids: []
		};
	}
};
