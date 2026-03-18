import { getDb } from '$lib/data/db';
import { getAllDeviations, getOpenDeviations } from '$lib/data/repositories/deviationRepo';
import { getStageName } from '$lib/constants/stageNames';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	try {
		const db = getDb();
		const deviations = getAllDeviations();
		const openDeviations = getOpenDeviations();

		// Enrich with batch number
		const enriched = db.prepare(`
			SELECT d.*, b.batch_number
			FROM deviations d
			JOIN batches b ON b.id = d.batch_id
			ORDER BY
				CASE d.severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 END,
				d.created_at DESC
		`).all() as any[];

		// Summary counts
		const bySeverity = {
			Critical: enriched.filter((d: any) => d.severity === 'Critical').length,
			High: enriched.filter((d: any) => d.severity === 'High').length,
			Medium: enriched.filter((d: any) => d.severity === 'Medium').length,
			Low: enriched.filter((d: any) => d.severity === 'Low').length
		};

		const byStatus = {
			Open: enriched.filter((d: any) => d.status === 'Open').length,
			'Under Review': enriched.filter((d: any) => d.status === 'Under Review').length,
			Resolved: enriched.filter((d: any) => d.status === 'Resolved').length,
			Closed: enriched.filter((d: any) => d.status === 'Closed').length
		};

		return {
			deviations: enriched,
			openCount: openDeviations.length,
			totalCount: deviations.length,
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
