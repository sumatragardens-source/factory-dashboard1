import { getDb } from '../db';
import type { Batch, BatchStage } from '$lib/domain/types';

export function getAllBatches(): Batch[] {
	const db = getDb();
	return db.prepare('SELECT * FROM batches ORDER BY created_at DESC').all() as Batch[];
}

export function getBatchById(id: number): Batch | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM batches WHERE id = ?').get(id) as Batch | undefined;
}

export function getBatchByNumber(batchNumber: string): Batch | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM batches WHERE batch_number = ?').get(batchNumber) as
		| Batch
		| undefined;
}

export function createBatch(data: {
	strain: string;
	supplier: string;
	leaf_input_kg: number;
	operator_name: string;
}): number {
	const db = getDb();
	const year = new Date().getFullYear();
	const row = db
		.prepare("SELECT COUNT(*) as count FROM batches WHERE batch_number LIKE ?")
		.get(`SG-${year}-%`) as { count: number };
	const seq = String(row.count + 1).padStart(3, '0');
	const batchNumber = `SG-${year}-${seq}`;

	const result = db
		.prepare(
			`INSERT INTO batches (batch_number, status, current_stage, strain, supplier, leaf_input_kg, operator_name)
			 VALUES (?, 'Draft', 1, ?, ?, ?, ?)`
		)
		.run(batchNumber, data.strain, data.supplier, data.leaf_input_kg, data.operator_name);

	const batchId = result.lastInsertRowid as number;

	const insertStage = db.prepare(
		`INSERT INTO batch_stages (batch_id, stage_number, status) VALUES (?, ?, 'Pending')`
	);
	for (let i = 1; i <= 4; i++) {
		insertStage.run(batchId, i);
	}

	return batchId;
}

export function getBatchStages(batchId: number): BatchStage[] {
	const db = getDb();
	return db
		.prepare('SELECT * FROM batch_stages WHERE batch_id = ? ORDER BY stage_number')
		.all(batchId) as BatchStage[];
}
