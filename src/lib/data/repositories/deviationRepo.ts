import { getDb } from '../db';
import type { Deviation } from '$lib/domain/types';

export function getAllDeviations(): Deviation[] {
	const db = getDb();
	return db.prepare('SELECT * FROM deviations ORDER BY created_at DESC').all() as Deviation[];
}

export function getDeviationsByBatch(batchId: number): Deviation[] {
	const db = getDb();
	return db
		.prepare('SELECT * FROM deviations WHERE batch_id = ? ORDER BY created_at DESC')
		.all(batchId) as Deviation[];
}

export function getOpenDeviations(): Deviation[] {
	const db = getDb();
	return db
		.prepare("SELECT * FROM deviations WHERE status IN ('Open','Under Review') ORDER BY severity DESC, created_at DESC")
		.all() as Deviation[];
}
