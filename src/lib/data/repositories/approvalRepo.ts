import { getDb } from '../db';
import type { Approval } from '$lib/domain/types';

export function getAllApprovals(): Approval[] {
	const db = getDb();
	return db.prepare('SELECT * FROM approvals ORDER BY requested_at DESC').all() as Approval[];
}

export function getPendingApprovals(): Approval[] {
	const db = getDb();
	return db
		.prepare("SELECT * FROM approvals WHERE status = 'Pending' ORDER BY requested_at DESC")
		.all() as Approval[];
}

export function getApprovalsByBatch(batchId: number): Approval[] {
	const db = getDb();
	return db
		.prepare('SELECT * FROM approvals WHERE batch_id = ? ORDER BY requested_at DESC')
		.all(batchId) as Approval[];
}
