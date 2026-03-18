// ============================================================
// 7 Process Stages → 4 UI Stages
// ============================================================

export interface ProcessStage {
	code: string;       // S1–S7
	number: number;     // 1–7
	name: string;       // Full process stage name
	uiStage: number;    // Which UI stage (1–4) this maps to
}

export interface UIStage {
	number: number;     // 1–4
	name: string;       // Pipeline label
	processStages: number[];  // Which process stages fall under this
}

export const PROCESS_STAGES: readonly ProcessStage[] = [
	{ code: 'S1', number: 1, name: 'Raw Leaf & Grinding',                          uiStage: 1 },
	{ code: 'S2', number: 2, name: 'Ethanol Extraction',                            uiStage: 2 },
	{ code: 'S3', number: 3, name: 'Filtration & Washing',                          uiStage: 2 },
	{ code: 'S4', number: 4, name: 'Ethanol Distillation/Recovery',                 uiStage: 2 },
	{ code: 'S5', number: 5, name: 'Acid/Base Extraction and Partitioning',         uiStage: 3 },
	{ code: 'S6', number: 6, name: 'Back-Extraction & Precipitation',               uiStage: 3 },
	{ code: 'S7', number: 7, name: 'Drying & Final Product',                        uiStage: 4 },
] as const;

export const UI_STAGES: readonly UIStage[] = [
	{ number: 1, name: 'Raw Leaf to Powder',                                         processStages: [1] },
	{ number: 2, name: 'Ethanol Extraction',                                         processStages: [2, 3, 4] },
	{ number: 3, name: 'Acid/Base Extraction and Partitioning',                      processStages: [5, 6] },
	{ number: 4, name: 'Back Extraction, Precipitation, Drying, and Final Product',  processStages: [6, 7] },
] as const;

export const TOTAL_PROCESS_STAGES = 7;
export const TOTAL_UI_STAGES = 4;

export const PROCESS_STAGE_KEYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type ProcessStageNumber = (typeof PROCESS_STAGE_KEYS)[number];

export const UI_STAGE_KEYS = [1, 2, 3, 4] as const;
export type UIStageNumber = (typeof UI_STAGE_KEYS)[number];

/** Get process stage name by number (1–7) */
export function getProcessStageName(stageNumber: number): string {
	const stage = PROCESS_STAGES.find(s => s.number === stageNumber);
	if (!stage) throw new Error(`Invalid process stage number: ${stageNumber}. Must be 1-${TOTAL_PROCESS_STAGES}.`);
	return stage.name;
}

/** Get UI stage name by number (1–4) */
export function getUIStageName(uiStageNumber: number): string {
	const stage = UI_STAGES.find(s => s.number === uiStageNumber);
	if (!stage) throw new Error(`Invalid UI stage number: ${uiStageNumber}. Must be 1-${TOTAL_UI_STAGES}.`);
	return stage.name;
}

// ── Backward compatibility ──────────────────────────────────────────────────

/** @deprecated Use UI_STAGES or PROCESS_STAGES directly */
export const STAGE_NAMES = UI_STAGES.map(s => s.name);

/** @deprecated Use TOTAL_UI_STAGES */
export const TOTAL_STAGES = TOTAL_UI_STAGES;

/** @deprecated Use PROCESS_STAGE_KEYS */
export const STAGE_KEYS = UI_STAGE_KEYS;

/** @deprecated Use getUIStageName() or getProcessStageName() */
export function getStageName(stageNumber: number): string {
	return getUIStageName(stageNumber);
}

export type StageName = string;
export type StageNumber = UIStageNumber;

/**
 * @deprecated Maps a UI stage number (1-4) to the underlying data record table number (1-4).
 * Now an identity mapping for backward compat with pages using the old 4-stage model.
 */
export function stageToRecordTable(stageNumber: number): 1 | 2 | 3 | 4 {
	if (stageNumber >= 1 && stageNumber <= 4) return stageNumber as 1 | 2 | 3 | 4;
	return 4;
}
