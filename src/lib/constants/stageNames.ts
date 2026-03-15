export const STAGE_NAMES = [
	'Raw Leaf to Powder',
	'Ethanol Extraction',
	'Acid/Base Extraction and Partitioning',
	'Back Extraction, Precipitation, Drying, and Final Product'
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
