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

export function getBatchStages(batchId: number): BatchStage[] {
	const db = getDb();
	return db
		.prepare('SELECT * FROM batch_stages WHERE batch_id = ? ORDER BY stage_number')
		.all(batchId) as BatchStage[];
}
