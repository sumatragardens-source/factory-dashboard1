import { getDb } from '../db';
import type { Batch, BatchStage, Deviation, Approval, Machine, LabResult, ProductionRun, ProductionRunSummary, BatchCostSummary, BatchEthanolSummary, BatchYieldSummary } from '$lib/domain/types';
import { getBatchCosts } from './costingRepo';
import { calculateTotalBatchCost, calculateCostPerKg } from '$lib/calculations/costing';

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
		.prepare('SELECT AVG(recovery_rate_pct) as avg_rate FROM stage2_records WHERE recovery_rate_pct IS NOT NULL')
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
		.prepare(`SELECT COALESCE(SUM(ethanol_stock_used_l), 0) as issued, COALESCE(SUM(total_ethanol_recovered_l), 0) as recovered, COALESCE(SUM(total_ethanol_loss_l), 0) as lost FROM stage2_records`)
		.get() as { issued: number; recovered: number; lost: number };
	const limonene = db
		.prepare(`SELECT COALESCE(SUM(limonene_volume_l), 0) as issued, COALESCE(SUM(limonene_recovered_l), 0) as recovered, COALESCE(SUM(limonene_loss_l), 0) as lost FROM stage3_records`)
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
		.prepare('SELECT COALESCE(SUM(s4.final_product_weight_kg), 0) as total FROM stage4_records s4 WHERE s4.final_product_weight_kg IS NOT NULL')
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
	const s1Output = (db.prepare("SELECT COALESCE(SUM(s1.powder_weight_kg), 0) as total FROM stage1_records s1 JOIN batch_stages bs ON bs.batch_id = s1.batch_id AND bs.stage_number = 1 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s2Output = (db.prepare("SELECT COALESCE(SUM(s2.extract_weight_kg), 0) as total FROM stage2_records s2 JOIN batch_stages bs ON bs.batch_id = s2.batch_id AND bs.stage_number = 4 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s3Output = (db.prepare("SELECT COALESCE(SUM(s3.alkaloid_precipitate_kg), 0) as total FROM stage3_records s3 JOIN batch_stages bs ON bs.batch_id = s3.batch_id AND bs.stage_number = 5 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s4Output = (db.prepare("SELECT COALESCE(SUM(s4.final_product_weight_kg), 0) as total FROM stage4_records s4 JOIN batch_stages bs ON bs.batch_id = s4.batch_id AND bs.stage_number = 8 WHERE bs.status = 'Finalized'").get() as { total: number }).total;

	// Map workflow stage → output kg from the relevant record table
	// Stage 1=powder, 2-4=extract, 5=precipitate, 6-8=final product
	const outputByStage: Record<number, number> = {
		1: s1Output, 2: s2Output, 3: s2Output, 4: s2Output,
		5: s3Output, 6: s4Output, 7: s4Output, 8: s4Output
	};

	return [1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
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
	powder_weight_kg: number | null;
	extract_weight_kg: number | null;
	reactor_count: number;
	ethanol_stock_used_l: number | null;
	ethanol_70_volume_l: number | null;
	bag_filter_output_l: number | null;
	centrifuge_output_l: number | null;
	screw_press_output_l: number | null;
	total_ethanol_70_to_rotovap_l: number | null;
	total_ethanol_recovered_l: number | null;
	total_ethanol_loss_l: number | null;
	water_mother_liquid_l: number | null;
	alkaloid_precipitate_kg: number | null;
	actual_ph_acid: number | null;
	actual_ph_base: number | null;
	limonene_volume_l: number | null;
	limonene_recovered_l: number | null;
	limonene_loss_l: number | null;
	precipitate_weight_kg: number | null;
	final_product_weight_kg: number | null;
	stages: BatchStage[];
}

export function getActiveBatchProgress(): ActiveBatchWithProgress[] {
	const db = getDb();

	const rows = db
		.prepare(`
			SELECT b.id, b.batch_number, b.status, b.current_stage, b.leaf_input_kg, b.operator_name,
				s1.powder_weight_kg,
				s2.extract_weight_kg, s2.ethanol_stock_used_l, s2.ethanol_70_volume_l,
				s2.bag_filter_output_l, s2.centrifuge_output_l, s2.screw_press_output_l,
				s2.total_ethanol_70_to_rotovap_l, s2.total_ethanol_recovered_l, s2.total_ethanol_loss_l,
				s2.water_mother_liquid_l,
				s3.alkaloid_precipitate_kg, s3.actual_ph_acid, s3.actual_ph_base,
				s3.limonene_volume_l, s3.limonene_recovered_l, s3.limonene_loss_l,
				s4.precipitate_weight_kg, s4.final_product_weight_kg,
				(SELECT COUNT(*) FROM stage2_reactors r WHERE r.batch_id = b.id) as reactor_count
			FROM batches b
			LEFT JOIN stage1_records s1 ON s1.batch_id = b.id
			LEFT JOIN stage2_records s2 ON s2.batch_id = b.id
			LEFT JOIN stage3_records s3 ON s3.batch_id = b.id
			LEFT JOIN stage4_records s4 ON s4.batch_id = b.id
			WHERE b.status != 'Draft'
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
		.prepare("SELECT id, batch_number FROM batches WHERE status = 'Completed' ORDER BY completed_at DESC LIMIT 1")
		.get() as { id: number; batch_number: string } | undefined;
	if (!batch) return null;

	const costs = getBatchCosts(batch.id);
	const totalCost = calculateTotalBatchCost(costs);

	const s4 = db
		.prepare('SELECT final_product_weight_kg FROM stage4_records WHERE batch_id = ?')
		.get(batch.id) as { final_product_weight_kg: number | null } | undefined;
	const finalProductKg = s4?.final_product_weight_kg ?? 0;

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
		.prepare("SELECT COALESCE(SUM(leaf_input_kg), 0) as total, COUNT(*) as cnt FROM batches WHERE status != 'Draft'")
		.get() as { total: number; cnt: number };
	const processed = db
		.prepare(`
			SELECT COALESCE(SUM(b.leaf_input_kg), 0) as total
			FROM batches b
			JOIN batch_stages bs ON bs.batch_id = b.id AND bs.stage_number = 1
			WHERE b.status != 'Draft' AND bs.status = 'Finalized'
		`)
		.get() as { total: number };
	const completed = db
		.prepare("SELECT COUNT(*) as cnt FROM batches WHERE status = 'Completed'")
		.get() as { cnt: number };
	const active = db
		.prepare("SELECT COUNT(*) as cnt FROM batches WHERE status IN ('In Progress', 'Pending Review')")
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
		.prepare('SELECT COALESCE(SUM(final_product_weight_kg), 0) as total, COUNT(*) as cnt FROM stage4_records WHERE final_product_weight_kg IS NOT NULL')
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

	const s1Output = (db.prepare("SELECT COALESCE(SUM(s1.powder_weight_kg), 0) as total FROM stage1_records s1 JOIN batch_stages bs ON bs.batch_id = s1.batch_id AND bs.stage_number = 1 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s2Output = (db.prepare("SELECT COALESCE(SUM(s2.extract_weight_kg), 0) as total FROM stage2_records s2 JOIN batch_stages bs ON bs.batch_id = s2.batch_id AND bs.stage_number = 4 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s3Output = (db.prepare("SELECT COALESCE(SUM(s3.alkaloid_precipitate_kg), 0) as total FROM stage3_records s3 JOIN batch_stages bs ON bs.batch_id = s3.batch_id AND bs.stage_number = 5 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s4Output = (db.prepare("SELECT COALESCE(SUM(s4.final_product_weight_kg), 0) as total FROM stage4_records s4 JOIN batch_stages bs ON bs.batch_id = s4.batch_id AND bs.stage_number = 8 WHERE bs.status = 'Finalized'").get() as { total: number }).total;

	const outputMap: Record<number, number> = {
		1: s1Output, 2: s2Output, 3: s2Output, 4: s2Output,
		5: s3Output, 6: s4Output, 7: s4Output, 8: s4Output
	};

	// Stage 2 extras
	const s2Extras = db
		.prepare("SELECT COALESCE(SUM(total_ethanol_recovered_l), 0) as ethanol_recovered, COALESCE(SUM(water_mother_liquid_l), 0) as water_extract FROM stage2_records")
		.get() as { ethanol_recovered: number; water_extract: number };

	return [1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
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
		SELECT cost_category, item_name, COALESCE(SUM(total_cost), 0) as total
		FROM batch_costs
		GROUP BY cost_category, item_name
	`).all() as { cost_category: string; item_name: string; total: number }[];

	let rawMaterial = 0, solvents = 0, reagents = 0, labor = 0, utilities = 0;
	for (const r of rows) {
		if (r.cost_category === 'Labor') labor += r.total;
		else if (r.cost_category === 'Utility') utilities += r.total;
		else if (r.cost_category === 'Material') {
			const name = r.item_name.toLowerCase();
			if (name.includes('leaf')) rawMaterial += r.total;
			else if (name.includes('ethanol') || name.includes('limonene')) solvents += r.total;
			else reagents += r.total; // HCl, NaOH, DI Water
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
		.prepare(`SELECT COALESCE(SUM(s2.ethanol_stock_used_l), 0) as issued, COALESCE(SUM(s2.total_ethanol_recovered_l), 0) as recovered, COALESCE(SUM(s2.total_ethanol_loss_l), 0) as lost FROM stage2_records s2 JOIN batches b ON b.id = s2.batch_id WHERE b.created_at >= ${cutoff}`)
		.get() as { issued: number; recovered: number; lost: number };
	const limonene = db
		.prepare(`SELECT COALESCE(SUM(s3.limonene_volume_l), 0) as issued, COALESCE(SUM(s3.limonene_recovered_l), 0) as recovered, COALESCE(SUM(s3.limonene_loss_l), 0) as lost FROM stage3_records s3 JOIN batches b ON b.id = s3.batch_id WHERE b.created_at >= ${cutoff}`)
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
		.prepare(`SELECT COALESCE(SUM(s4.final_product_weight_kg), 0) as total FROM stage4_records s4 JOIN batches b ON b.id = s4.batch_id WHERE s4.final_product_weight_kg IS NOT NULL AND b.created_at >= ${cutoff}`)
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
		SELECT b.batch_number, s2.recovery_rate_pct, date(b.created_at) as date,
			s2.total_ethanol_70_to_rotovap_l as filtration_return_l,
			s2.extract_weight_kg
		FROM stage2_records s2
		JOIN batches b ON b.id = s2.batch_id
		WHERE s2.recovery_rate_pct IS NOT NULL
		ORDER BY b.created_at DESC LIMIT ?
	`).all(limit) as { batch_number: string; recovery_rate_pct: number; date: string; filtration_return_l: number; extract_weight_kg: number }[];
	return rows.reverse().map(r => ({
		batch_number: r.batch_number,
		recoveryPct: Number(r.recovery_rate_pct.toFixed(1)),
		date: r.date,
		filtrationReturnL: Number((r.filtration_return_l ?? 0).toFixed(1)),
		extractWeightKg: Number((r.extract_weight_kg ?? 0).toFixed(2))
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
		LEFT JOIN batch_costs bc ON date(bc.created_at) = dates.d
		GROUP BY dates.d
		ORDER BY dates.d
	`).all() as { day: string; total: number }[];
}

export function getBatchYieldTrend(limit = 7): { batch_number: string; yieldPct: number; producedKg: number; date: string }[] {
	const db = getDb();
	const rows = db.prepare(`
		SELECT b.batch_number,
			CASE WHEN b.leaf_input_kg > 0
				THEN (s4.final_product_weight_kg / b.leaf_input_kg * 100)
				ELSE 0 END as yield_pct,
			s4.final_product_weight_kg as produced_kg,
			date(b.created_at) as date
		FROM stage4_records s4
		JOIN batches b ON b.id = s4.batch_id
		WHERE s4.final_product_weight_kg IS NOT NULL
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
	`).get() as { total: number; days: number };
	return row.days > 0 ? row.total / row.days : 0;
}

export function getAvgCostPerKg(): number {
	const db = getDb();
	const costs = db.prepare("SELECT COALESCE(SUM(total_cost), 0) as total FROM batch_costs").get() as { total: number };
	const product = db.prepare("SELECT COALESCE(SUM(final_product_weight_kg), 0) as total FROM stage4_records WHERE final_product_weight_kg IS NOT NULL").get() as { total: number };
	return product.total > 0 ? costs.total / product.total : 0;
}

export function getOperationsPipelineMetrics(): OperationsPipelineMetrics {
	const db = getDb();

	const finalizedRows = db
		.prepare("SELECT stage_number, COUNT(*) as cnt FROM batch_stages WHERE status = 'Finalized' GROUP BY stage_number")
		.all() as { stage_number: number; cnt: number }[];
	const stageCounts: Record<number, number> = {};
	for (const r of finalizedRows) stageCounts[r.stage_number] = r.cnt;

	const s1 = db.prepare("SELECT COALESCE(SUM(powder_weight_kg), 0) as total FROM stage1_records").get() as { total: number };

	const s2 = db.prepare(`
		SELECT COUNT(*) as batch_count,
			COALESCE(SUM(ethanol_stock_used_l), 0) as ethanol_used,
			COALESCE(SUM(ethanol_70_volume_l), 0) as ethanol_70_total,
			COALESCE(SUM(total_ethanol_70_to_rotovap_l), 0) as filtration_output,
			COALESCE(SUM(total_ethanol_distilled_l), 0) as distilled,
			COALESCE(SUM(total_ethanol_recovered_l), 0) as recovered,
			COALESCE(SUM(total_ethanol_loss_l), 0) as lost,
			COALESCE(SUM(extract_weight_kg), 0) as extract_total
		FROM stage2_records
	`).get() as any;

	const reactorCount = (db.prepare("SELECT COUNT(*) as cnt FROM stage2_reactors").get() as { cnt: number }).cnt;

	const s3 = db.prepare("SELECT COALESCE(SUM(limonene_recovered_l), 0) as lim_recovered, COALESCE(SUM(limonene_loss_l), 0) as lim_lost FROM stage3_records").get() as any;

	const s4 = db.prepare("SELECT COALESCE(SUM(precipitate_weight_kg), 0) as precipitate_total, COALESCE(SUM(final_product_weight_kg), 0) as final_total FROM stage4_records").get() as any;

	const completedCount = (db.prepare("SELECT COUNT(*) as cnt FROM batches WHERE status = 'Completed'").get() as { cnt: number }).cnt;

	return {
		stageCounts,
		totalPowderKg: Number(s1.total.toFixed(1)),
		lotsExtracted: s2.batch_count,
		ethanolStockUsedL: Number(s2.ethanol_used.toFixed(1)),
		ethanol70TotalL: Number(s2.ethanol_70_total.toFixed(1)),
		filtrationOutputL: Number(s2.filtration_output.toFixed(1)),
		ethanolDistilledL: Number(s2.distilled.toFixed(1)),
		ethanolRecoveredL: Number(s2.recovered.toFixed(1)),
		ethanolLostL: Number(s2.lost.toFixed(1)),
		extractTotalKg: Number(s2.extract_total.toFixed(1)),
		reactorCount,
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
		SELECT COALESCE(SUM(s4.final_product_weight_kg), 0) as total
		FROM stage4_records s4
		JOIN batches b ON b.id = s4.batch_id
		WHERE b.production_run_id = ? AND s4.final_product_weight_kg IS NOT NULL
	`).get(runId) as { total: number };

	const costs = db.prepare(`
		SELECT COALESCE(SUM(bc.total_cost), 0) as total
		FROM batch_costs bc
		JOIN batches b ON b.id = bc.batch_id
		WHERE b.production_run_id = ?
	`).get(runId) as { total: number };

	const ethanol = db.prepare(`
		SELECT COALESCE(AVG(s2.recovery_rate_pct), 0) as avg_recovery
		FROM stage2_records s2
		JOIN batches b ON b.id = s2.batch_id
		WHERE b.production_run_id = ? AND s2.recovery_rate_pct IS NOT NULL
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
		SELECT b.id as batch_id, b.batch_number, b.status,
			COALESCE(SUM(bc.total_cost), 0) as totalCost,
			s4.final_product_weight_kg
		FROM batches b
		LEFT JOIN batch_costs bc ON bc.batch_id = b.id
		LEFT JOIN stage4_records s4 ON s4.batch_id = b.id
		WHERE b.production_run_id = ?
		GROUP BY b.id
		ORDER BY b.batch_number
	`).all(runId).map((r: any) => ({
		batch_id: r.batch_id,
		batch_number: r.batch_number,
		status: r.status,
		totalCost: Number(r.totalCost),
		costPerKg: r.final_product_weight_kg ? Number((r.totalCost / r.final_product_weight_kg).toFixed(2)) : null,
		final_product_weight_kg: r.final_product_weight_kg
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

export function getRunEthanolBreakdown(runId: number): BatchEthanolSummary[] {
	const db = getDb();
	return db.prepare(`
		SELECT b.id as batch_id, b.batch_number, b.status,
			s2.ethanol_stock_used_l as ethanol_issued_l,
			s2.total_ethanol_recovered_l as ethanol_recovered_l,
			s2.total_ethanol_loss_l as ethanol_lost_l,
			s2.recovery_rate_pct as recovery_pct,
			s2.total_ethanol_70_to_rotovap_l as filtration_return_l,
			CASE WHEN s2.extract_weight_kg > 0 AND s2.total_ethanol_70_to_rotovap_l > 0
				THEN (s2.extract_weight_kg / s2.total_ethanol_70_to_rotovap_l * 1000) ELSE NULL END as concentration_gl
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
		SELECT COALESCE(SUM(s2.ethanol_stock_used_l), 0) as issued,
			COALESCE(SUM(s2.total_ethanol_recovered_l), 0) as recovered,
			COALESCE(AVG(s2.recovery_rate_pct), 0) as avg_recovery,
			COALESCE(SUM(s2.total_ethanol_loss_l), 0) as total_loss
		FROM stage2_records s2 JOIN batches b ON b.id = s2.batch_id
		WHERE b.production_run_id = ? AND s2.recovery_rate_pct IS NOT NULL
	`).get(runId) as { issued: number; recovered: number; avg_recovery: number; total_loss: number };

	const best = db.prepare(`
		SELECT b.batch_number, s2.recovery_rate_pct
		FROM stage2_records s2 JOIN batches b ON b.id = s2.batch_id
		WHERE b.production_run_id = ? AND s2.recovery_rate_pct IS NOT NULL
		ORDER BY s2.recovery_rate_pct DESC LIMIT 1
	`).get(runId) as { batch_number: string; recovery_rate_pct: number } | undefined;

	const worst = db.prepare(`
		SELECT b.batch_number, s2.recovery_rate_pct
		FROM stage2_records s2 JOIN batches b ON b.id = s2.batch_id
		WHERE b.production_run_id = ? AND s2.recovery_rate_pct IS NOT NULL
		ORDER BY s2.recovery_rate_pct ASC LIMIT 1
	`).get(runId) as { batch_number: string; recovery_rate_pct: number } | undefined;

	return {
		totalIssued: Number(totals.issued),
		totalRecovered: Number(totals.recovered),
		avgRecovery: Number(Number(totals.avg_recovery).toFixed(1)),
		bestBatch: best ? { batch_number: best.batch_number, recovery_pct: Number(best.recovery_rate_pct) } : null,
		worstBatch: worst ? { batch_number: worst.batch_number, recovery_pct: Number(worst.recovery_rate_pct) } : null,
		totalLoss: Number(totals.total_loss)
	};
}

export function getRunYieldBreakdown(runId: number): BatchYieldSummary[] {
	const db = getDb();
	return db.prepare(`
		SELECT b.id as batch_id, b.batch_number, b.status, b.leaf_input_kg,
			s4.final_product_weight_kg,
			s4.cumulative_yield_pct,
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
		SELECT COALESCE(SUM(s4.final_product_weight_kg), 0) as produced,
			COALESCE(SUM(b.leaf_input_kg), 0) as input
		FROM batches b
		LEFT JOIN stage4_records s4 ON s4.batch_id = b.id
		WHERE b.production_run_id = ?
	`).get(runId) as { produced: number; input: number };

	const best = db.prepare(`
		SELECT b.batch_number, s4.cumulative_yield_pct
		FROM stage4_records s4 JOIN batches b ON b.id = s4.batch_id
		WHERE b.production_run_id = ? AND s4.cumulative_yield_pct IS NOT NULL
		ORDER BY s4.cumulative_yield_pct DESC LIMIT 1
	`).get(runId) as { batch_number: string; cumulative_yield_pct: number } | undefined;

	const worst = db.prepare(`
		SELECT b.batch_number, s4.cumulative_yield_pct
		FROM stage4_records s4 JOIN batches b ON b.id = s4.batch_id
		WHERE b.production_run_id = ? AND s4.cumulative_yield_pct IS NOT NULL
		ORDER BY s4.cumulative_yield_pct ASC LIMIT 1
	`).get(runId) as { batch_number: string; cumulative_yield_pct: number } | undefined;

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
		SELECT AVG(s4.final_product_weight_kg) as avg_kg, COUNT(*) as cnt
		FROM stage4_records s4 JOIN batches b ON b.id = s4.batch_id
		WHERE b.production_run_id = ? AND s4.final_product_weight_kg IS NOT NULL
	`).get(runId) as { avg_kg: number | null; cnt: number };

	const totalBatches = db.prepare(`SELECT COUNT(*) as cnt FROM batches WHERE production_run_id = ?`).get(runId) as { cnt: number };
	const projectedFinal = completedBatchAvg.avg_kg ? completedBatchAvg.avg_kg * totalBatches.cnt : 0;

	return {
		totalProduced: Number(totals.produced),
		overallYield: totals.input > 0 ? Number(((totals.produced / totals.input) * 100).toFixed(2)) : 0,
		bestBatch: best ? { batch_number: best.batch_number, yield_pct: Number(best.cumulative_yield_pct) } : null,
		worstBatch: worst ? { batch_number: worst.batch_number, yield_pct: Number(worst.cumulative_yield_pct) } : null,
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
	reactors: any[];
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
	const reactors = db.prepare('SELECT * FROM stage2_reactors WHERE batch_id = ? ORDER BY reactor_number').all(batchId) as any[];

	const costsByCategory = db.prepare(`
		SELECT cost_category as category, COALESCE(SUM(total_cost), 0) as total
		FROM batch_costs WHERE batch_id = ? GROUP BY cost_category ORDER BY total DESC
	`).all(batchId) as { category: string; total: number }[];
	const totalCost = costsByCategory.reduce((s, c) => s + c.total, 0);
	const s4 = stage4 as any;
	const costPerKg = s4?.final_product_weight_kg ? Number((totalCost / s4.final_product_weight_kg).toFixed(2)) : null;

	const deviations = db.prepare('SELECT * FROM deviations WHERE batch_id = ? ORDER BY created_at DESC').all(batchId) as Deviation[];
	const labResults = db.prepare('SELECT * FROM lab_results WHERE batch_id = ? ORDER BY created_at DESC').all(batchId) as LabResult[];

	// Run averages for comparison
	const runAvgYield = db.prepare(`
		SELECT AVG(s4.cumulative_yield_pct) as avg FROM stage4_records s4
		JOIN batches b ON b.id = s4.batch_id WHERE b.production_run_id = ? AND s4.cumulative_yield_pct IS NOT NULL
	`).get(runId) as { avg: number | null };

	const runAvgCost = db.prepare(`
		SELECT AVG(bc_totals.total) as avg FROM (
			SELECT SUM(bc.total_cost) as total FROM batch_costs bc
			JOIN batches b ON b.id = bc.batch_id WHERE b.production_run_id = ? GROUP BY bc.batch_id
		) bc_totals
	`).get(runId) as { avg: number | null };

	const runAvgRecovery = db.prepare(`
		SELECT AVG(s2.recovery_rate_pct) as avg FROM stage2_records s2
		JOIN batches b ON b.id = s2.batch_id WHERE b.production_run_id = ? AND s2.recovery_rate_pct IS NOT NULL
	`).get(runId) as { avg: number | null };

	// Compute run avg cost per kg
	const runCostPerKg = (() => {
		const r = db.prepare(`
			SELECT COALESCE(SUM(bc.total_cost), 0) as cost, COALESCE(SUM(s4.final_product_weight_kg), 0) as kg
			FROM batch_costs bc JOIN batches b ON b.id = bc.batch_id
			LEFT JOIN stage4_records s4 ON s4.batch_id = b.id
			WHERE b.production_run_id = ? AND s4.final_product_weight_kg IS NOT NULL
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
		reactors,
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
