import { getDb } from '$lib/data/db';
import { getStageName } from '$lib/constants/stageNames';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const db = getDb();

	// Per-batch yield data (completed batches with stage4 records)
	const batchYields = db.prepare(`
		SELECT b.batch_number, b.leaf_input_kg,
			s1.powder_yield_pct,
			s4.cumulative_yield_pct, s4.final_product_weight_kg,
			s4.stage_yield_pct
		FROM batches b
		JOIN stage4_records s4 ON s4.batch_id = b.id
		LEFT JOIN stage1_records s1 ON s1.batch_id = b.id
		ORDER BY b.created_at ASC
	`).all() as any[];

	// Average cumulative yield
	const avgYield = batchYields.length > 0
		? Number((batchYields.reduce((s: number, b: any) => s + (b.cumulative_yield_pct ?? 0), 0) / batchYields.length).toFixed(1))
		: 0;

	// Ethanol recovery average (solvent efficiency)
	const solventEff = db.prepare(`
		SELECT COALESCE(AVG(recovery_rate_pct), 0) as avg_recovery
		FROM stage2_records
	`).get() as any;

	// HPLC alkaloid composition (latest completed)
	const hplc = db.prepare(`
		SELECT mitragynine_pct, hydroxy_mitragynine_pct, paynantheine_pct,
			speciogynine_pct, speciociliatine_pct, non_alkaloids_pct, hplc_purity_pct
		FROM lab_results
		WHERE test_type = 'HPLC' AND status = 'Completed'
		ORDER BY test_date DESC LIMIT 1
	`).get() as any;

	// Stage yield averages across all batches
	const stage1Avg = db.prepare(`SELECT COALESCE(AVG(powder_yield_pct), 0) as avg FROM stage1_records`).get() as any;
	const stage2Avg = db.prepare(`
		SELECT COALESCE(AVG(CASE WHEN s2.dry_mass_kg > 0 THEN (s2.extract_weight_kg / s2.dry_mass_kg * 100) END), 0) as avg
		FROM stage2_records s2
	`).get() as any;
	const stage3Avg = db.prepare(`
		SELECT COALESCE(AVG(CASE WHEN s3.feed_weight_kg > 0 THEN (s3.alkaloid_precipitate_kg / s3.feed_weight_kg * 100) END), 0) as avg
		FROM stage3_records s3
	`).get() as any;
	const stage4Avg = db.prepare(`SELECT COALESCE(AVG(stage_yield_pct), 0) as avg FROM stage4_records`).get() as any;

	const stageYields = [
		{ stage: getStageName(1), pct: Number(stage1Avg.avg.toFixed(1)) },
		{ stage: getStageName(2), pct: Number(stage2Avg.avg.toFixed(1)) },
		{ stage: getStageName(3), pct: Number(stage3Avg.avg.toFixed(1)) },
		{ stage: getStageName(4), pct: Number(stage4Avg.avg.toFixed(1)) }
	];

	// Cost per kg for completed batches
	const costPerKg = db.prepare(`
		SELECT b.batch_number, SUM(bc.total_cost) as total_cost, s4.final_product_weight_kg
		FROM batch_costs bc
		JOIN batches b ON b.id = bc.batch_id
		JOIN stage4_records s4 ON s4.batch_id = bc.batch_id
		GROUP BY bc.batch_id
	`).all() as any[];

	const costPerKgData = costPerKg.map((r: any) => ({
		batch: r.batch_number,
		costPerKg: r.final_product_weight_kg > 0 ? Number((r.total_cost / r.final_product_weight_kg).toFixed(2)) : 0
	}));

	const latestCostPerKg = costPerKgData.length > 0
		? costPerKgData[costPerKgData.length - 1].costPerKg
		: 0;

	// Batch cycle time estimates (using stage records timestamps)
	const cycleTimes = db.prepare(`
		SELECT b.batch_number,
			ROUND((julianday(COALESCE(s4.updated_at, s4.created_at)) - julianday(COALESCE(s1.created_at, b.created_at))) * 24, 1) as hours
		FROM batches b
		JOIN stage1_records s1 ON s1.batch_id = b.id
		JOIN stage4_records s4 ON s4.batch_id = b.id
		ORDER BY b.created_at ASC
	`).all() as any[];

	// Solvent performance trend (per-batch ethanol recovery)
	const solventTrend = db.prepare(`
		SELECT b.batch_number, s2.recovery_rate_pct
		FROM stage2_records s2
		JOIN batches b ON b.id = s2.batch_id
		ORDER BY b.created_at ASC
	`).all() as any[];

	return {
		avgYield,
		solventEfficiency: Number(solventEff.avg_recovery.toFixed(1)),
		hplc: hplc ?? null,
		batchYields,
		stageYields,
		costPerKgData,
		latestCostPerKg,
		cycleTimes,
		solventTrend
	};
};
