import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { TOTAL_STAGES, stageToRecordTable } from '$lib/constants/stageNames';
import type {
	TimeFilter,
	Stage1Performance,
	Stage2Performance,
	Stage3Performance,
	Stage4Performance
} from '$lib/data/repositories/stagePerformanceRepo';
import {
	getStage1Performance,
	getStage2Performance,
	getStage3Performance,
	getStage4Performance
} from '$lib/data/repositories/stagePerformanceRepo';

export const load: PageServerLoad = ({ params, url }) => {
	const stageNumber = Number(params.stageNumber);
	if (stageNumber < 1 || stageNumber > TOTAL_STAGES) error(404, 'Invalid stage number');

	const filter = (url.searchParams.get('filter') as TimeFilter) || 'all';
	const validFilters: TimeFilter[] = ['all', '3months', '1month', '1week', 'today'];
	const safeFilter = validFilters.includes(filter) ? filter : 'all';

	const table = stageToRecordTable(stageNumber);
	let performance: Stage1Performance | Stage2Performance | Stage3Performance | Stage4Performance;
	switch (table) {
		case 1:
			performance = getStage1Performance(safeFilter);
			break;
		case 2:
			performance = getStage2Performance(safeFilter);
			break;
		case 3:
			performance = getStage3Performance(safeFilter);
			break;
		case 4:
			performance = getStage4Performance(safeFilter);
			break;
	}

	return { stageNumber, filter: safeFilter, performance };
};
