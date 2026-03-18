import { getDb } from '../db';
import type { Batch, BatchStage, Deviation, Approval, Machine, LabResult, ProductionRun, ProductionRunSummary, BatchCostSummary, BatchEthanolSummary, BatchYieldSummary, RunHistorySummary, AnomalyFlag, QualityCorrelationPoint } from '$lib/domain/types';
import { getBatchCosts } from './costingRepo';
import { calculateTotalBatchCost, calculateCostPerKg } from '$lib/calculations/costing';

/** SQL subquery that resolves to the active production run id (In Progress first, then most recent) */
const ACTIVE_RUN_ID_SQL = `(SELECT pr.id FROM production_runs pr ORDER BY (pr.status = 'In Progress') DESC, pr.started_at DESC LIMIT 1)`;

export function getActiveBatches(): Batch[] {
	const db = getDb();
	return db
		.prepare("SELECT * FROM batches WHERE status IN ('In Progress','Pending Review') ORDER BY current_stage, created_at")
		.all() as Batch[];
}

export function getCompletedBatchCount(): number {
	const db = getDb();
	const row = db
		.prepare("SELECT COUNT(*) as count FROM batches WHERE status = 'Completed'")
		.get() as { count: number };
	return row.count;
}

export function getStalledBatches(daysThreshold: number = 3): Batch[] {
	const db = getDb();
	return db
		.prepare(`
			SELECT b.* FROM batches b
			JOIN batch_stages bs ON bs.batch_id = b.id AND bs.stage_number = b.current_stage
			WHERE b.status = 'In Progress'
			AND bs.status = 'In Progress'
			AND bs.started_at IS NOT NULL
			AND julianday('now') - julianday(bs.started_at) > ?
			ORDER BY bs.started_at ASC
		`)
		.all(daysThreshold) as Batch[];
}

export function getRecentBatches(limit: number = 5): Batch[] {
	const db = getDb();
	return db
		.prepare('SELECT * FROM batches ORDER BY updated_at DESC LIMIT ?')
		.all(limit) as Batch[];
}

export function getRecentDeviations(limit: number = 5): Deviation[] {
	const db = getDb();
	return db
		.prepare('SELECT * FROM deviations ORDER BY created_at DESC LIMIT ?')
		.all(limit) as Deviation[];
}

export function getPendingApprovals(): Approval[] {
	const db = getDb();
	return db
		.prepare("SELECT * FROM approvals WHERE status = 'Pending' ORDER BY requested_at DESC")
		.all() as Approval[];
}

export function getBatchesByStage(): { stage: number; count: number }[] {
	const db = getDb();
	return db
		.prepare(`
			SELECT current_stage as stage, COUNT(*) as count
			FROM batches
			WHERE status IN ('In Progress','Pending Review')
			GROUP BY current_stage
			ORDER BY current_stage
		`)
		.all() as { stage: number; count: number }[];
}

export function getAllMachineStatuses(): Machine[] {
	const db = getDb();
	return db.prepare('SELECT * FROM machines ORDER BY code').all() as Machine[];
}

export function getAverageEthanolRecovery(): number {
	const db = getDb();
	const row = db
		.prepare('SELECT AVG(etoh_recovery_pct) as avg_rate FROM stage2_records WHERE etoh_recovery_pct IS NOT NULL')
		.get() as { avg_rate: number | null };
	return row.avg_rate ? Number(row.avg_rate.toFixed(1)) : 0;
}

export function getOpenDeviationCount(): number {
	const db = getDb();
	const row = db
		.prepare("SELECT COUNT(*) as count FROM deviations WHERE status IN ('Open','Under Review')")
		.get() as { count: number };
	return row.count;
}

export function getSolventTotals(): {
	ethanol_issued: number;
	ethanol_recovered: number;
	ethanol_lost: number;
	limonene_issued: number;
	limonene_recovered: number;
	limonene_lost: number;
} {
	const db = getDb();
	const ethanol = db
		.prepare(`SELECT COALESCE(SUM(s2.etoh_vol_L), 0) as issued, COALESCE(SUM(s2.etoh_recovered_L), 0) as recovered, COALESCE(SUM(s2.etoh_lost_L), 0) as lost FROM stage2_records s2 JOIN batches b ON b.id = s2.batch_id WHERE b.production_run_id = ${ACTIVE_RUN_ID_SQL}`)
		.get() as { issued: number; recovered: number; lost: number };
	const limonene = db
		.prepare(`SELECT COALESCE(SUM(s3.dlimo_vol_L), 0) as issued, COALESCE(SUM(s3.dlimo_recovered_L), 0) as recovered, COALESCE(SUM(s3.dlimo_lost_L), 0) as lost FROM stage3_records s3 JOIN batches b ON b.id = s3.batch_id WHERE b.production_run_id = ${ACTIVE_RUN_ID_SQL}`)
		.get() as { issued: number; recovered: number; lost: number };
	return {
		ethanol_issued: ethanol.issued,
		ethanol_recovered: ethanol.recovered,
		ethanol_lost: ethanol.lost,
		limonene_issued: limonene.issued,
		limonene_recovered: limonene.recovered,
		limonene_lost: limonene.lost
	};
}

export function getLatestCompletedBatchNumber(): string | null {
	const db = getDb();
	const row = db
		.prepare("SELECT batch_number FROM batches WHERE status = 'Completed' ORDER BY completed_at DESC LIMIT 1")
		.get() as { batch_number: string } | undefined;
	return row?.batch_number ?? null;
}

export function getBatchCountByStatus(): Record<string, number> {
	const db = getDb();
	const rows = db
		.prepare('SELECT status, COUNT(*) as count FROM batches GROUP BY status')
		.all() as { status: string; count: number }[];
	const result: Record<string, number> = {};
	for (const r of rows) result[r.status] = r.count;
	return result;
}

export function getTotalLeafInputProcessed(): { total: number; batchCount: number } {
	const db = getDb();
	const row = db
		.prepare("SELECT COALESCE(SUM(leaf_input_kg), 0) as total, COUNT(*) as batch_count FROM batches WHERE status != 'Draft'")
		.get() as { total: number; batch_count: number };
	return { total: Number(row.total.toFixed(1)), batchCount: row.batch_count };
}

export function getTotalFinalProductWeight(): number {
	const db = getDb();
	const row = db
		.prepare('SELECT COALESCE(SUM(s4.final_product_g / 1000.0), 0) as total FROM stage4_records s4 WHERE s4.final_product_g IS NOT NULL')
		.get() as { total: number };
	return Number(row.total.toFixed(2));
}

export interface StagePipelineData {
	stageNumber: number;
	activeCount: number;
	activeQtyKg: number;
	completedThroughCount: number;
	completedThroughOutputKg: number;
}

export function getStagePipelineSummary(): StagePipelineData[] {
	const db = getDb();

	const activeRows = db
		.prepare("SELECT current_stage, COUNT(*) as cnt, COALESCE(SUM(leaf_input_kg), 0) as qty FROM batches WHERE status IN ('In Progress','Pending Review') GROUP BY current_stage")
		.all() as { current_stage: number; cnt: number; qty: number }[];

	const finalizedRows = db
		.prepare("SELECT stage_number, COUNT(*) as cnt FROM batch_stages WHERE status = 'Finalized' GROUP BY stage_number")
		.all() as { stage_number: number; cnt: number }[];

	// Output data is from the 4 underlying record tables
	const s1Output = (db.prepare("SELECT COALESCE(SUM(s1.powder_output_kg), 0) as total FROM stage1_records s1 JOIN batch_stages bs ON bs.batch_id = s1.batch_id AND bs.stage_number = 1 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s2Output = (db.prepare("SELECT COALESCE(SUM(s2.crude_extract_wt_kg), 0) as total FROM stage2_records s2 JOIN batch_stages bs ON bs.batch_id = s2.batch_id AND bs.stage_number = 2 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s3Output = (db.prepare("SELECT COALESCE(SUM(s3.acidic_aq_vol_L), 0) as total FROM stage3_records s3 JOIN batch_stages bs ON bs.batch_id = s3.batch_id AND bs.stage_number = 3 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s4Output = (db.prepare("SELECT COALESCE(SUM(s4.final_product_g / 1000.0), 0) as total FROM stage4_records s4 JOIN batch_stages bs ON bs.batch_id = s4.batch_id AND bs.stage_number = 4 WHERE bs.status = 'Finalized'").get() as { total: number }).total;

	// Map workflow stage → output kg from the relevant record table
	// Stage 1=powder, 2=extract, 3=precipitate, 4=final product
	const outputByStage: Record<number, number> = {
		1: s1Output, 2: s2Output, 3: s3Output, 4: s4Output
	};

	return [1, 2, 3, 4].map((n) => {
		const active = activeRows.find((r) => r.current_stage === n);
		const finalized = finalizedRows.find((r) => r.stage_number === n);
		return {
			stageNumber: n,
			activeCount: active?.cnt ?? 0,
			activeQtyKg: Number((active?.qty ?? 0).toFixed(1)),
			completedThroughCount: finalized?.cnt ?? 0,
			completedThroughOutputKg: Number((outputByStage[n] ?? 0).toFixed(2))
		};
	});
}

export interface ActiveBatchWithProgress {
	id: number;
	batch_number: string;
	status: string;
	current_stage: number;
	leaf_input_kg: number;
	operator_name: string | null;
	supplier_lot: string | null;
	lot_position: string | null;
	created_at: string | null;
	started_at: string | null;
	completed_at: string | null;
	powder_output_kg: number | null;
	crude_extract_wt_kg: number | null;
	etoh_vol_L: number | null;
	filtrate_vol_L: number | null;
	etoh_recovered_L: number | null;
	etoh_lost_L: number | null;
	etoh_recovery_pct: number | null;
	dlimo_vol_L: number | null;
	dlimo_recovered_L: number | null;
	dlimo_lost_L: number | null;
	wet_precipitate_g: number | null;
	final_product_g: number | null;
	overall_yield_pct: number | null;
	stages: BatchStage[];
}

export function getActiveBatchProgress(): ActiveBatchWithProgress[] {
	const db = getDb();

	const rows = db
		.prepare(`
			SELECT b.id, b.batch_number, b.status, b.current_stage, b.leaf_input_kg, b.operator_name, b.supplier_lot, b.lot_position, b.created_at, b.started_at, b.completed_at,
				s1.powder_output_kg,
				s2.crude_extract_wt_kg, s2.etoh_vol_L, s2.filtrate_vol_L, s2.etoh_recovered_L, s2.etoh_lost_L, s2.etoh_recovery_pct,
				s3.dlimo_vol_L, s3.dlimo_recovered_L, s3.dlimo_lost_L,
				s4.wet_precipitate_g, s4.final_product_g, s4.overall_yield_pct
			FROM batches b
			LEFT JOIN stage1_records s1 ON s1.batch_id = b.id
			LEFT JOIN stage2_records s2 ON s2.batch_id = b.id
			LEFT JOIN stage3_records s3 ON s3.batch_id = b.id
			LEFT JOIN stage4_records s4 ON s4.batch_id = b.id
			WHERE b.status != 'Draft'
			  AND b.production_run_id = (
			    SELECT pr.id FROM production_runs pr
			    ORDER BY (pr.status = 'In Progress') DESC, pr.started_at DESC LIMIT 1
			  )
			ORDER BY b.batch_number ASC
		`)
		.all() as Omit<ActiveBatchWithProgress, 'stages'>[];

	if (rows.length === 0) return [];

	const batchIds = rows.map((r) => r.id);
	const placeholders = batchIds.map(() => '?').join(',');
	const stageRows = db
		.prepare(`SELECT * FROM batch_stages WHERE batch_id IN (${placeholders}) ORDER BY batch_id, stage_number`)
		.all(...batchIds) as BatchStage[];

	const stagesByBatch = new Map<number, BatchStage[]>();
	for (const s of stageRows) {
		if (!stagesByBatch.has(s.batch_id)) stagesByBatch.set(s.batch_id, []);
		stagesByBatch.get(s.batch_id)!.push(s);
	}

	return rows.map((r) => ({
		...r,
		stages: stagesByBatch.get(r.id) ?? []
	}));
}

export function getPendingLabResults(): (LabResult & { batch_number: string })[] {
	const db = getDb();
	return db
		.prepare(`
			SELECT lr.*, b.batch_number FROM lab_results lr
			JOIN batches b ON b.id = lr.batch_id
			WHERE lr.status IN ('Pending', 'In Progress')
			ORDER BY lr.created_at DESC
		`)
		.all() as (LabResult & { batch_number: string })[];
}

export function getLatestCompletedBatchCostPerKg(): {
	batch_number: string;
	totalCost: number;
	finalProductKg: number;
	costPerKg: number;
} | null {
	const db = getDb();
	const batch = db
		.prepare(`SELECT id, batch_number FROM batches WHERE status = 'Completed' AND production_run_id = ${ACTIVE_RUN_ID_SQL} ORDER BY completed_at DESC LIMIT 1`)
		.get() as { id: number; batch_number: string } | undefined;
	if (!batch) return null;

	const costs = getBatchCosts(batch.id);
	const totalCost = calculateTotalBatchCost(costs);

	const s4 = db
		.prepare('SELECT final_product_g / 1000.0 as final_product_kg FROM stage4_records WHERE batch_id = ?')
		.get(batch.id) as { final_product_kg: number | null } | undefined;
	const finalProductKg = s4?.final_product_kg ?? 0;

	return {
		batch_number: batch.batch_number,
		totalCost,
		finalProductKg,
		costPerKg: calculateCostPerKg(totalCost, finalProductKg)
	};
}

export function getAverageCycleTimePerStage(): Record<number, number> {
	const db = getDb();
	const rows = db
		.prepare(`
			SELECT stage_number, AVG((julianday(finalized_at) - julianday(started_at)) * 24) as avg_hours
			FROM batch_stages
			WHERE status = 'Finalized' AND started_at IS NOT NULL AND finalized_at IS NOT NULL
			GROUP BY stage_number
		`)
		.all() as { stage_number: number; avg_hours: number }[];
	const result: Record<number, number> = {};
	for (const r of rows) result[r.stage_number] = Number(r.avg_hours.toFixed(1));
	return result;
}

export function getLatestHplcResult(): LabResult | null {
	const db = getDb();
	const row = db
		.prepare(`
			SELECT lr.* FROM lab_results lr
			JOIN batches b ON b.id = lr.batch_id
			WHERE lr.test_type = 'HPLC'
			  AND b.production_run_id = ${ACTIVE_RUN_ID_SQL}
			ORDER BY
				CASE lr.status WHEN 'Completed' THEN 0 WHEN 'In Progress' THEN 1 WHEN 'Pending' THEN 2 ELSE 3 END,
				lr.created_at DESC
			LIMIT 1
		`)
		.get() as LabResult | undefined;
	return row ?? null;
}

export interface IntakeProgress {
	totalIntakeKg: number;
	processedKg: number;
	remainingKg: number;
	pct: number;
	totalLots: number;
	activeLots: number;
	completedLots: number;
}

export function getIntakeProgress(): IntakeProgress {
	const db = getDb();
	const intake = db
		.prepare(`SELECT COALESCE(SUM(leaf_input_kg), 0) as total, COUNT(*) as cnt FROM batches WHERE status != 'Draft' AND production_run_id = ${ACTIVE_RUN_ID_SQL}`)
		.get() as { total: number; cnt: number };
	const processed = db
		.prepare(`
			SELECT COALESCE(SUM(b.leaf_input_kg), 0) as total
			FROM batches b
			JOIN batch_stages bs ON bs.batch_id = b.id AND bs.stage_number = 1
			WHERE b.status != 'Draft' AND bs.status = 'Finalized' AND b.production_run_id = ${ACTIVE_RUN_ID_SQL}
		`)
		.get() as { total: number };
	const completed = db
		.prepare(`SELECT COUNT(*) as cnt FROM batches WHERE status = 'Completed' AND production_run_id = ${ACTIVE_RUN_ID_SQL}`)
		.get() as { cnt: number };
	const active = db
		.prepare(`SELECT COUNT(*) as cnt FROM batches WHERE status IN ('In Progress', 'Pending Review') AND production_run_id = ${ACTIVE_RUN_ID_SQL}`)
		.get() as { cnt: number };

	const totalIntakeKg = Number(intake.total);
	const processedKg = Number(processed.total);
	return {
		totalIntakeKg,
		processedKg,
		remainingKg: totalIntakeKg - processedKg,
		pct: totalIntakeKg > 0 ? Number(((processedKg / totalIntakeKg) * 100).toFixed(1)) : 0,
		totalLots: intake.cnt,
		activeLots: active.cnt,
		completedLots: completed.cnt
	};
}

export interface TotalFinalYield {
	producedKg: number;
	targetKg: number;
	pct: number;
	lotsContributing: number;
}

export function getTotalFinalYield(): TotalFinalYield {
	const db = getDb();
	const row = db
		.prepare(`SELECT COALESCE(SUM(s4.final_product_g / 1000.0), 0) as total, COUNT(*) as cnt FROM stage4_records s4 JOIN batches b ON b.id = s4.batch_id WHERE s4.final_product_g IS NOT NULL AND b.production_run_id = ${ACTIVE_RUN_ID_SQL}`)
		.get() as { total: number; cnt: number };
	const targetKg = 50;
	const producedKg = Number(Number(row.total).toFixed(2));
	return {
		producedKg,
		targetKg,
		pct: Number(((producedKg / targetKg) * 100).toFixed(1)),
		lotsContributing: row.cnt
	};
}

export interface EnhancedPipelineStage {
	stageNumber: number;
	activeCount: number;
	activeQtyKg: number;
	completedThroughCount: number;
	completedThroughOutputKg: number;
	kgProcessed: number;
	pctOfIntake: number;
	ethanolRecoveredL?: number;
	waterExtractL?: number;
}

export function getEnhancedPipelineSummary(totalIntakeKg: number): EnhancedPipelineStage[] {
	const db = getDb();

	const activeRows = db
		.prepare("SELECT current_stage, COUNT(*) as cnt, COALESCE(SUM(leaf_input_kg), 0) as qty FROM batches WHERE status IN ('In Progress','Pending Review') GROUP BY current_stage")
		.all() as { current_stage: number; cnt: number; qty: number }[];

	const finalizedRows = db
		.prepare("SELECT stage_number, COUNT(*) as cnt FROM batch_stages WHERE status = 'Finalized' GROUP BY stage_number")
		.all() as { stage_number: number; cnt: number }[];

	const s1Output = (db.prepare("SELECT COALESCE(SUM(s1.powder_output_kg), 0) as total FROM stage1_records s1 JOIN batch_stages bs ON bs.batch_id = s1.batch_id AND bs.stage_number = 1 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s2Output = (db.prepare("SELECT COALESCE(SUM(s2.crude_extract_wt_kg), 0) as total FROM stage2_records s2 JOIN batch_stages bs ON bs.batch_id = s2.batch_id AND bs.stage_number = 2 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s3Output = (db.prepare("SELECT COALESCE(SUM(s3.acidic_aq_vol_L), 0) as total FROM stage3_records s3 JOIN batch_stages bs ON bs.batch_id = s3.batch_id AND bs.stage_number = 3 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s4Output = (db.prepare("SELECT COALESCE(SUM(s4.final_product_g / 1000.0), 0) as total FROM stage4_records s4 JOIN batch_stages bs ON bs.batch_id = s4.batch_id AND bs.stage_number = 4 WHERE bs.status = 'Finalized'").get() as { total: number }).total;

	const outputMap: Record<number, number> = {
		1: s1Output, 2: s2Output, 3: s3Output, 4: s4Output
	};

	// Stage 2 extras
	const s2Extras = db
		.prepare("SELECT COALESCE(SUM(etoh_recovered_L), 0) as ethanol_recovered, COALESCE(SUM(water_filtrate_L), 0) as water_extract FROM stage2_records")
		.get() as { ethanol_recovered: number; water_extract: number };

	return [1, 2, 3, 4].map((n) => {
		const active = activeRows.find((r) => r.current_stage === n);
		const finalized = finalizedRows.find((r) => r.stage_number === n);
		const kgProcessed = Number((outputMap[n] ?? 0).toFixed(2));
		const result: EnhancedPipelineStage = {
			stageNumber: n,
			activeCount: active?.cnt ?? 0,
			activeQtyKg: Number((active?.qty ?? 0).toFixed(1)),
			completedThroughCount: finalized?.cnt ?? 0,
			completedThroughOutputKg: kgProcessed,
			kgProcessed,
			pctOfIntake: totalIntakeKg > 0 ? Number(((kgProcessed / totalIntakeKg) * 100).toFixed(1)) : 0
		};
		if (n === 2) {
			result.ethanolRecoveredL = Number(s2Extras.ethanol_recovered.toFixed(1));
			result.waterExtractL = Number(s2Extras.water_extract.toFixed(1));
		}
		return result;
	});
}

export interface OperationsPipelineMetrics {
	stageCounts: Record<number, number>;
	totalPowderKg: number;
	lotsExtracted: number;
	ethanolStockUsedL: number;
	ethanol70TotalL: number;
	filtrationOutputL: number;
	ethanolDistilledL: number;
	ethanolRecoveredL: number;
	ethanolLostL: number;
	extractTotalKg: number;
	reactorCount: number;
	limoneneRecoveredL: number;
	limoneneLostL: number;
	precipitateKg: number;
	finalProductKg: number;
	completedCount: number;
}

export interface CostBreakdown {
	rawMaterial: number;
	solvents: number;
	reagents: number;
	labor: number;
	utilities: number;
	total: number;
}

export function getCostBreakdown(): CostBreakdown {
	const db = getDb();
	const rows = db.prepare(`
		SELECT bc.cost_category, bc.item_name, COALESCE(SUM(bc.total_cost), 0) as total
		FROM batch_costs bc
		JOIN batches b ON b.id = bc.batch_id
		WHERE b.production_run_id = ${ACTIVE_RUN_ID_SQL}
		GROUP BY bc.cost_category, bc.item_name
	`).all() as { cost_category: string; item_name: string; total: number }[];

	let rawMaterial = 0, solvents = 0, reagents = 0, labor = 0, utilities = 0;
	for (const r of rows) {
		if (r.cost_category === 'Labor') labor += r.total;
		else if (r.cost_category === 'Utility') utilities += r.total;
		else if (r.cost_category === 'Material') {
			const name = r.item_name.toLowerCase();
			if (name.includes('leaf')) rawMaterial += r.total;
			else if (name.includes('ethanol') || name.includes('limonene')) solvents += r.total;
			else reagents += r.total; // NaOH, K₂CO₃, acetic acid
		}
	}
	const total = rawMaterial + solvents + reagents + labor + utilities;
	return { rawMaterial, solvents, reagents, labor, utilities, total };
}

export type TimePeriod = 'daily' | '7d' | '30d' | '3m' | 'yearly';
const ALL_PERIODS: TimePeriod[] = ['daily', '7d', '30d', '3m', 'yearly'];

function dateFilter(period: TimePeriod): string {
	switch (period) {
		case 'daily': return "date('now')";
		case '7d': return "date('now', '-7 days')";
		case '30d': return "date('now', '-30 days')";
		case '3m': return "date('now', '-3 months')";
		case 'yearly': return "date('now', '-1 year')";
	}
}

export function getCostBreakdownByPeriod(period: TimePeriod): CostBreakdown {
	const db = getDb();
	const rows = db.prepare(`
		SELECT bc.cost_category, bc.item_name, COALESCE(SUM(bc.total_cost), 0) as total
		FROM batch_costs bc
		WHERE bc.created_at >= ${dateFilter(period)}
		GROUP BY bc.cost_category, bc.item_name
	`).all() as { cost_category: string; item_name: string; total: number }[];

	let rawMaterial = 0, solvents = 0, reagents = 0, labor = 0, utilities = 0;
	for (const r of rows) {
		if (r.cost_category === 'Labor') labor += r.total;
		else if (r.cost_category === 'Utility') utilities += r.total;
		else if (r.cost_category === 'Material') {
			const name = r.item_name.toLowerCase();
			if (name.includes('leaf')) rawMaterial += r.total;
			else if (name.includes('ethanol') || name.includes('limonene')) solvents += r.total;
			else reagents += r.total;
		}
	}
	const total = rawMaterial + solvents + reagents + labor + utilities;
	return { rawMaterial, solvents, reagents, labor, utilities, total };
}

export function getAllCostBreakdownsByPeriod(): Record<TimePeriod, CostBreakdown> {
	return Object.fromEntries(ALL_PERIODS.map(p => [p, getCostBreakdownByPeriod(p)])) as Record<TimePeriod, CostBreakdown>;
}

export interface SolventTotals {
	ethanol_issued: number;
	ethanol_recovered: number;
	ethanol_lost: number;
	limonene_issued: number;
	limonene_recovered: number;
	limonene_lost: number;
}

export function getSolventTotalsByPeriod(period: TimePeriod): SolventTotals {
	const db = getDb();
	const cutoff = dateFilter(period);
	const ethanol = db
		.prepare(`SELECT COALESCE(SUM(s2.etoh_vol_L), 0) as issued, COALESCE(SUM(s2.etoh_recovered_L), 0) as recovered, COALESCE(SUM(s2.etoh_lost_L), 0) as lost FROM stage2_records s2 JOIN batches b ON b.id = s2.batch_id WHERE b.created_at >= ${cutoff}`)
		.get() as { issued: number; recovered: number; lost: number };
	const limonene = db
		.prepare(`SELECT COALESCE(SUM(s3.dlimo_vol_L), 0) as issued, COALESCE(SUM(s3.dlimo_recovered_L), 0) as recovered, COALESCE(SUM(s3.dlimo_lost_L), 0) as lost FROM stage3_records s3 JOIN batches b ON b.id = s3.batch_id WHERE b.created_at >= ${cutoff}`)
		.get() as { issued: number; recovered: number; lost: number };
	return {
		ethanol_issued: ethanol.issued,
		ethanol_recovered: ethanol.recovered,
		ethanol_lost: ethanol.lost,
		limonene_issued: limonene.issued,
		limonene_recovered: limonene.recovered,
		limonene_lost: limonene.lost
	};
}

export function getAllSolventTotalsByPeriod(): Record<TimePeriod, SolventTotals> {
	return Object.fromEntries(ALL_PERIODS.map(p => [p, getSolventTotalsByPeriod(p)])) as Record<TimePeriod, SolventTotals>;
}

export interface YieldByPeriod {
	producedKg: number;
	inputKg: number;
	yieldPct: number;
}

export function getYieldByPeriod(period: TimePeriod): YieldByPeriod {
	const db = getDb();
	const cutoff = dateFilter(period);
	const product = db
		.prepare(`SELECT COALESCE(SUM(s4.final_product_g / 1000.0), 0) as total FROM stage4_records s4 JOIN batches b ON b.id = s4.batch_id WHERE s4.final_product_g IS NOT NULL AND b.created_at >= ${cutoff}`)
		.get() as { total: number };
	const input = db
		.prepare(`SELECT COALESCE(SUM(b.leaf_input_kg), 0) as total FROM batches b WHERE b.status != 'Draft' AND b.created_at >= ${cutoff}`)
		.get() as { total: number };
	const producedKg = Number(Number(product.total).toFixed(2));
	const inputKg = Number(Number(input.total).toFixed(2));
	return {
		producedKg,
		inputKg,
		yieldPct: inputKg > 0 ? Number(((producedKg / inputKg) * 100).toFixed(1)) : 0
	};
}

export function getAllYieldByPeriod(): Record<TimePeriod, YieldByPeriod> {
	return Object.fromEntries(ALL_PERIODS.map(p => [p, getYieldByPeriod(p)])) as Record<TimePeriod, YieldByPeriod>;
}

export function getEthanolRecoveryTrend(limit = 7): { batch_number: string; recoveryPct: number; date: string; filtrationReturnL: number; extractWeightKg: number }[] {
	const db = getDb();
	const rows = db.prepare(`
		SELECT b.batch_number, s2.etoh_recovery_pct, date(b.created_at) as date,
			s2.filtrate_vol_L as filtration_return_l,
			s2.crude_extract_wt_kg
		FROM stage2_records s2
		JOIN batches b ON b.id = s2.batch_id
		WHERE s2.etoh_recovery_pct IS NOT NULL AND b.production_run_id = ${ACTIVE_RUN_ID_SQL}
		ORDER BY b.created_at DESC LIMIT ?
	`).all(limit) as { batch_number: string; etoh_recovery_pct: number; date: string; filtration_return_l: number; crude_extract_wt_kg: number }[];
	return rows.reverse().map(r => ({
		batch_number: r.batch_number,
		recoveryPct: Number(r.etoh_recovery_pct.toFixed(1)),
		date: r.date,
		filtrationReturnL: Number((r.filtration_return_l ?? 0).toFixed(1)),
		extractWeightKg: Number((r.crude_extract_wt_kg ?? 0).toFixed(2))
	}));
}

export function getDailyCostTrend(days = 7): { day: string; total: number }[] {
	const db = getDb();
	return db.prepare(`
		WITH RECURSIVE dates(d) AS (
			VALUES(date('now', '-${days - 1} days'))
			UNION ALL
			SELECT date(d, '+1 day') FROM dates WHERE d < date('now')
		)
		SELECT dates.d as day, COALESCE(SUM(bc.total_cost), 0) as total
		FROM dates
		LEFT JOIN batch_costs bc ON date(bc.created_at) = dates.d AND bc.batch_id IN (SELECT id FROM batches WHERE production_run_id = ${ACTIVE_RUN_ID_SQL})
		GROUP BY dates.d
		ORDER BY dates.d
	`).all() as { day: string; total: number }[];
}

export function getBatchYieldTrend(limit = 7): { batch_number: string; yieldPct: number; producedKg: number; date: string }[] {
	const db = getDb();
	const rows = db.prepare(`
		SELECT b.batch_number,
			CASE WHEN b.leaf_input_kg > 0
				THEN (s4.final_product_g / 1000.0 / b.leaf_input_kg * 100)
				ELSE 0 END as yield_pct,
			s4.final_product_g / 1000.0 as produced_kg,
			date(b.created_at) as date
		FROM stage4_records s4
		JOIN batches b ON b.id = s4.batch_id
		WHERE s4.final_product_g IS NOT NULL AND b.production_run_id = ${ACTIVE_RUN_ID_SQL}
		ORDER BY b.created_at DESC LIMIT ?
	`).all(limit) as { batch_number: string; yield_pct: number; produced_kg: number; date: string }[];
	return rows.reverse().map(r => ({
		batch_number: r.batch_number,
		yieldPct: Number(r.yield_pct.toFixed(2)),
		producedKg: Number(r.produced_kg.toFixed(2)),
		date: r.date
	}));
}

export function getDailyOpCost(): number {
	const db = getDb();
	const row = db.prepare(`
		SELECT COALESCE(SUM(total_cost), 0) as total,
			COALESCE(julianday('now') - julianday(MIN(b.created_at)) + 1, 1) as days
		FROM batch_costs bc
		JOIN batches b ON b.id = bc.batch_id
		WHERE b.production_run_id = ${ACTIVE_RUN_ID_SQL}
	`).get() as { total: number; days: number };
	return row.days > 0 ? row.total / row.days : 0;
}

export function getAvgCostPerKg(): number {
	const db = getDb();
	// Only count costs from batches that have a final product weight (completed through stage 4)
	const completedBatchIds = `SELECT s4.batch_id FROM stage4_records s4 JOIN batches b ON b.id = s4.batch_id WHERE s4.final_product_g IS NOT NULL AND b.production_run_id = ${ACTIVE_RUN_ID_SQL}`;
	const costs = db.prepare(`SELECT COALESCE(SUM(bc.total_cost), 0) as total FROM batch_costs bc WHERE bc.batch_id IN (${completedBatchIds})`).get() as { total: number };
	const product = db.prepare(`SELECT COALESCE(SUM(s4.final_product_g / 1000.0), 0) as total FROM stage4_records s4 JOIN batches b ON b.id = s4.batch_id WHERE s4.final_product_g IS NOT NULL AND b.production_run_id = ${ACTIVE_RUN_ID_SQL}`).get() as { total: number };
	return product.total > 0 ? costs.total / product.total : 0;
}

export function getOperationsPipelineMetrics(): OperationsPipelineMetrics {
	const db = getDb();

	const finalizedRows = db
		.prepare(`SELECT bs.stage_number, COUNT(*) as cnt FROM batch_stages bs JOIN batches b ON b.id = bs.batch_id WHERE bs.status = 'Finalized' AND b.production_run_id = ${ACTIVE_RUN_ID_SQL} GROUP BY bs.stage_number`)
		.all() as { stage_number: number; cnt: number }[];
	const stageCounts: Record<number, number> = {};
	for (const r of finalizedRows) stageCounts[r.stage_number] = r.cnt;

	const s1 = db.prepare(`SELECT COALESCE(SUM(s1.powder_output_kg), 0) as total FROM stage1_records s1 JOIN batches b ON b.id = s1.batch_id WHERE b.production_run_id = ${ACTIVE_RUN_ID_SQL}`).get() as { total: number };

	const s2 = db.prepare(`
		SELECT COUNT(*) as batch_count,
			COALESCE(SUM(s2.etoh_vol_L), 0) as ethanol_used,
			COALESCE(SUM(s2.filtrate_vol_L), 0) as filtration_output,
			COALESCE(SUM(s2.etoh_recovered_L), 0) as recovered,
			COALESCE(SUM(s2.etoh_lost_L), 0) as lost,
			COALESCE(SUM(s2.crude_extract_wt_kg), 0) as extract_total
		FROM stage2_records s2
		JOIN batches b ON b.id = s2.batch_id
		WHERE b.production_run_id = ${ACTIVE_RUN_ID_SQL}
	`).get() as any;

	const s3 = db.prepare(`SELECT COALESCE(SUM(s3.dlimo_recovered_L), 0) as lim_recovered, COALESCE(SUM(s3.dlimo_lost_L), 0) as lim_lost FROM stage3_records s3 JOIN batches b ON b.id = s3.batch_id WHERE b.production_run_id = ${ACTIVE_RUN_ID_SQL}`).get() as any;

	const s4 = db.prepare(`SELECT COALESCE(SUM(s4.wet_precipitate_g / 1000.0), 0) as precipitate_total, COALESCE(SUM(s4.final_product_g / 1000.0), 0) as final_total FROM stage4_records s4 JOIN batches b ON b.id = s4.batch_id WHERE b.production_run_id = ${ACTIVE_RUN_ID_SQL}`).get() as any;

	const completedCount = (db.prepare(`SELECT COUNT(*) as cnt FROM batches WHERE status = 'Completed' AND production_run_id = ${ACTIVE_RUN_ID_SQL}`).get() as { cnt: number }).cnt;

	return {
		stageCounts,
		totalPowderKg: Number(s1.total.toFixed(1)),
		lotsExtracted: s2.batch_count,
		ethanolStockUsedL: Number(s2.ethanol_used.toFixed(1)),
		ethanol70TotalL: 0,
		filtrationOutputL: Number(s2.filtration_output.toFixed(1)),
		ethanolDistilledL: 0,
		ethanolRecoveredL: Number(s2.recovered.toFixed(1)),
		ethanolLostL: Number(s2.lost.toFixed(1)),
		extractTotalKg: Number(s2.extract_total.toFixed(1)),
		reactorCount: 0,
		limoneneRecoveredL: Number(s3.lim_recovered.toFixed(1)),
		limoneneLostL: Number(s3.lim_lost.toFixed(1)),
		precipitateKg: Number(s4.precipitate_total.toFixed(1)),
		finalProductKg: Number(s4.final_total.toFixed(2)),
		completedCount
	};
}

// ============================================================
// Production Run Intelligence
// ============================================================

export function getProductionRuns(): ProductionRun[] {
	const db = getDb();
	return db.prepare('SELECT * FROM production_runs ORDER BY created_at DESC').all() as ProductionRun[];
}

export function getProductionRunSummary(runId: number): ProductionRunSummary | null {
	const db = getDb();
	const run = db.prepare('SELECT * FROM production_runs WHERE id = ?').get(runId) as ProductionRun | undefined;
	if (!run) return null;

	const batchStats = db.prepare(`
		SELECT COUNT(*) as total,
			SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
			SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
			COALESCE(SUM(leaf_input_kg), 0) as total_input
		FROM batches WHERE production_run_id = ?
	`).get(runId) as { total: number; completed: number; in_progress: number; total_input: number };

	const produced = db.prepare(`
		SELECT COALESCE(SUM(s4.final_product_g / 1000.0), 0) as total
		FROM stage4_records s4
		JOIN batches b ON b.id = s4.batch_id
		WHERE b.production_run_id = ? AND s4.final_product_g IS NOT NULL
	`).get(runId) as { total: number };

	const costs = db.prepare(`
		SELECT COALESCE(SUM(bc.total_cost), 0) as total
		FROM batch_costs bc
		JOIN batches b ON b.id = bc.batch_id
		WHERE b.production_run_id = ?
	`).get(runId) as { total: number };

	const ethanol = db.prepare(`
		SELECT COALESCE(AVG(s2.etoh_recovery_pct), 0) as avg_recovery
		FROM stage2_records s2
		JOIN batches b ON b.id = s2.batch_id
		WHERE b.production_run_id = ? AND s2.etoh_recovery_pct IS NOT NULL
	`).get(runId) as { avg_recovery: number };

	const totalProducedKg = Number(produced.total);
	const totalCost = Number(costs.total);

	return {
		run,
		totalBatches: batchStats.total,
		completedBatches: batchStats.completed,
		inProgressBatches: batchStats.in_progress,
		totalInputKg: Number(batchStats.total_input),
		totalProducedKg,
		overallYieldPct: batchStats.total_input > 0 ? Number(((totalProducedKg / batchStats.total_input) * 100).toFixed(2)) : 0,
		totalCost,
		costPerKg: totalProducedKg > 0 ? Number((totalCost / totalProducedKg).toFixed(2)) : 0,
		avgEthanolRecovery: Number(Number(ethanol.avg_recovery).toFixed(1))
	};
}

export function getRunBatchCosts(runId: number): BatchCostSummary[] {
	const db = getDb();
	return db.prepare(`
		SELECT b.id as batch_id, b.batch_number, b.status, b.supplier_lot,
			COALESCE(SUM(bc.total_cost), 0) as totalCost,
			s4.final_product_g / 1000.0 as final_product_kg
		FROM batches b
		LEFT JOIN batch_costs bc ON bc.batch_id = b.id
		LEFT JOIN stage4_records s4 ON s4.batch_id = b.id
		WHERE b.production_run_id = ?
		GROUP BY b.id, b.supplier_lot
		ORDER BY b.batch_number
	`).all(runId).map((r: any) => ({
		batch_id: r.batch_id,
		batch_number: r.batch_number,
		status: r.status,
		supplier_lot: r.supplier_lot ?? null,
		totalCost: Number(r.totalCost),
		costPerKg: r.final_product_kg ? Number((r.totalCost / r.final_product_kg).toFixed(2)) : null,
		final_product_g: r.final_product_kg ? r.final_product_kg * 1000 : null
	})) as BatchCostSummary[];
}

export interface RunCostAggregates {
	totalCost: number;
	avgCostPerBatch: number;
	projectedTotal: number;
	costByCategory: { category: string; total: number }[];
}

export function getRunCostAggregates(runId: number): RunCostAggregates {
	const db = getDb();
	const totalRow = db.prepare(`
		SELECT COALESCE(SUM(bc.total_cost), 0) as total
		FROM batch_costs bc JOIN batches b ON b.id = bc.batch_id
		WHERE b.production_run_id = ?
	`).get(runId) as { total: number };

	const batchesWithCosts = db.prepare(`
		SELECT COUNT(DISTINCT bc.batch_id) as cnt
		FROM batch_costs bc JOIN batches b ON b.id = bc.batch_id
		WHERE b.production_run_id = ?
	`).get(runId) as { cnt: number };

	const totalBatches = db.prepare(`
		SELECT COUNT(*) as cnt FROM batches WHERE production_run_id = ?
	`).get(runId) as { cnt: number };

	const categories = db.prepare(`
		SELECT bc.cost_category as category, COALESCE(SUM(bc.total_cost), 0) as total
		FROM batch_costs bc JOIN batches b ON b.id = bc.batch_id
		WHERE b.production_run_id = ?
		GROUP BY bc.cost_category
		ORDER BY total DESC
	`).all(runId) as { category: string; total: number }[];

	const totalCost = Number(totalRow.total);
	const avgCostPerBatch = batchesWithCosts.cnt > 0 ? totalCost / batchesWithCosts.cnt : 0;
	const projectedTotal = batchesWithCosts.cnt > 0 ? avgCostPerBatch * totalBatches.cnt : 0;

	return {
		totalCost,
		avgCostPerBatch: Number(avgCostPerBatch.toFixed(2)),
		projectedTotal: Number(projectedTotal.toFixed(2)),
		costByCategory: categories
	};
}

export interface BatchCostSegment {
	batchId: number;
	batchNumber: string;
	supplierLot: string | null;
	leaf: number;
	solvent: number;
	chemicals: number;
	labor: number;
	electricity: number;
	testing: number;
}

export function getBatchCostBreakdown(runId: number): BatchCostSegment[] {
	const db = getDb();
	return db.prepare(`
		SELECT b.id as batch_id, b.batch_number, b.supplier_lot,
			COALESCE(SUM(CASE WHEN bc.item_name = 'Raw leaf' THEN bc.total_cost END), 0) as leaf,
			COALESCE(SUM(CASE WHEN bc.item_name IN ('Ethanol loss', 'D-Limonene loss') THEN bc.total_cost END), 0) as solvent,
			COALESCE(SUM(CASE WHEN bc.item_name IN ('Acetic acid', 'NaOH', 'K₂CO₃') THEN bc.total_cost END), 0) as chemicals,
			COALESCE(SUM(CASE WHEN bc.item_name = 'Labor' THEN bc.total_cost END), 0) as labor,
			COALESCE(SUM(CASE WHEN bc.item_name = 'Electricity' THEN bc.total_cost END), 0) as electricity,
			COALESCE(SUM(CASE WHEN bc.item_name = 'Testing' THEN bc.total_cost END), 0) as testing
		FROM batches b
		LEFT JOIN batch_costs bc ON bc.batch_id = b.id
		WHERE b.production_run_id = ?
		GROUP BY b.id
		ORDER BY b.batch_number
	`).all(runId).map((r: any) => ({
		batchId: r.batch_id,
		batchNumber: r.batch_number,
		supplierLot: r.supplier_lot ?? null,
		leaf: Number(r.leaf),
		solvent: Number(r.solvent),
		chemicals: Number(r.chemicals),
		labor: Number(r.labor),
		electricity: Number(r.electricity),
		testing: Number(r.testing)
	})) as BatchCostSegment[];
}

export function getRunEthanolBreakdown(runId: number): BatchEthanolSummary[] {
	const db = getDb();
	return db.prepare(`
		SELECT b.id as batch_id, b.batch_number, b.status, b.supplier_lot,
			s2.etoh_vol_L as ethanol_issued_l,
			s2.etoh_recovered_L as ethanol_recovered_l,
			s2.etoh_lost_L as ethanol_lost_l,
			s2.etoh_recovery_pct as recovery_pct,
			s2.filtrate_vol_L as filtration_return_l,
			CASE WHEN s2.crude_extract_wt_kg > 0 AND s2.filtrate_vol_L > 0
				THEN (s2.crude_extract_wt_kg / s2.filtrate_vol_L * 1000) ELSE NULL END as concentration_gl
		FROM batches b
		LEFT JOIN stage2_records s2 ON s2.batch_id = b.id
		WHERE b.production_run_id = ?
		ORDER BY b.batch_number
	`).all(runId) as BatchEthanolSummary[];
}

export interface RunEthanolAggregates {
	totalIssued: number;
	totalRecovered: number;
	avgRecovery: number;
	bestBatch: { batch_number: string; recovery_pct: number } | null;
	worstBatch: { batch_number: string; recovery_pct: number } | null;
	totalLoss: number;
}

export function getRunEthanolAggregates(runId: number): RunEthanolAggregates {
	const db = getDb();
	const totals = db.prepare(`
		SELECT COALESCE(SUM(s2.etoh_vol_L), 0) as issued,
			COALESCE(SUM(s2.etoh_recovered_L), 0) as recovered,
			COALESCE(AVG(s2.etoh_recovery_pct), 0) as avg_recovery,
			COALESCE(SUM(s2.etoh_lost_L), 0) as total_loss
		FROM stage2_records s2 JOIN batches b ON b.id = s2.batch_id
		WHERE b.production_run_id = ? AND s2.etoh_recovery_pct IS NOT NULL
	`).get(runId) as { issued: number; recovered: number; avg_recovery: number; total_loss: number };

	const best = db.prepare(`
		SELECT b.batch_number, s2.etoh_recovery_pct
		FROM stage2_records s2 JOIN batches b ON b.id = s2.batch_id
		WHERE b.production_run_id = ? AND s2.etoh_recovery_pct IS NOT NULL
		ORDER BY s2.etoh_recovery_pct DESC LIMIT 1
	`).get(runId) as { batch_number: string; etoh_recovery_pct: number } | undefined;

	const worst = db.prepare(`
		SELECT b.batch_number, s2.etoh_recovery_pct
		FROM stage2_records s2 JOIN batches b ON b.id = s2.batch_id
		WHERE b.production_run_id = ? AND s2.etoh_recovery_pct IS NOT NULL
		ORDER BY s2.etoh_recovery_pct ASC LIMIT 1
	`).get(runId) as { batch_number: string; etoh_recovery_pct: number } | undefined;

	return {
		totalIssued: Number(totals.issued),
		totalRecovered: Number(totals.recovered),
		avgRecovery: Number(Number(totals.avg_recovery).toFixed(1)),
		bestBatch: best ? { batch_number: best.batch_number, recovery_pct: Number(best.etoh_recovery_pct) } : null,
		worstBatch: worst ? { batch_number: worst.batch_number, recovery_pct: Number(worst.etoh_recovery_pct) } : null,
		totalLoss: Number(totals.total_loss)
	};
}

export function getRunYieldBreakdown(runId: number): BatchYieldSummary[] {
	const db = getDb();
	return db.prepare(`
		SELECT b.id as batch_id, b.batch_number, b.status, b.supplier_lot, b.leaf_input_kg,
			s4.final_product_g,
			s4.overall_yield_pct,
			lr.hplc_purity_pct,
			lr.mitragynine_pct,
			COALESCE(dev.cnt, 0) as deviation_count
		FROM batches b
		LEFT JOIN stage4_records s4 ON s4.batch_id = b.id
		LEFT JOIN (SELECT batch_id, hplc_purity_pct, mitragynine_pct FROM lab_results WHERE test_type = 'HPLC' AND status = 'Completed') lr ON lr.batch_id = b.id
		LEFT JOIN (SELECT batch_id, COUNT(*) as cnt FROM deviations GROUP BY batch_id) dev ON dev.batch_id = b.id
		WHERE b.production_run_id = ?
		ORDER BY b.batch_number
	`).all(runId) as BatchYieldSummary[];
}

export interface RunYieldAggregates {
	totalProduced: number;
	overallYield: number;
	bestBatch: { batch_number: string; yield_pct: number } | null;
	worstBatch: { batch_number: string; yield_pct: number } | null;
	avgPurity: number | null;
	projectedFinal: number;
	totalDeviations: number;
}

export function getRunYieldAggregates(runId: number): RunYieldAggregates {
	const db = getDb();
	const totals = db.prepare(`
		SELECT COALESCE(SUM(s4.final_product_g / 1000.0), 0) as produced,
			COALESCE(SUM(b.leaf_input_kg), 0) as input
		FROM batches b
		LEFT JOIN stage4_records s4 ON s4.batch_id = b.id
		WHERE b.production_run_id = ?
	`).get(runId) as { produced: number; input: number };

	const best = db.prepare(`
		SELECT b.batch_number, s4.overall_yield_pct
		FROM stage4_records s4 JOIN batches b ON b.id = s4.batch_id
		WHERE b.production_run_id = ? AND s4.overall_yield_pct IS NOT NULL
		ORDER BY s4.overall_yield_pct DESC LIMIT 1
	`).get(runId) as { batch_number: string; overall_yield_pct: number } | undefined;

	const worst = db.prepare(`
		SELECT b.batch_number, s4.overall_yield_pct
		FROM stage4_records s4 JOIN batches b ON b.id = s4.batch_id
		WHERE b.production_run_id = ? AND s4.overall_yield_pct IS NOT NULL
		ORDER BY s4.overall_yield_pct ASC LIMIT 1
	`).get(runId) as { batch_number: string; overall_yield_pct: number } | undefined;

	const purity = db.prepare(`
		SELECT AVG(lr.hplc_purity_pct) as avg_purity
		FROM lab_results lr JOIN batches b ON b.id = lr.batch_id
		WHERE b.production_run_id = ? AND lr.test_type = 'HPLC' AND lr.status = 'Completed'
	`).get(runId) as { avg_purity: number | null };

	const devCount = db.prepare(`
		SELECT COUNT(*) as cnt FROM deviations d JOIN batches b ON b.id = d.batch_id WHERE b.production_run_id = ?
	`).get(runId) as { cnt: number };

	// Projected: avg produced per completed batch × total batches in run
	const completedBatchAvg = db.prepare(`
		SELECT AVG(s4.final_product_g / 1000.0) as avg_kg, COUNT(*) as cnt
		FROM stage4_records s4 JOIN batches b ON b.id = s4.batch_id
		WHERE b.production_run_id = ? AND s4.final_product_g IS NOT NULL
	`).get(runId) as { avg_kg: number | null; cnt: number };

	const totalBatches = db.prepare(`SELECT COUNT(*) as cnt FROM batches WHERE production_run_id = ?`).get(runId) as { cnt: number };
	const projectedFinal = completedBatchAvg.avg_kg ? completedBatchAvg.avg_kg * totalBatches.cnt : 0;

	return {
		totalProduced: Number(totals.produced),
		overallYield: totals.input > 0 ? Number(((totals.produced / totals.input) * 100).toFixed(2)) : 0,
		bestBatch: best ? { batch_number: best.batch_number, yield_pct: Number(best.overall_yield_pct) } : null,
		worstBatch: worst ? { batch_number: worst.batch_number, yield_pct: Number(worst.overall_yield_pct) } : null,
		avgPurity: purity.avg_purity ? Number(Number(purity.avg_purity).toFixed(1)) : null,
		projectedFinal: Number(projectedFinal.toFixed(2)),
		totalDeviations: devCount.cnt
	};
}

export interface BatchDetailData {
	batch: Batch;
	stages: BatchStage[];
	stage1: any;
	stage2: any;
	stage3: any;
	stage4: any;
	costs: { category: string; total: number }[];
	totalCost: number;
	costPerKg: number | null;
	deviations: Deviation[];
	labResults: LabResult[];
	runAvgYield: number | null;
	runAvgCostPerKg: number | null;
	runAvgRecovery: number | null;
}

export function getBatchDetailForDrawer(batchId: number, runId: number): BatchDetailData | null {
	const db = getDb();
	const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId) as Batch | undefined;
	if (!batch) return null;

	const stages = db.prepare('SELECT * FROM batch_stages WHERE batch_id = ? ORDER BY stage_number').all(batchId) as BatchStage[];
	const stage1 = db.prepare('SELECT * FROM stage1_records WHERE batch_id = ?').get(batchId) || null;
	const stage2 = db.prepare('SELECT * FROM stage2_records WHERE batch_id = ?').get(batchId) || null;
	const stage3 = db.prepare('SELECT * FROM stage3_records WHERE batch_id = ?').get(batchId) || null;
	const stage4 = db.prepare('SELECT * FROM stage4_records WHERE batch_id = ?').get(batchId) || null;

	const costsByCategory = db.prepare(`
		SELECT cost_category as category, COALESCE(SUM(total_cost), 0) as total
		FROM batch_costs WHERE batch_id = ? GROUP BY cost_category ORDER BY total DESC
	`).all(batchId) as { category: string; total: number }[];
	const totalCost = costsByCategory.reduce((s, c) => s + c.total, 0);
	const s4 = stage4 as any;
	const finalProductKg = s4?.final_product_g ? s4.final_product_g / 1000.0 : null;
	const costPerKg = finalProductKg ? Number((totalCost / finalProductKg).toFixed(2)) : null;

	const deviations = db.prepare('SELECT * FROM deviations WHERE batch_id = ? ORDER BY created_at DESC').all(batchId) as Deviation[];
	const labResults = db.prepare('SELECT * FROM lab_results WHERE batch_id = ? ORDER BY created_at DESC').all(batchId) as LabResult[];

	// Run averages for comparison
	const runAvgYield = db.prepare(`
		SELECT AVG(s4.overall_yield_pct) as avg FROM stage4_records s4
		JOIN batches b ON b.id = s4.batch_id WHERE b.production_run_id = ? AND s4.overall_yield_pct IS NOT NULL
	`).get(runId) as { avg: number | null };

	const runAvgCost = db.prepare(`
		SELECT AVG(bc_totals.total) as avg FROM (
			SELECT SUM(bc.total_cost) as total FROM batch_costs bc
			JOIN batches b ON b.id = bc.batch_id WHERE b.production_run_id = ? GROUP BY bc.batch_id
		) bc_totals
	`).get(runId) as { avg: number | null };

	const runAvgRecovery = db.prepare(`
		SELECT AVG(s2.etoh_recovery_pct) as avg FROM stage2_records s2
		JOIN batches b ON b.id = s2.batch_id WHERE b.production_run_id = ? AND s2.etoh_recovery_pct IS NOT NULL
	`).get(runId) as { avg: number | null };

	// Compute run avg cost per kg
	const runCostPerKg = (() => {
		const r = db.prepare(`
			SELECT COALESCE(SUM(bc.total_cost), 0) as cost, COALESCE(SUM(s4.final_product_g / 1000.0), 0) as kg
			FROM batch_costs bc JOIN batches b ON b.id = bc.batch_id
			LEFT JOIN stage4_records s4 ON s4.batch_id = b.id
			WHERE b.production_run_id = ? AND s4.final_product_g IS NOT NULL
		`).get(runId) as { cost: number; kg: number };
		return r.kg > 0 ? Number((r.cost / r.kg).toFixed(2)) : null;
	})();

	return {
		batch,
		stages,
		stage1,
		stage2,
		stage3,
		stage4,
		costs: costsByCategory,
		totalCost,
		costPerKg,
		deviations,
		labResults,
		runAvgYield: runAvgYield.avg ? Number(Number(runAvgYield.avg).toFixed(2)) : null,
		runAvgCostPerKg: runCostPerKg,
		runAvgRecovery: runAvgRecovery.avg ? Number(Number(runAvgRecovery.avg).toFixed(1)) : null
	};
}

// ============================================================
// Run History, Anomalies, Quality Correlation
// ============================================================

export function getRunHistorySummaries(): RunHistorySummary[] {
	const db = getDb();
	const runs = db.prepare('SELECT * FROM production_runs ORDER BY started_at DESC').all() as ProductionRun[];

	return runs.map(run => {
		const batchStats = db.prepare(`
			SELECT COUNT(*) as total,
				SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
				COALESCE(SUM(leaf_input_kg), 0) as total_input
			FROM batches WHERE production_run_id = ?
		`).get(run.id) as { total: number; completed: number; total_input: number };

		const produced = db.prepare(`
			SELECT COALESCE(SUM(s4.final_product_g / 1000.0), 0) as total
			FROM stage4_records s4 JOIN batches b ON b.id = s4.batch_id
			WHERE b.production_run_id = ? AND s4.final_product_g IS NOT NULL
		`).get(run.id) as { total: number };

		const costs = db.prepare(`
			SELECT COALESCE(SUM(bc.total_cost), 0) as total
			FROM batch_costs bc JOIN batches b ON b.id = bc.batch_id
			WHERE b.production_run_id = ?
		`).get(run.id) as { total: number };

		const ethanol = db.prepare(`
			SELECT COALESCE(AVG(s2.etoh_recovery_pct), 0) as avg_recovery,
				COALESCE(SUM(s2.etoh_vol_L), 0) as total_issued,
				COALESCE(SUM(s2.etoh_recovered_L), 0) as total_recovered,
				COALESCE(SUM(s2.etoh_lost_L), 0) as total_lost
			FROM stage2_records s2 JOIN batches b ON b.id = s2.batch_id
			WHERE b.production_run_id = ? AND s2.etoh_recovery_pct IS NOT NULL
		`).get(run.id) as { avg_recovery: number; total_issued: number; total_recovered: number; total_lost: number };

		const purity = db.prepare(`
			SELECT AVG(lr.hplc_purity_pct) as avg_purity
			FROM lab_results lr JOIN batches b ON b.id = lr.batch_id
			WHERE b.production_run_id = ? AND lr.test_type = 'HPLC' AND lr.status = 'Completed'
		`).get(run.id) as { avg_purity: number | null };

		const devCount = db.prepare(`
			SELECT COUNT(*) as cnt FROM deviations d JOIN batches b ON b.id = d.batch_id WHERE b.production_run_id = ?
		`).get(run.id) as { cnt: number };

		const totalProducedKg = Number(produced.total);
		const totalCost = Number(costs.total);
		const completedBatches = Number(batchStats.completed);
		const totalBatches = Number(batchStats.total);

		return {
			runId: run.id,
			runNumber: run.run_number,
			status: run.status,
			startedAt: run.started_at,
			completedAt: run.completed_at,
			totalBatches,
			completedBatches,
			totalInputKg: Number(batchStats.total_input),
			totalProducedKg,
			overallYieldPct: batchStats.total_input > 0 ? Number(((totalProducedKg / batchStats.total_input) * 100).toFixed(2)) : 0,
			totalCost,
			costPerKg: totalProducedKg > 0 ? Number((totalCost / totalProducedKg).toFixed(2)) : 0,
			avgCostPerBatch: completedBatches > 0 ? Number((totalCost / completedBatches).toFixed(2)) : (totalBatches > 0 ? Number((totalCost / totalBatches).toFixed(2)) : 0),
			avgEthanolRecovery: Number(Number(ethanol.avg_recovery).toFixed(1)),
			totalEthanolIssued: Number(ethanol.total_issued),
			totalEthanolRecovered: Number(ethanol.total_recovered),
			totalEthanolLost: Number(ethanol.total_lost),
			avgPurity: purity.avg_purity ? Number(Number(purity.avg_purity).toFixed(1)) : null,
			deviationCount: devCount.cnt
		};
	});
}

export function getBatchAnomalies(runId: number): AnomalyFlag[] {
	const db = getDb();

	// Get per-batch metrics for this run
	const rows = db.prepare(`
		SELECT b.id as batch_id, b.batch_number,
			s2.etoh_recovery_pct as recovery,
			s4.overall_yield_pct as yield,
			COALESCE(cost_agg.total_cost, 0) as cost,
			lr.hplc_purity_pct as purity
		FROM batches b
		LEFT JOIN stage2_records s2 ON s2.batch_id = b.id
		LEFT JOIN stage4_records s4 ON s4.batch_id = b.id
		LEFT JOIN (SELECT batch_id, SUM(total_cost) as total_cost FROM batch_costs GROUP BY batch_id) cost_agg ON cost_agg.batch_id = b.id
		LEFT JOIN (SELECT batch_id, hplc_purity_pct FROM lab_results WHERE test_type = 'HPLC' AND status = 'Completed') lr ON lr.batch_id = b.id
		WHERE b.production_run_id = ?
	`).all(runId) as { batch_id: number; batch_number: string; recovery: number | null; yield: number | null; cost: number; purity: number | null }[];

	if (rows.length < 3) return []; // need at least 3 batches for meaningful stats

	const flags: AnomalyFlag[] = [];
	const metrics: { key: string; extract: (r: typeof rows[0]) => number | null }[] = [
		{ key: 'recovery', extract: r => r.recovery },
		{ key: 'yield', extract: r => r.yield },
		{ key: 'cost', extract: r => r.cost > 0 ? r.cost : null },
		{ key: 'purity', extract: r => r.purity }
	];

	for (const m of metrics) {
		const values = rows.map(r => m.extract(r)).filter((v): v is number => v !== null);
		if (values.length < 3) continue;

		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
		const stddev = Math.sqrt(variance);
		if (stddev < 0.001) continue; // no variation

		for (const row of rows) {
			const val = m.extract(row);
			if (val === null) continue;
			const dev = Math.abs(val - mean) / stddev;
			if (dev > 1.5) {
				flags.push({
					batchId: row.batch_id,
					batchNumber: row.batch_number,
					metric: m.key,
					value: Number(val.toFixed(2)),
					runAvg: Number(mean.toFixed(2)),
					deviation: Number(dev.toFixed(2)),
					severity: dev > 2 ? 'critical' : 'warning'
				});
			}
		}
	}

	// Sort by severity (critical first) then deviation magnitude
	flags.sort((a, b) => {
		if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
		return b.deviation - a.deviation;
	});

	return flags;
}

export function getQualityCorrelation(runId: number): QualityCorrelationPoint[] {
	const db = getDb();
	return db.prepare(`
		SELECT b.id as batchId, b.batch_number as batchNumber, b.supplier,
			s4.overall_yield_pct as yieldPct,
			lr.hplc_purity_pct as purityPct,
			lr.mitragynine_pct as mitragynine,
			lr.hydroxy_mitragynine_pct as hydroxymitragynine,
			lr.paynantheine_pct as paynantheine,
			lr.speciogynine_pct as speciogynine,
			lr.speciociliatine_pct as speciociliatine
		FROM batches b
		JOIN stage4_records s4 ON s4.batch_id = b.id
		JOIN lab_results lr ON lr.batch_id = b.id AND lr.test_type = 'HPLC' AND lr.status = 'Completed'
		WHERE b.production_run_id = ? AND s4.overall_yield_pct IS NOT NULL
		ORDER BY b.batch_number
	`).all(runId) as QualityCorrelationPoint[];
}
