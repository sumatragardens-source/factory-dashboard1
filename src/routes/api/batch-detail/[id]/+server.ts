import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBatchDetailForDrawer } from '$lib/data/repositories/dashboardRepo';

export const GET: RequestHandler = ({ params, url }) => {
	const batchId = Number(params.id);
	const runId = Number(url.searchParams.get('runId') ?? 0);

	if (!batchId || !runId) {
		return json({ error: 'Missing batchId or runId' }, { status: 400 });
	}

	const data = getBatchDetailForDrawer(batchId, runId);
	if (!data) {
		return json({ error: 'Batch not found' }, { status: 404 });
	}

	return json(data);
};
