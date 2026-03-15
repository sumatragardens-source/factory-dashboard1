import { getBatchById, getBatchStages } from '$lib/data/repositories/batchRepo';
import { getStage1Record, getStage2Record, getStage3Record, getStage4Record } from '$lib/data/repositories/stageRepo';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const batch = getBatchById(Number(params.id));
	if (!batch) error(404, 'Batch not found');

	const stageNumber = Number(params.stageNumber);
	if (stageNumber < 1 || stageNumber > 4) error(404, 'Invalid stage number');

	const stages = getBatchStages(batch.id);

	const stageRecords = {
		stage1: getStage1Record(batch.id) ?? null,
		stage2: getStage2Record(batch.id) ?? null,
		stage3: getStage3Record(batch.id) ?? null,
		stage4: getStage4Record(batch.id) ?? null
	};

	return { batch, stageNumber, stages, ...stageRecords };
};
