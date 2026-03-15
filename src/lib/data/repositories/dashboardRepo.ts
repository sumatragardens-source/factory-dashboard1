import { getDb } from '../db';
import type { Batch, Deviation, Approval, Machine } from '$lib/domain/types';

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

export function getBatchCountByStatus(): Record<string, number> {
	const db = getDb();
	const rows = db
		.prepare('SELECT status, COUNT(*) as count FROM batches GROUP BY status')
		.all() as { status: string; count: number }[];
	const result: Record<string, number> = {};
	for (const r of rows) result[r.status] = r.count;
	return result;
}
