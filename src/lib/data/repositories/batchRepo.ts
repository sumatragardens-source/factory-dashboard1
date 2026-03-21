import { getDb } from '../db';
import type { Batch, BatchStage } from '$lib/domain/types';

export function getAllBatches(): Batch[] {
	const db = getDb();
	return db.prepare('SELECT * FROM batches ORDER BY created_at ASC').all() as Batch[];
}

export function getBatchById(id: number): Batch | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM batches WHERE id = ?').get(id) as Batch | undefined;
}

export function getBatchByNumber(batchNumber: string): Batch | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM batches WHERE batch_number = ?').get(batchNumber) as Batch | undefined;
}

export function createBatch(data: {
	supplier: string;
	supplier_lot: string | null;
	leaf_input_kg: number;
	operator_name: string;
}): number {
	const db = getDb();
	const year = new Date().getFullYear();
	const row = db.prepare('SELECT COUNT(*) as count FROM batches WHERE batch_number LIKE ?').get(`SG-${year}%`) as {
		count: number;
	};
	const seq = String(row.count + 1).padStart(3, '0');
	const batchNumber = `SG-${year}${seq}`;

	const result = db
		.prepare(
			`INSERT INTO batches (batch_number, status, current_stage, supplier, supplier_lot, leaf_input_kg, operator_name)
			 VALUES (?, 'Draft', 1, ?, ?, ?, ?)`
		)
		.run(batchNumber, data.supplier, data.supplier_lot, data.leaf_input_kg, data.operator_name);

	const batchId = result.lastInsertRowid as number;

	const insertStage = db.prepare(`INSERT INTO batch_stages (batch_id, stage_number, status) VALUES (?, ?, 'Pending')`);
	for (let i = 1; i <= 7; i++) {
		insertStage.run(batchId, i);
	}

	return batchId;
}

export function getBatchStages(batchId: number): BatchStage[] {
	const db = getDb();
	return db.prepare('SELECT * FROM batch_stages WHERE batch_id = ? ORDER BY stage_number').all(batchId) as BatchStage[];
}

export function startStage(batchId: number, stageNumber: number): void {
	const db = getDb();
	const txn = db.transaction(() => {
		db.prepare(
			`
			UPDATE batch_stages SET status = 'In Progress', started_at = datetime('now')
			WHERE batch_id = ? AND stage_number = ? AND status = 'Pending'
		`
		).run(batchId, stageNumber);

		db.prepare(
			`
			UPDATE batches SET status = 'In Progress', current_stage = ?, started_at = COALESCE(started_at, datetime('now')), updated_at = datetime('now')
			WHERE id = ?
		`
		).run(stageNumber, batchId);
	});
	txn();
}

export function updateBatchStatus(batchId: number, status: string): void {
	getDb().prepare("UPDATE batches SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, batchId);
}

export function finalizeStage(batchId: number, stageNumber: number, finalizedBy: string): void {
	const db = getDb();
	const txn = db.transaction(() => {
		db.prepare(
			`
			UPDATE batch_stages SET status = 'Finalized', finalized_at = datetime('now'), finalized_by = ?
			WHERE batch_id = ? AND stage_number = ?
		`
		).run(finalizedBy, batchId, stageNumber);

		if (stageNumber < 7) {
			const nextStage = stageNumber + 1;
			db.prepare(
				`
				UPDATE batch_stages SET status = 'In Progress', started_at = datetime('now')
				WHERE batch_id = ? AND stage_number = ? AND status = 'Pending'
			`
			).run(batchId, nextStage);

			db.prepare(
				`
				UPDATE batches SET current_stage = ?, updated_at = datetime('now')
				WHERE id = ?
			`
			).run(nextStage, batchId);
		} else {
			db.prepare(
				`
				UPDATE batches SET status = 'Pending Review', updated_at = datetime('now'), completed_at = datetime('now')
				WHERE id = ?
			`
			).run(batchId);
		}
	});
	txn();
}
