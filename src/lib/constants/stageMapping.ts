// ============================================================
// Process Stage ↔ UI Stage mapping utilities
// ============================================================

import { PROCESS_STAGES, UI_STAGES, type UIStage, type ProcessStage } from './stageNames';

/** Get the UI stage for a given process stage number (1–7) */
export function getUIStage(processStage: number): UIStage {
	const ps = PROCESS_STAGES.find(s => s.number === processStage);
	if (!ps) throw new Error(`Invalid process stage: ${processStage}`);
	const ui = UI_STAGES.find(s => s.number === ps.uiStage);
	if (!ui) throw new Error(`No UI stage mapping for process stage: ${processStage}`);
	return ui;
}

/** Get all process stage numbers that belong to a UI stage (1–4) */
export function getProcessStages(uiStage: number): number[] {
	const ui = UI_STAGES.find(s => s.number === uiStage);
	if (!ui) throw new Error(`Invalid UI stage: ${uiStage}`);
	return [...ui.processStages];
}

/** Get the UI stage number for a given process stage number */
export function getUIStageNumber(processStage: number): number {
	return getUIStage(processStage).number;
}

/** Get process stage definition by number */
export function getProcessStage(stageNumber: number): ProcessStage {
	const ps = PROCESS_STAGES.find(s => s.number === stageNumber);
	if (!ps) throw new Error(`Invalid process stage: ${stageNumber}`);
	return ps;
}
