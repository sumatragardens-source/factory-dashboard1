export const STAGE_NAMES = [
	'Raw Leaf to Powder',
	'Ethanol + Water Extraction',
	'Basification + Back-Extraction',
	'Precipitation + Drying'
] as const;

export type StageName = (typeof STAGE_NAMES)[number];

export const TOTAL_STAGES = 4;

export const STAGE_KEYS = [1, 2, 3, 4] as const;
export type StageNumber = (typeof STAGE_KEYS)[number];

export function getStageName(stageNumber: number): StageName {
	if (stageNumber < 1 || stageNumber > TOTAL_STAGES) {
		throw new Error(`Invalid stage number: ${stageNumber}. Must be 1-${TOTAL_STAGES}.`);
	}
	return STAGE_NAMES[stageNumber - 1];
}

/**
 * Maps a stage number (1-4) to the underlying data record table number (1-4).
 * Now an identity mapping since we have 4 stages matching 4 record tables.
 */
export function stageToRecordTable(stageNumber: number): 1 | 2 | 3 | 4 {
	if (stageNumber >= 1 && stageNumber <= 4) return stageNumber as 1 | 2 | 3 | 4;
	return 4;
}
