import { getDb } from '../db';
import type { LabResult } from '$lib/domain/types';

export function getAllLabResults(): LabResult[] {
	const db = getDb();
	return db.prepare('SELECT * FROM lab_results ORDER BY created_at DESC').all() as LabResult[];
}

export function getLabResultsByBatch(batchId: number): LabResult[] {
	const db = getDb();
	return db.prepare('SELECT * FROM lab_results WHERE batch_id = ? ORDER BY test_date DESC').all(batchId) as LabResult[];
}
