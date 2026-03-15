import { getDb } from '$lib/data/db';
import { getAllLabResults } from '$lib/data/repositories/labResultRepo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const db = getDb();

	// Enrich lab results with batch number
	const labResults = db.prepare(`
		SELECT lr.*, b.batch_number, b.strain
		FROM lab_results lr
		JOIN batches b ON b.id = lr.batch_id
		ORDER BY lr.created_at DESC
	`).all() as any[];

	// Selected sample (first one by default)
	const selected = labResults.length > 0 ? labResults[0] : null;

	return {
		labResults,
		selected,
		totalSamples: labResults.length
	};
};
