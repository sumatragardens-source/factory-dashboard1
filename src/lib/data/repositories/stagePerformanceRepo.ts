import { getDb } from '../db';

export type TimeFilter = 'all' | '3months' | '1month' | '1week' | 'today';

function getDateFilter(filter: TimeFilter): string {
	switch (filter) {
		case '3months': return "AND bs.finalized_at >= datetime('now', '-3 months')";
		case '1month': return "AND bs.finalized_at >= datetime('now', '-1 month')";
		case '1week': return "AND bs.finalized_at >= datetime('now', '-7 days')";
		case 'today': return "AND date(bs.finalized_at) = date('now')";
		default: return '';
	}
}

export interface StagePerformanceBase {
	batchCount: number;
	avgCycleTimeHours: number;
}

export interface Stage1Performance extends StagePerformanceBase {
	avgPowderYieldPct: number;
	avgMassBalanceErrorPct: number;
	totalInputKg: number;
	totalOutputKg: number;
	batches: {
		batch_number: string;
		batch_id: number;
		powder_weight_kg: number | null;
		powder_yield_pct: number | null;
		mass_balance_error_pct: number | null;
		finalized_at: string | null;
	}[];
}

export function getStage1Performance(filter: TimeFilter): Stage1Performance {
	const db = getDb();
	const dateClause = getDateFilter(filter);

	const summary = db.prepare(`
		SELECT
			COUNT(*) as batch_count,
			AVG(s1.powder_yield_pct) as avg_yield,
			AVG(s1.mass_balance_error_pct) as avg_mbe,
			COALESCE(SUM(s1.net_weight_kg), 0) as total_input,
			COALESCE(SUM(s1.powder_weight_kg), 0) as total_output,
			AVG((julianday(bs.finalized_at) - julianday(bs.started_at)) * 24) as avg_cycle
		FROM stage1_records s1
		JOIN batch_stages bs ON bs.batch_id = s1.batch_id AND bs.stage_number = 1
		WHERE bs.status = 'Finalized' ${dateClause}
	`).get() as any;

	const batches = db.prepare(`
		SELECT b.batch_number, b.id as batch_id, s1.powder_weight_kg, s1.powder_yield_pct,
			s1.mass_balance_error_pct, bs.finalized_at
		FROM stage1_records s1
		JOIN batch_stages bs ON bs.batch_id = s1.batch_id AND bs.stage_number = 1
		JOIN batches b ON b.id = s1.batch_id
		WHERE bs.status = 'Finalized' ${dateClause}
		ORDER BY bs.finalized_at DESC
	`).all() as any[];

	return {
		batchCount: summary.batch_count ?? 0,
		avgPowderYieldPct: Number((summary.avg_yield ?? 0).toFixed(1)),
		avgMassBalanceErrorPct: Number((summary.avg_mbe ?? 0).toFixed(1)),
		totalInputKg: Number((summary.total_input ?? 0).toFixed(2)),
		totalOutputKg: Number((summary.total_output ?? 0).toFixed(2)),
		avgCycleTimeHours: Number((summary.avg_cycle ?? 0).toFixed(1)),
		batches
	};
}

export interface Stage2Performance extends StagePerformanceBase {
	avgRecoveryRatePct: number;
	totalEthanolUsedL: number;
	totalEthanolRecoveredL: number;
	totalEthanolLostL: number;
	avgSolventRatio: number;
	batches: {
		batch_number: string;
		batch_id: number;
		extract_weight_kg: number | null;
		recovery_rate_pct: number | null;
		ethanol_stock_used_l: number | null;
		finalized_at: string | null;
	}[];
}

export function getStage2Performance(filter: TimeFilter): Stage2Performance {
	const db = getDb();
	const dateClause = getDateFilter(filter);

	const summary = db.prepare(`
		SELECT
			COUNT(*) as batch_count,
			AVG(s2.recovery_rate_pct) as avg_recovery,
			COALESCE(SUM(s2.ethanol_stock_used_l), 0) as total_ethanol_used,
			COALESCE(SUM(s2.total_ethanol_recovered_l), 0) as total_recovered,
			COALESCE(SUM(s2.total_ethanol_loss_l), 0) as total_lost,
			AVG((julianday(bs.finalized_at) - julianday(bs.started_at)) * 24) as avg_cycle
		FROM stage2_records s2
		JOIN batch_stages bs ON bs.batch_id = s2.batch_id AND bs.stage_number = 2
		WHERE bs.status = 'Finalized' ${dateClause}
	`).get() as any;

	const avgRatio = db.prepare(`
		SELECT AVG(r.solvent_ratio) as avg_ratio
		FROM stage2_reactors r
		JOIN batch_stages bs ON bs.batch_id = r.batch_id AND bs.stage_number = 2
		WHERE bs.status = 'Finalized' ${dateClause}
	`).get() as any;

	const batches = db.prepare(`
		SELECT b.batch_number, b.id as batch_id, s2.extract_weight_kg, s2.recovery_rate_pct,
			s2.ethanol_stock_used_l, bs.finalized_at
		FROM stage2_records s2
		JOIN batch_stages bs ON bs.batch_id = s2.batch_id AND bs.stage_number = 2
		JOIN batches b ON b.id = s2.batch_id
		WHERE bs.status = 'Finalized' ${dateClause}
		ORDER BY bs.finalized_at DESC
	`).all() as any[];

	return {
		batchCount: summary.batch_count ?? 0,
		avgRecoveryRatePct: Number((summary.avg_recovery ?? 0).toFixed(1)),
		totalEthanolUsedL: Number((summary.total_ethanol_used ?? 0).toFixed(1)),
		totalEthanolRecoveredL: Number((summary.total_recovered ?? 0).toFixed(1)),
		totalEthanolLostL: Number((summary.total_lost ?? 0).toFixed(1)),
		avgSolventRatio: Number((avgRatio?.avg_ratio ?? 0).toFixed(1)),
		avgCycleTimeHours: Number((summary.avg_cycle ?? 0).toFixed(1)),
		batches
	};
}

export interface Stage3Performance extends StagePerformanceBase {
	avgPartitionYieldPct: number;
	avgLimoneneRecoveryPct: number;
	totalReagentCostEstimate: number;
	batches: {
		batch_number: string;
		batch_id: number;
		alkaloid_precipitate_kg: number | null;
		feed_weight_kg: number | null;
		limonene_volume_l: number | null;
		limonene_recovered_l: number | null;
		finalized_at: string | null;
	}[];
}

export function getStage3Performance(filter: TimeFilter): Stage3Performance {
	const db = getDb();
	const dateClause = getDateFilter(filter);

	const summary = db.prepare(`
		SELECT
			COUNT(*) as batch_count,
			AVG(CASE WHEN s3.feed_weight_kg > 0 THEN (s3.alkaloid_precipitate_kg / s3.feed_weight_kg * 100) END) as avg_partition_yield,
			AVG(CASE WHEN s3.limonene_volume_l > 0 THEN (s3.limonene_recovered_l / s3.limonene_volume_l * 100) END) as avg_lim_recovery,
			AVG((julianday(bs.finalized_at) - julianday(bs.started_at)) * 24) as avg_cycle
		FROM stage3_records s3
		JOIN batch_stages bs ON bs.batch_id = s3.batch_id AND bs.stage_number = 3
		WHERE bs.status = 'Finalized' ${dateClause}
	`).get() as any;

	const batches = db.prepare(`
		SELECT b.batch_number, b.id as batch_id, s3.alkaloid_precipitate_kg, s3.feed_weight_kg,
			s3.limonene_volume_l, s3.limonene_recovered_l, bs.finalized_at
		FROM stage3_records s3
		JOIN batch_stages bs ON bs.batch_id = s3.batch_id AND bs.stage_number = 3
		JOIN batches b ON b.id = s3.batch_id
		WHERE bs.status = 'Finalized' ${dateClause}
		ORDER BY bs.finalized_at DESC
	`).all() as any[];

	return {
		batchCount: summary.batch_count ?? 0,
		avgPartitionYieldPct: Number((summary.avg_partition_yield ?? 0).toFixed(1)),
		avgLimoneneRecoveryPct: Number((summary.avg_lim_recovery ?? 0).toFixed(1)),
		totalReagentCostEstimate: 0,
		avgCycleTimeHours: Number((summary.avg_cycle ?? 0).toFixed(1)),
		batches
	};
}

export interface Stage4Performance extends StagePerformanceBase {
	avgCumulativeYieldPct: number;
	totalFinalProductKg: number;
	avgCostPerKg: number;
	batches: {
		batch_number: string;
		batch_id: number;
		final_product_weight_kg: number | null;
		cumulative_yield_pct: number | null;
		finalized_at: string | null;
	}[];
}

export function getStage4Performance(filter: TimeFilter): Stage4Performance {
	const db = getDb();
	const dateClause = getDateFilter(filter);

	const summary = db.prepare(`
		SELECT
			COUNT(*) as batch_count,
			AVG(s4.cumulative_yield_pct) as avg_yield,
			COALESCE(SUM(s4.final_product_weight_kg), 0) as total_product,
			AVG((julianday(bs.finalized_at) - julianday(bs.started_at)) * 24) as avg_cycle
		FROM stage4_records s4
		JOIN batch_stages bs ON bs.batch_id = s4.batch_id AND bs.stage_number = 4
		WHERE bs.status = 'Finalized' ${dateClause}
	`).get() as any;

	const batches = db.prepare(`
		SELECT b.batch_number, b.id as batch_id, s4.final_product_weight_kg,
			s4.cumulative_yield_pct, bs.finalized_at
		FROM stage4_records s4
		JOIN batch_stages bs ON bs.batch_id = s4.batch_id AND bs.stage_number = 4
		JOIN batches b ON b.id = s4.batch_id
		WHERE bs.status = 'Finalized' ${dateClause}
		ORDER BY bs.finalized_at DESC
	`).all() as any[];

	return {
		batchCount: summary.batch_count ?? 0,
		avgCumulativeYieldPct: Number((summary.avg_yield ?? 0).toFixed(1)),
		totalFinalProductKg: Number((summary.total_product ?? 0).toFixed(2)),
		avgCostPerKg: 0,
		avgCycleTimeHours: Number((summary.avg_cycle ?? 0).toFixed(1)),
		batches
	};
}
