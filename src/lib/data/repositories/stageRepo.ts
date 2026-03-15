import { getDb } from '../db';
import type { Stage1Record, Stage2Record, Stage3Record, Stage4Record } from '$lib/domain/types';

export function getStage1Record(batchId: number): Stage1Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage1_records WHERE batch_id = ?').get(batchId) as
		| Stage1Record
		| undefined;
}

export function getStage2Record(batchId: number): Stage2Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage2_records WHERE batch_id = ?').get(batchId) as
		| Stage2Record
		| undefined;
}

export function getStage3Record(batchId: number): Stage3Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage3_records WHERE batch_id = ?').get(batchId) as
		| Stage3Record
		| undefined;
}

export function getStage4Record(batchId: number): Stage4Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage4_records WHERE batch_id = ?').get(batchId) as
		| Stage4Record
		| undefined;
}
