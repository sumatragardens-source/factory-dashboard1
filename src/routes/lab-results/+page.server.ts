import { getDb } from '$lib/data/db';
import type { LabResult } from '$lib/domain/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	try {
		const db = getDb();

		// Enrich lab results with batch number
		const labResults = db
			.prepare(
				`
			SELECT lr.*, b.batch_number, b.supplier
			FROM lab_results lr
			JOIN batches b ON b.id = lr.batch_id
			ORDER BY lr.created_at DESC
		`
			)
			.all() as (LabResult & { batch_number: string; supplier: string })[];

		// Selected sample (first one by default)
		const selected = labResults.length > 0 ? labResults[0] : null;

		return {
			labResults,
			selected,
			totalSamples: labResults.length
		};
	} catch (error) {
		console.error('Failed to load lab results data:', error);
		return {
			labResults: [],
			selected: null,
			totalSamples: 0
		};
	}
};
