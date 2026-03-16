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
		.prepare(`SELECT COALESCE(SUM(ethanol_volume_l), 0) as issued, COALESCE(SUM(recovered_ethanol_l), 0) as recovered, COALESCE(SUM(ethanol_loss_l), 0) as lost FROM stage2_records`)
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

	const s1Output = (db.prepare("SELECT COALESCE(SUM(s1.powder_weight_kg), 0) as total FROM stage1_records s1 JOIN batch_stages bs ON bs.batch_id = s1.batch_id AND bs.stage_number = 1 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s2Output = (db.prepare("SELECT COALESCE(SUM(s2.extract_weight_kg), 0) as total FROM stage2_records s2 JOIN batch_stages bs ON bs.batch_id = s2.batch_id AND bs.stage_number = 2 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s3Output = (db.prepare("SELECT COALESCE(SUM(s3.alkaloid_precipitate_kg), 0) as total FROM stage3_records s3 JOIN batch_stages bs ON bs.batch_id = s3.batch_id AND bs.stage_number = 3 WHERE bs.status = 'Finalized'").get() as { total: number }).total;
	const s4Output = (db.prepare("SELECT COALESCE(SUM(s4.final_product_weight_kg), 0) as total FROM stage4_records s4 JOIN batch_stages bs ON bs.batch_id = s4.batch_id AND bs.stage_number = 4 WHERE bs.status = 'Finalized'").get() as { total: number }).total;

	const outputByStage = [s1Output, s2Output, s3Output, s4Output];

	return [1, 2, 3, 4].map((n) => {
		const active = activeRows.find((r) => r.current_stage === n);
		const finalized = finalizedRows.find((r) => r.stage_number === n);
		return {
			stageNumber: n,
			activeCount: active?.cnt ?? 0,
			activeQtyKg: Number((active?.qty ?? 0).toFixed(1)),
			completedThroughCount: finalized?.cnt ?? 0,
			completedThroughOutputKg: Number(outputByStage[n - 1].toFixed(2))
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
	alkaloid_precipitate_kg: number | null;
	final_product_weight_kg: number | null;
	stages: BatchStage[];
}

export function getActiveBatchProgress(): ActiveBatchWithProgress[] {
	const db = getDb();

	const rows = db
		.prepare(`
			SELECT b.id, b.batch_number, b.status, b.current_stage, b.leaf_input_kg, b.operator_name,
				s1.powder_weight_kg, s2.extract_weight_kg, s3.alkaloid_precipitate_kg, s4.final_product_weight_kg
			FROM batches b
			LEFT JOIN stage1_records s1 ON s1.batch_id = b.id
			LEFT JOIN stage2_records s2 ON s2.batch_id = b.id
			LEFT JOIN stage3_records s3 ON s3.batch_id = b.id
			LEFT JOIN stage4_records s4 ON s4.batch_id = b.id
			WHERE b.status IN ('In Progress', 'Pending Review')
			ORDER BY b.current_stage DESC, b.updated_at DESC
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
