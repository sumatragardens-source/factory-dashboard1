import { getAllBatches } from '$lib/data/repositories/batchRepo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const batches = getAllBatches();
	return { batches };
};
