import { getDb } from '../db';
import type { Batch, BatchStage, Deviation, Approval, Machine, LabResult } from '$lib/domain/types';
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
			WHERE b.status IN ('In Progress', 'Pending Review')
			ORDER BY b.current_stage DESC, b.created_at ASC
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
			WHERE lr.test_type = 'HPLC' AND lr.status = 'Completed' AND b.status = 'Completed'
			ORDER BY b.completed_at DESC LIMIT 1
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
