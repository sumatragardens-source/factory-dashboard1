import { initDb } from '$lib/data/init';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ url }) => {
	initDb();

	const pathTitles: Record<string, string> = {
		'/operations': 'Operations',
		'/batches': 'Batches',
		'/inventory': 'Inventory',
		'/machines': 'Machines',
		'/batch-costing': 'Batch Costing',
		'/solvent-economics': 'Solvent Economics',
		'/yield-analytics': 'Yield & Analytics',
		'/deviations': 'Deviations',
		'/lab-results': 'Lab Results',
		'/stages': 'Stage Performance'
	};

	const basePath = '/' + (url.pathname.split('/')[1] || 'operations');
	const pageTitle = pathTitles[basePath] ?? 'Sumatra Gardens';

	return { pageTitle };
};
