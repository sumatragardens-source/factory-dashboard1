import { getDb } from '$lib/data/db';
import type { Deviation } from '$lib/domain/types';
import type { PageServerLoad } from './$types';

type DeviationRow = Deviation & { batch_number: string };

export const load: PageServerLoad = () => {
	try {
		const db = getDb();

		// Enrich with batch number
		const enriched = db
			.prepare(
				`
			SELECT d.*, b.batch_number
			FROM deviations d
			JOIN batches b ON b.id = d.batch_id
			ORDER BY
				CASE d.severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 END,
				d.created_at DESC
		`
			)
			.all() as DeviationRow[];

		// Summary counts
		const bySeverity = {
			Critical: enriched.filter((d) => d.severity === 'Critical').length,
			High: enriched.filter((d) => d.severity === 'High').length,
			Medium: enriched.filter((d) => d.severity === 'Medium').length,
			Low: enriched.filter((d) => d.severity === 'Low').length
		};

		const byStatus = {
			Open: enriched.filter((d) => d.status === 'Open').length,
			'Under Review': enriched.filter((d) => d.status === 'Under Review').length,
			Resolved: enriched.filter((d) => d.status === 'Resolved').length,
			Closed: enriched.filter((d) => d.status === 'Closed').length
		};

		return {
			deviations: enriched,
			openCount: enriched.filter((d) => d.status === 'Open' || d.status === 'Under Review').length,
			totalCount: enriched.length,
			bySeverity,
			byStatus
		};
	} catch (error) {
		console.error('Failed to load deviations data:', error);
		return {
			deviations: [],
			openCount: 0,
			totalCount: 0,
			bySeverity: { Critical: 0, High: 0, Medium: 0, Low: 0 },
			byStatus: { Open: 0, 'Under Review': 0, Resolved: 0, Closed: 0 }
		};
	}
};
