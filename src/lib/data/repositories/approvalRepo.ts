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

export function createApproval(data: {
	batch_id: number;
	approval_type: string;
	requested_by: string;
}): number {
	const db = getDb();
	const result = db
		.prepare(
			`INSERT INTO approvals (batch_id, approval_type, requested_by) VALUES (?, ?, ?)`
		)
		.run(data.batch_id, data.approval_type, data.requested_by);
	return result.lastInsertRowid as number;
}

export function decideApproval(id: number, data: {
	decided_by: string;
	status: string;
	decision_notes: string | null;
}): void {
	const db = getDb();
	db.prepare(
		`UPDATE approvals SET status = ?, decided_by = ?, decision_notes = ?, decided_at = datetime('now') WHERE id = ?`
	).run(data.status, data.decided_by, data.decision_notes, id);
}
