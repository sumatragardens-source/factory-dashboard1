import { getDb } from '../db';
import type { UnitRate, BatchCost } from '$lib/domain/types';

export function getAllUnitRates(): UnitRate[] {
	const db = getDb();
	return db.prepare('SELECT * FROM unit_rates ORDER BY category, item_name').all() as UnitRate[];
}

export function getBatchCosts(batchId: number): BatchCost[] {
	const db = getDb();
	return db
		.prepare('SELECT * FROM batch_costs WHERE batch_id = ? ORDER BY cost_category')
		.all(batchId) as BatchCost[];
}

export function getBatchTotalCost(batchId: number): number {
	const db = getDb();
	const result = db
		.prepare('SELECT COALESCE(SUM(total_cost), 0) as total FROM batch_costs WHERE batch_id = ?')
		.get(batchId) as { total: number };
	return result.total;
}
