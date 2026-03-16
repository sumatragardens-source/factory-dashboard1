export const STAGE_NAMES = [
	'Raw Leaf to Powder',
	'Ethanol Extraction',
	'Filtration',
	'Distillation',
	'Acid/Base Extraction',
	'Back Extraction',
	'Precipitation',
	'Drying'
] as const;

export type StageName = (typeof STAGE_NAMES)[number];

export const TOTAL_STAGES = 8;

export const STAGE_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type StageNumber = (typeof STAGE_KEYS)[number];

export function getStageName(stageNumber: number): StageName {
	if (stageNumber < 1 || stageNumber > TOTAL_STAGES) {
		throw new Error(`Invalid stage number: ${stageNumber}. Must be 1-${TOTAL_STAGES}.`);
	}
	return STAGE_NAMES[stageNumber - 1];
}

/**
 * Maps a workflow stage number (1-8) to the underlying data record table number (1-4).
 * Stage 1 → table 1, Stages 2-4 → table 2, Stage 5 → table 3, Stages 6-8 → table 4
 */
export function stageToRecordTable(stageNumber: number): 1 | 2 | 3 | 4 {
	if (stageNumber === 1) return 1;
	if (stageNumber >= 2 && stageNumber <= 4) return 2;
	if (stageNumber === 5) return 3;
	return 4;
}
